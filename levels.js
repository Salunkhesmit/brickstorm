(function (BB) {
  'use strict';

  BB.BRICK_TYPES = {
    m: { color: '#ec4899', points: 500 },  // magenta
    p: { color: '#a855f7', points: 250 },  // purple
    b: { color: '#3b82f6', points: 250 },  // blue
    c: { color: '#00f0ff', points: 100 },  // cyan
    t: { color: '#00c8d6', points: 100 }   // teal
  };

  BB.LEVELS = [
    {
      name: 'SECTOR 01',
      layout: [
        'mmmmmm',
        'pppppp',
        'bbbbbb',
        'cccccc',
        'tttttt'
      ]
    }
  ];
})(window.BB = window.BB || {});