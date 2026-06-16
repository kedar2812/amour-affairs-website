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
import './styles/sections/testimonials.css';
import './styles/sections/inquiry.css';
import './styles/sections/contact.css';
import './styles/buttons.css'; // unified button identity — must load last

// ── Libraries ──
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── Modules ──
import { initNav } from './js/nav.js';
import { initHero } from './js/hero.js';
import { initHeroCanvas } from './js/hero-canvas.js';
import { initPreloader, initAllAnimations } from './js/animations.js';
import { initInstagramFeed } from './js/gallery.js';
import { initGlobe } from './js/globe.js';
import { initFooterTyping } from './js/footer-typing.js';
import { initTestimonials } from './js/testimonials.js';
import { initLeadForm } from './js/lead-form.js';

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
lenis.on('scroll', () => {
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

// ── Boot Sequence ──
async function init() {
  // 1. Run preloader animation
  await initPreloader();

  // 2. Initialize navigation
  initNav(lenis);

  // 3. Initialize 3D canvas scroll sequence (couple model)
  await initHeroCanvas();

  // 3.5. Initialize hero video loop + leaf bloom animation
  initHero();

  // 4. Initialize all scroll-triggered animations
  initAllAnimations();

  // 5. Initialize custom Instagram feed
  initInstagramFeed();

  // 5.5. Initialize testimonials carousel
  initTestimonials();

  // 5.6. Initialize inquiry form (lead capture)
  initLeadForm();

  // 6. Init footer typing effect
  initFooterTyping();

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
window.addEventListener('load', () => {
  setTimeout(() => initGlobe(), 200);
});
