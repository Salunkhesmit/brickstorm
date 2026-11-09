(function (BB) {
  'use strict';

  BB.Utils = {
    clamp: function (v, min, max) { return v < min ? min : (v > max ? max : v); },
    toRad: function (deg) { return deg * Math.PI / 180; },

    formatScore: function (n) {
      n = Math.max(0, Math.floor(n || 0));
      if (n > 999999) return n.toLocaleString('en-US');
      var s = String(n);
      while (s.length < 6) s = '0' + s;
      return s.slice(0, 3) + ',' + s.slice(3);
    }
  };
})(window.BB = window.BB || {});