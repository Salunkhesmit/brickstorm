(function (BB) {
  'use strict';

  BB.Storage.load();

  var canvas = document.getElementById('game-canvas');
  var input = new BB.Input();
  var renderer = new BB.Renderer(canvas);
  var game = new BB.Game({
    input: input,
    renderer: renderer,
    onHud: BB.UI.updateHud,
    onEnd: BB.UI.showResult
  });

  input.attach(canvas);
  BB.UI.init({ game: game, input: input, renderer: renderer });

  BB.app = { game: game, input: input, renderer: renderer };
})(window.BB = window.BB || {});
