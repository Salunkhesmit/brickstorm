(function (BB) {
  'use strict';

  var defaults = {
    best: 0,
    games: 0,
    wins: 0,
    muted: false,
    sensitivity: BB.CONFIG.settings.sensitivity.default
  };
  var data = Object.assign({}, defaults);

  function load() {
    try {
      var raw = localStorage.getItem(BB.CONFIG.storageKey);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') data = Object.assign({}, defaults, parsed);
    } catch (e) { /* ignore */ }
  }

  function save() {
    try { localStorage.setItem(BB.CONFIG.storageKey, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  BB.Storage = {
    load: load,
    get: function (key) { return data[key]; },
    set: function (key, value) { data[key] = value; save(); },

    recordGame: function (score, won) {
      var isNewBest = score > data.best;
      if (isNewBest) data.best = score;
      data.games += 1;
      if (won) data.wins += 1;
      save();
      return { isNewBest: isNewBest, best: data.best };
    },

    resetSettings: function () {
      data.sensitivity = defaults.sensitivity;
      save();
    }
  };
})(window.BB = window.BB || {});
