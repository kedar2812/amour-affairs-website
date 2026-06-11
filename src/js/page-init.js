/* ============================================================
   PAGE-INIT.JS — Shared init for service detail pages
   Amour Affairs · Premium Wedding Photography
   Lenis smooth-scroll, GSAP ScrollTrigger, premium reveals
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/service-pages.css';

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
   ANIMATIONS
   ═══════════════════════════════════════════════════════ */

/* ── Hero headline cinematic entrance ── */
function initHeroEntrance() {
  const tl = gsap.timeline({ delay: 0.15 });

  // Eyebrow slides in from above
  tl.from('.page-hero__eyebrow', {
    y: -30, opacity: 0, duration: 0.9, ease: 'power3.out',
  });

  // Headline words stagger up
  const headline = document.querySelector('.page-hero__headline');
  if (headline) {
    const text = headline.innerHTML;
    // Wrap each line in a span for clip reveal
    headline.querySelectorAll('.word-inner')?.forEach(w => {
      gsap.set(w, { y: '110%', opacity: 0 });
    });

    tl.from(headline, {
      y: 50, opacity: 0, duration: 1.2, ease: 'power3.out',
    }, '-=0.5');
  }

  // Subtext fades up
  tl.from('.page-hero__sub', {
    y: 40, opacity: 0, duration: 1.0, ease: 'power3.out',
  }, '-=0.7');

  // Scroll cue
  tl.from('.page-hero__scroll-cue', {
    y: 20, opacity: 0, duration: 0.8, ease: 'power3.out',
  }, '-=0.4');
}

/* ── Parallax hero background ── */
function initHeroParallax() {
  const bg = document.querySelector('.page-hero__bg');
  if (!bg) return;
  gsap.to(bg, {
    yPercent: 20,
    ease: 'none',
    scrollTrigger: {
      trigger: '.page-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });
}

/* ── Fade Up Reveals ── */
function initFadeUps() {
  gsap.utils.toArray('.fade-up').forEach((el) => {
    gsap.from(el, {
      y: 60,
      opacity: 0,
      duration: 1.0,
      ease: 'power3.out',
      clearProps: 'transform',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  });
}

/* ── Text Reveal (word-by-word) ── */
function initTextReveals() {
  document.querySelectorAll('.text-reveal').forEach((el) => {
    const buildWords = (text, emphasize) =>
      text.split(' ').filter(w => w.length > 0).map((word) =>
        `<span class="word"><span class="word-inner">${emphasize ? `<em>${word}</em>` : word}</span></span>`
      );
    const parts = [];
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(...buildWords(node.textContent, false));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        parts.push(...buildWords(node.textContent, node.tagName === 'EM'));
      }
    });
    el.innerHTML = parts.join(' ');
  });

  document.querySelectorAll('.text-reveal').forEach((el) => {
    const wordInners = el.querySelectorAll('.word-inner');
    gsap.set(wordInners, { y: '110%', opacity: 0 });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to(wordInners, {
          y: '0%', opacity: 1, duration: 1.0, ease: 'power3.out', stagger: 0.06,
        });
      },
      once: true,
    });
  });
}

/* ── Slide from sides ── */
function initSlideReveals() {
  gsap.utils.toArray('.slide-left').forEach((el) => {
    gsap.from(el, {
      x: -60, opacity: 0, duration: 1.0, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });

  gsap.utils.toArray('.slide-right').forEach((el) => {
    gsap.from(el, {
      x: 60, opacity: 0, duration: 1.0, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });
}

/* ── Stagger children of a container ── */
function initStaggerGroups() {
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    const children = group.children;
    gsap.from(children, {
      y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: group, start: 'top 85%', toggleActions: 'play none none none' },
    });
  });
}

/* ── Counter / number animation ── */
function initCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseInt(el.dataset.count, 10);
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: end, duration: 2, ease: 'power2.out', roundProps: 'val',
          onUpdate: () => { el.textContent = obj.val; },
        });
      },
    });
  });
}

/* ── Gallery hover zoom + tint ── */
function initGalleryHovers() {
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

/* ── Horizontal rule / divider draw ── */
function initLineDraws() {
  document.querySelectorAll('.sp-col__rule').forEach((line) => {
    gsap.from(line, {
      scaleX: 0, transformOrigin: 'left center',
      duration: 1.2, ease: 'power3.out',
      scrollTrigger: { trigger: line, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });
}


/* ═══════════════════════════════════════════════════════
   BOOT SEQUENCE
   ═══════════════════════════════════════════════════════ */

async function init() {
  await initPreloader();
  initNav(lenis);
  initHeroEntrance();
  initHeroParallax();
  initTextReveals();
  initFadeUps();
  initSlideReveals();
  initStaggerGroups();
  initCounters();
  initLineDraws();
  initGalleryHovers();
  initMarquee();
  initFooterTyping();

  ScrollTrigger.refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
