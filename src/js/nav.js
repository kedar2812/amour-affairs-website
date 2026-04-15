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
  let lastScroll = 0;
  const scrollThreshold = 80;

  function updateNav() {
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle('scrolled', currentScroll > scrollThreshold);
    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav(); // Initial check

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
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      toggleMobileMenu(false);
      isOpen = false;

      // Small delay for menu close animation
      setTimeout(() => {
        if (target && lenisInstance) {
          lenisInstance.scrollTo(target, { offset: -80 });
        }
      }, 600);
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
