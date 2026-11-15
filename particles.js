(function (BB) {
  'use strict';
  var FX = BB.CONFIG.effects;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var CONFETTI = ['#00f0ff', '#ddb7ff', '#ff7eb6', '#fbbf24', '#4ade80'];

  BB.Effects = function Effects(opts) {
    this.preview = !!(opts && opts.preview);
    this.parts = [];
    this.ghosts = [];
    this.rings = [];
    this.texts = [];
    this.flash = null;
    this.shakeMag = 0;
    this.sx = 0; this.sy = 0;
    this.time = 0;
  };

  BB.Effects.prototype._q = function () { return BB.Settings.particleLevel(); };
  BB.Effects.prototype._accent = function () { return BB.Settings.accentHex(); };

  /** Total live effect objects (handy for tests / debugging). */
  BB.Effects.prototype.count = function () {
    return this.parts.length + this.ghosts.length + this.rings.length + this.texts.length;
  };

  BB.Effects.prototype.clear = function () {
    this.parts.length = 0; this.ghosts.length = 0; this.rings.length = 0; this.texts.length = 0;
    this.flash = null; this.shakeMag = 0; this.sx = this.sy = 0;
  };

  BB.Effects.prototype._add = function (p) {
    if (this.parts.length >= FX.maxParticles) return;
    p.max = p.life;
    p.rot = p.rot || 0; p.vr = p.vr || 0; p.delay = p.delay || 0; p.drag = p.drag || 0; p.g = p.g || 0;
    this.parts.push(p);
  };

  BB.Effects.prototype._burst = function (n, x, y, o) {
    for (var i = 0; i < n; i++) {
      var a = rnd(o.a0 === undefined ? 0 : o.a0, o.a1 === undefined ? Math.PI * 2 : o.a1);
      var s = rnd(o.s0, o.s1);
      var col = o.colors ? o.colors[Math.floor(Math.random() * o.colors.length)] : o.color;
      this._add({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rnd(o.l0, o.l1), size: rnd(o.z0, o.z1), color: col, shape: o.shape || 'dot',
        g: o.g || 0, drag: o.drag || 0, delay: o.delay || 0, vr: o.shape === 'rect' ? rnd(-9, 9) : 0, rot: rnd(0, 6.28)
      });
    }
  };

  BB.Effects.prototype.addShake = function (mag) {
    if (this.preview || !BB.Settings.get('shake')) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
  };

  BB.Effects.prototype._vibrate = function (ms) {
    if (this.preview || !BB.Settings.get('haptics')) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
  };

  /** Spawn the effect for a game event. */
  BB.Effects.prototype.emit = function (name, d) {
    var q = this._q();
    var acc = this._accent();
    d = d || {};
    var delay = (d.depth || 0) * 0.07;           // chain reactions ripple outward

    switch (name) {
      case 'brickBreak':
        if (q > 0) {
          this.ghosts.push({ x: d.x, y: d.y, w: d.w, h: d.h, color: d.color, t: -delay, dur: 0.34 });
          this._burst(Math.round(14 * q), d.x, d.y, { s0: 70, s1: 250, l0: 0.45, l1: 0.95, z0: 2, z1: 5, color: d.color, shape: 'rect', g: 520, drag: 0.8, delay: delay });
          this._burst(Math.round(6 * q), d.x, d.y, { s0: 40, s1: 160, l0: 0.25, l1: 0.5, z0: 1.2, z1: 2.4, color: '#ffffff', g: 200, delay: delay });
          if (d.points) this.texts.push({ x: d.x, y: d.y, text: '+' + d.points, color: d.color, t: -delay, life: 0.9, vy: -42 });
        }
        this._vibrate(8);
        break;

      case 'brickHit':
        this._burst(Math.round(5 * q), d.x, d.y, { s0: 50, s1: 150, l0: 0.2, l1: 0.45, z0: 1.2, z1: 2.4, color: d.color || '#ffffff', g: 300 });
        this._vibrate(6);
        break;

      case 'solidHit':
        this._burst(Math.round(5 * q), d.x, d.y, { s0: 60, s1: 180, l0: 0.2, l1: 0.4, z0: 1, z1: 2, colors: ['#e2e8f0', '#94a3b8'], g: 400 });
        break;

      case 'explosion':
        if (q > 0) {
          this.rings.push({ x: d.x, y: d.y, r0: 8, r1: 78, life: 0.45, color: '#f97316', width: 3.5, t: -delay });
          this._burst(Math.round(24 * q), d.x, d.y, { s0: 60, s1: 280, l0: 0.4, l1: 0.85, z0: 2, z1: 5.5, colors: ['#f97316', '#fbbf24', '#ef4444'], drag: 2.4, delay: delay });
        }
        this.addShake(5 + Math.min(3, d.depth || 0) * 1.5);
        this._vibrate(30);
        break;

      case 'paddle':
        this._burst(Math.round(7 * q), d.x, d.y, { a0: Math.PI * 1.1, a1: Math.PI * 1.9, s0: 70, s1: 200, l0: 0.2, l1: 0.45, z0: 1.4, z1: 2.8, color: acc, g: 380 });
        if (q > 0) this.rings.push({ x: d.x, y: d.y, r0: 4, r1: 24, life: 0.26, color: acc, width: 2, t: 0 });
        break;

      case 'wall':
        this._burst(Math.round(3 * q), d.x, d.y, { s0: 30, s1: 90, l0: 0.15, l1: 0.3, z0: 1, z1: 1.8, color: '#ffffff' });
        break;

      case 'launch':
        if (q > 0) this.rings.push({ x: d.x, y: d.y, r0: 5, r1: 30, life: 0.3, color: acc, width: 2, t: 0 });
        break;

      case 'powerup':
        if (q > 0) this.rings.push({ x: d.x, y: d.y, r0: 6, r1: 46, life: 0.4, color: d.color, width: 3, t: 0 });
        this._burst(Math.round(16 * q), d.x, d.y, { s0: 60, s1: 210, l0: 0.35, l1: 0.7, z0: 1.6, z1: 3.4, color: d.color, drag: 1.6 });
        this._vibrate(15);
        break;

      case 'lifeLost':
        if (q > 0) this.flash = { color: '#ff2d55', t: 0, dur: 0.45, alpha: 0.32 };
        this.addShake(8);
        this._vibrate(80);
        break;

      case 'levelClear':
      case 'victory':
        var n = Math.round((name === 'victory' ? 130 : 55) * q), W = BB.CONFIG.canvas.width;
        for (var i = 0; i < n; i++) {
          this._add({
            x: rnd(0, W), y: rnd(-30, 80), vx: rnd(-60, 60), vy: rnd(40, 200),
            life: rnd(1.1, 2.2), size: rnd(2.5, 5.5), color: CONFETTI[i % CONFETTI.length], shape: 'rect',
            g: 120, drag: 0.4, vr: rnd(-8, 8), rot: rnd(0, 6.28), delay: rnd(0, 0.35)
          });
        }
        if (q > 0 && name === 'victory') this.flash = { color: acc, t: 0, dur: 0.6, alpha: 0.22 };
        this._vibrate(name === 'victory' ? [40, 40, 90] : 25);
        break;
    }
  };

  BB.Effects.prototype.update = function (dt) {
    this.time += dt;
    var i, p;

    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life -= dt;
      if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
      if (p.drag) { var k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (i = this.ghosts.length - 1; i >= 0; i--) {
      p = this.ghosts[i]; p.t += dt;
      if (p.t >= p.dur) { this.ghosts[i] = this.ghosts[this.ghosts.length - 1]; this.ghosts.pop(); }
    }
    for (i = this.rings.length - 1; i >= 0; i--) {
      p = this.rings[i]; p.t += dt;
      if (p.t >= p.life) { this.rings[i] = this.rings[this.rings.length - 1]; this.rings.pop(); }
    }
    for (i = this.texts.length - 1; i >= 0; i--) {
      p = this.texts[i]; p.t += dt;
      if (p.t > 0) p.y += p.vy * dt;
      if (p.t >= p.life) { this.texts[i] = this.texts[this.texts.length - 1]; this.texts.pop(); }
    }
    if (this.flash) { this.flash.t += dt; if (this.flash.t >= this.flash.dur) this.flash = null; }

    if (this.shakeMag > 0.08) {
      this.shakeMag *= Math.exp(-9 * dt);
      this.sx = (Math.random() * 2 - 1) * this.shakeMag;
      this.sy = (Math.random() * 2 - 1) * this.shakeMag;
    } else { this.shakeMag = 0; this.sx = this.sy = 0; }
  };
})(window.BB = window.BB || {});
