/* ============================================================
   ABOUT-INIT.JS — Dedicated init for the About page
   Amour Affairs · Premium Wedding Photography
   Lenis smooth-scroll, GSAP ScrollTrigger, cinematic reveals
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/service-pages.css';
import '../styles/about-page.css';

// ── Libraries ──
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── Modules ──
import { initCursor } from './cursor.js';
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

gsap.ticker.add((time) => { lenis.raf(time * 1000); });

lenis.on('scroll', () => { ScrollTrigger.update(); });

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

ScrollTrigger.addEventListener('refresh', () => lenis.resize());
ScrollTrigger.defaults({ scroller: document.body });


/* ═══════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════ */

/* ── 1. Hero Cinematic Entrance (plays once on load) ── */
function initHeroReveal() {
  const tl = gsap.timeline({ delay: 0.3 });

  // Line 1 — "The Storyteller"
  tl.to('#heroTitle', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    ease: 'power3.out',
  });

  // Line 2 — subline
  tl.to('#heroSub', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
  }, '-=0.7');

  // Gold line draws in
  tl.to('#heroLine', {
    scaleX: 1,
    duration: 0.8,
    ease: 'power3.out',
  }, '-=0.4');

  // Roman numeral watermark fades in
  tl.to('.about-hero__watermark', {
    opacity: 0.03,
    duration: 1.5,
    ease: 'power2.out',
  }, '-=1.0');
}


/* ── 2. Founder Section — ScrollTrigger Reveals ── */
function initFounderReveals() {
  // Left column — photo slides in from left
  gsap.from('#founderPhoto', {
    opacity: 0,
    x: -50,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#founderPhoto',
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
    onComplete: () => {
      // Gold frame draws in after image settles
      gsap.to('.photo-frame::after', {
        opacity: 1,
        scaleX: 1,
        duration: 0.8,
        ease: 'power3.out',
      });
    },
  });

  // Animate the gold frame pseudo-element using a class toggle
  ScrollTrigger.create({
    trigger: '#founderPhoto',
    start: 'top 80%',
    onEnter: () => {
      // Use GSAP to animate the actual pseudo-element via CSS
      setTimeout(() => {
        const frame = document.querySelector('.photo-frame');
        if (frame) frame.classList.add('frame-revealed');
      }, 600);
    },
    once: true,
  });

  // Right column — stagger text elements
  const textElements = document.querySelectorAll(
    '.founder__name, .founder__role, .founder__pullquote, .founder__body, .founder__philosophy-quote, .founder__signature'
  );

  gsap.from(textElements, {
    opacity: 0,
    y: 25,
    duration: 0.9,
    ease: 'power2.out',
    stagger: 0.15,
    scrollTrigger: {
      trigger: '#founderText',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  // Photo caption fade up
  gsap.from('.founder__photo-caption', {
    opacity: 0,
    y: 15,
    duration: 0.8,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.founder__photo-caption',
      start: 'top 92%',
      toggleActions: 'play none none none',
    },
  });
}


/* ── 3. Philosophy Strip ── */
function initPhilosophyReveals() {
  const blocks = document.querySelectorAll('.philosophy__block');
  const dividers = document.querySelectorAll('.philosophy__divider');

  gsap.from(blocks, {
    opacity: 0,
    y: 20,
    duration: 0.9,
    ease: 'power2.out',
    stagger: 0.2,
    scrollTrigger: {
      trigger: '.philosophy',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  gsap.from(dividers, {
    opacity: 0,
    scaleY: 0,
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0.2,
    scrollTrigger: {
      trigger: '.philosophy',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}


/* ── 4. Parallax Photo Break ── */
function initParallax() {
  const bg = document.getElementById('parallaxBg');
  if (!bg) return;

  gsap.fromTo(bg,
    { yPercent: -10 },
    {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: '.about-parallax',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    }
  );

  // Quote fade-up
  gsap.from('.about-parallax__quote', {
    opacity: 0,
    y: 30,
    duration: 1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.about-parallax',
      start: 'top 70%',
      toggleActions: 'play none none none',
    },
  });
}


/* ── 5. CTA Section ── */
function initCtaReveal() {
  gsap.from('.about-cta__label, .about-cta__heading, .about-cta__buttons', {
    opacity: 0,
    y: 25,
    duration: 0.9,
    ease: 'power2.out',
    stagger: 0.15,
    scrollTrigger: {
      trigger: '.about-cta',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}


/* ── Nav scroll behavior for about page ── */
function initAboutNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // No hero pin spacer on this page — use a simple 60px threshold
  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav(); // run once on load
}


/* ═══════════════════════════════════════════════════════
   BOOT SEQUENCE
   ═══════════════════════════════════════════════════════ */

async function init() {
  await initPreloader();
  initNav(lenis);
  initAboutNav();
  initFounderReveals();
  initPhilosophyReveals();
  initParallax();
  initCtaReveal();
  initCursor();
  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
