(function (BB) {
  'use strict';
  var C = BB.CONFIG, P = C.physics, PU = C.powerups, T = C.transitions;
  var clamp = BB.Utils.clamp, toRad = BB.Utils.toRad;
  var Physics = BB.Physics;
  function noop() {}
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  BB.Game = function Game(opts) {
    this.input = opts.input;
    this.renderer = opts.renderer;
    this.onHud = opts.onHud || noop;
    this.onEnd = opts.onEnd || noop;
    this.onSound = opts.onSound || noop;
    this.rng = Math.random;
    this.fx = opts.fx || new BB.Effects();

    this.width = C.canvas.width;
    this.height = C.canvas.height;
    this.paddle = new BB.Paddle(C.paddle, this.width, this.height);
    this.balls = [];
    this.bricks = [];
    this.capsules = [];
    this.effects = { expand: 0, slow: 0 };

    this.totalBricks = 0;
    this.bricksLeft = 0;
    this.bricksDestroyed = 0;

    this.state = 'idle';
    this.paused = false;
    this.score = 0;
    this.lives = C.lives;
    this.levelIndex = 0;
    this.speedRamp = 0;

    this.banner = null;
    this._resumeTimer = 0;
    this._levelTimer = 0;
    this._accum = 0;
    this._paddleVx = 0;

    this._raf = 0;
    this._last = 0;
    this._frame = this._frame.bind(this);
  };

  /** The first ball */
  Object.defineProperty(BB.Game.prototype, 'ball', {
    get: function () { return this.balls[0] || null; }
  });

  /** 3, 2, 1 while the resume countdown runs; 0 otherwise. */
  Object.defineProperty(BB.Game.prototype, 'countdown', {
    get: function () { return this._resumeTimer > 0 ? Math.ceil(this._resumeTimer / T.resumeStep) : 0; }
  });

  /* run control */

  /** Start */
  BB.Game.prototype.newGame = function () {
    this.score = 0;
    this.lives = C.lives;
    this.levelIndex = 0;
    this.bricksDestroyed = 0;
    this.paused = false;
    this.input.reset();
    this.fx.clear();
    this._beginLevel();
    this._emitHud();
    this._startLoop();
  };

  /** Build the current level and put a ball on the paddle. */
  BB.Game.prototype._beginLevel = function () {
    var level = BB.LEVELS[this.levelIndex];
    this.bricks = BB.buildBricks(level, C.bricks, this.width);
    this.totalBricks = this.bricks.filter(function (b) { return !b.solid; }).length;   // steel doesn't count
    this.bricksLeft = this.totalBricks;
    this._resetEffects();
    this.speedRamp = 0;
    this.paddle.reset();
    var ball = new BB.Ball(C.ball);
    ball.attachTo(this.paddle);
    this.balls = [ball];
    this.state = 'ready';
    this._accum = 0;
    this._levelTimer = 0;
    this._resumeTimer = 0;
    this._setBanner(level.name, 'LEVEL ' + pad2(this.levelIndex + 1) + ' / ' + pad2(BB.LEVELS.length), T.bannerIntro, false);
  };

  /** Leave the game screen */
  BB.Game.prototype.stop = function () {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.state = 'idle';
    this.paused = false;
    this.fx.clear();
  };

  /** Launch the ball */
  BB.Game.prototype.launch = function () {
    if (this.paused) return;
    if (this.state === 'levelclear') {
      if (this._levelTimer < T.levelClear - T.levelClearSkipAfter) this._levelTimer = 0;
      return;
    }
    if (this.state !== 'ready') return;
    this.balls[0].launch(this._targetSpeed());
    this.state = 'playing';
    this.onSound('launch');
    this.fx.emit('launch', { x: this.balls[0].x, y: this.balls[0].y });
    this._emitHud();
  };

  /* pause / resume */
  BB.Game.prototype.canPause = function () {
    return !this.paused && (this.state === 'ready' || this.state === 'playing');
  };

  BB.Game.prototype.pause = function () {
    if (!this.canPause()) return false;
    this.paused = true;
    this._emitHud();
    return true;
  };

  /** Resume */
  BB.Game.prototype.resume = function () {
    if (!this.paused) return;
    this.paused = false;
    this.input.reset();
    if (this.state === 'playing') this._resumeTimer = T.resumeCount * T.resumeStep;
    this._emitHud();
  };

  /** Numbers for the pause card. */
  BB.Game.prototype.snapshot = function () {
    return {
      score: this.score,
      level: this.levelIndex + 1,
      levels: BB.LEVELS.length,
      bricksLeft: this.bricksLeft,
      totalBricks: this.totalBricks,
      lives: this.lives,
      maxLives: C.lives
    };
  };

  /* loop */
  BB.Game.prototype._startLoop = function () {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  };

  BB.Game.prototype._frame = function (now) {
    this._raf = requestAnimationFrame(this._frame);
    var dt = clamp((now - this._last) / 1000, 0, 1 / 30);   // never jump more than 1/30s
    this._last = now;
    this.update(dt);
    this.renderer.draw(this);
  };

  /* Advance the game by dt seconds */
  BB.Game.prototype.update = function (dt) {
    if (this.paused) return;

    this._animate(dt);

    // banner fades on real time
    if (this.banner) {
      this.banner.age += dt;
      if (!this.banner.sticky && this.banner.age >= this.banner.life) this.banner = null;
    }

    // paddle
    var oldX = this.paddle.x;
    var px = this.input.consumePointerX();
    if (px !== null) this.paddle.moveTo(px);
    var dir = this.input.axis();
    if (dir) {
      var sens = BB.Storage.get('sensitivity') || 1;
      this.paddle.moveBy(dir * C.paddle.keyboardSpeed * sens * dt);
    }
    if (dt > 0) this._paddleVx += ((this.paddle.x - oldX) / dt - this._paddleVx) * 0.4;   // smoothed, for "english"
    this.paddle.update(dt, PU.paddleGrowSpeed);

    if (this.state === 'ready') { this.balls[0].attachTo(this.paddle); return; }

    if (this.state === 'levelclear') {
      this._levelTimer -= dt;
      if (this._levelTimer <= 0) this._nextLevel();
      return;
    }

    if (this.state !== 'playing') return;

    // resume countdown
    if (this._resumeTimer > 0) { this._resumeTimer -= dt; return; }

    // timed power-ups
    if (this.effects.expand > 0) {
      this.effects.expand -= dt;
      if (this.effects.expand <= 0) { this.effects.expand = 0; this.paddle.setTargetWidth(this.paddle.baseW); }
    }
    if (this.effects.slow > 0) {
      this.effects.slow -= dt;
      if (this.effects.slow < 0) this.effects.slow = 0;
    }

    this._accum += dt;
    var h = P.fixedStep, guard = 0;
    while (this._accum >= h && this.state === 'playing' && guard++ < 16) {
      this._step(h);
      this._accum -= h;
    }
    if (this.state !== 'playing') this._accum = 0;
  };

  /* Visual-only timers */
  BB.Game.prototype._animate = function (dt) {
    this.fx.update(dt);
    var i, b, introT = C.effects.brickIntro;
    for (i = 0; i < this.bricks.length; i++) {
      b = this.bricks[i];
      if (b.spawn < introT) b.spawn += dt;
      if (b.hitT > 0) b.hitT = Math.max(0, b.hitT - dt * 6);
    }
    for (i = 0; i < this.balls.length; i++) {
      b = this.balls[i];
      if (b.attached) { b.trail.length = 0; continue; }
      var last = b.trail[b.trail.length - 1];
      if (!last || Math.abs(b.x - last.x) + Math.abs(b.y - last.y) > 3) {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > C.effects.trailLength) b.trail.shift();
      }
    }
  };

  /* physics step */
  BB.Game.prototype._targetSpeed = function () {
    var level = BB.LEVELS[this.levelIndex];
    var s = C.ball.speed * (level.speed || 1) * (1 + this.speedRamp);
    if (this.effects.slow > 0) s *= PU.slow.factor;
    return s;
  };

  BB.Game.prototype._step = function (h) {
    var target = this._targetSpeed();

    for (var i = this.balls.length - 1; i >= 0; i--) {
      var b = this.balls[i];
      this._steer(b, target, h);
      b.idle += h;
      b.x += b.vx * h;
      b.y += b.vy * h;

      this._collideWalls(b);
      this._collidePaddle(b, target);
      if (this._collideBricks(b) && this.state !== 'playing') return;

      if (b.y - b.r > this.height) this.balls.splice(i, 1);
    }

    this._stepCapsules(h);

    if (this.balls.length === 0 && this.state === 'playing') this._loseLife();
  };

  /* Stall breaker */
  BB.Game.prototype._unstall = function (b) {
    if (b.idle <= P.stallTime) return;
    var lo = P.stallNudgeDeg[0], hi = P.stallNudgeDeg[1];
    Physics.steepen(b, lo + this.rng() * (hi - lo));
  };

  /* Ease a ball's speed toward the target */
  BB.Game.prototype._steer = function (b, target, h) {
    var s = Physics.speedOf(b);
    if (s === 0 || Math.abs(s - target) < 0.01) return;
    var ns = s + clamp(target - s, -P.speedAccel * h, P.speedAccel * h);
    var k = ns / s;
    b.vx *= k; b.vy *= k;
  };

  BB.Game.prototype._collideWalls = function (b) {
    var bounced = false;
    if (b.x - b.r < 0)                  { b.x = b.r;               b.vx =  Math.abs(b.vx); bounced = true; }
    else if (b.x + b.r > this.width)    { b.x = this.width - b.r;  b.vx = -Math.abs(b.vx); bounced = true; }
    if (b.y - b.r < 0)                  { b.y = b.r;               b.vy =  Math.abs(b.vy); bounced = true; }
    if (bounced) {
      this._unstall(b);
      Physics.enforceMinVertical(b, P.minVerticalRatio);
      this.onSound('wall');
      this.fx.emit('wall', { x: b.x, y: b.y });
    }
  };

  BB.Game.prototype._collidePaddle = function (b, speed) {
    var p = this.paddle;
    if (b.vy <= 0) return;
    if (b.y > p.y + p.h / 2) return;
    if (!Physics.circleRect(b.x, b.y, b.r, p.x, p.y, p.w, p.h)) return;

    var max = toRad(C.ball.maxBounceDeg);
    var rel = clamp((b.x - p.centerX) / (p.w / 2), -1, 1);
    var english = clamp(this._paddleVx / P.englishRef, -1, 1) * toRad(P.englishDeg);
    var angle = clamp(rel * max + english, -max, max);
    b.vx = speed * Math.sin(angle);
    b.vy = -speed * Math.cos(angle);
    b.y = p.y - b.r;
    b.idle = 0;
    this.onSound('paddle');
    this.fx.emit('paddle', { x: b.x, y: p.y });
  };

  BB.Game.prototype._collideBricks = function (b) {
    var best = null, brick = null;
    for (var i = 0; i < this.bricks.length; i++) {
      var br = this.bricks[i];
      if (!br.alive) continue;
      var hit = Physics.circleRect(b.x, b.y, b.r, br.x, br.y, br.w, br.h);
      if (hit && (!best || hit.dist2 < best.dist2)) { best = hit; brick = br; }
    }
    if (!best) return false;

    Physics.reflect(b, best.nx, best.ny);
    b.x = best.px + best.nx * b.r;
    b.y = best.py + best.ny * b.r;
    Physics.enforceMinVertical(b, P.minVerticalRatio);

    if (brick.solid) {
      this._unstall(b);
      this.onSound('clink');
      this.fx.emit('solidHit', { x: best.px, y: best.py });
      return true;
    }

    b.idle = 0;
    this._hitBrick(brick, 1, 0, best.px, best.py);
    if (this.bricksLeft === 0) this._levelCleared();
    else this._emitHud();
    return true;
  };

  BB.Game.prototype._hitBrick = function (brick, damage, depth, px, py) {
    brick.hp -= damage;
    if (brick.hp > 0) {
      brick.hitT = 1;
      this.onSound('hit', { hp: brick.hp, max: brick.maxHp });
      this.fx.emit('brickHit', { x: px, y: py, color: brick.color });
      return;
    }
    this._destroyBrick(brick, depth);
  };

  BB.Game.prototype._destroyBrick = function (brick, depth) {
    brick.alive = false;
    brick.hp = 0;
    this.bricksLeft--;
    this.bricksDestroyed++;
    this.score += brick.points;
    this.speedRamp = Math.min(P.speedRamp.max, this.speedRamp + P.speedRamp.perBrick);

    var boom = brick.behavior === 'explode';
    this.onSound(boom ? 'explode' : 'brick', { points: brick.points });
    this.fx.emit('brickBreak', {
      x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, w: brick.w, h: brick.h,
      color: brick.color, points: brick.points, depth: depth, kind: brick.kind
    });
    this._maybeDrop(brick, brick.behavior === 'gift');
    if (boom) this._explode(brick, depth);
  };

  /** Explosive brick */
  BB.Game.prototype._explode = function (brick, depth) {
    var cx = brick.x + brick.w / 2, cy = brick.y + brick.h / 2;
    this.fx.emit('explosion', { x: cx, y: cy, depth: depth });
    var reach = C.bricks.blastReach;
    for (var i = 0; i < this.bricks.length; i++) {
      var nb = this.bricks[i];
      if (!nb.alive || nb.solid || nb === brick) continue;
      if (Math.abs(nb.row - brick.row) <= reach && Math.abs(nb.col - brick.col) <= reach) {
        this._hitBrick(nb, C.bricks.blastDamage, depth + 1, cx, cy);
      }
    }
  };

  /* power-ups */
  BB.Game.prototype._maybeDrop = function (brick, force) {
    if (!force && this.rng() >= PU.dropChance) return;
    this.capsules.push({
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      w: PU.size.w,
      h: PU.size.h,
      type: BB.PowerUps.pick(this.rng)
    });
  };

  BB.Game.prototype._stepCapsules = function (h) {
    var p = this.paddle;
    for (var i = this.capsules.length - 1; i >= 0; i--) {
      var c = this.capsules[i];
      c.y += PU.fallSpeed * h;
      if (c.y - c.h / 2 > this.height) { this.capsules.splice(i, 1); continue; }
      var overlap = c.y + c.h / 2 >= p.y && c.y - c.h / 2 <= p.y + p.h &&
                    c.x + c.w / 2 >= p.x && c.x - c.w / 2 <= p.x + p.w;
      if (overlap) { this.capsules.splice(i, 1); this._collect(c.type, c); }
    }
  };

  BB.Game.prototype._collect = function (type, c) {
    this.onSound('powerup');
    this.fx.emit('powerup', { x: c ? c.x : this.paddle.centerX, y: c ? c.y : this.paddle.y, color: BB.PowerUps.TYPES[type].color });
    if (type === 'expand') {
      this.effects.expand = PU.expand.duration;            // re-collecting refreshes the timer
      this.paddle.setTargetWidth(this.paddle.baseW * PU.expand.factor);
    } else if (type === 'slow') {
      this.effects.slow = PU.slow.duration;
    } else if (type === 'multi') {
      this._multiBall();
    }
  };

  /* Split every ball into three */
  BB.Game.prototype._multiBall = function () {
    var sources = this.balls.slice();
    var angles = [0.38, -0.38];
    for (var i = 0; i < sources.length; i++) {
      for (var j = 0; j < angles.length; j++) {
        if (this.balls.length >= PU.maxBalls) return;
        var s = sources[i], a = angles[j];
        var nb = new BB.Ball(C.ball);
        nb.attached = false;
        nb.x = s.x; nb.y = s.y;
        nb.vx = s.vx * Math.cos(a) - s.vy * Math.sin(a);
        nb.vy = s.vx * Math.sin(a) + s.vy * Math.cos(a);
        Physics.enforceMinVertical(nb, P.minVerticalRatio);
        this.balls.push(nb);
      }
    }
  };

  BB.Game.prototype._resetEffects = function () {
    this.effects.expand = 0;
    this.effects.slow = 0;
    this.capsules = [];
    this.paddle.setTargetWidth(this.paddle.baseW);
  };

  /* life / level / end */
  BB.Game.prototype._loseLife = function () {
    this.lives--;
    this.onSound('life');
    this.fx.emit('lifeLost', {});
    this._resetEffects();
    this.speedRamp = 0;
    if (this.lives <= 0) {
      this.lives = 0;
      this._end('gameover');
      return;
    }
    var ball = new BB.Ball(C.ball);
    ball.attachTo(this.paddle);
    this.balls = [ball];
    this.state = 'ready';
    this._accum = 0;
    this._emitHud();
  };

  BB.Game.prototype._levelCleared = function () {
    var level = BB.LEVELS[this.levelIndex];
    this.balls = [];
    this._resetEffects();
    if (this.levelIndex >= BB.LEVELS.length - 1) {
      this._end('victory');
      return;
    }
    this.state = 'levelclear';
    this._levelTimer = T.levelClear;
    this.onSound('clear');
    this.fx.emit('levelClear', {});
    this._setBanner(level.name + ' CLEARED', 'GET READY', 0, true);
    this._emitHud();
  };

  BB.Game.prototype._nextLevel = function () {
    this.levelIndex++;
    this._beginLevel();
    this._emitHud();
  };

  BB.Game.prototype._end = function (kind) {
    this.state = kind;
    this.balls = [];
    this.onSound(kind);
    if (kind === 'victory') this.fx.emit('victory', {});
    var rec = BB.Storage.recordGame(this.score, kind === 'victory');
    this._emitHud();
    this.onEnd({
      kind: kind,
      score: this.score,
      level: this.levelIndex + 1,
      totalLevels: BB.LEVELS.length,
      bricksDestroyed: this.bricksDestroyed,
      lives: this.lives,
      best: rec.best,
      isNewBest: rec.isNewBest && this.score > 0
    });
  };

  BB.Game.prototype._setBanner = function (title, sub, life, sticky) {
    this.banner = { title: title, sub: sub, age: 0, life: life, sticky: !!sticky };
  };

  BB.Game.prototype._emitHud = function () {
    this.onHud({
      score: this.score,
      lives: this.lives,
      maxLives: C.lives,
      best: Math.max(BB.Storage.get('best'), this.score),
      state: this.state,
      paused: this.paused,
      level: this.levelIndex + 1,
      levels: BB.LEVELS.length
    });
  };
})(window.BB = window.BB || {});
