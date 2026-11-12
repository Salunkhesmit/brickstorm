(function (BB) {
  'use strict';
  var clamp = BB.Utils.clamp;

  BB.Paddle = function Paddle(cfg, canvasW, canvasH) {
    this.baseW = cfg.width;
    this.w = cfg.width;
    this.targetW = cfg.width;
    this.h = cfg.height;
    this.y = canvasH - cfg.bottomOffset - cfg.height;
    this.canvasW = canvasW;
    this.x = 0;
    this.reset();
  };

  BB.Paddle.prototype.reset = function () {
    this.w = this.targetW = this.baseW;
    this.x = (this.canvasW - this.w) / 2;
  };

  Object.defineProperty(BB.Paddle.prototype, 'centerX', {
    get: function () { return this.x + this.w / 2; }
  });

  BB.Paddle.prototype.moveTo = function (centerX) {
    this.x = clamp(centerX - this.w / 2, 0, this.canvasW - this.w);
  };

  BB.Paddle.prototype.moveBy = function (dx) {
    this.x = clamp(this.x + dx, 0, this.canvasW - this.w);
  };

  BB.Paddle.prototype.setTargetWidth = function (w) { this.targetW = w; };

  BB.Paddle.prototype.update = function (dt, growSpeed) {
    if (this.w === this.targetW) return;
    var c = this.centerX;
    var step = growSpeed * dt;
    this.w = this.w < this.targetW ? Math.min(this.targetW, this.w + step) : Math.max(this.targetW, this.w - step);
    this.x = clamp(c - this.w / 2, 0, this.canvasW - this.w);
  };
})(window.BB = window.BB || {});
