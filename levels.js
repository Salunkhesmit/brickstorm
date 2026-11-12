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
        '..mm..',
        '.mppm.',
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
        'pppppp',
        'b.bb.b',
        'cccccc',
        't.tt.t',
        'bbbbbb',
        '.pppp.'
      ]
    },
    {
      name: 'SECTOR 04', speed: 1.3,
      layout: [
        'mmmmmm',
        'm.pp.m',
        'mpbbpm',
        'pbccbp',
        'bcttcb',
        'ct..tc',
        'cttttc',
        'tttttt'
      ]
    },
    {
      name: 'SECTOR 05', speed: 1.4,
      layout: [
        'mmmmmm',
        'pmpmpm',
        'mpmpmp',
        'bbbbbb',
        'b.bb.b',
        'cccccc',
        'c.cc.c',
        'tttttt'
      ]
    }
  ];
})(window.BB = window.BB || {});
