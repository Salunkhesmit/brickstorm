(function (BB) {
  'use strict';
  var clamp = BB.Utils.clamp;

  BB.Physics = {
    circleRect: function (cx, cy, r, rx, ry, rw, rh) {
      var px = clamp(cx, rx, rx + rw);
      var py = clamp(cy, ry, ry + rh);
      var dx = cx - px, dy = cy - py;
      var d2 = dx * dx + dy * dy;
      if (d2 > r * r) return null;

      if (d2 === 0) {
        var l = cx - rx, rt = rx + rw - cx, t = cy - ry, b = ry + rh - cy;
        var m = Math.min(l, rt, t, b);
        if (m === l)  return { nx: -1, ny: 0,  px: rx,      py: cy,      dist2: 0 };
        if (m === rt) return { nx: 1,  ny: 0,  px: rx + rw, py: cy,      dist2: 0 };
        if (m === t)  return { nx: 0,  ny: -1, px: cx,      py: ry,      dist2: 0 };
        return              { nx: 0,  ny: 1,  px: cx,      py: ry + rh, dist2: 0 };
      }

      var d = Math.sqrt(d2);
      return { nx: dx / d, ny: dy / d, px: px, py: py, dist2: d2 };
    }
  };
})(window.BB = window.BB || {});