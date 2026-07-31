/* ============================================================
   ANIMATIONS.JS — All ScrollTrigger Animations
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Text Reveal Animation for headlines ── */
export function initTextReveals() {
  // Split text into words for animation, preserving <em> emphasis per word
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

  // Animate each text-reveal on scroll
  document.querySelectorAll('.text-reveal').forEach((el) => {
    const wordInners = el.querySelectorAll('.word-inner');
    gsap.set(wordInners, { y: '110%', opacity: 0 });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to(wordInners, {
          y: '0%',
          opacity: 1,
          duration: 1.0,
          ease: 'power3.out',
          stagger: 0.06,
        });
      },
      once: true,
    });
  });
}

/* ── Fade Up Reveals ── */
export function initFadeReveals() {
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

/* ── Fade In from sides ── */
export function initSlideReveals() {
  gsap.utils.toArray('.slide-left').forEach((el) => {
    gsap.from(el, {
      x: -60,
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

  gsap.utils.toArray('.slide-right').forEach((el) => {
    gsap.from(el, {
      x: 60,
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

/* ── Parallax Sections ── */
export function initParallax() {
  const isMobile = window.innerWidth < 768;
  const intensity = isMobile ? 15 : 30;

  document.querySelectorAll('.parallax-img').forEach((img) => {
    gsap.to(img, {
      yPercent: intensity,
      ease: 'none',
      scrollTrigger: {
        trigger: img.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

/* ── Service Cards Stagger ── */
export function initServiceCards() {
  const cards = gsap.utils.toArray('.service-card');

  // Prime GPU layers before animation
  gsap.set(cards, { willChange: 'opacity, transform' });

  cards.forEach((card, i) => {
    const xDir = i % 2 === 0 ? -40 : 40;
    gsap.fromTo(card,
      { x: xDir, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        clearProps: 'willChange,x',
        scrollTrigger: {
          trigger: card,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
}

/* ── Gallery Image Reveals ── */
export function initGalleryReveals() {
  gsap.utils.toArray('.gallery__item').forEach((item, i) => {
    gsap.from(item, {
      scale: 0.92,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: i * 0.08,
      scrollTrigger: {
        trigger: item,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
    });
  });
}

/* ── Process Steps — scroll-driven highlight with illustration reveals ── */
export function initProcessAnimation() {
  const steps = gsap.utils.toArray('.process__step');
  const lineFill = document.querySelector('.process__line-fill');
  const stepsContainer = document.querySelector('.process__steps');

  if (!stepsContainer || !steps.length) return;

  // Remove any pre-existing step-active classes
  steps.forEach((s) => s.classList.remove('step-active'));

  // Staggered entrance animation for each step's illustration + info
  steps.forEach((step, i) => {
    const illustration = step.querySelector('.process__step-illustration');
    const info = step.querySelector('.process__step-info');

    if (illustration) {
      gsap.from(illustration, {
        y: 40,
        opacity: 0,
        scale: 0.9,
        duration: 0.9,
        ease: 'power3.out',
        delay: i * 0.1,
        scrollTrigger: {
          trigger: stepsContainer,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });
    }

    if (info) {
      gsap.from(info, {
        y: 25,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: i * 0.1 + 0.2,
        scrollTrigger: {
          trigger: stepsContainer,
          start: 'top 90%',
          toggleActions: 'play none none none',
        },
      });
    }
  });

  // The highlight scrub is mapped to the section's ENTRANCE — from the strip
  // peeking in ('top 85%') to it being fully on screen ('bottom 92%') — so
  // every step and the connecting line finish revealing while the whole strip
  // is still visible. The old window ended at 'bottom 55%', which meant the
  // final steps only lit up after the top of the section had already scrolled
  // off screen.
  const revealWindow = { trigger: stepsContainer, start: 'top 85%', end: 'bottom 92%' };

  // Animate the connecting line fill with scroll scrub
  if (lineFill) {
    gsap.to(lineFill, {
      width: '100%',
      ease: 'none',
      scrollTrigger: { ...revealWindow, scrub: 1 },
    });
  }

  // For each step, activate it when the scroll line passes its midpoint
  const total = steps.length;

  ScrollTrigger.create({
    ...revealWindow,
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;
      steps.forEach((step, i) => {
        const threshold = i / (total - 1 + 0.5);
        const shouldBeActive = progress >= threshold;
        step.classList.toggle('step-active', shouldBeActive);
      });
    },
    onLeaveBack: () => {
      steps.forEach((s) => s.classList.remove('step-active'));
    },
  });
}

/* ── Counter Animation ──
   Safe to call more than once: any previously-created stat triggers are killed
   first so the CMS can re-arm the counters after applying dashboard-edited
   numbers. The real figure is written to the element up front, so even if the
   trigger never fires (slow boot, reduced motion, scroll already past it) the
   strip reads its true value instead of sticking at 0. */
let counterTriggers = [];
export function initCounters() {
  counterTriggers.forEach((t) => t.kill());
  counterTriggers = [];

  document.querySelectorAll('.about__stat-number').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    if (isNaN(target)) return; // non-numeric CMS value → leave the baked text as-is

    el.textContent = target + suffix; // correct baseline before any animation

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: function() {
            el.textContent = Math.round(this.targets()[0].val) + suffix;
          },
        });
      },
    });
    counterTriggers.push(trigger);
  });
}

/* ── Preloader ── */
export function initPreloader() {
  return new Promise((resolve) => {
    const preloader = document.querySelector('.preloader');
    if (!preloader) {
      resolve();
      return;
    }

    const fill = preloader.querySelector('.preloader__progress-fill');
    
    // Simulate loading progress from 0 to 100 over 1.2 seconds
    let progress = 0;
    const duration = 1200; // ms
    const intervalTime = 16;
    const step = 100 / (duration / intervalTime);

    const interval = setInterval(() => {
      progress += step;
      
      if (fill) {
        fill.style.transform = `translateX(-${100 - Math.min(progress, 100)}%)`;
      }

      if (progress >= 100) {
        clearInterval(interval);
        
        // Brief pause at 100% before fading out
        setTimeout(() => {
          // Hide page content for the reveal transition
          document.body.style.opacity = '0';

          gsap.to(preloader, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete: () => {
              preloader.classList.add('loaded');
              preloader.remove(); // Clean up from DOM
              document.body.classList.remove('is-loading');

              // Smooth fade-in reveal of page content
              document.body.style.opacity = '';
              document.body.classList.add('page-revealed');
              
              resolve();
            },
          });
        }, 150);
      }
    }, intervalTime);
  });
}

/* ── CTA Banner Animation ── */
export function initCTABanner() {
  const banner = document.querySelector('.cta-banner__inner');
  if (!banner) return;

  gsap.from(banner, {
    scale: 0.95,
    opacity: 0,
    duration: 1.0,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: banner,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

/* ── Initialize All Animations ── */
/* ── About intro — gold rule draws in, paragraphs follow the headline ── */
export function initAboutIntro() {
  const copy = document.querySelector('.about__copy');
  if (!copy) return;

  const rule = copy.querySelector('.about__rule');
  const paras = copy.querySelectorAll('.about__text');
  if (rule) gsap.set(rule, { scaleX: 0 });
  gsap.set(paras, { y: 24, opacity: 0 });

  ScrollTrigger.create({
    trigger: copy,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      const tl = gsap.timeline({ delay: 0.35 }); // lets the headline lead
      if (rule) tl.to(rule, { scaleX: 1, duration: 0.9, ease: 'power3.out' });
      tl.to(paras, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      }, '-=0.6');
    },
  });
}

export function initAllAnimations() {
  initTextReveals();
  initAboutIntro();
  initFadeReveals();
  initSlideReveals();
  initParallax();
  initServiceCards();
  initGalleryReveals();
  initProcessAnimation();
  initCounters();
  initCTABanner();
}
