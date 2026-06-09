/* ============================================================
   WEDDINGS-INIT.JS — Dedicated script for Weddings Detail Page
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/contact.css';
import '../styles/sections/weddings-fresh.css';

// ── Libraries ──
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── Modules ──
import { initNav } from './nav.js';
import { initPreloader } from './animations.js';

gsap.registerPlugin(ScrollTrigger);

// ── Lenis Smooth Scroll ──
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
  touchMultiplier: 2,
});

window.__lenis = lenis;

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

lenis.on('scroll', () => {
  ScrollTrigger.update();
});

// Configure ScrollTrigger to work with Lenis smooth scrolling
ScrollTrigger.scrollerProxy(document.body, {
  scrollTop(value) {
    if (arguments.length) lenis.scrollTo(value, { immediate: true });
    return lenis.scroll;
  },
  getBoundingClientRect() {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  },
  pinType: document.body.style.transform ? 'transform' : 'fixed',
});

ScrollTrigger.addEventListener('refresh', () => lenis.refresh());
ScrollTrigger.defaults({ scroller: document.body });


/* ═══════════════════════════════════════════════════════
   WEDDINGS PAGE ANIMATIONS
   ═══════════════════════════════════════════════════════ */

function initHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.15 });

  if (document.querySelector('.w-hero__tag')) {
    tl.from('.w-hero__tag', {
      y: 20, opacity: 0, duration: 1.0, ease: 'power3.out'
    });
  }

  if (document.querySelector('.w-hero__title')) {
    tl.from('.w-hero__title', {
      y: 35, opacity: 0, duration: 1.2, ease: 'power3.out'
    }, '-=0.7');
  }

  if (document.querySelector('.w-hero__sub')) {
    tl.from('.w-hero__sub', {
      y: 20, opacity: 0, duration: 1.0, ease: 'power3.out'
    }, '-=0.7');
  }

  if (document.querySelector('.w-hero__scroll')) {
    tl.from('.w-hero__scroll', {
      y: 20, opacity: 0, duration: 0.8, ease: 'power3.out'
    }, '-=0.5');
  }
}

function initScrollReveals() {
  // Intro Text Staggered Reveal
  if (document.querySelector('.w-intro__container')) {
    gsap.from('.w-intro__container > *', {
      scrollTrigger: {
        trigger: '.w-intro',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 35,
      opacity: 0,
      stagger: 0.15,
      duration: 1.0,
      ease: 'power2.out'
    });
  }

  // Masonry Gallery Items Reveal
  gsap.utils.toArray('.w-gallery__item').forEach((item) => {
    gsap.from(item, {
      scrollTrigger: {
        trigger: item,
        start: 'top 95%',
        toggleActions: 'play none none none',
      },
      y: 50,
      opacity: 0,
      duration: 1.0,
      ease: 'power3.out'
    });
  });

  // Interstitial Quote Zoom & Fade
  if (document.querySelector('.w-interstitial__content')) {
    gsap.from('.w-interstitial__content', {
      scrollTrigger: {
        trigger: '.w-interstitial',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      scale: 0.97,
      opacity: 0,
      duration: 1.2,
      ease: 'power2.out'
    });
  }

  // Featured Series Story Reveal
  if (document.querySelector('.w-story__image-wrapper')) {
    gsap.from('.w-story__image-wrapper', {
      scrollTrigger: {
        trigger: '.w-story',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      x: -50,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out'
    });
  }

  if (document.querySelector('.w-story__info')) {
    gsap.from('.w-story__info > *', {
      scrollTrigger: {
        trigger: '.w-story',
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
      x: 50,
      opacity: 0,
      stagger: 0.15,
      duration: 1.0,
      ease: 'power3.out'
    });
  }

  // Pricing cards stagger - TRIGGER on '.w-package' instead of '.w-pricing' for better reliability!
  gsap.utils.toArray('.w-package').forEach((card) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 95%',
        toggleActions: 'play none none none',
      },
      y: 55,
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out'
    });
  });

  // Call to action block reveal (if w-cta exists)
  if (document.querySelector('.w-cta__content')) {
    gsap.from('.w-cta__content > *', {
      scrollTrigger: {
        trigger: '.w-cta',
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 35,
      opacity: 0,
      stagger: 0.15,
      duration: 1.0,
      ease: 'power2.out'
    });
  }
}


/* ═══════════════════════════════════════════════════════
   BOOT SEQUENCE
   ═══════════════════════════════════════════════════════ */

async function init() {
  await initPreloader();
  initNav(lenis);
  initHeroEntrance();
  initScrollReveals();
  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
