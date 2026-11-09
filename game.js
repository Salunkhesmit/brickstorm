(function (BB) {
  'use strict';
  var C = BB.CONFIG;
  var clamp = BB.Utils.clamp;
  var toRad = BB.Utils.toRad;

  BB.Game = function Game(opts) {
    this.input = opts.input;
    this.renderer = opts.renderer;
    this.onHud = opts.onHud || function () {};
    this.onEnd = opts.onEnd || function () {};

    this.width = C.canvas.width;
    this.height = C.canvas.height;
    this.paddle = new BB.Paddle(C.paddle, this.width, this.height);
    this.ball = new BB.Ball(C.ball);
    this.bricks = [];
    this.totalBricks = 0;
    this.bricksLeft = 0;

    this.state = 'idle';
    this.score = 0;
    this.lives = C.lives;
    this.levelIndex = 0;

    this._raf = 0;
    this._last = 0;
    this._frame = this._frame.bind(this);
  };

  /* run control */

  /** Start (or restart) */
  BB.Game.prototype.newGame = function () {
    this.score = 0;
    this.lives = C.lives;
    this.levelIndex = 0;
    this.input.reset();
    this.loadLevel();
    this.state = 'ready';
    this._emitHud();
    this._startLoop();
  };

  BB.Game.prototype.loadLevel = function () {
    var level = BB.LEVELS[this.levelIndex];
    this.bricks = BB.buildBricks(level, C.bricks, this.width);
    this.totalBricks = this.bricks.length;
    this.bricksLeft = this.totalBricks;
    this.paddle.reset();
    this.ball.attachTo(this.paddle);
  };

  /** Back to menu */
  BB.Game.prototype.stop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.state = 'idle';
  };

  BB.Game.prototype.launch = function () {
    if (this.state !== 'ready') return;
    this.ball.launch();
    this.state = 'playing';
    this._emitHud();
  };

  /* loop */
  BB.Game.prototype._startLoop = function () {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  };

  BB.Game.prototype._frame = function (now) {
    this._raf = requestAnimationFrame(this._frame);
    var dt = clamp((now - this._last) / 1000, 0, 1 / 30);
    this._last = now;
    this.update(dt);
    this.renderer.draw(this);
  };

  /* Advance the simulation by dt seconds. */
  BB.Game.prototype.update = function (dt) {
    // paddle
    var px = this.input.consumePointerX();
    if (px !== null) this.paddle.moveTo(px);
    var dir = this.input.axis();
    if (dir) {
      var sens = BB.Storage.get('sensitivity') || 1;
      this.paddle.moveBy(dir * C.paddle.keyboardSpeed * sens * dt);
    }

    if (this.state === 'ready') { this.ball.attachTo(this.paddle); return; }
    if (this.state !== 'playing') return;

    var b = this.ball;
    var dist = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * dt;
    var steps = Math.max(1, Math.ceil(dist / (b.r * 0.9)));
    var h = dt / steps;
    for (var i = 0; i < steps && this.state === 'playing'; i++) this._stepBall(h);
  };

  BB.Game.prototype._stepBall = function (h) {
    var b = this.ball;
    b.x += b.vx * h;
    b.y += b.vy * h;

    // walls + ceiling
    if (b.x - b.r < 0)           { b.x = b.r;               b.vx =  Math.abs(b.vx); }
    else if (b.x + b.r > this.width) { b.x = this.width - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < 0)           { b.y = b.r;               b.vy =  Math.abs(b.vy); }

    this._collidePaddle();
    this._collideBricks();

    if (this.state === 'playing' && b.y - b.r > this.height) this._loseLife();
  };

  BB.Game.prototype._collidePaddle = function () {
    var b = this.ball, p = this.paddle;
    if (b.vy <= 0) return;
    if (b.y > p.y + p.h / 2) return;
    if (!BB.Physics.circleRect(b.x, b.y, b.r, p.x, p.y, p.w, p.h)) return;

    var rel = clamp((b.x - p.centerX) / (p.w / 2), -1, 1);
    var angle = rel * toRad(C.ball.maxBounceDeg);
    b.vx = b.speed * Math.sin(angle);
    b.vy = -b.speed * Math.cos(angle);
    b.y = p.y - b.r;
  };

  BB.Game.prototype._collideBricks = function () {
    var b = this.ball, best = null, bestBrick = null;
    for (var i = 0; i < this.bricks.length; i++) {
      var br = this.bricks[i];
      if (!br.alive) continue;
      var hit = BB.Physics.circleRect(b.x, b.y, b.r, br.x, br.y, br.w, br.h);
      if (hit && (!best || hit.dist2 < best.dist2)) { best = hit; bestBrick = br; }
    }
    if (!best) return;

    if (Math.abs(best.nx) > Math.abs(best.ny)) b.vx = best.nx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
    else                                       b.vy = best.ny > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
    b.x = best.px + best.nx * b.r;
    b.y = best.py + best.ny * b.r;

    bestBrick.alive = false;
    this.bricksLeft--;
    this.score += bestBrick.points;
    this._emitHud();
    if (this.bricksLeft === 0) this._end('victory');
  };

  BB.Game.prototype._loseLife = function () {
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this._end('gameover');
      return;
    }
    this.state = 'ready';
    this.ball.attachTo(this.paddle);
    this._emitHud();
  };

  BB.Game.prototype._end = function (kind) {
    this.state = kind;
    var rec = BB.Storage.recordGame(this.score, kind === 'victory');
    this._emitHud();
    this.onEnd({
      kind: kind,
      score: this.score,
      bricksBroken: this.totalBricks - this.bricksLeft,
      totalBricks: this.totalBricks,
      lives: this.lives,
      best: rec.best,
      isNewBest: rec.isNewBest && this.score > 0
    });
  };

  BB.Game.prototype._emitHud = function () {
    this.onHud({
      score: this.score,
      lives: this.lives,
      maxLives: C.lives,
      best: Math.max(BB.Storage.get('best'), this.score),
      state: this.state
    });
  };
})(window.BB = window.BB || {});