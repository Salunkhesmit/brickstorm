(function (BB) {
  'use strict';
  var C = BB.CONFIG;
  var clamp = BB.Utils.clamp;
  var HEAD_FONT = '"Space Grotesk", system-ui, sans-serif';
  var MONO_FONT = '"Space Mono", ui-monospace, Menlo, Consolas, monospace';

  /* small helpers */
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function chamferPath(ctx, x, y, w, h, c) {
    ctx.beginPath();
    ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c); ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath();
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  /* Mix a hex colour toward white (t>0) or black (t<0). */
  function shade(hex, t) {
    var c = hexToRgb(hex), target = t > 0 ? 255 : 0, a = Math.abs(t);
    return 'rgb(' + c.map(function (v) { return Math.round(v + (target - v) * a); }).join(',') + ')';
  }
  function rgba(hex, a) { var c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function pseudo(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  /* renderer */
  BB.Renderer = function Renderer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = opts.width || C.canvas.width;
    this.H = opts.height || C.canvas.height;
    this.fx = opts.fx || null;
    this.sx = 1;
    this.sy = 1;

    // a fixed field of stars for the "Deep Nebula" theme
    var r = pseudo(7);
    this.stars = [];
    for (var i = 0; i < 46; i++) this.stars.push([r() * this.W, r() * this.H, 0.6 + r() * 1.2, r() * 6.28]);

    var self = this;
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas);
    window.addEventListener('resize', function () { self.resize(); });
  };

  /* Match the canvas bitmap to its on-screen size */
  BB.Renderer.prototype.resize = function () {
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;                       // hidden
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.sx = pw / this.W;
    this.sy = ph / this.H;
  };

  BB.Renderer.prototype.draw = function (game) {
    var ctx = this.ctx, S = BB.Settings, fx = this.fx;
    var theme = BB.THEMES[S.get('theme')], acc = S.accentHex();
    var q = S.particleLevel(), time = performance.now() / 1000;
    var slowed = game.effects.slow > 0, expanded = game.effects.expand > 0;

    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    this._background(ctx, theme, acc, time);

    ctx.save();
    if (fx && (fx.sx || fx.sy)) ctx.translate(fx.sx, fx.sy);
    var style = S.get('brick'), i;
    for (i = 0; i < game.bricks.length; i++) this._brick(ctx, game.bricks[i], style, time, q);
    if (fx) this._ghosts(ctx, fx.ghosts);
    this._capsules(ctx, game.capsules);
    if (fx) this._rings(ctx, fx.rings);
    for (i = 0; i < game.balls.length; i++) this._trail(ctx, game.balls[i], q, acc);
    this._paddle(ctx, game.paddle, expanded, time, acc);
    for (i = 0; i < game.balls.length; i++) this._ball(ctx, game.balls[i], slowed, time, acc);
    if (fx) { this._particles(ctx, fx.parts); this._texts(ctx, fx.texts); }
    ctx.restore();

    if (fx && fx.flash) {
      ctx.globalAlpha = fx.flash.alpha * (1 - fx.flash.t / fx.flash.dur);
      ctx.fillStyle = fx.flash.color;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }
    this._effectPills(ctx, game.effects);
    this._banner(ctx, game.banner, acc);
    this._countdown(ctx, game, acc);
  };

  /* background / themes */
  BB.Renderer.prototype._background = function (ctx, theme, acc, time) {
    var W = this.W, H = this.H, rgb = hexToRgb(acc);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, W, H);

    if (theme.glowA > 0) {
      var g = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, H * 0.7);
      g.addColorStop(0, 'rgba(' + rgb.join(',') + ',' + theme.glowA + ')');
      g.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (theme.glow2) {
      var g2 = ctx.createRadialGradient(W * 0.85, H * 0.95, 0, W * 0.85, H * 0.95, H * 0.65);
      g2.addColorStop(0, 'rgba(' + theme.glow2.join(',') + ',0.16)');
      g2.addColorStop(1, 'rgba(' + theme.glow2.join(',') + ',0)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    }
    if (theme.grid) {                                   // "Vector 1984" grid
      ctx.strokeStyle = 'rgba(' + rgb.join(',') + ',0.09)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = 0; x <= W; x += 30) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (var y = 0; y <= H; y += 30) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
    }
    if (theme.stars) {
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.3 + s[3]));
        ctx.fillRect(s[0], s[1], s[2], s[2]);
      }
      ctx.globalAlpha = 1;
    }
  };

  /* bricks */
  BB.Renderer.prototype._brick = function (ctx, b, style, time, q) {
    if (!b.alive) return;
    var intro = C.effects.brickIntro;
    var s = q === 0 ? intro : b.spawn;
    if (s < 0) return;
    var k = s >= intro ? 1 : clamp(easeOutBack(s / intro), 0, 1.15);
    var alpha = s >= intro ? 1 : clamp(s / (intro * 0.5), 0, 1);

    var jx = b.hitT > 0 ? (Math.random() - 0.5) * 2.4 * b.hitT : 0;
    var x = b.x + jx, y = b.y - (1 - k) * 28, w = b.w, h = b.h;
    var base = b.solid ? '#475569' : b.color;

    ctx.globalAlpha = alpha;
    switch (style) {
      case 'retro':
        ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = shade(base, 0.4); ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y, 3, h);
        ctx.fillStyle = shade(base, -0.4); ctx.fillRect(x, y + h - 3, w, 3); ctx.fillRect(x + w - 3, y, 3, h);
        break;
      case 'hex':
        ctx.shadowColor = b.solid ? 'transparent' : base; ctx.shadowBlur = 8;
        chamferPath(ctx, x, y, w, h, 6);
        ctx.fillStyle = shade(base, -0.55); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = shade(base, 0.15); ctx.lineWidth = 1.6; ctx.stroke();
        chamferPath(ctx, x + 4, y + 4, w - 8, h - 8, 3);
        ctx.strokeStyle = rgba(base, 0.45);
        ctx.lineWidth = 1; ctx.stroke();
        break;
      case 'holo':
        ctx.shadowColor = b.solid ? 'transparent' : base; ctx.shadowBlur = 10;
        roundRectPath(ctx, x, y, w, h, 3);
        ctx.fillStyle = rgba(base, 0.2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(base, 0.95); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.save(); roundRectPath(ctx, x, y, w, h, 3); ctx.clip();
        ctx.fillStyle = rgba(base, 0.28);
        for (var ly = y + 2 + ((time * 14) % 3); ly < y + h; ly += 3) ctx.fillRect(x, ly, w, 1);
        ctx.restore();
        break;
      default:                                           // 'glass'
        ctx.shadowColor = b.solid ? 'transparent' : base;
        ctx.shadowBlur = b.solid ? 0 : 12;
        roundRectPath(ctx, x, y, w, h, 4);
        if (b.metal && !b.solid) {
          var mg = ctx.createLinearGradient(0, y, 0, y + h);
          mg.addColorStop(0, '#f1f5f9'); mg.addColorStop(0.5, b.color); mg.addColorStop(1, '#94a3b8');
          ctx.fillStyle = mg;
        } else ctx.fillStyle = base;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        roundRectPath(ctx, x + 1, y + 1, w - 2, h / 2 - 1, 3); ctx.fill();
    }
    ctx.shadowBlur = 0;

    this._brickDetails(ctx, b, x, y, w, h, time);

    if (b.hitT > 0) {
      ctx.globalAlpha = alpha * b.hitT * 0.55;
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, x, y, w, h, 3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /* Markings that are the same in every material: steel rivets, explosive core, gift star, cracks, hit pips */
  BB.Renderer.prototype._brickDetails = function (ctx, b, x, y, w, h, time) {
    var cx = x + w / 2, cy = y + h / 2, i;

    if (b.solid) {                                       // steel: hazard stripes + rivets
      ctx.save(); roundRectPath(ctx, x, y, w, h, 3); ctx.clip();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)'; ctx.lineWidth = 3;
      for (i = -h; i < w + h; i += 12) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)'; ctx.lineWidth = 1;
      roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 3); ctx.stroke();
      ctx.fillStyle = '#0f172a';
      [[5, 5], [w - 5, 5], [5, h - 5], [w - 5, h - 5]].forEach(function (p) { ctx.beginPath(); ctx.arc(x + p[0], y + p[1], 1.6, 0, 6.28); ctx.fill(); });
      return;
    }

    if (b.behavior === 'explode') {
      var pr = 4.2 + Math.sin(time * 7 + b.col) * 1.1;
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, 6.28); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(cx, cy, pr * 0.5, 0, 6.28); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 247, 237, 0.85)'; ctx.lineWidth = 1.2;
      for (i = 0; i < 8; i++) {
        var a = i * Math.PI / 4 + time * 1.5;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (pr + 1.5), cy + Math.sin(a) * (pr + 1.5));
        ctx.lineTo(cx + Math.cos(a) * (pr + 4.5), cy + Math.sin(a) * (pr + 4.5)); ctx.stroke();
      }
    } else if (b.behavior === 'gift') {
      var sp = 0.8 + 0.2 * Math.sin(time * 6 + b.col);
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      for (i = 0; i < 10; i++) {
        var rr = (i % 2 ? 2.8 : 6.4) * sp, ang = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (b.maxHp > 1) {
      for (i = 0; i < b.maxHp; i++) {
        var px = x + w - 8 - i * 7, py = y + h / 2 - 2.5;
        if (i < b.hp) { ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'; ctx.fillRect(px, py, 5, 5); }
        else { ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, 4, 4); }
      }
      if (b.hp < b.maxHp) this._cracks(ctx, b, x, y, w, h);
    }
  };

  BB.Renderer.prototype._cracks = function (ctx, b, x, y, w, h) {
    if (!b.cracks) {
      var r = pseudo(b.row * 17 + b.col * 5 + 3), list = [];
      for (var n = 0; n < b.maxHp - 1; n++) {
        var pts = [], px = 0.2 + r() * 0.6, py = r() < 0.5 ? 0 : 1;
        for (var s = 0; s < 5; s++) { pts.push([px, py]); px = clamp(px + (r() - 0.5) * 0.4, 0.05, 0.95); py = py < 0.5 ? py + 0.28 : py - 0.28; }
        list.push(pts);
      }
      b.cracks = list;
    }
    var dmg = b.maxHp - b.hp;
    for (var c = 0; c < Math.min(dmg, b.cracks.length); c++) {
      var pts2 = b.cracks[c];
      ctx.beginPath();
      for (var i = 0; i < pts2.length; i++) ctx[i ? 'lineTo' : 'moveTo'](x + pts2[i][0] * w, y + clamp(pts2[i][1], 0, 1) * h);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 0.7; ctx.stroke();
    }
  };

  /* effects */
  BB.Renderer.prototype._ghosts = function (ctx, ghosts) {
    for (var i = 0; i < ghosts.length; i++) {
      var g = ghosts[i];
      if (g.t < 0) continue;
      var k = g.t / g.dur, sc = 1 + 0.35 * k, w = g.w * sc, h = g.h * sc;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.fillStyle = g.color;
      roundRectPath(ctx, g.x - w / 2, g.y - h / 2, w, h, 4); ctx.fill();
      if (k < 0.3) { ctx.globalAlpha = (1 - k / 0.3) * 0.85; ctx.fillStyle = '#ffffff'; roundRectPath(ctx, g.x - w / 2, g.y - h / 2, w, h, 4); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };

  BB.Renderer.prototype._rings = function (ctx, rings) {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      if (r.t < 0) continue;
      var k = r.t / r.life, e = 1 - Math.pow(1 - k, 3);
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, 6.2832); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  BB.Renderer.prototype._particles = function (ctx, parts) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.delay > 0) continue;
      ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  BB.Renderer.prototype._texts = function (ctx, texts) {
    if (!texts.length) return;
    ctx.font = 'bold 13px ' + MONO_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < texts.length; i++) {
      var t = texts[i];
      if (t.t < 0) continue;
      var k = t.t / t.life;
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'; ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  };

  /* Falling power-up capsules */
  BB.Renderer.prototype._capsules = function (ctx, capsules) {
    for (var i = 0; i < capsules.length; i++) {
      var c = capsules[i], def = BB.PowerUps.TYPES[c.type];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.type === 'multi' ? -1 : 1) * 0.12);
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = def.color;
      roundRectPath(ctx, -c.w / 2, -c.h / 2, c.w, c.h, c.h / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = def.text;
      ctx.font = 'bold 10px ' + MONO_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.label, 0, 1);
      ctx.restore();
    }
  };

  /* paddle */
  BB.Renderer.prototype._paddle = function (ctx, p, expanded, time, acc) {
    var key = BB.Settings.get('paddle'), st = BB.PADDLE_STYLES[key];
    var g = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    for (var i = 0; i < st.stops.length; i++) g.addColorStop(i / (st.stops.length - 1), BB.resolveColor(st.stops[i], acc));
    var pulse = key === 'plasma' ? 0.5 + 0.5 * Math.sin(time * 4.5) : 0;

    ctx.shadowColor = BB.resolveColor(st.glow, acc);
    ctx.shadowBlur = (expanded ? 28 : 18) + pulse * 12;
    ctx.fillStyle = g;
    roundRectPath(ctx, p.x, p.y, p.w, p.h, key === 'titanium' ? 4 : p.h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (key === 'titanium') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)'; ctx.fillRect(p.x + 6, p.y + p.h - 4, p.w - 12, 1.5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'; ctx.fillRect(p.x + 6, p.y + 2, p.w - 12, 1.5);
    } else if (key === 'gold') {
      ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
      for (var s = 1; s < 6; s++) ctx.fillRect(p.x + (p.w * s) / 6 - 0.5, p.y + 2, 1, p.h - 4);
    }
    ctx.fillStyle = 'rgba(7, 9, 19, 0.55)';
    roundRectPath(ctx, p.x + p.w / 2 - 9, p.y + p.h / 2 - 1.5, 18, 3, 1.5);
    ctx.fill();
  };

  /* ball */
  BB.Renderer.prototype._trail = function (ctx, b, q, acc) {
    if (q === 0 || b.trail.length < 2) return;
    var key = BB.Settings.get('ball'), st = BB.BALL_STYLES[key];
    var col = BB.resolveColor(st.trail, acc), n = b.trail.length;
    for (var i = 0; i < n; i++) {
      var f = (i + 1) / n;
      ctx.globalAlpha = f * 0.42 * (key === 'fireball' ? 0.8 + Math.random() * 0.4 : 1);
      ctx.fillStyle = (key === 'glitch' && i % 2) ? '#ff2d95' : col;
      if (key === 'glitch') { var sz = b.r * f * 1.5; ctx.fillRect(b.trail[i].x - sz / 2, b.trail[i].y - sz / 2, sz, sz); }
      else { ctx.beginPath(); ctx.arc(b.trail[i].x, b.trail[i].y, b.r * f * 0.9, 0, 6.2832); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  };

  BB.Renderer.prototype._ball = function (ctx, b, slowed, time, acc) {
    var key = BB.Settings.get('ball'), st = BB.BALL_STYLES[key];
    var glow = slowed ? '#eab308' : BB.resolveColor(st.glow, acc);
    var r = b.r;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;

    if (key === 'fireball') {
      var fr = r * (1.05 + Math.random() * 0.12);
      var fg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, fr);
      fg.addColorStop(0, '#fffbe6'); fg.addColorStop(0.5, st.core); fg.addColorStop(1, '#f97316');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(b.x, b.y, fr, 0, 6.2832); ctx.fill();
    } else if (key === 'glitch') {
      var gs = r * 1.7, j = Math.sin(time * 40 + b.x) > 0.92 ? 2 : 0;
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.85)'; ctx.fillRect(b.x - gs / 2 - 1.8 - j, b.y - gs / 2, gs, gs);
      ctx.fillStyle = 'rgba(255, 45, 149, 0.85)'; ctx.fillRect(b.x - gs / 2 + 1.8 + j, b.y - gs / 2, gs, gs);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x - gs / 2, b.y - gs / 2, gs, gs);
    } else {
      var pr = key === 'pulse' ? r * (1 + 0.08 * Math.sin(time * 6)) : r;
      ctx.fillStyle = st.core; ctx.beginPath(); ctx.arc(b.x, b.y, pr, 0, 6.2832); ctx.fill();
      if (key === 'ion') {                               // two orbiting sparks
        ctx.shadowBlur = 6; ctx.fillStyle = '#ddb7ff';
        for (var o = 0; o < 2; o++) {
          var a = time * 8 + o * Math.PI;
          ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * (r + 5), b.y + Math.sin(a) * (r + 5), 1.9, 0, 6.2832); ctx.fill();
        }
      }
    }
    ctx.shadowBlur = 0;
  };

  /* HUD-ish overlays */
  /* Timer pills */
  BB.Renderer.prototype._effectPills = function (ctx, effects) {
    var PU = C.powerups;
    var items = [
      { type: 'expand', left: effects.expand, total: PU.expand.duration },
      { type: 'slow',   left: effects.slow,   total: PU.slow.duration }
    ];
    var w = 92, h = 18, gap = 6;
    var x = this.W - 30, y = 14;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.left <= 0) continue;
      var def = BB.PowerUps.TYPES[it.type];
      x -= w;
      ctx.fillStyle = 'rgba(12, 15, 36, 0.85)';
      roundRectPath(ctx, x, y, w, h, h / 2); ctx.fill();
      ctx.strokeStyle = def.color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      roundRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, h / 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = def.color;
      ctx.font = 'bold 9px ' + MONO_FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(def.label, x + 9, y + h / 2 + 0.5);
      var bx = x + 44, bw = w - 44 - 9, bh = 5, by = y + (h - bh) / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = def.color;
      roundRectPath(ctx, bx, by, Math.max(bh, bw * clamp(it.left / it.total, 0, 1)), bh, bh / 2); ctx.fill();
      x -= gap;
    }
  };

  /* Big fading title */
  BB.Renderer.prototype._banner = function (ctx, b, acc) {
    if (!b) return;
    var fadeIn = clamp(b.age / 0.25, 0, 1);
    var fadeOut = b.sticky ? 1 : clamp((b.life - b.age) / 0.4, 0, 1);
    var a = Math.min(fadeIn, fadeOut);
    if (a <= 0) return;
    var W = this.W, y = this.H * 0.52;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var size = 34;
    ctx.font = '700 ' + size + 'px ' + HEAD_FONT;
    while (ctx.measureText(b.title).width > W - 48 && size > 16) {
      size -= 2;
      ctx.font = '700 ' + size + 'px ' + HEAD_FONT;
    }
    ctx.shadowColor = acc;
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#dbfcff';
    ctx.fillText(b.title, W / 2, y - (1 - fadeIn) * 8);
    ctx.shadowBlur = 0;
    ctx.font = '700 12px ' + MONO_FONT;
    ctx.fillStyle = '#ddb7ff';
    ctx.fillText(b.sub, W / 2, y + size * 0.85);
    ctx.restore();
  };

  /** 3 / 2 / 1 after resuming. */
  BB.Renderer.prototype._countdown = function (ctx, game, acc) {
    var n = game.countdown;
    if (!n) return;
    var step = C.transitions.resumeStep;
    var frac = (game._resumeTimer / step) - (n - 1);
    ctx.save();
    ctx.globalAlpha = clamp(0.35 + frac * 0.65, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(84 + (1 - frac) * -14) + 'px ' + HEAD_FONT;
    ctx.shadowColor = acc; ctx.shadowBlur = 24;
    ctx.fillStyle = '#dbfcff';
    ctx.fillText(String(n), this.W / 2, this.H * 0.6);
    ctx.restore();
  };
})(window.BB = window.BB || {});
