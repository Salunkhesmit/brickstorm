(function (BB) {
  'use strict';
  var fmt = BB.Utils.formatScore;

  function $(sel) { return document.querySelector(sel); }

  var game, input, renderer;
  var els = {};
  var currentScreen = 'menu';
  var openModalId = null;
  var lastFocus = null;

  /* screens */
  function showScreen(name) {
    currentScreen = name;
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('is-active', s.id === 'screen-' + name);
    });
    syncInput();
    if (name === 'menu') renderMenuStats();
  }

  function syncInput() {
    input.enabled = currentScreen === 'game' && !openModalId;
    if (!input.enabled) input.reset();
  }

  function startGame() {
    closeModal();
    showScreen('game');
    renderer.resize();
    game.newGame();
    syncInput();
  }

  function goMenu() {
    closeModal();
    game.stop();
    showScreen('menu');
  }

  /* modals */
  function openModal(id) {
    closeModal(true);
    var modal = document.getElementById(id);
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    openModalId = id;
    syncInput();
    var focusTarget = modal.querySelector('[data-autofocus]') || modal.querySelector('button');
    if (focusTarget) focusTarget.focus();
  }

  function closeModal(keepFocus) {
    if (!openModalId) return;
    var modal = document.getElementById(openModalId);
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    openModalId = null;
    syncInput();
    if (!keepFocus && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* HUD */
  function updateHud(h) {
    els.score.textContent = fmt(h.score);
    els.best.textContent = fmt(h.best);
    els.arena.setAttribute('data-state', h.state);

    var cells = els.lives.children;
    if (cells.length !== h.maxLives) {
      els.lives.innerHTML = '';
      for (var i = 0; i < h.maxLives; i++) {
        var c = document.createElement('span');
        c.className = 'life';
        els.lives.appendChild(c);
      }
    }
    for (var j = 0; j < els.lives.children.length; j++) {
      els.lives.children[j].classList.toggle('is-lost', j >= h.lives);
    }
    els.lives.setAttribute('aria-label', h.lives + ' of ' + h.maxLives + ' lives left');
  }

  /* menu stats */

  function renderMenuStats() {
    $('#stat-best').textContent = fmt(BB.Storage.get('best'));
    $('#stat-games').textContent = BB.Storage.get('games');
    $('#stat-wins').textContent = BB.Storage.get('wins');
  }

  /* result */
  function showResult(r) {
    var win = r.kind === 'victory';
    var modal = $('#modal-result');
    modal.setAttribute('data-kind', r.kind);

    $('#result-badge-text').textContent = r.isNewBest ? 'NEW HIGH SCORE!' : (win ? 'SECTOR CLEARED' : 'MISSION FAILED');
    $('#result-title').textContent = win ? 'VICTORY!' : 'GAME OVER';
    $('#result-sub').textContent = win ? 'ALL BRICKS DESTROYED • GRID STABILIZED' : 'OUT OF LIVES • GRID COMPROMISED';
    $('#result-score').textContent = fmt(r.score);
    $('#result-bricks').textContent = r.bricksBroken + ' / ' + r.totalBricks;
    $('#result-lives').textContent = r.lives;
    $('#result-best').textContent = fmt(r.best);

    openModal('modal-result');
  }

  /* settings */
  function initSettings() {
    var cfg = BB.CONFIG.settings.sensitivity;
    var slider = $('#set-sens');
    var out = $('#set-sens-val');
    slider.min = cfg.min; slider.max = cfg.max; slider.step = cfg.step;

    function show() {
      var v = Number(BB.Storage.get('sensitivity')) || cfg.default;
      slider.value = v;
      out.textContent = v.toFixed(2) + 'x';
    }
    slider.addEventListener('input', function () {
      var v = Number(slider.value);
      BB.Storage.set('sensitivity', v);
      out.textContent = v.toFixed(2) + 'x';
    });
    $('#btn-settings-reset').addEventListener('click', function () {
      BB.Storage.resetSettings();
      show();
    });
    show();
  }

  /* init */
  function init(deps) {
    game = deps.game; input = deps.input; renderer = deps.renderer;
    els.score = $('#hud-score');
    els.best = $('#hud-best');
    els.lives = $('#hud-lives');
    els.arena = $('#arena');

    // menu
    $('#btn-play').addEventListener('click', startGame);
    $('#btn-howto').addEventListener('click', function () { openModal('modal-howto'); });
    $('#btn-settings').addEventListener('click', function () { openModal('modal-settings'); });

    // game HUD
    $('#btn-hud-restart').addEventListener('click', function (e) { e.currentTarget.blur(); startGame(); });
    $('#btn-hud-menu').addEventListener('click', function (e) { e.currentTarget.blur(); goMenu(); });

    // result
    $('#btn-result-again').addEventListener('click', startGame);
    $('#btn-result-menu').addEventListener('click', goMenu);

    // generic modal closers
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(); });
    });
    document.querySelectorAll('.modal[data-backdrop-close]').forEach(function (m) {
      m.addEventListener('pointerdown', function (e) { if (e.target === m) closeModal(); });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openModalId && openModalId !== 'modal-result') closeModal();
    });

    // keyboard restart shortcut (R)
    input.onLaunch = function () { game.launch(); };
    input.onRestart = startGame;

    initSettings();
    renderMenuStats();
    showScreen('menu');
  }

  BB.UI = {
    init: init,
    updateHud: updateHud,
    showResult: showResult,
    showScreen: showScreen
  };
})(window.BB = window.BB || {});