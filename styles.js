(function (BB) {
  'use strict';

  /* Background ambience */
  BB.THEMES = {
    midnight: { name: 'Midnight Neon', sub: 'Default',       bg: '#070913', glow2: [111, 0, 190], glowA: 0.10, grid: false, stars: false },
    nebula:   { name: 'Deep Nebula',   sub: 'Cosmic Violet', bg: '#0c0618', glow2: [168, 85, 247], glowA: 0.07, grid: false, stars: true  },
    retro:    { name: 'Retro Mint',    sub: 'Vector 1984',   bg: '#03120c', glow2: [0, 255, 136], glowA: 0.05, grid: true,  stars: false },
    void:     { name: 'Void Black',    sub: 'OLED Pitch',    bg: '#000000', glow2: null,          glowA: 0,    grid: false, stars: false }
  };

  /* HUD beam / accent colour. */
  BB.ACCENTS = {
    cyan:     { name: 'Electric Cyan', hex: '#00f0ff', fixed: '#7df4ff', rgb: [0, 240, 255] },
    lavender: { name: 'Lavender',      hex: '#ddb7ff', fixed: '#eedcff', rgb: [221, 183, 255] },
    pink:     { name: 'Hot Pink',      hex: '#ff7eb6', fixed: '#ffb0d0', rgb: [255, 126, 182] },
    mint:     { name: 'Neon Mint',     hex: '#4ade80', fixed: '#86efac', rgb: [74, 222, 128] },
    amber:    { name: 'Amber',         hex: '#fbbf24', fixed: '#fde68a', rgb: [251, 191, 36] }
  };

  /* Paddle look */
  BB.PADDLE_STYLES = {
    quantum:  { name: 'Quantum Laser', sub: 'Default', stops: ['#ddb7ff', '@accent', '#dbfcff', '@accent', '#ddb7ff'], glow: '@accent' },
    titanium: { name: 'Titanium Arc',  sub: 'Brushed steel', stops: ['#94a3b8', '#e2e8f0', '#f8fafc', '#e2e8f0', '#94a3b8'], glow: '#e2e8f0' },
    plasma:   { name: 'Plasma Pulse',  sub: 'Pulsing glow', stops: ['#7e22ce', '#c084fc', '#f5e8ff', '#c084fc', '#7e22ce'], glow: '#a855f7' },
    gold:     { name: 'Cyber Gold',    sub: 'Gold + pink', stops: ['#ff7eb6', '#fbbf24', '#fff7d6', '#fbbf24', '#ff7eb6'], glow: '#fbbf24' }
  };

  /* Ball looks */
  BB.BALL_STYLES = {
    pulse:    { name: 'Pulse',    core: '#ffffff', glow: '@accent', trail: '@accent' },
    fireball: { name: 'Fireball', core: '#ffe08a', glow: '#f97316', trail: '#f97316' },
    ion:      { name: 'Ion Arc',  core: '#f5e8ff', glow: '#a855f7', trail: '#a855f7' },
    glitch:   { name: 'Glitch',   core: '#ffffff', glow: '#ff2d95', trail: '#00f0ff' }
  };

  /* Brick materials */
  BB.BRICK_STYLES = {
    glass: { name: 'Neon Glass',   sub: 'Default' },
    retro: { name: '8-Bit Retro',  sub: 'Flat pixels' },
    hex:   { name: 'Cyber Hex',    sub: 'Cut corners' },
    holo:  { name: 'Hologram',     sub: 'Scanlines' }
  };

  /* Particle amount presets */
  BB.PARTICLE_LEVELS = { off: 0, low: 0.5, high: 1 };

  /* Legend text for the how-to-play panel / side briefing */
  BB.BRICK_INFO = [
    { kind: 'c', title: 'Standard',  text: 'Breaks in 1 hit.' },
    { kind: 'h', title: 'Tough',     text: 'Takes 2 hits.' },
    { kind: 'a', title: 'Armored',   text: 'Takes 3 hits.' },
    { kind: 'x', title: 'Explosive', text: 'Blows up the bricks around it.' },
    { kind: 'g', title: 'Gift',      text: 'Always drops a power-up.' },
    { kind: 's', title: 'Steel',     text: 'Indestructible — bounce off it.' }
  ];

  /* Resolve '@accent' to the current accent hex. */
  BB.resolveColor = function (c, accentHex) { return c === '@accent' ? accentHex : c; };
})(window.BB = window.BB || {});
