/* ============================================================
   NAV.JS — Navigation Behavior
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

export function initNav(lenisInstance) {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileMenu = document.querySelector('.nav__mobile-menu');
  const mobileLinks = document.querySelectorAll('.nav__mobile-link');
  const mobileFooter = document.querySelector('.nav__mobile-footer');
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]');

  if (!nav) return;

  // ── Scroll-based background transition ──
  // The hero is pinned by GSAP for 350vh (end: '+=350%').
  // We only activate the frosted-glass nav AFTER the hero pin spacer is fully scrolled.
  let lastScroll = 0;

  function getNavThreshold() {
    // 3.5 × viewport height = the scroll distance of the hero pin spacer
    // Add a small buffer (0.05) so it doesn't flicker right at the edge
    return window.innerHeight * 3.55;
  }

  function updateNav() {
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle('scrolled', currentScroll > getNavThreshold());
    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav(); // Initial check

  // ── Dark nav when footer is in view ──────────────────────────────────
  const footer = document.querySelector('.footer');
  if (footer) {
    const footerObserver = new IntersectionObserver(
      (entries) => {
        nav.classList.toggle('nav--dark', entries[0].isIntersecting);
      },
      // Trigger when footer's top edge hits the bottom 5px of the viewport
      { rootMargin: '0px 0px -5px 0px', threshold: 0 }
    );
    footerObserver.observe(footer);
  }

  // ── Smooth scroll for internal nav links ──
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target && lenisInstance) {
        lenisInstance.scrollTo(target, { offset: -80 });
      }
    });
  });

  // ── Mobile hamburger toggle ──
  if (!hamburger || !mobileMenu) return;

  let isOpen = false;

  hamburger.addEventListener('click', () => {
    isOpen = !isOpen;
    toggleMobileMenu(isOpen);
  });

  // Close on mobile link click
  mobileLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // Only prevent default and smooth scroll if it's an anchor link
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        toggleMobileMenu(false);
        isOpen = false;

        // Small delay for menu close animation
        setTimeout(() => {
          if (target && lenisInstance) {
            lenisInstance.scrollTo(target, { offset: -80 });
          }
        }, 600);
      } else {
        // Normal link - let the browser navigate
        toggleMobileMenu(false);
        isOpen = false;
      }
    });
  });

  function toggleMobileMenu(open) {
    hamburger.classList.toggle('active', open);

    if (open) {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (lenisInstance) lenisInstance.stop();

      // Staggered animation using GSAP (imported dynamically)
      import('gsap').then(({ gsap }) => {
        gsap.to(mobileLinks, {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          delay: 0.2,
        });

        if (mobileFooter) {
          gsap.to(mobileFooter, {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power3.out',
            delay: 0.5,
          });
        }
      });
    } else {
      // Reset and close
      import('gsap').then(({ gsap }) => {
        gsap.to(mobileLinks, {
          y: 40,
          opacity: 0,
          duration: 0.3,
          stagger: 0.04,
          ease: 'power2.in',
        });

        if (mobileFooter) {
          gsap.to(mobileFooter, {
            y: 20,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
          });
        }

        setTimeout(() => {
          mobileMenu.classList.remove('open');
          document.body.style.overflow = '';
          if (lenisInstance) lenisInstance.start();
        }, 400);
      });
    }
  }
}
