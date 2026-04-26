/* ============================================================
   ANIMATIONS.JS — All ScrollTrigger Animations
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── Text Reveal Animation for headlines ── */
export function initTextReveals() {
  // Split text into words for animation
  document.querySelectorAll('.text-reveal').forEach((el) => {
    const text = el.textContent;
    const words = text.split(' ').filter(w => w.length > 0);
    el.innerHTML = words.map((word) =>
      `<span class="word"><span class="word-inner">${word}</span></span>`
    ).join(' ');
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
  cards.forEach((card, i) => {
    const direction = i % 2 === 0 ? -60 : 60;
    gsap.from(card, {
      x: direction,
      opacity: 0,
      duration: 1.0,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
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

/* ── Process Steps — scroll-driven highlight ── */
export function initProcessAnimation() {
  const steps = gsap.utils.toArray('.process__step');
  const lineFill = document.querySelector('.process__line-fill');
  const stepsContainer = document.querySelector('.process__steps');

  if (!stepsContainer || !steps.length) return;

  // Remove any pre-existing step-active classes
  steps.forEach((s) => s.classList.remove('step-active'));

  // Animate the connecting line width with scroll scrub
  if (lineFill) {
    gsap.to(lineFill, {
      width: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: stepsContainer,
        start: 'top 70%',
        end: 'bottom 55%',
        scrub: 1,
      },
    });
  }

  // For each step, activate it when the scroll line passes its midpoint
  // We split the scroll progress into N equal segments
  const total = steps.length;

  ScrollTrigger.create({
    trigger: stepsContainer,
    start: 'top 70%',
    end: 'bottom 55%',
    scrub: 1,
    onUpdate: (self) => {
      // progress goes 0 → 1 across the container
      const progress = self.progress;
      steps.forEach((step, i) => {
        // step i activates when progress passes i/(total-1) threshold (with a small lead)
        const threshold = i / (total - 1 + 0.5);
        const shouldBeActive = progress >= threshold;
        step.classList.toggle('step-active', shouldBeActive);
      });
    },
    onLeaveBack: () => {
      // All steps return to dim when scrolling back above section
      steps.forEach((s) => s.classList.remove('step-active'));
    },
  });
}

/* ── Counter Animation ── */
export function initCounters() {
  document.querySelectorAll('.about__stat-number').forEach((el) => {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;

    const suffix = el.dataset.suffix || '';

    ScrollTrigger.create({
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
    
    // Simulate loading progress from 0 to 100 over 2 seconds
    let progress = 0;
    const duration = 2000; // ms
    const intervalTime = 20;
    const step = 100 / (duration / intervalTime);

    const interval = setInterval(() => {
      progress += step;
      
      if (fill) {
        fill.style.transform = `translateX(-${100 - Math.min(progress, 100)}%)`;
      }

      if (progress >= 100) {
        clearInterval(interval);
        
        // Wait briefly at 100% before fading out
        setTimeout(() => {
          gsap.to(preloader, {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
              preloader.classList.add('loaded');
              preloader.remove(); // Clean up from DOM
              document.body.classList.remove('is-loading');
              resolve();
            },
          });
        }, 300);
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
export function initAllAnimations() {
  initTextReveals();
  initFadeReveals();
  initSlideReveals();
  initParallax();
  initServiceCards();
  initGalleryReveals();
  initProcessAnimation();
  initCounters();
  initCTABanner();
}
