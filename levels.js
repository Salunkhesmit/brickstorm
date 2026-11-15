(function (BB) {
  'use strict';

  BB.BRICK_TYPES = {
    // standard — 1 hit
    m: { color: '#ec4899', points: 500 },  // magenta
    p: { color: '#a855f7', points: 250 },  // purple
    b: { color: '#3b82f6', points: 250 },  // blue
    c: { color: '#00f0ff', points: 100 },  // cyan
    t: { color: '#00c8d6', points: 100 },  // teal
    // special
    h: { color: '#6366f1', points: 200, hits: 2 },                              // tough
    a: { color: '#cbd5e1', points: 400, hits: 3, metal: true },                 // armored
    x: { color: '#f97316', points: 150, behavior: 'explode' },                  // explosive
    g: { color: '#eab308', points: 100, behavior: 'gift' },                     // gift
    s: { color: '#475569', points: 0,   behavior: 'solid', metal: true }        // steel
  };

  BB.LEVELS = [
    {
      name: 'SECTOR 01', speed: 1.0,
      layout: [
        'mmmmmm',
        'pppppp',
        'bbbbbb',
        'cccccc',
        'tttttt'
      ]
    },
    {
      name: 'SECTOR 02', speed: 1.1,
      layout: [
        '..hh..',
        '.mggm.',
        'mppppm',
        'bbbbbb',
        '.cccc.',
        'tttttt'
      ]
    },
    {
      name: 'SECTOR 03', speed: 1.2,
      layout: [
        'm.mm.m',
        'phphph',
        's.aa.s',
        'cccccc',
        't.tt.t',
        'bbbbbb',
        '.pppp.'
      ]
    },
    {
      name: 'SECTOR 04', speed: 1.3,
      layout: [
        'mmaamm',
        'm.pp.m',
        'mpbbpm',
        'pbccbp',
        'bcxxcb',
        'ct..tc',
        'cgttgc',
        'tttttt'
      ]
    },
    {
      name: 'SECTOR 05', speed: 1.4,
      layout: [
        'mmmmmm',
        'hmhmhm',
        'mxmmxm',
        'bbaabb',
        's.bb.s',
        'cccccc',
        'g.cc.g',
        'tttttt'
      ]
    }
  ];

  /* Helper used by the game and tests */
  BB.isBreakable = function (type) { return type.behavior !== 'solid'; };
})(window.BB = window.BB || {});
