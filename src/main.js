/* ============================================================
   MAIN.JS — Entry Point
   Amour Affairs · Premium Wedding Photography
   Initializes: Lenis, GSAP, ScrollTrigger, all modules
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

// ── Libraries ──
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── Modules ──
import { initCursor } from './js/cursor.js';
import { initNav } from './js/nav.js';
import { initHero } from './js/hero.js';
import { initPreloader, initAllAnimations } from './js/animations.js';
import { initTestimonials, initGalleryHovers } from './js/gallery.js';

// ── Register GSAP Plugins ──
gsap.registerPlugin(ScrollTrigger);

// ── Initialize Lenis Smooth Scroll ──
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
});

// Store globally for hero scroll CTA
window.__lenis = lenis;

// CRITICAL: Connect Lenis to GSAP ticker
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// CRITICAL: Connect Lenis scroll to ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// ── Boot Sequence ──
async function init() {
  // 1. Run preloader animation
  await initPreloader();

  // 2. Initialize navigation
  initNav(lenis);

  // 3. Initialize cinematic video hero
  initHero();

  // 4. Initialize all scroll-triggered animations
  initAllAnimations();

  // 5. Initialize testimonials carousel
  initTestimonials();

  // 6. Initialize gallery hovers
  initGalleryHovers();

  // 7. Initialize custom cursor (last, after all elements are in DOM)
  initCursor();

  // 8. Refresh ScrollTrigger after everything is set up
  ScrollTrigger.refresh();
}

// ── DOM Ready ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
