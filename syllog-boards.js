/* Shared star ratings and monthly boards for every live Syllog game. */
(function () {
  var URL = 'https://mlstrkqefyqoczusewrm.supabase.co';
  var KEY = 'sb_publishable_g7_BTnT_cTqaIk19Kx9FEw_iP1I7Df7';
  var sb = window.supabase ? window.supabase.createClient(URL, KEY) : null;
  var PRIZES = [2000, 1000, 500];
  var GAMES = [
    {
      id: 'void-vexon',
      name: 'Void Vexon',
      featured: true,
      unit: 'pts',
      money: false,
      play: 'Voidvexon.html',
      rule: 'Best single run this month. First, second, and third win 2,000, 1,000, and 500 SC when the month closes.'
    },
    {
      id: 'vegas-reckoning',
      name: 'Vegas Reckoning',
      featured: false,
      unit: 'won',
      money: true,
      play: 'Vegasreckoning.html',
      rule: 'Best night of money won at the tables. Story gifts, loans, and chips bought with SC do not count. First, second, and third win 2,000, 1,000, and 500 SC when the month closes.'
    }
  ];
  var summaryMap = null;
  var mineMap = {};
  var userId = null;

  function monthKey(now) {
    now = now || new Date();
    return now.getUTCFullYear() + '-' + String(now.getUTCMonth() + 1).padStart(2, '0');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function starsHTML(n) {
    var html = '';
    var fill = Math.max(0, Math.min(5, Math.round(n || 0)));
    for (var i = 1; i <= 5; i++) html += '<span class="star' + (i <= fill ? ' on' : '') + '">★</span>';
    return html;
  }

  function countText(row) {
    if (!row || !row.votes) return 'No ratings yet';
    var avg = Number(row.average || 0);
    var n = Number(row.votes || 0);
    return avg.toFixed(1) + ' · ' + n + (n === 1 ? ' rating' : ' ratings');
  }

  function paintSlots() {
    document.querySelectorAll('.star-slot[data-game]').forEach(function (el) {
      var row = summaryMap && summaryMap[el.getAttribute('data-game')];
      el.innerHTML = starsHTML(row && row.average) + '<span class="star-count">' + countText(row) + '</span>';
    });
    document.querySelectorAll('.star-num[data-game]').forEach(function (el) {
      var row = summaryMap && summaryMap[el.getAttribute('data-game')];
      el.textContent = row && row.votes ? Number(row.average).toFixed(1) : '—';
    });
  }

  function ensureSlots() {
    document.querySelectorAll('.game-card[data-game]').forEach(function (card) {
      if (card.querySelector('.star-slot')) return;
      var title = card.querySelector('.game-card-title');
      if (!title) return;
      var el = document.createElement('div');
      el.className = 'star-slot';
      el.setAttribute('data-game', card.getAttribute('data-game'));
      title.insertAdjacentElement('afterend', el);
    });
  }

  async function refresh() {
    ensureSlots();
    if (!sb) return;
    var res = await sb.rpc('syllog_rating_summary');
    summaryMap = {};
    if (!res.error && res.data) {
      res.data.forEach(function (r) { summaryMap[r.game_id] = r; });
    }
    mineMap = {};
    var session = await sb.auth.getSession();
    userId = session && session.data && session.data.session ? session.data.session.user.id : null;
    if (userId) {
      var mine = await sb.rpc('syllog_my_ratings');
      if (!mine.error && mine.data) mine.data.forEach(function (r) { mineMap[r.game_id] = r.stars; });
    }
    paintSlots();
    var rateBox = document.getElementById('gd-rate');
    if (rateBox && rateBox.getAttribute('data-game')) paintRater(rateBox, rateBox.getAttribute('data-game'));
    if (document.getElementById('extra-boards')) paintBoards();
    settle();
  }

  function paintRater(box, gameId) {
    if (!box) return;
    box.setAttribute('data-game', gameId);
    var row = summaryMap && summaryMap[gameId];
    var mine = mineMap[gameId] || 0;
    var buttons = '';
    for (var i = 1; i <= 5; i++) {
      buttons += '<button type="button" data-star="' + i + '" class="' + (i <= mine ? 'on' : '') + '" aria-label="' + i + ' star">' + (i <= mine ? '★' : '☆') + '</button>';
    }
    box.innerHTML =
      '<div class="star-row rate">' + buttons + '</div>' +
      '<div class="star-count">' + countText(row) + (userId ? (mine ? ' · Your rating is ' + mine : ' · Tap a star to rate') : ' · Sign in to rate') + '</div>';
    box.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        rate(gameId, Number(btn.getAttribute('data-star')), box);
      });
    });
  }

  async function rate(gameId, stars, box) {
    if (!sb) return;
    if (!userId) {
      window.location.href = 'auth.html?tab=signin';
      return;
    }
    var res = await sb.rpc('syllog_rate_game', { p_game: gameId, p_stars: stars });
    if (res.error) return;
    await refresh();
    paintRater(box, gameId);
  }

  function money(n) {
    return '$' + Number(n || 0).toLocaleString();
  }

  async function standings(gameId) {
    if (!sb) return null;
    var res = await sb.from('syllog_month_scores')
      .select('score, updated_at, players(username, avatar_url, pass_tier)')
      .eq('game_id', gameId)
      .eq('month_key', monthKey())
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(10);
    if (res.error) return null;
    return res.data || [];
  }

  function scoreText(game, n) {
    return game.money ? money(n) : Number(n || 0).toLocaleString();
  }

  function paintBoards() {
    var host = document.getElementById('extra-boards');
    if (!host) return;
    var games = GAMES.filter(function (g) { return !g.featured; });
    host.innerHTML = games.map(function (g) {
      return '<div class="section-eyebrow">Monthly Competition</div>' +
        '<div class="section-title">' + g.name + ' <span>&middot; Championship</span></div>' +
        '<p class="board-rule">' + g.rule + ' The month ends at 00:00 UTC.</p>' +
        '<div class="prize-row">' +
          '<div class="prize-chip"><span class="prize-chip-val">2,000 SC</span><span class="prize-chip-lbl">1st</span></div>' +
          '<div class="prize-chip"><span class="prize-chip-val">1,000 SC</span><span class="prize-chip-lbl">2nd</span></div>' +
          '<div class="prize-chip"><span class="prize-chip-val">500 SC</span><span class="prize-chip-lbl">3rd</span></div>' +
          '<a class="fc-play" href="' + g.play + '" style="text-decoration:none;">Play Now — Free</a>' +
        '</div>' +
        '<div class="standings-grid" id="board-' + g.id + '" style="margin-top:1.25rem;"><div class="standings-empty">Loading standings...</div></div>';
    }).join('');
    games.forEach(function (g) { fillBoard(g); });
  }

  async function fillBoard(game) {
    var grid = document.getElementById('board-' + game.id);
    var rows = await standings(game.id);
    if (!grid) return;
    if (rows === null) {
      grid.innerHTML = '<div class="standings-empty">This board is opening. Signed-in scores will land here.</div>';
      return;
    }
    rows = rows.filter(function (r) { return (r.score || 0) > 0; });
    var champ = document.getElementById(game.id + '-champion');
    if (!rows.length) {
      grid.innerHTML = '<div class="standings-empty">No scores yet this month. Sign in and play.</div>';
      if (champ) champ.innerHTML = '<div class="champion-empty">No score yet</div>';
      return;
    }
    var html = '';
    rows.forEach(function (r, i) {
      var name = esc((r.players && r.players.username) || 'Player');
      var rank = i + 1;
      var prize = rank <= 3 ? '<div class="st-prize"><span class="st-prize-val">' + PRIZES[i].toLocaleString() + '</span><span class="st-prize-lbl"> SC</span></div>' : '<div class="st-no-prize">&mdash;</div>';
      html += '<div class="standing-row"><div class="st-rank">' + rank + '</div><div class="st-player"><div><div class="st-name">' + name + '</div></div></div><div><div class="st-score">' + scoreText(game, r.score) + '</div></div>' + prize + '</div>';
    });
    grid.innerHTML = html;
    if (champ) {
      var top = rows[0];
      var name = esc((top.players && top.players.username) || 'Player');
      champ.innerHTML = '<div class="champion-info"><div class="champion-crown">Champion</div><div class="champion-name">' + name + '</div><div class="champion-score">' + scoreText(game, top.score) + '</div></div>';
    }
  }

  async function settle() {
    if (!sb) return;
    try { await sb.rpc('syllog_settle_months'); } catch (e) {}
  }

  window.SyllogBoards = {
    games: GAMES,
    monthKey: monthKey,
    refresh: refresh,
    paintRater: paintRater,
    standings: standings,
    paintBoards: paintBoards,
    settle: settle,
    game: function (id) { return GAMES.filter(function (g) { return g.id === id; })[0] || null; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
