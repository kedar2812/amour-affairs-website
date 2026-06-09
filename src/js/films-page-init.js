/* ============================================================
   FILMS-PAGE-INIT.JS — Dedicated init for Films page
   Amour Affairs · Premium Wedding Photography
   Lenis smooth-scroll, GSAP ScrollTrigger, random featured film
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/service-pages.css';
import '../styles/films-page.css';

// ── Libraries ──
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ── Modules ──
import { initNav } from './nav.js';
import { initPreloader } from './animations.js';
import { initFooterTyping } from './footer-typing.js';

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
   RANDOM FEATURED FILM
   ═══════════════════════════════════════════════════════ */

const FEATURED_FILMS = [
  { id: 'p38a2BZKXLQ', title: 'Annie & Shyam', type: 'Wedding Trailer' },
  { id: 'H-9VEi9q1NI', title: 'Taniya & Neeraj', type: 'Della Resorts, Lonavla' },
  { id: '53z3LB8dXo0', title: 'Neha & Gaurav', type: 'Wedding Teaser' },
  { id: 'gvlezU6RDC0', title: 'Medini & Abishal', type: 'Haldi Highlight' },
  { id: '8GXP7T-o72U', title: 'Annie & Shyam', type: 'Final Trailer' },
  { id: 'cHWYpSlPYE8', title: 'Disha & Kunal', type: 'Prewedding Film' },
];

function initFeaturedFilm() {
  const iframe = document.getElementById('featuredIframe');
  const titleEl = document.getElementById('featuredTitle');
  const typeEl = document.getElementById('featuredType');

  if (!iframe) return;

  const film = FEATURED_FILMS[Math.floor(Math.random() * FEATURED_FILMS.length)];

  iframe.src = `https://www.youtube.com/embed/${film.id}?rel=0&modestbranding=1&color=white`;
  iframe.title = `${film.title} — ${film.type}`;

  if (titleEl) titleEl.textContent = film.title;
  if (typeEl) typeEl.textContent = film.type;
}


/* ═══════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════ */

/* Hero entrance */
function initHeroReveal() {
  const tl = gsap.timeline({ delay: 0.3 });

  tl.from('.fpage-hero__eyebrow', {
    opacity: 0, y: -15, duration: 0.7, ease: 'power3.out',
  });

  tl.from('.fpage-hero__title', {
    opacity: 0, y: 30, duration: 1, ease: 'power3.out',
  }, '-=0.4');

  tl.from('.fpage-hero__sub', {
    opacity: 0, y: 20, duration: 0.8, ease: 'power3.out',
  }, '-=0.6');
}

/* Featured film reveal */
function initFeaturedReveal() {
  gsap.from('.fpage-featured__inner', {
    opacity: 0, y: 50, duration: 1.2, ease: 'power3.out',
    scrollTrigger: {
      trigger: '.fpage-featured',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}

/* Gallery cards stagger */
function initGalleryReveal() {
  gsap.from('.fpage-card', {
    opacity: 0, y: 60, duration: 0.9, ease: 'power3.out', stagger: 0.12,
    scrollTrigger: {
      trigger: '.fpage-gallery__grid',
      start: 'top 82%',
      toggleActions: 'play none none none',
    },
  });
}

/* Gallery section header */
function initGalleryHeaderReveal() {
  gsap.from('.fpage-gallery__header', {
    opacity: 0, y: 30, duration: 0.9, ease: 'power3.out',
    scrollTrigger: {
      trigger: '.fpage-gallery__header',
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

/* CTA reveal */
function initCtaReveal() {
  gsap.from('.fpage-cta__label, .fpage-cta__heading, .fpage-cta__btn', {
    opacity: 0, y: 25, duration: 0.9, ease: 'power2.out', stagger: 0.15,
    scrollTrigger: {
      trigger: '.fpage-cta',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });
}

/* Nav scroll behavior */
function initPageNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  function updateNav() {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();
}


/* ═══════════════════════════════════════════════════════
   VIDEO MODAL
   ═══════════════════════════════════════════════════════ */

function initVideoModal() {
  const modal = document.getElementById('videoModal');
  const modalIframe = document.getElementById('modalIframe');
  const closeBtn = modal?.querySelector('.fpage-modal__close');
  const backdrop = modal?.querySelector('.fpage-modal__backdrop');

  if (!modal || !modalIframe) return;

  function openModal(videoId) {
    modalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    lenis.stop();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    lenis.start();
    // Clear iframe after transition to stop playback
    setTimeout(() => { modalIframe.src = ''; }, 400);
  }

  // Card clicks
  document.querySelectorAll('.fpage-card[data-video-id]').forEach(card => {
    card.addEventListener('click', () => {
      openModal(card.dataset.videoId);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.dataset.videoId);
      }
    });
  });

  // Close handlers
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
}


/* ═══════════════════════════════════════════════════════
   BOOT SEQUENCE
   ═══════════════════════════════════════════════════════ */

async function init() {
  await initPreloader();
  initNav(lenis);
  initPageNav();
  initFeaturedFilm();
  initVideoModal();
  initHeroReveal();
  initFeaturedReveal();
  initGalleryHeaderReveal();
  initGalleryReveal();
  initCtaReveal();
  initFooterTyping();

  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
