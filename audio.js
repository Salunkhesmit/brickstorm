(function (BB) {
  'use strict';

  var ctx = null, master = null, muted = false;
  var listeners = [];
  var lastPlayed = {};

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    var c = ensure();
    if (!c) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function arp(notes, step, type, vol) {
    notes.forEach(function (f, i) { tone(f, step * 1.6, type, vol, null, i * step); });
  }

  // name
  var SOUNDS = {
    launch:  [60,  function () { tone(220, 0.12, 'sawtooth', 0.12, 520); }],
    wall:    [40,  function () { tone(190, 0.05, 'sine', 0.16); }],
    paddle:  [40,  function () { tone(330, 0.09, 'triangle', 0.28, 220); }],
    brick:   [25,  function (d) {
      var pts = (d && d.points) || 100;
      tone(300 + pts * 0.9, 0.08, 'square', 0.1, 200 + pts * 0.6);
    }],
    powerup: [80,  function () { arp([520, 660, 880], 0.06, 'triangle', 0.22); }],
    life:    [200, function () { tone(320, 0.4, 'sawtooth', 0.2, 70); }],
    clear:   [200, function () { arp([523, 659, 784, 1047], 0.09, 'square', 0.14); }],
    gameover:[200, function () { arp([392, 330, 262, 196], 0.17, 'sawtooth', 0.16); }],
    victory: [200, function () { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, 'square', 0.14); }],
    pause:   [80,  function () { tone(420, 0.07, 'triangle', 0.2, 280); }],
    resume:  [80,  function () { tone(280, 0.07, 'triangle', 0.2, 420); }],
    tick:    [80,  function () { tone(600, 0.05, 'sine', 0.18); }],
    blip:    [40,  function () { tone(700, 0.06, 'triangle', 0.2); }]
  };

  function emitChange() { listeners.forEach(function (fn) { fn(muted); }); }

  BB.Audio = {
    init: function () {
      muted = !!BB.Storage.get('muted');
      var unlock = function () { BB.Audio.unlock(); };
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, unlock, { once: true, passive: true });
      });
    },

    unlock: function () {
      var c = ensure();
      if (c && c.state === 'suspended' && c.resume) c.resume();
    },

    play: function (name, data) {
      if (muted) return;
      var s = SOUNDS[name];
      if (!s) return;
      var now = Date.now();
      if (lastPlayed[name] && now - lastPlayed[name] < s[0]) return;
      lastPlayed[name] = now;
      s[1](data);
    },

    isMuted: function () { return muted; },

    setMuted: function (m) {
      muted = !!m;
      BB.Storage.set('muted', muted);
      emitChange();
    },

    toggle: function () {
      BB.Audio.setMuted(!muted);
      if (!muted) { BB.Audio.unlock(); BB.Audio.play('blip'); }
    },

    onChange: function (fn) { listeners.push(fn); }
  };
})(window.BB = window.BB || {});
