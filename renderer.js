(function (BB) {
  'use strict';
  var C = BB.CONFIG;

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
    this._paddle(ctx, game.paddle);
    this._ball(ctx, game.ball);
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

  BB.Renderer.prototype._paddle = function (ctx, p) {
    var g = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    g.addColorStop(0, '#ddb7ff');
    g.addColorStop(0.15, '#00f0ff');
    g.addColorStop(0.5, '#dbfcff');
    g.addColorStop(0.85, '#00f0ff');
    g.addColorStop(1, '#ddb7ff');
    ctx.shadowColor = C.colors.paddleGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = g;
    roundRectPath(ctx, p.x, p.y, p.w, p.h, p.h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // centre pip
    ctx.fillStyle = 'rgba(7, 9, 19, 0.55)';
    roundRectPath(ctx, p.x + p.w / 2 - 9, p.y + p.h / 2 - 1.5, 18, 3, 1.5);
    ctx.fill();
  };

  BB.Renderer.prototype._ball = function (ctx, b) {
    ctx.shadowColor = C.colors.ballGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = C.colors.ball;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };
})(window.BB = window.BB || {});