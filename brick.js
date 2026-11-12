(function (BB) {
  'use strict';

  BB.Brick = function Brick(x, y, w, h, type) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.color = type.color;
    this.points = type.points;
    this.alive = true;
  };

  /** Turn a level's layout strings into an array of Brick objects. */
  BB.buildBricks = function (level, cfg, canvasW) {
    var cols = cfg.cols;
    var w = (canvasW - cfg.sidePadding * 2 - cfg.gap * (cols - 1)) / cols;
    var bricks = [];
    level.layout.forEach(function (row, r) {
      for (var c = 0; c < cols; c++) {
        var type = BB.BRICK_TYPES[row.charAt(c)];
        if (!type) continue;
        bricks.push(new BB.Brick(
          cfg.sidePadding + c * (w + cfg.gap),
          cfg.topOffset + r * (cfg.height + cfg.gap),
          w, cfg.height, type
        ));
      }
    });
    return bricks;
  };
})(window.BB = window.BB || {});
