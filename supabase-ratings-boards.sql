-- Syllog star ratings and per-game monthly championships.
-- Safe to run more than once.
-- Prizes match Void Vexon: 2,000 / 1,000 / 500 SC, paid when the month closes.

create table if not exists public.syllog_ranked_games (
  game_id text primary key,
  title text not null
);

insert into public.syllog_ranked_games (game_id, title) values
  ('void-vexon', 'Void Vexon'),
  ('vegas-reckoning', 'Vegas Reckoning')
on conflict (game_id) do update set title = excluded.title;

create table if not exists public.syllog_game_ratings (
  player_id uuid not null references public.players(id) on delete cascade,
  game_id text not null references public.syllog_ranked_games(game_id),
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (player_id, game_id)
);

create table if not exists public.syllog_month_scores (
  player_id uuid not null references public.players(id) on delete cascade,
  game_id text not null references public.syllog_ranked_games(game_id),
  month_key text not null,
  score bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, game_id, month_key)
);

create index if not exists syllog_month_scores_board_idx
  on public.syllog_month_scores (game_id, month_key, score desc);

create table if not exists public.syllog_month_payouts (
  game_id text not null,
  month_key text not null,
  place integer not null,
  player_id uuid,
  amount integer not null default 0,
  paid_at timestamptz not null default now(),
  primary key (game_id, month_key, place)
);

create table if not exists public.syllog_payout_queue (
  id bigserial primary key,
  player_id uuid not null,
  amount integer not null check (amount > 0),
  game_id text not null,
  month_key text not null,
  place integer not null
);

revoke all on public.syllog_payout_queue from anon, authenticated;
revoke all on public.syllog_month_payouts from anon, authenticated;

-- Wallet guard: a browser still cannot mint SC.
-- A credit is allowed only when this trigger can see a matching payout-queue row,
-- which only syllog_settle_months inserts.
create or replace function public.syllog_guard_players()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_client boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
  added_cost integer := 0;
  spent integer;
  delta integer;
  qid bigint;
begin
  if not is_client then return new; end if;

  if tg_op = 'INSERT' then
    if new.id is distinct from auth.uid() then
      raise exception 'You can only change your own Syllog account';
    end if;
    new.sc_balance := 0;
    if exists (select 1 from unnest(syllog_list(new.owned_ships::text) || syllog_list(new.owned_skins::text)) i where syllog_item_price(i) > 0) then
      new.owned_ships := '[]';
      new.owned_skins := '[]';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Account id cannot be changed';
  end if;

  delta := coalesce(new.sc_balance, 0) - coalesce(old.sc_balance, 0);
  if delta > 0 then
    select q.id into qid
    from public.syllog_payout_queue q
    where q.player_id = new.id and q.amount = delta
    order by q.id
    limit 1;
  end if;

  if qid is not null then
    delete from public.syllog_payout_queue where id = qid;
  else
    if new.id is distinct from auth.uid() then
      raise exception 'You can only change your own Syllog account';
    end if;
    if delta > 0 or coalesce(new.sc_balance, 0) < 0 then
      new.sc_balance := old.sc_balance;
    end if;
  end if;

  select coalesce(sum(syllog_item_price(i)), 0) into added_cost
  from unnest(syllog_list(new.owned_ships::text) || syllog_list(new.owned_skins::text)) i
  where i <> all(syllog_list(old.owned_ships::text) || syllog_list(old.owned_skins::text));

  spent := coalesce(old.sc_balance, 0) - coalesce(new.sc_balance, 0);
  if added_cost > 0 and spent < added_cost then
    new.owned_ships := old.owned_ships;
    new.owned_skins := old.owned_skins;
  end if;

  return new;
end $$;

