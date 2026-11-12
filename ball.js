(function (BB) {
  'use strict';

  BB.Ball = function Ball(cfg) {
    this.r = cfg.radius;
    this.speed = cfg.speed;
    this.spread = BB.Utils.toRad(cfg.launchSpreadDeg);
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.attached = true;
  };

  /** Park the ball on top of the paddle. */
  BB.Ball.prototype.attachTo = function (paddle) {
    this.attached = true;
    this.vx = 0; this.vy = 0;
    this.x = paddle.centerX;
    this.y = paddle.y - this.r - 1;
  };

  /** Fire upward at a small random angle. `speed` overrides the default. */
  BB.Ball.prototype.launch = function (speed) {
    if (!this.attached) return;
    var s = speed || this.speed;
    var a = (Math.random() * 2 - 1) * this.spread;
    this.vx = s * Math.sin(a);
    this.vy = -s * Math.cos(a);
    this.attached = false;
  };
})(window.BB = window.BB || {});
