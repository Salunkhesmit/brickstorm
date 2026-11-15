(function (BB) {
  'use strict';
  var fmt = BB.Utils.formatScore;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function animOn() { return BB.Settings.get('uiAnim'); }

  var game, input, renderer;
  var els = {};
  var currentScreen = 'menu';
  var openModalId = null;
  var lastFocus = null;
  var prevHud = {};
  var countRaf = 0;

  /* Re-trigger a one-shot CSS animation class on an element. */
  function bump(el, cls) {
    if (!el || !animOn()) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    var done = function (e) {
      if (e.target !== el) return;
      el.classList.remove(cls);
      el.removeEventListener('animationend', done);
    };
    el.addEventListener('animationend', done);
  }

  var ANIM_CLASSES = ['bump', 'just-lost', 'hud-hit', 'pulse'];
  function clearAnimClasses() {
    ANIM_CLASSES.forEach(function (c) { $$('.' + c).forEach(function (el) { el.classList.remove(c); }); });
  }

  /* screens */
  function showScreen(name) {
    currentScreen = name;
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.id === 'screen-' + name); });
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
    prevHud = {};
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
    if (id === 'modal-settings') { syncSettings(); BB.Preview.start(); }
    var focusTarget = modal.querySelector('[data-autofocus]') || modal.querySelector('button');
    if (focusTarget) focusTarget.focus();
  }

  function closeModal(keepFocus) {
    if (!openModalId) return;
    var modal = document.getElementById(openModalId);
    if (openModalId === 'modal-settings') BB.Preview.stop();
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
    var p = prevHud;
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

    // little animations on change
    if (p.score !== undefined && h.score > p.score) { bump(els.score, 'bump'); if (h.best > p.best) bump(els.best, 'bump'); }
    if (p.lives !== undefined && h.lives < p.lives) {
      var lost = els.lives.children[h.lives];
      bump(lost, 'just-lost'); bump(els.hud, 'hud-hit');
    }
    if (p.level !== undefined && h.level !== p.level) bump(els.level, 'pulse');
    prevHud = { score: h.score, lives: h.lives, level: h.level, best: h.best };
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
    $$('[data-sound-toggle]').forEach(function (btn) {
      btn.classList.toggle('is-muted', muted);
      btn.setAttribute('aria-pressed', String(!muted));
      btn.title = muted ? 'Unmute (M)' : 'Mute (M)';
      var icon = btn.querySelector('.js-sound-icon');
      if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
      var label = btn.querySelector('.js-sound-label');
      if (label) label.textContent = muted ? 'MUTED' : 'ON';
    });
  }

  /* result */
  function countUp(el, target) {
    if (countRaf) cancelAnimationFrame(countRaf);
    countRaf = 0;
    el.dataset.final = fmt(target);
    if (!animOn() || target <= 0) { el.textContent = fmt(target); return; }
    var t0 = performance.now(), dur = 900;
    function step(now) {
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(target * e));
      if (k < 1) countRaf = requestAnimationFrame(step); else countRaf = 0;
    }
    countRaf = requestAnimationFrame(step);
  }

  function showResult(r) {
    var win = r.kind === 'victory';
    var modal = $('#modal-result');
    modal.setAttribute('data-kind', r.kind);

    $('#result-badge-text').textContent = r.isNewBest ? 'NEW HIGH SCORE!' : (win ? 'ALL SECTORS CLEARED' : 'MISSION FAILED');
    $('#result-title').textContent = win ? 'VICTORY!' : 'GAME OVER';
    $('#result-sub').textContent = win
      ? 'GRID STABILIZED • EVERY SECTOR PURGED'
      : 'SECTOR ' + pad2(r.level) + ' • OUT OF LIVES';
    $('#result-level').textContent = pad2(r.level) + ' / ' + pad2(r.totalLevels);
    $('#result-bricks').textContent = r.bricksDestroyed;
    $('#result-lives').textContent = r.lives;
    $('#result-best').textContent = fmt(r.best);

    openModal('modal-result');
    countUp($('#result-score'), r.score);
  }

  /* legends (brick types + power-ups) */
  function buildLegends() {
    $$('[data-legend="bricks"]').forEach(function (ul) {
      ul.innerHTML = '';
      BB.BRICK_INFO.forEach(function (i) {
        var t = BB.BRICK_TYPES[i.kind];
        var li = document.createElement('li');
        li.innerHTML = '<span class="legend__sw legend__sw--' + i.kind + '" style="--sw:' + t.color + '"></span>' +
                       '<span><b>' + i.title + '</b> ' + i.text + '</span>';
        ul.appendChild(li);
      });
    });
    var PU = BB.CONFIG.powerups;
    var puText = {
      expand: 'Paddle grows for ' + PU.expand.duration + 's.',
      multi: 'Splits every ball in three.',
      slow: 'Slows the ball for ' + PU.slow.duration + 's.'
    };
    $$('[data-legend="powerups"]').forEach(function (ul) {
      ul.innerHTML = '';
      Object.keys(BB.PowerUps.TYPES).forEach(function (k) {
        var t = BB.PowerUps.TYPES[k];
        var li = document.createElement('li');
        li.innerHTML = '<span class="legend__pill" style="background:' + t.color + ';color:' + t.text + '">' + t.label + '</span>' +
                       '<span><b>' + t.title + '</b> ' + puText[k] + '</span>';
        ul.appendChild(li);
      });
    });
  }

  /* Settings panel */
  function stopsToCss(stops) {
    return 'linear-gradient(90deg,' + stops.map(function (c) { return c === '@accent' ? 'var(--cyan)' : c; }).join(',') + ')';
  }
  function col(c) { return c === '@accent' ? 'var(--cyan)' : c; }

  var GROUPS = {
    theme: { el: '#set-theme', data: function () { return BB.THEMES; }, inner: function (k, d) {
      var g2 = d.glow2 ? ', radial-gradient(circle at 88% 92%, rgba(' + d.glow2.join(',') + ',0.55), transparent 60%)' : '';
      return '<span class="tile__sw tile__sw--theme" style="background: radial-gradient(circle at 25% 15%, rgba(var(--accent-rgb),' + (d.glowA ? 0.4 : 0) + '), transparent 60%)' + g2 + ', ' + d.bg + '"></span>' +
             '<span class="tile__txt"><b>' + d.name + '</b><small>' + d.sub + '</small></span>';
    } },
    paddle: { el: '#set-paddle', data: function () { return BB.PADDLE_STYLES; }, inner: function (k, d) {
      return '<span class="tile__sw tile__sw--paddle"><i style="background:' + stopsToCss(d.stops) + ';box-shadow:0 0 10px ' + col(d.glow) + '"></i></span>' +
             '<span class="tile__txt"><b>' + d.name + '</b><small>' + d.sub + '</small></span>';
    } },
    ball: { el: '#set-ball', data: function () { return BB.BALL_STYLES; }, inner: function (k, d) {
      return '<span class="tile__sw tile__sw--ball"><i class="ball-' + k + '" style="background:radial-gradient(circle at 35% 30%,' + col(d.core) + ',' + col(d.glow) + ');box-shadow:0 0 12px ' + col(d.glow) + '"></i></span>' +
             '<span class="tile__txt"><b>' + d.name + '</b></span>';
    } },
    brick: { el: '#set-brick', data: function () { return BB.BRICK_STYLES; }, inner: function (k, d) {
      return '<span class="tile__sw tile__sw--brick"><i class="mat-' + k + '"></i></span>' +
             '<span class="tile__txt"><b>' + d.name + '</b><small>' + d.sub + '</small></span>';
    } },
    accent: { el: '#set-accent', data: function () { return BB.ACCENTS; }, cls: 'swatch', inner: function (k, d) {
      return '<span class="swatch__dot" style="--sw:' + d.hex + '"></span><span class="sr-only">' + d.name + '</span>';
    } },
    particles: { el: '#set-particles', data: function () { return { off: 0, low: 0, high: 0 }; }, cls: 'seg', inner: function (k) {
      return k.toUpperCase();
    } }
  };

  function buildSettings() {
    Object.keys(GROUPS).forEach(function (group) {
      var g = GROUPS[group], host = $(g.el), data = g.data();
      host.innerHTML = '';
      Object.keys(data).forEach(function (key) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = g.cls || 'tile';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.dataset.group = group; b.dataset.value = key;
        b.title = data[key].name || key;
        b.innerHTML = g.inner(key, data[key]);
        b.addEventListener('click', function () { BB.Settings.set(group, key); BB.Audio.play('tick'); });
        host.appendChild(b);
      });
    });

    // on/off switches
    $$('.switch[data-key]').forEach(function (sw) {
      sw.addEventListener('click', function () {
        BB.Settings.set(sw.dataset.key, !BB.Settings.get(sw.dataset.key));
        BB.Audio.play('tick');
      });
    });

    // master volume
    var vol = $('#set-vol');
    vol.addEventListener('input', function () { BB.Settings.set('volume', Number(vol.value) / 100); });
    vol.addEventListener('change', function () { BB.Audio.play('blip'); });

    // keyboard paddle speed
    var cfg = BB.CONFIG.settings.sensitivity, slider = $('#set-sens');
    slider.min = cfg.min; slider.max = cfg.max; slider.step = cfg.step;
    slider.addEventListener('input', function () {
      var v = Number(slider.value);
      BB.Storage.set('sensitivity', v);
      $('#set-sens-val').textContent = v.toFixed(2) + 'x';
    });

    $('#btn-settings-reset').addEventListener('click', function () {
      BB.Settings.reset();
      syncSettings();
    });

    BB.Settings.onChange(function (key) {
      syncSettings();
      if (key === 'uiAnim' || key === '*') clearAnimClasses();
    });
  }

  /* Show the current values in every control of the panel. */
  function syncSettings() {
    $$('[data-group]').forEach(function (b) {
      b.setAttribute('aria-checked', String(BB.Settings.get(b.dataset.group) === b.dataset.value));
    });
    $$('.switch[data-key]').forEach(function (sw) {
      sw.setAttribute('aria-checked', String(BB.Settings.get(sw.dataset.key)));
    });
    var v = Math.round(BB.Settings.get('volume') * 100);
    $('#set-vol').value = v;
    $('#set-vol-val').textContent = v + '%';
    var s = Number(BB.Storage.get('sensitivity')) || BB.CONFIG.settings.sensitivity.default;
    $('#set-sens').value = s;
    $('#set-sens-val').textContent = s.toFixed(2) + 'x';
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

  /* Pause automatically when the player switches away. */
  function autoPause() {
    if (currentScreen === 'game' && !openModalId) pauseGame();
  }

  /* init */
  function init(deps) {
    game = deps.game; input = deps.input; renderer = deps.renderer;
    els.hud = $('.hud');
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

    // game HUD  (blur so Space/Enter can't re-trigger a focused button)
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

    // sound toggles (menu, HUD, pause card, settings)
    $$('[data-sound-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.currentTarget.blur(); BB.Audio.toggle(); });
    });
    BB.Audio.onChange(refreshSound);
    refreshSound();

    // generic modal closers
    $$('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(); });
    });
    $$('.modal[data-backdrop-close]').forEach(function (m) {
      m.addEventListener('pointerdown', function (e) { if (e.target === m) closeModal(); });
    });

    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', function () { if (document.hidden) autoPause(); });
    window.addEventListener('blur', autoPause);

    // gameplay input hooks
    input.onLaunch = function () { game.launch(); };
    input.onRestart = startGame;

    BB.Preview.init($('#settings-preview'));
    buildSettings();
    buildLegends();
    syncSettings();
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
