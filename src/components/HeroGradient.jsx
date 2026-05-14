/* ============================================================
   HERO-GRADIENT.JSX — Interactive ShaderGradient Hero Background
   Amour Affairs · Premium Wedding Photography

   Renders a full-bleed ShaderGradient behind the hero section
   with a compact "Customize" button that opens a floating glass
   menu with preset selection and controls.
   ============================================================ */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

/* ─── Preset Definitions ─────────────────────────────────── */
const PRESETS = [
  {
    name: 'Dusk Romance',
    color1: '#ff5005', color2: '#dbba95', color3: '#d0bce1',
    type: 'plane', uStrength: 4, uDensity: 1.3, uSpeed: 0.4,
    grain: 'on', lightType: '3d', envPreset: 'city',
    textMode: 'light',
  },
  {
    name: 'Midnight Velvet',
    color1: '#1a0533', color2: '#6b21a8', color3: '#4a1d7a',
    type: 'plane', uStrength: 3.5, uDensity: 2.0, uSpeed: 0.2,
    grain: 'on', lightType: '3d', envPreset: 'night',
    textMode: 'light',
  },
  {
    name: 'Golden Hour',
    color1: '#f59e0b', color2: '#fde68a', color3: '#ea8b2d',
    type: 'plane', uStrength: 2.5, uDensity: 1.3, uSpeed: 0.3,
    grain: 'on', lightType: '3d', envPreset: 'city',
    textMode: 'dark',
  },
  {
    name: 'Rose Bloom',
    color1: '#f43f5e', color2: '#e8657a', color3: '#c2385a',
    type: 'plane', uStrength: 3.5, uDensity: 1.8, uSpeed: 0.35,
    grain: 'on', lightType: '3d', envPreset: 'city',
    textMode: 'light',
  },
  {
    name: 'Sage Dream',
    color1: '#6ee7b7', color2: '#a7f3d0', color3: '#34d399',
    type: 'waterPlane', uStrength: 2.5, uDensity: 1.1, uSpeed: 0.25,
    grain: 'on', lightType: '3d', envPreset: 'dawn',
    textMode: 'dark',
  },
  {
    name: 'Deep Ocean',
    color1: '#0c4a6e', color2: '#38bdf8', color3: '#0369a1',
    type: 'plane', uStrength: 3, uDensity: 1.4, uSpeed: 0.3,
    grain: 'on', lightType: '3d', envPreset: 'city',
    textMode: 'light',
  },
  {
    name: 'Champagne Toast',
    color1: '#92400e', color2: '#d97706', color3: '#b45309',
    type: 'plane', uStrength: 2.5, uDensity: 1.3, uSpeed: 0.2,
    grain: 'on', lightType: '3d', envPreset: 'city',
    textMode: 'dark',
  },
  {
    name: 'Lavender Fields',
    color1: '#7c3aed', color2: '#c4b5fd', color3: '#8b5cf6',
    type: 'waterPlane', uStrength: 3, uDensity: 1.3, uSpeed: 0.3,
    grain: 'on', lightType: '3d', envPreset: 'dawn',
    textMode: 'dark',
  },
  {
    name: 'Crimson Veil',
    color1: '#7f1d1d', color2: '#ef4444', color3: '#991b1b',
    type: 'plane', uStrength: 4, uDensity: 1.5, uSpeed: 0.4,
    grain: 'on', lightType: '3d', envPreset: 'night',
    textMode: 'light',
  },
];

