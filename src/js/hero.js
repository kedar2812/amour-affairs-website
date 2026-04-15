/* ============================================================
   HERO.JS — Full-Screen Parallax Slider (Manual GSAP)
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initHero() {
  const slides = document.querySelectorAll('.hero__slide');
  const indicators = document.querySelectorAll('.hero__indicator');
  const hero = document.querySelector('.hero');

  if (!slides.length || !hero) return;

  let currentIndex = 0;
  let autoPlayTimer = null;
  let isAnimating = false;
  const totalSlides = slides.length;
  const SLIDE_DURATION = 5000;

  // ── Initialize first slide ──
  function initSlides() {
    slides.forEach((slide, i) => {
      if (i === 0) {
        slide.classList.add('active');
        gsap.set(slide, { opacity: 1, zIndex: 11 });
        animateSlideContent(slide);
      } else {
        gsap.set(slide, { opacity: 0, zIndex: 10 });
      }
    });

    if (indicators.length) {
      indicators[0].classList.add('active');
    }
  }

  // ── Animate text content on slide entry ──
  function animateSlideContent(slide) {
    const line1Words = slide.querySelectorAll('.hero__line1 .word-inner');
    const line2Words = slide.querySelectorAll('.hero__line2 .word-inner');
    const tagline = slide.querySelector('.hero__tagline');

    const tl = gsap.timeline();

    // Reset
    gsap.set([line1Words, line2Words], { y: '120%' });
    if (tagline) gsap.set(tagline, { opacity: 0, y: 20 });

    // Animate line 1 words
    tl.to(line1Words, {
      y: '0%',
      duration: 1.0,
      ease: 'power3.out',
      stagger: 0.08,
    });

    // Animate line 2 words (overlapping)
    tl.to(line2Words, {
      y: '0%',
      duration: 1.2,
      ease: 'power3.out',
      stagger: 0.06,
    }, '-=0.7');

    // Tagline fade in
    if (tagline) {
      tl.to(tagline, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
      }, '-=0.5');
    }

    return tl;
  }

  // ── Transition to slide ──
  function goToSlide(nextIndex) {
    if (isAnimating || nextIndex === currentIndex) return;
    isAnimating = true;

    const currentSlide = slides[currentIndex];
    const nextSlide = slides[nextIndex];
    const currentBg = currentSlide.querySelector('.hero__slide-bg');
    const nextBg = nextSlide.querySelector('.hero__slide-bg');

    // Reset next slide content text
    const nextLine1Words = nextSlide.querySelectorAll('.hero__line1 .word-inner');
    const nextLine2Words = nextSlide.querySelectorAll('.hero__line2 .word-inner');
    const nextTagline = nextSlide.querySelector('.hero__tagline');
    gsap.set([nextLine1Words, nextLine2Words], { y: '120%' });
    if (nextTagline) gsap.set(nextTagline, { opacity: 0, y: 20 });

    // Prepare next slide
    gsap.set(nextSlide, { opacity: 0, zIndex: 12 });
    if (nextBg) gsap.set(nextBg, { scale: 1.08 });

    const tl = gsap.timeline({
      onComplete: () => {
        currentSlide.classList.remove('active');
        nextSlide.classList.add('active');
        gsap.set(currentSlide, { zIndex: 10 });
        gsap.set(nextSlide, { zIndex: 11 });
        currentIndex = nextIndex;
        isAnimating = false;

        // Reset indicators
        updateIndicators(nextIndex);

        // Restart autoplay
        startAutoPlay();
      },
    });

    // Fade in next slide
    tl.to(nextSlide, {
      opacity: 1,
      duration: 1.0,
      ease: 'power2.inOut',
    });

    // Scale down next bg from 1.08 to 1.0
    if (nextBg) {
      tl.to(nextBg, {
        scale: 1.0,
        duration: 1.4,
        ease: 'power2.out',
      }, 0);
    }

    // Fade out current
    tl.to(currentSlide, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
    }, 0.3);

    // Animate next slide text content
    tl.add(animateSlideContent(nextSlide), 0.4);
  }

  // ── Update indicators ──
  function updateIndicators(index) {
    indicators.forEach((ind, i) => {
      ind.classList.toggle('active', i === index);
      // Reset progress bar animation
      const progress = ind.querySelector('.hero__indicator-progress');
      if (progress) {
        progress.style.animation = 'none';
        progress.offsetHeight; // Force reflow
        if (i === index) {
          progress.style.animation = `indicatorFill ${SLIDE_DURATION}ms linear forwards`;
        }
      }
    });
  }

  // ── Auto-play ──
  function startAutoPlay() {
    stopAutoPlay();
    autoPlayTimer = setTimeout(() => {
      const next = (currentIndex + 1) % totalSlides;
      goToSlide(next);
    }, SLIDE_DURATION);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  // Pause on hover
  hero.addEventListener('mouseenter', stopAutoPlay);
  hero.addEventListener('mouseleave', startAutoPlay);

  // ── Indicator clicks ──
  indicators.forEach((ind, i) => {
    ind.addEventListener('click', () => {
      if (!isAnimating) {
        stopAutoPlay();
        goToSlide(i);
      }
    });
  });

  // ── Parallax on hero background ──
  slides.forEach((slide) => {
    const bg = slide.querySelector('.hero__slide-bg');
    if (bg) {
      gsap.to(bg, {
        yPercent: 15,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  });

  // ── Scroll CTA ──
  const scrollCTA = document.querySelector('.scroll-indicator');
  if (scrollCTA) {
    scrollCTA.addEventListener('click', () => {
      const aboutSection = document.querySelector('#about');
      if (aboutSection) {
        // Use lenis if available, fallback to native
        if (window.__lenis) {
          window.__lenis.scrollTo(aboutSection, { offset: -80 });
        } else {
          aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // ── Initialize ──
  initSlides();
  updateIndicators(0);
  startAutoPlay();
}
