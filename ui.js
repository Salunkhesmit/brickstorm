(function (BB) {
  'use strict';
  var fmt = BB.Utils.formatScore;

  function $(sel) { return document.querySelector(sel); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

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

  function dropFocus() {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function startGame() {
    closeModal(true);
    dropFocus();
    showScreen('game');
    renderer.resize();
    game.newGame();
    syncInput();
  }

  function goMenu() {
    closeModal(true);
    dropFocus();
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

  /* pause / resume */
  function fillPause() {
    var s = game.snapshot();
    $('#pause-sub').textContent = 'SECTOR ' + pad2(s.level) + ' • ' + s.bricksLeft + ' / ' + s.totalBricks + ' TARGETS LEFT';
    $('#pause-score').textContent = fmt(s.score);
    $('#pause-level').textContent = pad2(s.level) + ' / ' + pad2(s.levels);
    $('#pause-bricks').textContent = s.bricksLeft + ' / ' + s.totalBricks;
    $('#pause-lives').textContent = s.lives + ' / ' + s.maxLives;
  }

  function pauseGame() {
    if (currentScreen !== 'game' || openModalId) return;
    if (!game.pause()) return;
    BB.Audio.play('pause');
    fillPause();
    openModal('modal-pause');
  }

  function resumeGame() {
    if (openModalId !== 'modal-pause') return;
    closeModal(true);
    dropFocus();
    game.resume();
    BB.Audio.play('resume');
  }

  /* HUD */
  function updateHud(h) {
    els.score.textContent = fmt(h.score);
    els.best.textContent = fmt(h.best);
    els.level.textContent = 'SECTOR ' + pad2(h.level) + ' / ' + pad2(h.levels);
    els.arena.setAttribute('data-state', h.paused ? 'paused' : h.state);
    els.pause.disabled = h.paused || !(h.state === 'ready' || h.state === 'playing');

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

  /* sound toggles */
  function refreshSound() {
    var muted = BB.Audio.isMuted();
    document.querySelectorAll('[data-sound-toggle]').forEach(function (btn) {
      btn.classList.toggle('is-muted', muted);
      btn.setAttribute('aria-pressed', String(!muted));
      btn.title = muted ? 'Unmute (M)' : 'Mute (M)';
      var icon = btn.querySelector('.js-sound-icon');
      if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
      var label = btn.querySelector('.js-sound-label');
      if (label) label.textContent = muted ? 'MUTED' : 'ON';
    });
  }

  /* result (game over / victory) */
  function showResult(r) {
    var win = r.kind === 'victory';
    var modal = $('#modal-result');
    modal.setAttribute('data-kind', r.kind);

    $('#result-badge-text').textContent = r.isNewBest ? 'NEW HIGH SCORE!' : (win ? 'ALL SECTORS CLEARED' : 'MISSION FAILED');
    $('#result-title').textContent = win ? 'VICTORY!' : 'GAME OVER';
    $('#result-sub').textContent = win
      ? 'GRID STABILIZED • EVERY SECTOR PURGED'
      : 'SECTOR ' + pad2(r.level) + ' • OUT OF LIVES';
    $('#result-score').textContent = fmt(r.score);
    $('#result-level').textContent = pad2(r.level) + ' / ' + pad2(r.totalLevels);
    $('#result-bricks').textContent = r.bricksDestroyed;
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

  /* keyboard shortcuts: P / Esc / M */
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      if (openModalId === 'modal-pause') resumeGame();
      else if (openModalId && openModalId !== 'modal-result') closeModal();
      else if (!openModalId) pauseGame();
      return;
    }
    if (typing || e.repeat) return;
    if (e.code === 'KeyP') {
      if (openModalId === 'modal-pause') resumeGame();
      else if (!openModalId) pauseGame();
    } else if (e.code === 'KeyM') {
      BB.Audio.toggle();
    }
  }

  function autoPause() {
    if (currentScreen === 'game' && !openModalId) pauseGame();
  }

  /* init */
  function init(deps) {
    game = deps.game; input = deps.input; renderer = deps.renderer;
    els.score = $('#hud-score');
    els.best = $('#hud-best');
    els.lives = $('#hud-lives');
    els.level = $('#hud-level');
    els.pause = $('#btn-hud-pause');
    els.arena = $('#arena');

    // menu
    $('#btn-play').addEventListener('click', startGame);
    $('#btn-howto').addEventListener('click', function () { openModal('modal-howto'); });
    $('#btn-settings').addEventListener('click', function () { openModal('modal-settings'); });

    // game HUD
    els.pause.addEventListener('click', function (e) { e.currentTarget.blur(); pauseGame(); });
    $('#btn-hud-restart').addEventListener('click', function (e) { e.currentTarget.blur(); startGame(); });
    $('#btn-hud-menu').addEventListener('click', function (e) { e.currentTarget.blur(); goMenu(); });

    // pause card
    $('#btn-resume').addEventListener('click', resumeGame);
    $('#btn-pause-restart').addEventListener('click', startGame);
    $('#btn-pause-menu').addEventListener('click', goMenu);

    // result
    $('#btn-result-again').addEventListener('click', startGame);
    $('#btn-result-menu').addEventListener('click', goMenu);

    // sound toggles
    document.querySelectorAll('[data-sound-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.currentTarget.blur(); BB.Audio.toggle(); });
    });
    BB.Audio.onChange(refreshSound);
    refreshSound();

    // generic modal closers
    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(); });
    });
    document.querySelectorAll('.modal[data-backdrop-close]').forEach(function (m) {
      m.addEventListener('pointerdown', function (e) { if (e.target === m) closeModal(); });
    });

    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', function () { if (document.hidden) autoPause(); });
    window.addEventListener('blur', autoPause);

    // gameplay input hooks (Space / click / R)
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