create or replace function public.syllog_rate_game(p_game text, p_stars integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to rate';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'Rating must be 1 to 5';
  end if;
  if not exists (select 1 from public.syllog_ranked_games g where g.game_id = p_game) then
    raise exception 'Unknown game';
  end if;
  insert into public.syllog_game_ratings (player_id, game_id, stars)
  values (auth.uid(), p_game, p_stars)
  on conflict (player_id, game_id)
  do update set stars = excluded.stars, updated_at = now();
end $$;

create or replace function public.syllog_rating_summary()
returns table(game_id text, average numeric, votes bigint)
language sql
security definer
stable
set search_path = public
as $$
  select r.game_id,
         round(avg(r.stars)::numeric, 1) as average,
         count(*)::bigint as votes
  from public.syllog_game_ratings r
  group by r.game_id;
$$;

create or replace function public.syllog_my_ratings()
returns table(game_id text, stars smallint)
language sql
security definer
stable
set search_path = public
as $$
  select r.game_id, r.stars
  from public.syllog_game_ratings r
  where r.player_id = auth.uid();
$$;

create or replace function public.syllog_post_score(p_game text, p_score bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mk text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if auth.uid() is null then
    raise exception 'Sign in to post a score';
  end if;
  if p_score is null or p_score <= 0 or p_score > 2000000000 then
    return;
  end if;
  if not exists (select 1 from public.syllog_ranked_games g where g.game_id = p_game) then
    raise exception 'Unknown game';
  end if;
  insert into public.syllog_month_scores (player_id, game_id, month_key, score)
  values (auth.uid(), p_game, mk, p_score)
  on conflict (player_id, game_id, month_key)
  do update set score = greatest(public.syllog_month_scores.score, excluded.score),
                updated_at = now()
  where excluded.score > public.syllog_month_scores.score;
end $$;

create or replace function public.syllog_settle_months()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  prizes integer[] := array[2000, 1000, 500];
  cur text := to_char(now() at time zone 'utc', 'YYYY-MM');
  g text;
  mk text;
  rec record;
  place integer;
  amt integer;
  paid integer := 0;
begin
  perform pg_advisory_xact_lock(874210);

  insert into public.syllog_month_scores (player_id, game_id, month_key, score)
  select p.id, 'void-vexon', p.voidrift_month_key, p.voidrift_month_score
  from public.players p
  where p.voidrift_month_key is not null
    and p.voidrift_month_key < cur
    and coalesce(p.voidrift_month_score, 0) > 0
  on conflict (player_id, game_id, month_key)
  do update set score = greatest(public.syllog_month_scores.score, excluded.score);

  for g, mk in
    select distinct s.game_id, s.month_key
    from public.syllog_month_scores s
    where s.month_key < cur
      and s.score > 0
      and not exists (
        select 1 from public.syllog_month_payouts y
        where y.game_id = s.game_id and y.month_key = s.month_key
      )
  loop
    place := 0;
    for rec in
      select s.player_id, s.score
      from public.syllog_month_scores s
      where s.game_id = g and s.month_key = mk and s.score > 0
      order by s.score desc, s.updated_at asc
      limit 3
    loop
      place := place + 1;
      amt := prizes[place];
      insert into public.syllog_payout_queue (player_id, amount, game_id, month_key, place)
      values (rec.player_id, amt, g, mk, place);
      update public.players
        set sc_balance = coalesce(sc_balance, 0) + amt
        where id = rec.player_id;
      insert into public.syllog_month_payouts (game_id, month_key, place, player_id, amount)
      values (g, mk, place, rec.player_id, amt);
      paid := paid + 1;
    end loop;
    if place = 0 then
      insert into public.syllog_month_payouts (game_id, month_key, place, player_id, amount)
      values (g, mk, 0, null, 0);
    end if;
  end loop;

  return paid;
end $$;

revoke all on function public.syllog_rate_game(text, integer) from public;
revoke all on function public.syllog_rating_summary() from public;
revoke all on function public.syllog_my_ratings() from public;
revoke all on function public.syllog_post_score(text, bigint) from public;
revoke all on function public.syllog_settle_months() from public;

grant execute on function public.syllog_rate_game(text, integer) to authenticated;
grant execute on function public.syllog_my_ratings() to authenticated;
grant execute on function public.syllog_post_score(text, bigint) to authenticated;
grant execute on function public.syllog_rating_summary() to anon, authenticated;
grant execute on function public.syllog_settle_months() to anon, authenticated;

grant select on public.syllog_ranked_games to anon, authenticated;
grant select on public.syllog_month_scores to anon, authenticated;
grant select on public.syllog_game_ratings to anon, authenticated;

insert into public.syllog_month_scores (player_id, game_id, month_key, score)
select p.id, 'void-vexon', p.voidrift_month_key, p.voidrift_month_score
from public.players p
where p.voidrift_month_key is not null
  and coalesce(p.voidrift_month_score, 0) > 0
on conflict (player_id, game_id, month_key)
do update set score = greatest(public.syllog_month_scores.score, excluded.score);

notify pgrst, 'reload schema';
