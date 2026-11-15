(function (BB) {
  'use strict';
  var C = BB.CONFIG;
  var W = 450, H = 210;

  var canvas, renderer, fx, ball, paddle, bricks, game;
  var raf = 0, last = 0, timer = 0, respawn = [];

  function build() {
    var level = { layout: ['mhaxgs', 'pbctcb'] };         // one of every special brick + standard colours
    bricks = BB.buildBricks(level, { cols: 6, height: 22, gap: 6, sidePadding: 18, topOffset: 34 }, W);
    paddle = new BB.Paddle(C.paddle, W, H);
    paddle.y = H - 30;
    ball = new BB.Ball(C.ball);
    ball.attached = false;
    ball.x = 120; ball.y = 130; ball.vx = 170; ball.vy = -200;
    game = {
      bricks: bricks, capsules: [], paddle: paddle, balls: [ball],
      effects: { expand: 0, slow: 0 }, banner: null, countdown: 0, _resumeTimer: 0
    };
    timer = 0.7; respawn = [];
  }

  function demoHit() {
    var alive = bricks.filter(function (b) { return b.alive && !b.solid; });
    if (!alive.length) return;
    var b = alive[Math.floor(Math.random() * alive.length)];
    if (b.maxHp > 1 && b.hp > 1) {                        // durable bricks show damage first
      b.hp--; b.hitT = 1; fx.emit('brickHit', { x: b.x + b.w / 2, y: b.y + b.h, color: b.color });
      return;
    }
    b.alive = false;
    fx.emit('brickBreak', { x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, color: b.color, points: b.points });
    if (b.behavior === 'explode') fx.emit('explosion', { x: b.x + b.w / 2, y: b.y + b.h / 2, depth: 0 });
    respawn.push({ b: b, t: 0.9 });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    if (!canvas.clientWidth) return;
    renderer.resize();

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < 100) { ball.y = 100; ball.vy = Math.abs(ball.vy); fx.emit('wall', { x: ball.x, y: ball.y }); }
    if (ball.y > paddle.y - ball.r) { ball.y = paddle.y - ball.r; ball.vy = -Math.abs(ball.vy); fx.emit('paddle', { x: ball.x, y: paddle.y }); }
    paddle.moveTo(paddle.centerX + (ball.x - paddle.centerX) * Math.min(1, dt * 6));

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > C.effects.trailLength) ball.trail.shift();

    timer -= dt;
    if (timer <= 0) { demoHit(); timer = 0.85; }
    for (var i = respawn.length - 1; i >= 0; i--) {
      respawn[i].t -= dt;
      if (respawn[i].t <= 0) { var b = respawn[i].b; b.alive = true; b.hp = b.maxHp; b.spawn = -0.05; respawn.splice(i, 1); }
    }
    for (var j = 0; j < bricks.length; j++) {
      var br = bricks[j];
      if (br.spawn < C.effects.brickIntro) br.spawn += dt;
      if (br.hitT > 0) br.hitT = Math.max(0, br.hitT - dt * 6);
    }

    fx.update(dt);
    renderer.draw(game);
  }

  BB.Preview = {
    init: function (c) {
      canvas = c;
      fx = new BB.Effects({ preview: true });
      renderer = new BB.Renderer(c, { width: W, height: H, fx: fx });
      build();
    },
    start: function () {
      if (raf || !canvas) return;
      build(); fx.clear();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; },
    running: function () { return !!raf; },
    /** For tests. */
    debug: function () { return { fx: fx, renderer: renderer, game: game }; }
  };
})(window.BB = window.BB || {});
