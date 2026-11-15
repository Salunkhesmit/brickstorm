(function (BB) {
  'use strict';

  BB.PowerUps = {
    TYPES: {
      expand: { label: 'WIDE',   color: '#00f0ff', text: '#070913', title: 'Wide paddle' },
      multi:  { label: '3-BALL', color: '#a855f7', text: '#ffffff', title: 'Multi-ball' },
      slow:   { label: 'SLOW',   color: '#eab308', text: '#070913', title: 'Slow ball' }
    },

    /** Pick a type using the configured weights */
    pick: function (rng) {
      var w = BB.CONFIG.powerups.weights, total = 0, k;
      for (k in w) total += w[k];
      var r = rng() * total;
      for (k in w) { r -= w[k]; if (r < 0) return k; }
      return 'expand';
    }
  };
})(window.BB = window.BB || {});
