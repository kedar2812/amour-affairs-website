/* ============================================================
   MAIN.JS — Entry Point
   Amour Affairs · Premium Wedding Photography
   Initializes: Lenis, GSAP, ScrollTrigger, ShaderGradient, all modules
   ============================================================ */

// ── Styles ──
import './styles/reset.css';
import './styles/variables.css';
import './styles/typography.css';
import './styles/components.css';
import './styles/sections/hero.css';
import './styles/sections/about.css';
import './styles/sections/services.css';
import './styles/sections/process.css';
import './styles/sections/gallery.css';
import './styles/sections/press.css';
import './styles/sections/contact.css';
import './styles/sections/shader-gradient.css';

// ── Libraries ──
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── React (for ShaderGradient) ──
import React from 'react';
import { createRoot } from 'react-dom/client';
import HeroGradient from './components/HeroGradient.jsx';

// ── Modules ──
import { initNav } from './js/nav.js';
import { initHeroCanvas } from './js/hero-canvas.js';
import { initPreloader, initAllAnimations } from './js/animations.js';
import { initInstagramFeed } from './js/gallery.js';
import { initGlobe } from './js/globe.js';

// ── Register GSAP Plugins ──
gsap.registerPlugin(ScrollTrigger);

// ── Initialize Lenis Smooth Scroll ──
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
  touchMultiplier: 2,
});

// Store globally for other modules
window.__lenis = lenis;

// CRITICAL: Connect Lenis to GSAP ticker
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});


// CRITICAL: Lenis + ScrollTrigger integration for pinned sections
// Without scrollerProxy, pinned heroes jitter with Lenis
lenis.on('scroll', (e) => {
  ScrollTrigger.update();
});

// Tell ScrollTrigger to use Lenis scroll values
ScrollTrigger.scrollerProxy(document.body, {
  scrollTop(value) {
    if (arguments.length) {
      lenis.scrollTo(value, { immediate: true });
    }
    return lenis.scroll;
  },
  getBoundingClientRect() {
    return {
      top: 0, left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },
  pinType: document.body.style.transform ? 'transform' : 'fixed',
});

ScrollTrigger.addEventListener('refresh', () => lenis.resize());
ScrollTrigger.defaults({ scroller: document.body });

// ── Mount ShaderGradient React Component ──
function mountShaderGradient() {
  const container = document.getElementById('shader-gradient-root');
  if (container) {
    const root = createRoot(container);
    root.render(React.createElement(HeroGradient));
  }
}

// ── Boot Sequence ──
async function init() {
  // 1. Run preloader animation
  await initPreloader();

  // 2. Initialize navigation
  initNav(lenis);

  // 3. Mount the ShaderGradient background
  mountShaderGradient();

  // 4. Initialize 3D canvas scroll sequence (model frames only)
  await initHeroCanvas();

  // 5. Initialize all scroll-triggered animations
  initAllAnimations();

  // 6. Initialize custom Instagram feed
  initInstagramFeed();

  // 7. Refresh ScrollTrigger after everything is set up
  ScrollTrigger.refresh();
}

// ── DOM Ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ── Globe — initialise independently after layout settles ──
// Uses its own setTimeout so it's never blocked by the preloader
window.addEventListener('load', () => {
  setTimeout(() => initGlobe(), 200);
});
