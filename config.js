(function (BB) {
  'use strict';

  BB.CONFIG = {
    storageKey: 'brickBreaker.save',

    canvas: { width: 450, height: 650 },

    lives: 3,

    paddle: {
      width: 96,
      height: 14,
      bottomOffset: 44,     // gap between paddle and bottom edge
      keyboardSpeed: 560    // px/second at 1.0x sensitivity
    },

    ball: {
      radius: 7,
      speed: 380,           // px/second
      launchSpreadDeg: 25,  // random launch angle, +/- from straight up
      maxBounceDeg: 60      // steepest angle the paddle can send the ball
    },

    bricks: {
      cols: 6,
      height: 22,
      gap: 6,
      sidePadding: 18,
      topOffset: 56,
      blastDamage: 2,            // damage an explosive brick deals to each neighbour
      blastReach: 1              // neighbour distance in bricks (1 = the 8 around it)
    },

    settings: {
      sensitivity: { min: 0.5, max: 2, step: 0.25, default: 1 }
    },

    // Level 2: physics
    physics: {
      fixedStep: 1 / 120,        // simulation step (s). Ball moves < radius per step, so no tunnelling
      minVerticalRatio: 0.22,    // |vy| never drops below this share of speed (no endless flat bounces)
      speedAccel: 900,           // px/s^2 the ball changes speed (smooth slow-ball in/out)
      englishDeg: 10,            // extra paddle-bounce angle when the paddle is moving
      englishRef: 600,           // paddle speed (px/s) that gives the full english
      speedRamp: { perBrick: 0.004, max: 0.25 },  // ball gets faster as bricks break (resets per life/level)
      stallTime: 6,              // seconds a ball may go without touching the paddle or a breakable brick...
      stallNudgeDeg: [3, 7]      // ...before each wall/steel bounce steepens its angle by this much (prevents endless orbits)
    },

    // Level 2: power-ups
    powerups: {
      dropChance: 0.16,          // chance a destroyed brick drops a capsule
      fallSpeed: 150,            // px/s
      size: { w: 46, h: 18 },
      maxBalls: 6,
      weights: { expand: 0.34, multi: 0.33, slow: 0.33 },
      expand: { factor: 1.5, duration: 12 },     // paddle width multiplier, seconds
      slow:   { factor: 0.65, duration: 10 },    // ball speed multiplier, seconds
      paddleGrowSpeed: 260       // px/s the paddle grows / shrinks
    },

    // Level 3: visual effects
    effects: {
      maxParticles: 500,         // hard cap so the game never slows down
      trailLength: 12,           // ball trail points
      brickIntro: 0.4            // seconds a brick takes to drop in at level start
    },

    // Level 2: transitions
    transitions: {
      levelClear: 1.9,           // "SECTOR CLEARED" pause before the next level
      levelClearSkipAfter: 0.5,  // can't skip a banner in its first moments
      bannerIntro: 1.6,          // "SECTOR 02" intro banner
      resumeCount: 3,            // resume countdown numbers (3..2..1)
      resumeStep: 0.5            // seconds per number
    },

    // Canvas colours
    colors: {
      background: '#070913',
      glowTop: 'rgba(0, 240, 255, 0.10)',
      ball: '#ffffff',
      ballGlow: '#00f0ff',
      paddleGlow: 'rgba(0, 240, 255, 0.8)'
    }
  };
})(window.BB = window.BB || {});
