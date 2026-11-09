(function (BB) {
  'use strict';

  BB.CONFIG = {
    storageKey: 'brickBreaker.save',

    canvas: { width: 450, height: 650 },

    lives: 3,

    paddle: {
      width: 96,
      height: 14,
      bottomOffset: 44,
      keyboardSpeed: 560
    },

    ball: {
      radius: 7,
      speed: 380,           // px/second
      launchSpreadDeg: 25,
      maxBounceDeg: 60
    },

    bricks: {
      cols: 6,
      height: 22,
      gap: 6,
      sidePadding: 18,
      topOffset: 56
    },

    settings: {
      sensitivity: { min: 0.5, max: 2, step: 0.25, default: 1 }
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