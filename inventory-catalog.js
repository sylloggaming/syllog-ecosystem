/**
 * Syllog ecosystem inventory catalog.
 * Profile Inventory renders EVERY owned id automatically.
 * Add new games/items here — unknown ids still appear as generic cards.
 */
(function (global) {
  function titleize(id) {
    return String(id || 'item')
      .replace(/^skin_/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function parseList(v, fb) {
    if (Array.isArray(v)) return v.slice();
    if (v == null || v === '') return (fb || []).slice();
    try {
      var a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) ? a : (fb || []).slice();
    } catch (e) {
      return (fb || []).slice();
    }
  }

  function uniq(arr) {
    var out = [];
    var seen = {};
    (arr || []).forEach(function (x) {
      if (x == null || x === '') return;
      var k = String(x);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(k);
    });
    return out;
  }

  var ALIAS = {
    ship: { nova: 'interceptor', dread: 'destroyer', void_fighter: 'default' },
    skin: {
      skin_aurora: 'skin_gold',
      skin_inferno: 'skin_crimson',
      skin_nebula: 'skin_void',
      skin_celestial: 'skin_wraith'
    }
  };

  function norm(kind, id) {
    if (!id) return id;
    var map = ALIAS[kind] || {};
    return map[id] || id;
  }

  /**
   * games[].sections[].items[id] = { name, type, icon?, preview? }
   * preview: 'ship' uses SyllogShipPreview when available
   */
  var GAMES = [
    {
      id: 'void_vexon',
      name: 'Void Vexon',
      sections: [
        {
          id: 'ships',
          label: 'Ships',
          source: 'owned_ships',
          kind: 'ship',
          alwaysInclude: ['default'],
          items: {
            default: { name: 'Void Fighter', type: 'Ship', preview: 'ship' },
            interceptor: { name: 'Nova Interceptor', type: 'Ship', preview: 'ship' },
            destroyer: { name: 'Dread Destroyer', type: 'Ship', preview: 'ship' },
            phantom: { name: 'Phantom Elite', type: 'Ship', preview: 'ship' }
          }
        },
        {
          id: 'skins',
          label: 'Skins',
          source: 'owned_skins',
          kind: 'skin',
          items: {
            skin_gold: { name: 'Aurora', type: 'Skin', preview: 'ship', skin: 'skin_gold' },
            skin_crimson: { name: 'Inferno', type: 'Skin', preview: 'ship', skin: 'skin_crimson' },
            skin_void: { name: 'Nebula', type: 'Skin', preview: 'ship', skin: 'skin_void' },
            skin_wraith: { name: 'Celestial Wraith', type: 'Skin', preview: 'ship', skin: 'skin_wraith' }
          }
        },
        {
          id: 'items',
          label: 'Items',
          source: 'owned_items',
          kind: 'item',
          items: {
            ad_remove: { name: 'Remove Ads', type: 'Access', icon: '🚫' },
            xp_boost: { name: 'XP Booster', type: 'Boost', icon: '⚡' }
          }
        }
      ]
    }
  ];

  var UNIVERSE = {
    deep_lore: { name: 'Deep Lore Archive', type: 'Lore', icon: '🔒' },
    comic_vr_001: { name: 'Void Vexon: Issue #1', type: 'Comic', icon: '📖' },
    comic_vr_002: { name: 'Void Vexon: Issue #2', type: 'Comic', icon: '📖' },
    music_vr_ost1: { name: 'Void Vexon OST Vol.1', type: 'Music', icon: '🎵' },
    book_vr_bible: { name: 'The Void Bible', type: 'Book', icon: '📚' }
  };

  function lookup(kind, id) {
    id = norm(kind, id);
    for (var g = 0; g < GAMES.length; g++) {
      var game = GAMES[g];
      for (var s = 0; s < game.sections.length; s++) {
        var sec = game.sections[s];
        if (sec.kind === kind && sec.items[id]) {
          return Object.assign({ id: id, game: game.id, gameName: game.name, section: sec.id }, sec.items[id]);
        }
      }
    }
    return null;
  }

  function collectOwned(player) {
    var ships = uniq(parseList(player.owned_ships, ['default']).map(function (id) { return norm('ship', id); }));
    if (ships.indexOf('default') === -1) ships.unshift('default');

    var skins = uniq(parseList(player.owned_skins, []).map(function (id) { return norm('skin', id); }));

    var items = uniq(parseList(player.owned_items, []));
    // Legacy / local flags that may appear on row later
    if (player.ads_removed || player.adsRemoved) items = uniq(items.concat(['ad_remove']));

    var unlocks = uniq(parseList(player.unlocked_items, []));

    return {
      ships: ships,
      skins: skins,
      items: items,
      unlocks: unlocks,
      equippedShip: norm('ship', player.equipped_ship || 'default'),
      equippedSkin: norm('skin', player.equipped_skin || '')
    };
  }

  function cardHTML(meta, opts) {
    opts = opts || {};
    var eq = !!opts.equipped;
    var icon = '';
    if (meta.preview === 'ship' && global.SyllogShipPreview) {
      var shipId = meta.skin ? (opts.shipForSkin || opts.equippedShip || 'default') : meta.id;
      var skinId = meta.skin || (opts.useEquippedSkin ? opts.equippedSkin : '') || '';
      icon =
        '<canvas class="ship-preview-canvas" data-ship="' + shipId + '" data-skin="' + skinId +
        '" width="72" height="72"></canvas>';
    } else {
      icon = '<div class="inv-emoji">' + (meta.icon || '📦') + '</div>';
    }
    return (
      '<div class="inv-card' + (eq ? ' equipped' : '') + '" data-item-id="' + meta.id + '">' +
      (eq ? '<div class="inv-equipped">Equipped</div>' : '') +
      '<div class="inv-card-icon">' + icon + '</div>' +
      '<div class="inv-card-name">' + meta.name + '</div>' +
      '<div class="inv-card-type">' + (meta.type || 'Item') + (meta.gameName ? ' · ' + meta.gameName : '') + '</div>' +
      '</div>'
    );
  }

  function unknownMeta(id, type, gameName) {
    return { id: id, name: titleize(id), type: type || 'Item', icon: '✨', gameName: gameName || '' };
  }

  /**
   * Build full inventory DOM into containers.
   * containers: { root, summary }
   */
  function render(player, containers) {
    var owned = collectOwned(player);
    var root = containers.root;
    if (!root) return owned;

    var html = '';
    var total = 0;

    GAMES.forEach(function (game) {
      game.sections.forEach(function (sec) {
        var list =
          sec.source === 'owned_ships' ? owned.ships :
          sec.source === 'owned_skins' ? owned.skins :
          sec.source === 'owned_items' ? owned.items :
          [];

        // Always-include defaults (e.g. starter ship)
        (sec.alwaysInclude || []).forEach(function (id) {
          id = norm(sec.kind, id);
          if (list.indexOf(id) === -1) list.push(id);
        });

        // Show every owned id for this source — known or unknown
        var cards = '';
        list.forEach(function (id) {
          // Only put skin_* into skins section, ships into ships, etc.
          if (sec.kind === 'skin' && id.indexOf('skin_') !== 0) return;
          if (sec.kind === 'ship' && id.indexOf('skin_') === 0) return;
          if (sec.kind === 'item' && (id.indexOf('skin_') === 0 || sec.items && !sec.items[id] && lookup('ship', id))) return;

          var meta = sec.items[id]
            ? Object.assign({ id: id, gameName: game.name }, sec.items[id])
            : unknownMeta(id, sec.label.replace(/s$/, ''), game.name);

          var equipped = false;
          if (sec.kind === 'ship') equipped = owned.equippedShip === id;
          if (sec.kind === 'skin') equipped = owned.equippedSkin === id;

          cards += cardHTML(meta, {
            equipped: equipped,
            equippedShip: owned.equippedShip,
            equippedSkin: owned.equippedSkin,
            shipForSkin: owned.equippedShip,
            useEquippedSkin: sec.kind === 'ship' && equipped
          });
          total++;
        });

        if (!cards && sec.kind !== 'item') {
          cards = '<div class="inv-empty">No ' + sec.label.toLowerCase() + ' yet</div>';
        }
        if (!cards) return; // hide empty optional sections (items)

        html +=
          '<div class="inv-section" data-game="' + game.id + '" data-section="' + sec.id + '">' +
          '<div class="inv-section-hdr">' + sec.label + ' — ' + game.name + '</div>' +
          '<div class="inv-grid">' + cards + '</div></div>';
      });
    });

    // Orphan owned ids that no game section claimed (future games before catalog update)
    var claimed = {};
    GAMES.forEach(function (game) {
      game.sections.forEach(function (sec) {
        Object.keys(sec.items || {}).forEach(function (id) { claimed[id] = 1; });
        (sec.alwaysInclude || []).forEach(function (id) { claimed[norm(sec.kind, id)] = 1; });
      });
    });
    var orphans = uniq([].concat(owned.ships, owned.skins, owned.items)).filter(function (id) {
      if (id === 'default') return false;
      return !claimed[id] && !lookup('ship', id) && !lookup('skin', id) && !lookup('item', id);
    });
    if (orphans.length) {
      var oc = '';
      orphans.forEach(function (id) {
        oc += cardHTML(unknownMeta(id, 'Unlock', 'Syllog'));
        total++;
      });
      html +=
        '<div class="inv-section"><div class="inv-section-hdr">Other Unlocks</div>' +
        '<div class="inv-grid">' + oc + '</div></div>';
    }

    // Universe content also listed in Inventory for one bag view
    if (owned.unlocks.length) {
      var uc = '';
      owned.unlocks.forEach(function (id) {
        var meta = UNIVERSE[id]
          ? Object.assign({ id: id, gameName: 'Universe' }, UNIVERSE[id])
          : unknownMeta(id, 'Universe', 'Universe');
        uc += cardHTML(meta);
        total++;
      });
      html +=
        '<div class="inv-section"><div class="inv-section-hdr">Universe Content</div>' +
        '<div class="inv-grid">' + uc + '</div></div>';
    }

    if (!html) {
      html = '<div class="inv-empty">Your inventory is empty — play games and unlock gear to fill it.</div>';
    } else {
      html =
        '<div class="inv-auto-note">Inventory updates automatically when you unlock or buy anything while signed in.</div>' +
        html;
    }

    root.innerHTML = html;
    if (global.SyllogShipPreview) global.SyllogShipPreview.hydrate(root);
    if (containers.summary) containers.summary.textContent = total + ' item' + (total === 1 ? '' : 's');
    return owned;
  }

  global.SyllogInventory = {
    GAMES: GAMES,
    UNIVERSE: UNIVERSE,
    parseList: parseList,
    uniq: uniq,
    norm: norm,
    collectOwned: collectOwned,
    lookup: lookup,
    render: render,
    registerGame: function (game) {
      if (!game || !game.id) return;
      GAMES = GAMES.filter(function (g) { return g.id !== game.id; }).concat([game]);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
