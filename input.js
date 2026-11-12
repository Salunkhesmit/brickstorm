(function (BB) {
  'use strict';

  BB.Input = function Input() {
    this.enabled = false;
    this.left = false;
    this.right = false;
    this.onLaunch = null;
    this.onRestart = null;
    this._px = null;
    this._canvas = null;

    window.addEventListener('keydown', this._onKey.bind(this, true));
    window.addEventListener('keyup', this._onKey.bind(this, false));
    window.addEventListener('blur', this.reset.bind(this));
  };

  BB.Input.prototype.attach = function (canvas) {
    var self = this;
    this._canvas = canvas;
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointermove', function (e) { self._pointer(e); });
    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      self._pointer(e);
      if (self.enabled && self.onLaunch) self.onLaunch();
    });
  };

  BB.Input.prototype._pointer = function (e) {
    if (!this.enabled) return;
    var rect = this._canvas.getBoundingClientRect();
    if (!rect.width) return;
    this._px = (e.clientX - rect.left) * (BB.CONFIG.canvas.width / rect.width);
  };

  BB.Input.prototype._onKey = function (down, e) {
    var code = e.code;

    if (!down) {
      if (code === 'ArrowLeft' || code === 'KeyA') this.left = false;
      if (code === 'ArrowRight' || code === 'KeyD') this.right = false;
      return;
    }

    if (!this.enabled) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (code) {
      case 'ArrowLeft': case 'KeyA':
        this.left = true; e.preventDefault(); break;
      case 'ArrowRight': case 'KeyD':
        this.right = true; e.preventDefault(); break;
      case 'Space':
        e.preventDefault();
        if (!e.repeat && this.onLaunch) this.onLaunch();
        break;
      case 'KeyR':
        if (!e.repeat && this.onRestart) this.onRestart();
        break;
    }
  };

  /** -1, 0 or +1 depending on held keys. */
  BB.Input.prototype.axis = function () {
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  };

  BB.Input.prototype.consumePointerX = function () {
    var v = this._px;
    this._px = null;
    return v;
  };

  BB.Input.prototype.reset = function () {
    this.left = false;
    this.right = false;
    this._px = null;
  };
})(window.BB = window.BB || {});
