(function (BB) {
  'use strict';

  BB.Brick = function Brick(x, y, w, h, type, kind, row, col) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.kind = kind;
    this.row = row; this.col = col;
    this.color = type.color;
    this.points = type.points;
    this.maxHp = type.hits || 1;
    this.hp = this.maxHp;
    this.behavior = type.behavior || 'normal';
    this.solid = this.behavior === 'solid';
    this.metal = !!type.metal;
    this.alive = true;
    this.hitT = 0;
    this.spawn = 0;
  };

  /* Turn a level's layout strings into an array of Brick objects. */
  BB.buildBricks = function (level, cfg, canvasW) {
    var cols = cfg.cols;
    var w = (canvasW - cfg.sidePadding * 2 - cfg.gap * (cols - 1)) / cols;
    var bricks = [];
    level.layout.forEach(function (row, r) {
      for (var c = 0; c < cols; c++) {
        var kind = row.charAt(c);
        var type = BB.BRICK_TYPES[kind];
        if (!type) continue;
        var brick = new BB.Brick(
          cfg.sidePadding + c * (w + cfg.gap),
          cfg.topOffset + r * (cfg.height + cfg.gap),
          w, cfg.height, type, kind, r, c
        );
        brick.spawn = -(r * 0.07 + c * 0.03);
        bricks.push(brick);
      }
    });
    return bricks;
  };
})(window.BB = window.BB || {});
