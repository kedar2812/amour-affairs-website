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
          start: 'top 80%',
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
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
      });
    }
  });

  // Animate the connecting line fill with scroll scrub
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
  const total = steps.length;

  ScrollTrigger.create({
    trigger: stepsContainer,
    start: 'top 70%',
    end: 'bottom 55%',
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
