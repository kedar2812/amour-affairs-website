/* ============================================================
   PAGE-INIT.JS — Shared init for service detail pages
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/service-pages.css';

import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { initCursor } from './cursor.js';
import { initNav } from './nav.js';
import { initPreloader } from './animations.js';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
});

window.__lenis = lenis;

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

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

/* ── Scroll-driven fade-up ── */
function initFadeUps() {
  gsap.utils.toArray('.fade-up').forEach((el) => {
    gsap.from(el, {
      y: 50,
      opacity: 0,
      duration: 1.0,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  });
}

/* ── Page hero headline slide-up on load ── */
function initHeroEntrance() {
  const targets = document.querySelectorAll('.page-hero__headline, .page-hero__sub, .page-hero__eyebrow');
  gsap.from(targets, {
    y: 60,
    opacity: 0,
    duration: 1.1,
    ease: 'power3.out',
    stagger: 0.15,
    delay: 0.2,
  });
}

/* ── Gallery hover tint ── */
function initGallery() {
  document.querySelectorAll('.pg-gallery__item').forEach((item) => {
    const img = item.querySelector('img');
    const overlay = item.querySelector('.pg-gallery__overlay');
    if (!img || !overlay) return;

    item.addEventListener('mouseenter', () => {
      gsap.to(img, { scale: 1.06, duration: 0.7, ease: 'power2.out' });
      gsap.to(overlay, { opacity: 1, duration: 0.4 });
    });
    item.addEventListener('mouseleave', () => {
      gsap.to(img, { scale: 1, duration: 0.7, ease: 'power2.out' });
      gsap.to(overlay, { opacity: 0, duration: 0.4 });
    });
  });
}

/* ── Marquee pause on hover ── */
function initMarquee() {
  document.querySelectorAll('.marquee__track').forEach((track) => {
    track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  });
}

async function init() {
  await initPreloader();
  initNav(lenis);
  initFadeUps();
  initHeroEntrance();
  initGallery();
  initMarquee();
  initCursor();
  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
