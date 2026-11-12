(function (BB) {
  'use strict';
  var C = BB.CONFIG;
  var clamp = BB.Utils.clamp;
  var HEAD_FONT = '"Space Grotesk", system-ui, sans-serif';
  var MONO_FONT = '"Space Mono", ui-monospace, Menlo, Consolas, monospace';

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

  BB.Renderer = function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sx = 1;
    this.sy = 1;

    var self = this;
    this.resize();
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(canvas);
    }
    window.addEventListener('resize', function () { self.resize(); });
  };

  BB.Renderer.prototype.resize = function () {
    var w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;                       // hidden screen
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.sx = pw / C.canvas.width;
    this.sy = ph / C.canvas.height;
  };

  BB.Renderer.prototype.draw = function (game) {
    var ctx = this.ctx;
    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    this._background(ctx);
    this._bricks(ctx, game.bricks);
    this._capsules(ctx, game.capsules);
    this._paddle(ctx, game.paddle, game.effects.expand > 0);
    for (var i = 0; i < game.balls.length; i++) this._ball(ctx, game.balls[i], game.effects.slow > 0);
    this._effectPills(ctx, game.effects);
    this._banner(ctx, game.banner);
    this._countdown(ctx, game);
  };

  BB.Renderer.prototype._background = function (ctx) {
    ctx.fillStyle = C.colors.background;
    ctx.fillRect(0, 0, C.canvas.width, C.canvas.height);
    var g = ctx.createRadialGradient(C.canvas.width / 2, C.canvas.height * 0.35, 0,
                                     C.canvas.width / 2, C.canvas.height * 0.35, C.canvas.height * 0.7);
    g.addColorStop(0, C.colors.glowTop);
    g.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.canvas.width, C.canvas.height);
  };

  BB.Renderer.prototype._bricks = function (ctx, bricks) {
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = b.color;
      roundRectPath(ctx, b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      // soft top highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      roundRectPath(ctx, b.x + 1, b.y + 1, b.w - 2, b.h / 2 - 1, 3);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  };

  /** Falling power-up capsules */
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

  BB.Renderer.prototype._paddle = function (ctx, p, expanded) {
    var g = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    g.addColorStop(0, '#ddb7ff');
    g.addColorStop(0.15, '#00f0ff');
    g.addColorStop(0.5, '#dbfcff');
    g.addColorStop(0.85, '#00f0ff');
    g.addColorStop(1, '#ddb7ff');
    ctx.shadowColor = C.colors.paddleGlow;
    ctx.shadowBlur = expanded ? 28 : 18;
    ctx.fillStyle = g;
    roundRectPath(ctx, p.x, p.y, p.w, p.h, p.h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // centre pip
    ctx.fillStyle = 'rgba(7, 9, 19, 0.55)';
    roundRectPath(ctx, p.x + p.w / 2 - 9, p.y + p.h / 2 - 1.5, 18, 3, 1.5);
    ctx.fill();
  };

  BB.Renderer.prototype._ball = function (ctx, b, slowed) {
    ctx.shadowColor = slowed ? '#eab308' : C.colors.ballGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = C.colors.ball;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  /** Timer pills */
  BB.Renderer.prototype._effectPills = function (ctx, effects) {
    var PU = C.powerups;
    var items = [
      { type: 'expand', left: effects.expand, total: PU.expand.duration },
      { type: 'slow',   left: effects.slow,   total: PU.slow.duration }
    ];
    var w = 92, h = 18, gap = 6;
    var x = C.canvas.width - 30, y = 14;
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
      // label
      ctx.fillStyle = def.color;
      ctx.font = 'bold 9px ' + MONO_FONT;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(def.label, x + 9, y + h / 2 + 0.5);
      // bar
      var bx = x + 44, bw = w - 44 - 9, bh = 5, by = y + (h - bh) / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      roundRectPath(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = def.color;
      roundRectPath(ctx, bx, by, Math.max(bh, bw * clamp(it.left / it.total, 0, 1)), bh, bh / 2); ctx.fill();
      x -= gap;
    }
  };

  /** Big fading title */
  BB.Renderer.prototype._banner = function (ctx, b) {
    if (!b) return;
    var fadeIn = clamp(b.age / 0.25, 0, 1);
    var fadeOut = b.sticky ? 1 : clamp((b.life - b.age) / 0.4, 0, 1);
    var a = Math.min(fadeIn, fadeOut);
    if (a <= 0) return;
    var W = C.canvas.width, y = C.canvas.height * 0.52;

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
    ctx.shadowColor = 'rgba(0, 240, 255, 0.9)';
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
  BB.Renderer.prototype._countdown = function (ctx, game) {
    var n = game.countdown;
    if (!n) return;
    var step = C.transitions.resumeStep;
    var frac = (game._resumeTimer / step) - (n - 1);
    ctx.save();
    ctx.globalAlpha = clamp(0.35 + frac * 0.65, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.round(84 + (1 - frac) * -14) + 'px ' + HEAD_FONT;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.9)'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#dbfcff';
    ctx.fillText(String(n), C.canvas.width / 2, C.canvas.height * 0.6);
    ctx.restore();
  };
})(window.BB = window.BB || {});
