(function (BB) {
  'use strict';

  var prefersReduced = false;
  try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  var DEFAULTS = {
    theme: 'midnight', accent: 'cyan', paddle: 'quantum', ball: 'pulse', brick: 'glass',
    particles: 'high', shake: true, haptics: true, uiAnim: !prefersReduced, volume: 0.8
  };

  var ALLOWED = {
    theme: Object.keys(BB.THEMES), accent: Object.keys(BB.ACCENTS), paddle: Object.keys(BB.PADDLE_STYLES),
    ball: Object.keys(BB.BALL_STYLES), brick: Object.keys(BB.BRICK_STYLES), particles: Object.keys(BB.PARTICLE_LEVELS)
  };

  var data = Object.assign({}, DEFAULTS);
  var listeners = [];

  function valid(key, v) {
    if (ALLOWED[key]) return ALLOWED[key].indexOf(v) !== -1;
    if (key === 'volume') return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1;
    if (key === 'shake' || key === 'haptics' || key === 'uiAnim') return typeof v === 'boolean';
    return false;
  }

  function apply() {
    var root = document.documentElement;
    var th = BB.THEMES[data.theme], ac = BB.ACCENTS[data.accent];
    root.setAttribute('data-theme', data.theme);
    root.setAttribute('data-anim', data.uiAnim ? 'on' : 'off');
    root.style.setProperty('--bg', th.bg);
    root.style.setProperty('--glow2-rgb', (th.glow2 || [0, 0, 0]).join(', '));
    root.style.setProperty('--grid-alpha', th.grid ? '0.07' : '0.03');
    root.style.setProperty('--accent-rgb', ac.rgb.join(', '));
    root.style.setProperty('--cyan', ac.hex);
    root.style.setProperty('--cyan-fixed', ac.fixed);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th.bg);
    if (BB.Audio && BB.Audio.setVolume) BB.Audio.setVolume(data.volume);
  }

  BB.Settings = {
    DEFAULTS: DEFAULTS,

    load: function () {
      var saved = BB.Storage.get('settings') || {};
      Object.keys(DEFAULTS).forEach(function (k) {
        data[k] = valid(k, saved[k]) ? saved[k] : DEFAULTS[k];
      });
      apply();
    },

    get: function (key) { return data[key]; },
    all: function () { return Object.assign({}, data); },

    set: function (key, value) {
      if (!(key in DEFAULTS) || !valid(key, value) || data[key] === value) return false;
      data[key] = value;
      BB.Storage.set('settings', Object.assign({}, data));
      apply();
      listeners.forEach(function (fn) { fn(key, value); });
      return true;
    },

    /* Back to factory settings */
    reset: function () {
      data = Object.assign({}, DEFAULTS);
      BB.Storage.set('settings', Object.assign({}, data));
      BB.Storage.resetSettings();
      apply();
      listeners.forEach(function (fn) { fn('*', null); });
    },

    onChange: function (fn) { listeners.push(fn); },

    /* Accent colour as a hex string. */
    accentHex: function () { return BB.ACCENTS[data.accent].hex; },
    /* 0, 0.5 or 1 */
    particleLevel: function () { return BB.PARTICLE_LEVELS[data.particles]; }
  };
})(window.BB = window.BB || {});
