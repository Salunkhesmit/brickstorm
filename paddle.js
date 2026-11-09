(function (BB) {
  'use strict';
  var clamp = BB.Utils.clamp;

  BB.Paddle = function Paddle(cfg, canvasW, canvasH) {
    this.w = cfg.width;
    this.h = cfg.height;
    this.y = canvasH - cfg.bottomOffset - cfg.height;
    this.canvasW = canvasW;
    this.x = 0;
    this.reset();
  };

  BB.Paddle.prototype.reset = function () {
    this.x = (this.canvasW - this.w) / 2;
  };

  Object.defineProperty(BB.Paddle.prototype, 'centerX', {
    get: function () { return this.x + this.w / 2; }
  });

  /** Put the paddle's centre at x */
  BB.Paddle.prototype.moveTo = function (centerX) {
    this.x = clamp(centerX - this.w / 2, 0, this.canvasW - this.w);
  };

  /** Nudge the paddle by dx pixels */
  BB.Paddle.prototype.moveBy = function (dx) {
    this.x = clamp(this.x + dx, 0, this.canvasW - this.w);
  };
})(window.BB = window.BB || {});