(function (BB) {
  'use strict';

  BB.Storage.load();
  BB.Settings.load();
  BB.Audio.init();

  var canvas = document.getElementById('game-canvas');
  var input = new BB.Input();
  var fx = new BB.Effects();
  var renderer = new BB.Renderer(canvas, { fx: fx });
  var game = new BB.Game({
    input: input,
    renderer: renderer,
    fx: fx,
    onHud: BB.UI.updateHud,
    onEnd: BB.UI.showResult,
    onSound: BB.Audio.play
  });

  input.attach(canvas);
  BB.UI.init({ game: game, input: input, renderer: renderer });

  BB.app = { game: game, input: input, renderer: renderer, fx: fx };
})(window.BB = window.BB || {});
