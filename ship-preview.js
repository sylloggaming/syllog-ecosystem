/**
 * Lightweight Void Vexon ship previews for Syllog profile / dashboards.
 * IDs match the game: default | interceptor | destroyer | phantom
 */
(function (global) {
  var ALIAS = { nova: 'interceptor', dread: 'destroyer', void_fighter: 'default' };
  var INFO = {
    default: { name: 'Void Fighter', color: '#44aaff', glow: 'rgba(68,170,255,.55)', hue: 212 },
    interceptor: { name: 'Nova Interceptor', color: '#f97316', glow: 'rgba(249,115,22,.6)', hue: 24 },
    destroyer: { name: 'Dread Destroyer', color: '#ef4444', glow: 'rgba(220,38,38,.55)', hue: 0 },
    phantom: { name: 'Phantom Elite', color: '#fbbf24', glow: 'rgba(251,191,36,.65)', hue: 45 }
  };
  var SKIN_MAP = {
    skin_aurora: 'skin_gold', skin_gold: 'skin_gold',
    skin_inferno: 'skin_crimson', skin_crimson: 'skin_crimson',
    skin_nebula: 'skin_void', skin_void: 'skin_void',
    skin_celestial: 'skin_wraith', skin_wraith: 'skin_wraith'
  };
  var SKIN_TINT = {
    skin_gold: [255, 220, 80],
    skin_crimson: [255, 80, 30],
    skin_void: [160, 80, 255],
    skin_wraith: [0, 255, 220]
  };

  function normShip(id) {
    id = (id || 'default').toLowerCase();
    return ALIAS[id] || (INFO[id] ? id : 'default');
  }
  function normSkin(id) {
    if (!id) return null;
    return SKIN_MAP[id] || (SKIN_TINT[id] ? id : null);
  }
  function shipName(id) {
    return (INFO[normShip(id)] || INFO.default).name;
  }

  function hsl(h, s, l, a) {
    return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')';
  }

  function drawShip(ctx, cx, cy, scale, shipId, skinId, t) {
    var id = normShip(shipId);
    var info = INFO[id];
    var skin = normSkin(skinId);
    var tint = skin ? SKIN_TINT[skin] : null;
    var bank = Math.sin((t || 0) * 0.0018) * 0.18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(bank);
    ctx.scale(scale, scale);

    // engine glow
    var g = ctx.createRadialGradient(0, 22, 2, 0, 28, 28);
    g.addColorStop(0, info.color);
    g.addColorStop(0.35, info.glow);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 26, 14, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    function paint(baseH, s, l) {
      if (tint) {
        var mix = 0.55;
        var r = Math.round(tint[0] * mix + ((baseH === info.hue) ? 80 : 40) * (1 - mix));
        var gg = Math.round(tint[1] * mix + 90 * (1 - mix));
        var b = Math.round(tint[2] * mix + 140 * (1 - mix));
        var k = l / 70;
        return 'rgb(' + Math.min(255, r * k + 20) + ',' + Math.min(255, gg * k + 20) + ',' + Math.min(255, b * k + 30) + ')';
      }
      return hsl(baseH, s, l);
    }

    // wings
    ctx.beginPath();
    if (id === 'destroyer') {
      ctx.moveTo(-6, -6); ctx.lineTo(-38, 10); ctx.lineTo(-34, 22); ctx.lineTo(-8, 16); ctx.closePath();
      ctx.moveTo(6, -6); ctx.lineTo(38, 10); ctx.lineTo(34, 22); ctx.lineTo(8, 16); ctx.closePath();
    } else if (id === 'interceptor') {
      ctx.moveTo(-5, -10); ctx.lineTo(-34, 4); ctx.lineTo(-28, 16); ctx.lineTo(-7, 10); ctx.closePath();
      ctx.moveTo(5, -10); ctx.lineTo(34, 4); ctx.lineTo(28, 16); ctx.lineTo(7, 10); ctx.closePath();
    } else if (id === 'phantom') {
      ctx.moveTo(-5, -8); ctx.lineTo(-36, 0); ctx.lineTo(-30, 14); ctx.lineTo(-8, 12); ctx.closePath();
      ctx.moveTo(5, -8); ctx.lineTo(36, 0); ctx.lineTo(30, 14); ctx.lineTo(8, 12); ctx.closePath();
    } else {
      ctx.moveTo(-6, -4); ctx.lineTo(-32, 8); ctx.lineTo(-28, 18); ctx.lineTo(-8, 14); ctx.closePath();
      ctx.moveTo(6, -4); ctx.lineTo(32, 8); ctx.lineTo(28, 18); ctx.lineTo(8, 14); ctx.closePath();
    }
    ctx.fillStyle = paint(info.hue, 55, 38);
    ctx.fill();
    ctx.strokeStyle = paint(info.hue, 50, 62);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // fuselage
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(9, -22);
    ctx.lineTo(11, 14);
    ctx.lineTo(0, 20);
    ctx.lineTo(-11, 14);
    ctx.lineTo(-9, -22);
    ctx.closePath();
    var body = ctx.createLinearGradient(-12, -34, 12, 20);
    body.addColorStop(0, paint(info.hue, 60, 72));
    body.addColorStop(0.45, paint(info.hue, 55, 48));
    body.addColorStop(1, paint(info.hue, 50, 28));
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // canopy
    ctx.beginPath();
    ctx.ellipse(0, -12, 5, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = id === 'phantom' ? 'rgba(255,240,180,0.85)' : 'rgba(180,230,255,0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();

    // nose highlight
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.lineTo(4, -26);
    ctx.lineTo(0, -24);
    ctx.lineTo(-4, -26);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    // engine pods
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = paint(info.hue, 45, 30);
      ctx.fillRect(s * 12 - 3, 6, 6, 14);
      ctx.fillStyle = info.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(s * 12, 22, 3.2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // phantom gold trim
    if (id === 'phantom') {
      ctx.strokeStyle = 'rgba(251,191,36,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(0, 12);
      ctx.stroke();
    }

    ctx.restore();
  }

  function paintCanvas(canvas, shipId, skinId, opts) {
    if (!canvas) return;
    opts = opts || {};
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var css = opts.size || Math.min(canvas.clientWidth || canvas.width || 120, canvas.clientHeight || canvas.height || 120) || 120;
    if (!canvas.clientWidth && opts.size) {
      canvas.style.width = opts.size + 'px';
      canvas.style.height = opts.size + 'px';
    }
    var w = canvas.clientWidth || opts.size || 120;
    var h = canvas.clientHeight || opts.size || 120;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // soft plate
    var bg = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.55);
    bg.addColorStop(0, 'rgba(255,255,255,0.06)');
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    var scale = (Math.min(w, h) / 90) * (opts.scale || 1);
    drawShip(ctx, w / 2, h / 2 + 2, scale, shipId, skinId, opts.t || performance.now());
  }

  function avatarHTML(shipId, skinId, size) {
    size = size || 120;
    var id = 'sp-' + Math.random().toString(36).slice(2, 9);
    return (
      '<canvas class="ship-preview-canvas" id="' + id + '" width="' + size + '" height="' + size + '" ' +
      'data-ship="' + normShip(shipId) + '" data-skin="' + (normSkin(skinId) || '') + '" ' +
      'style="width:' + size + 'px;height:' + size + 'px;display:block;"></canvas>'
    );
  }

  function hydrate(root) {
    (root || document).querySelectorAll('canvas.ship-preview-canvas[data-ship],canvas[data-ship-preview]').forEach(function (c) {
      paintCanvas(c, c.getAttribute('data-ship') || c.getAttribute('data-ship-preview'), c.getAttribute('data-skin') || '', {
        size: c.clientWidth || 96,
        scale: parseFloat(c.getAttribute('data-scale') || '1') || 1
      });
    });
  }

  function startIdleSpin(canvas, shipId, skinId) {
    if (!canvas) return function () {};
    var alive = true;
    function frame(t) {
      if (!alive) return;
      paintCanvas(canvas, shipId, skinId, { t: t, scale: 1.05 });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return function () { alive = false; };
  }

  global.SyllogShipPreview = {
    INFO: INFO,
    ALIAS: ALIAS,
    normShip: normShip,
    normSkin: normSkin,
    shipName: shipName,
    paintCanvas: paintCanvas,
    avatarHTML: avatarHTML,
    hydrate: hydrate,
    startIdleSpin: startIdleSpin,
    drawShip: drawShip
  };
})(typeof window !== 'undefined' ? window : globalThis);
