/* ============================================================
   INFO-PAGE-INIT.JS — Shared init for the five utility pages
   (privacy-policy, disclaimer, terms-and-conditions, faqs,
   careers). Amour Affairs · Premium Wedding Photography
   Preloader, standard nav, scroll reveals, FAQ tabs/accordion.
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/info-page.css';

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
   FAQ TABS + ACCORDION (only present on the FAQs page)
   ═══════════════════════════════════════════════════════ */

function initFaqTabs() {
  const tabs = document.querySelectorAll('.ipage-tab');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      document.querySelectorAll('.ipage-tabpanel').forEach((panel) => {
        panel.classList.toggle('is-active', panel.id === `tab-${tab.dataset.tab}`);
      });
    });
  });
}

function initFaqAccordion() {
  document.querySelectorAll('.ipage-faq').forEach((item) => {
    const q = item.querySelector('.ipage-faq__q');
    const a = item.querySelector('.ipage-faq__a');
    if (!q || !a) return;

    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      item.classList.toggle('is-open', !isOpen);
      q.setAttribute('aria-expanded', String(!isOpen));
      a.style.maxHeight = isOpen ? '0' : `${a.scrollHeight}px`;
    });
  });
}


/* ═══════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════ */

function initHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.15 });

  tl.from('.ipage-hero__eyebrow', {
    y: 20, opacity: 0, duration: 1.0, ease: 'power3.out'
  });
  tl.from('.ipage-hero__title', {
    y: 35, opacity: 0, duration: 1.2, ease: 'power3.out'
  }, '-=0.7');
  if (document.querySelector('.ipage-hero__sub')) {
    tl.from('.ipage-hero__sub', {
      y: 20, opacity: 0, duration: 1.0, ease: 'power3.out'
    }, '-=0.7');
  }
}

function initScrollReveals() {
  gsap.utils.toArray('.ipage-reveal').forEach((el) => {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 95%',
        toggleActions: 'play none none none',
      },
      y: 35,
      opacity: 0,
      duration: 1.0,
      ease: 'power2.out'
    });
  });
}


/* ═══════════════════════════════════════════════════════
   BOOT SEQUENCE
   ═══════════════════════════════════════════════════════ */

async function init() {
  initFaqTabs();
  initFaqAccordion();
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