/* ─── Lerp helper for smooth transitions ─────────────────── */
function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1)}`;
}

function lerpNum(a, b, t) {
  return a + (b - a) * t;
}

/* ─── Static fallback gradient (for webglcontextlost) ────── */
function getFallbackGradient(preset) {
  return `linear-gradient(135deg, ${preset.color1}, ${preset.color2}, ${preset.color3})`;
}

/* ─── Main Component ─────────────────────────────────────── */
export default function HeroGradient() {
  // Load saved favorite from localStorage (default: Midnight Velvet = index 1)
  const DEFAULT_INDEX = 1;
  const savedIndex = useMemo(() => {
    try {
      const saved = localStorage.getItem('amour-gradient-favorite');
      if (saved === null) return DEFAULT_INDEX;
      const idx = parseInt(saved, 10);
      return idx >= 0 && idx < PRESETS.length ? idx : DEFAULT_INDEX;
    } catch { return DEFAULT_INDEX; }
  }, []);

  const [activeIndex, setActiveIndex] = useState(savedIndex);
  const [favoriteIndex, setFavoriteIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('amour-gradient-favorite');
      return saved !== null ? parseInt(saved, 10) : -1;
    } catch { return -1; }
  });

  // Lerped values for smooth transitions
  const [currentProps, setCurrentProps] = useState({ ...PRESETS[savedIndex] });
  const lerpRef = useRef(null);

  // Controls state
  const [grainOverride, setGrainOverride] = useState(null);
  const [speedOverride, setSpeedOverride] = useState(null);
  const [strengthOverride, setStrengthOverride] = useState(null);

  // Menu visibility
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // WebGL fallback
  const [webglLost, setWebglLost] = useState(false);

  // Scroll visibility — hide controls once past hero
  const [controlsVisible, setControlsVisible] = useState(true);
  useEffect(() => {
    function onScroll() {
      const heroThreshold = window.innerHeight * 1.2;
      setControlsVisible(window.scrollY < heroThreshold);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Apply text mode class to hero section + nav ──
  useEffect(() => {
    const hero = document.querySelector('.hero');
    const nav = document.querySelector('.nav');
    if (!hero) return;
    const preset = PRESETS[activeIndex];
    if (preset.textMode === 'light') {
      hero.classList.add('hero--light-text');
      if (nav) nav.classList.remove('nav--dark-preset');
    } else {
      hero.classList.remove('hero--light-text');
      if (nav) nav.classList.add('nav--dark-preset');
    }
  }, [activeIndex]);

  // ── Lerp transition when preset changes ──
  useEffect(() => {
    const target = PRESETS[activeIndex];
    const from = { ...currentProps };

    if (lerpRef.current) cancelAnimationFrame(lerpRef.current);

    const duration = 1200;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      setCurrentProps({
        ...target,
        color1: lerpColor(from.color1, target.color1, ease),
        color2: lerpColor(from.color2, target.color2, ease),
        color3: lerpColor(from.color3, target.color3, ease),
        uStrength: lerpNum(from.uStrength, target.uStrength, ease),
        uDensity: lerpNum(from.uDensity, target.uDensity, ease),
        uSpeed: lerpNum(from.uSpeed, target.uSpeed, ease),
      });

      if (t < 1) {
        lerpRef.current = requestAnimationFrame(animate);
      }
    }

    lerpRef.current = requestAnimationFrame(animate);
    return () => { if (lerpRef.current) cancelAnimationFrame(lerpRef.current); };
  }, [activeIndex]);

  // ── Close menu on click outside ──
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // ── Toggle favorite (can unfavorite) ──
  const toggleFavorite = useCallback(() => {
    if (favoriteIndex === activeIndex) {
      // Unfavorite
      setFavoriteIndex(-1);
      try { localStorage.removeItem('amour-gradient-favorite'); } catch {}
    } else {
      // Set favorite
      setFavoriteIndex(activeIndex);
      try { localStorage.setItem('amour-gradient-favorite', String(activeIndex)); } catch {}
    }
  }, [activeIndex, favoriteIndex]);

  // ── Randomize ──
  const randomize = useCallback(() => {
    let idx;
    do { idx = Math.floor(Math.random() * PRESETS.length); } while (idx === activeIndex);
    setActiveIndex(idx);
  }, [activeIndex]);

  // ── Computed gradient props (with overrides) ──
  const gradientProps = useMemo(() => {
    const p = { ...currentProps };
    if (grainOverride !== null) p.grain = grainOverride ? 'on' : 'off';
    if (speedOverride !== null) p.uSpeed = speedOverride;
    if (strengthOverride !== null) p.uStrength = strengthOverride;
    return p;
  }, [currentProps, grainOverride, speedOverride, strengthOverride]);

  // ── WebGL context lost handler ──
  const handleContextLost = useCallback(() => {
    setWebglLost(true);
  }, []);

  return (
    <>
      {/* ── Gradient Canvas ── */}
      <div
        className={`shader-gradient-root ${webglLost ? 'shader-gradient-root--fallback' : ''}`}
        style={webglLost ? { background: getFallbackGradient(PRESETS[activeIndex]) } : undefined}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!webglLost && (
          <ShaderGradientCanvas
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
            onCreated={({ gl }) => {
              const canvas = gl.domElement;
              canvas.addEventListener('webglcontextlost', handleContextLost);
            }}
          >
            <ShaderGradient
              type={gradientProps.type}
              color1={gradientProps.color1}
              color2={gradientProps.color2}
              color3={gradientProps.color3}
              uStrength={gradientProps.uStrength}
              uDensity={gradientProps.uDensity}
              uSpeed={gradientProps.uSpeed}
              grain={gradientProps.grain}
              lightType={gradientProps.lightType}
              envPreset={gradientProps.envPreset}
            />
          </ShaderGradientCanvas>
        )}
      </div>

      {/* ── Customize Button + Menu — portaled to body to escape stacking context ── */}
      {createPortal(
        <div
          className={`gradient-customize ${!controlsVisible ? 'gradient-customize--hidden' : ''} ${PRESETS[activeIndex].textMode === 'dark' ? 'gradient-customize--dark-preset' : ''}`}
          ref={menuRef}
        >
          {/* Expanding Menu — opens ABOVE the button */}
          <div className={`gradient-menu ${menuOpen ? 'gradient-menu--open' : ''}`}>
            {/* Header */}
            <div className="gradient-menu__header">
              <span className="gradient-menu__title">Customize Background</span>
              <button className="gradient-menu__close" onClick={() => setMenuOpen(false)}>✕</button>
            </div>

            {/* Presets Grid */}
            <div className="gradient-menu__section">
              <span className="gradient-menu__heading">Presets</span>
              <div className="gradient-menu__presets">
                {PRESETS.map((preset, i) => (
                  <button
                    key={preset.name}
                    className={`gradient-menu__preset ${i === activeIndex ? 'gradient-menu__preset--active' : ''}`}
                    onClick={() => setActiveIndex(i)}
                    title={preset.name}
                  >
                    <span
                      className="gradient-menu__preset-swatch"
                      style={{
                        background: `linear-gradient(135deg, ${preset.color1}, ${preset.color2}, ${preset.color3})`,
                      }}
                    />
                    <span className="gradient-menu__preset-name">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="gradient-menu__section">
              <span className="gradient-menu__heading">Adjust</span>

              <div className="gradient-menu__control">
                <span className="gradient-menu__control-label">Grain</span>
                <button
                  className={`gradient-menu__toggle ${(grainOverride !== null ? grainOverride : gradientProps.grain === 'on') ? 'gradient-menu__toggle--on' : ''}`}
                  onClick={() => {
                    const current = grainOverride !== null ? grainOverride : gradientProps.grain === 'on';
                    setGrainOverride(!current);
                  }}
                >
                  <span className="gradient-menu__toggle-knob" />
                </button>
              </div>

              <div className="gradient-menu__control">
                <span className="gradient-menu__control-label">Speed</span>
                <input
                  type="range"
                  className="gradient-menu__slider"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={speedOverride !== null ? speedOverride : gradientProps.uSpeed}
                  onChange={(e) => setSpeedOverride(parseFloat(e.target.value))}
                />
              </div>

              <div className="gradient-menu__control">
                <span className="gradient-menu__control-label">Intensity</span>
                <input
                  type="range"
                  className="gradient-menu__slider"
                  min="1"
                  max="6"
                  step="0.5"
                  value={strengthOverride !== null ? strengthOverride : gradientProps.uStrength}
                  onChange={(e) => setStrengthOverride(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="gradient-menu__actions">
              <button className="gradient-menu__action-btn" onClick={randomize}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                Shuffle
              </button>
              <button
                className={`gradient-menu__action-btn ${favoriteIndex === activeIndex ? 'gradient-menu__action-btn--fav-active' : ''}`}
                onClick={toggleFavorite}
                title={favoriteIndex === activeIndex ? 'Remove from favorites' : 'Set as my background'}
              >
                <span className="gradient-menu__fav-icon">
                  {favoriteIndex === activeIndex ? '♥' : '♡'}
                </span>
                {favoriteIndex === activeIndex ? 'Saved' : 'Favorite'}
              </button>
            </div>
          </div>

          {/* Trigger Button */}
          <button
            className={`gradient-customize__btn ${menuOpen ? 'gradient-customize__btn--open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            title="Customize gradient"
          >
            <svg className="gradient-customize__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="gradient-customize__label">Customize</span>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
