/**
 * Syllog ecosystem inventory catalog.
 * Profile Inventory renders EVERY owned id automatically.
 *
 * Game purchases are stored on the player as "code:itemId" in unlocked_items.
 * Example: vr:cb_noir is the Noir Card Back from Vegas Reckoning.
 * Add a game by adding one entry to CODES (name, page, art pattern).
 * Item pictures use CODES[code].art with {id} swapped in, unless that item sets art.
 * An item that is not listed yet still shows under its game, with a readable name.
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

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * One entry per game. The code is the prefix before the colon in unlocked_items.
   * art: "{id}" is replaced with the item id. Upload SHOP/{id}.png and it shows
   * even before the item is named in this list.
   */
  var CODES = {
    vr: {
      name: 'Vegas Reckoning',
      href: 'Vegasreckoning.html',
      art: 'https://syllog-cdn.b-cdn.net/Vegas-Reckoning/SHOP/{id}.png',
      items: {
        suit_silver: { name: 'Silver Mogul Suit', type: 'Suit', icon: '🥈', art: 'https://syllog-cdn.b-cdn.net/Vegas-Reckoning/Pictures%20%26%20Scenes/maddox-silver.png', artPos: 'center 16%' },
        suit_black: { name: 'Midnight Phantom Suit', type: 'Suit', icon: '🖤', art: 'https://syllog-cdn.b-cdn.net/Vegas-Reckoning/Pictures%20%26%20Scenes/maddox-phantom.png', artPos: 'center 16%' },
        suit_gold: { name: 'Gold Emperor Suit', type: 'Suit', icon: '👑', art: 'https://syllog-cdn.b-cdn.net/Vegas-Reckoning/Pictures%20%26%20Scenes/maddox-gold.png', artPos: 'center 16%' },
        cb_noir: { name: 'Noir Card Back', type: 'Card Back', icon: '🃏', artPos: 'center 42%' },
        cb_gold: { name: 'Gold Foil Card Back', type: 'Card Back', icon: '✨', artPos: 'center 42%' },
        cb_obsidian: { name: 'Obsidian Card Back', type: 'Card Back', icon: '⬛', artPos: 'center 42%' },
        table_crimson: { name: 'Crimson Table Felt', type: 'Table Felt', icon: '🔴' },
        table_midnight: { name: 'Midnight Blue Felt', type: 'Table Felt', icon: '🔵' },
        title_shark: { name: 'The Shark', type: 'Title', icon: '🦈' },
        title_ghost: { name: 'The Ghost', type: 'Title', icon: '👻' },
        title_phantom: { name: 'The Phantom', type: 'Title', icon: '🎭' },
        boost_insurance: { name: 'Table Insurance', type: 'Boost', icon: '🛡️' },
        boost_lucky: { name: 'Lucky Streak Token', type: 'Boost', icon: '🍀' },
        boost_startchips: { name: 'High Roller Starter Pack', type: 'Boost', icon: '💰' },
        boost_stake: { name: 'Cold Night Stake', type: 'Boost', icon: '💵' },
        boost_lounge: { name: 'Lounge Stake', type: 'Boost', icon: '💴' },
        boost_double: { name: 'Double Down Charm', type: 'Boost', icon: '⚡' },
        boost_rep: { name: 'Reputation Surge', type: 'Boost', icon: '⭐' },
        boost_reveal: { name: 'Dealer Tell', type: 'Boost', icon: '👁️' },
        boost_noads: { name: 'Ad Removal', type: 'Access', icon: '🚫' },
        dlc_vivienne: { name: 'The Vivienne Files', type: 'Story', icon: '💍' },
        dlc_chen: { name: "Chen's Gambit", type: 'Story', icon: '📁' },
        dlc_penthouse: { name: 'Penthouse Invitation', type: 'Story', icon: '🌟' },
        dlc_marchetti: { name: "Marchetti's Dossier", type: 'Story', icon: '🖤' }
      }
    }
  };

  function artFor(game, itemId, item) {
    if (item && item.art) return item.art;
    if (game && game.art) return game.art.replace('{id}', encodeURIComponent(itemId));
    return '';
  }

  function describeUnlock(id) {
    var s = String(id || '');
    var cut = s.indexOf(':');
    if (cut > 0) {
      var code = s.slice(0, cut).toLowerCase();
      var itemId = s.slice(cut + 1);
      var game = CODES[code] || null;
      var item = game && game.items ? game.items[itemId] : null;
      return {
        id: s,
        code: code,
        itemId: itemId,
        knownGame: !!game,
        gameName: game ? game.name : titleize(code),
        href: game ? game.href : '',
        name: item ? item.name : titleize(itemId),
        type: item ? item.type : 'Item',
        icon: item && item.icon ? item.icon : '✦',
        art: artFor(game, itemId, item),
        artPos: (item && item.artPos) || 'center 32%',
        showGame: true
      };
    }
    var uni = UNIVERSE[s];
    if (uni) {
      return {
        id: s,
        code: '',
        gameName: 'Syllog Universe',
        href: 'universe.html',
        name: uni.name,
        type: uni.type || 'Unlock',
        icon: uni.icon || '✦',
        art: uni.art || '',
        artPos: uni.artPos || 'center 32%',
        showGame: true
      };
    }
    return {
      id: s,
      code: '',
      gameName: 'Syllog Universe',
      href: 'universe.html',
      name: titleize(s),
      type: 'Unlock',
      icon: '✦',
      art: '',
      showGame: true
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
    } else if (meta.art) {
      icon =
        '<img class="inv-art" src="' + esc(meta.art) + '" alt="" referrerpolicy="no-referrer" style="object-position:' + esc(meta.artPos || 'center 32%') + '" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'flex\'">' +
        '<div class="inv-emoji" style="display:none">' + (meta.icon || '✦') + '</div>';
    } else {
      icon = '<div class="inv-emoji">' + (meta.icon || '📦') + '</div>';
    }
    var typeLine = meta.type || 'Item';
    if (!meta.showGame && meta.gameName) typeLine += ' · ' + meta.gameName;
    var gameLine = meta.showGame && meta.gameName
      ? '<div class="inv-card-game">' + esc(meta.gameName) + '</div>'
      : '';
    return (
      '<div class="inv-card' + (eq ? ' equipped' : '') + (meta.art ? ' has-art' : '') + '" data-item-id="' + esc(meta.id) + '">' +
      (eq ? '<div class="inv-equipped">Equipped</div>' : '') +
      '<div class="inv-card-icon">' + icon + '</div>' +
      '<div class="inv-card-name">' + esc(meta.name) + '</div>' +
      '<div class="inv-card-type">' + esc(typeLine) + '</div>' +
      gameLine +
      '</div>'
    );
  }

  function unlockSections(player) {
    var owned = collectOwned(player);
    var groups = [];
    var byCode = {};
    var universe = [];
    owned.unlocks.forEach(function (id) {
      var meta = describeUnlock(id);
      if (meta.code) {
        if (!byCode[meta.code]) {
          byCode[meta.code] = { code: meta.code, name: meta.gameName, href: meta.href, items: [] };
          groups.push(byCode[meta.code]);
        }
        byCode[meta.code].items.push(meta);
      } else {
        universe.push(meta);
      }
    });
    groups.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (universe.length) {
      groups.push({ code: '', name: 'Syllog Universe', href: 'universe.html', items: universe });
    }
    return groups;
  }

  function unlockHTML(player) {
    var groups = unlockSections(player);
    if (!groups.length) return '';
    return groups.map(function (g) {
      var cards = g.items.map(function (meta) { return cardHTML(meta); }).join('');
      var title = g.href
        ? '<a class="inv-game-link" href="' + esc(g.href) + '">' + esc(g.name) + '</a>'
        : esc(g.name);
      return (
        '<div class="inv-section" data-game="' + esc(g.code || 'universe') + '">' +
        '<div class="inv-section-hdr">' + title + '<span class="inv-count">' + g.items.length + '</span></div>' +
        '<div class="inv-grid">' + cards + '</div></div>'
      );
    }).join('');
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

    var bought = unlockHTML(player);
    if (bought) {
      html += bought;
      unlockSections(player).forEach(function (g) { total += g.items.length; });
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
    CODES: CODES,
    parseList: parseList,
    uniq: uniq,
    norm: norm,
    collectOwned: collectOwned,
    lookup: lookup,
    describeUnlock: describeUnlock,
    unlockHTML: unlockHTML,
    render: render,
    registerGame: function (game) {
      if (!game || !game.id) return;
      GAMES = GAMES.filter(function (g) { return g.id !== game.id; }).concat([game]);
    },
    registerCode: function (code, game) {
      if (!code || !game) return;
      CODES[String(code).toLowerCase()] = game;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
