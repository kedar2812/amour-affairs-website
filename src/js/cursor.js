/* ============================================================
   CURSOR.JS — Custom Cursor with GSAP Smoothing
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

export function initCursor() {
  // Disable on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    return;
  }

  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');

  if (!dot || !ring) return;

  // Show cursors
  dot.style.opacity = '1';
  ring.style.opacity = '1';

  let mouseX = 0;
  let mouseY = 0;
  let dotX = 0;
  let dotY = 0;
  let ringX = 0;
  let ringY = 0;

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Smooth follow using RAF
  function animate() {
    // Dot follows more tightly
    dotX += (mouseX - dotX) * 0.18;
    dotY += (mouseY - dotY) * 0.18;
    dot.style.left = `${dotX}px`;
    dot.style.top = `${dotY}px`;

    // Ring follows with more lag
    ringX += (mouseX - ringX) * 0.08;
    ringY += (mouseY - ringY) * 0.08;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;

    requestAnimationFrame(animate);
  }
  
  requestAnimationFrame(animate);

  // Scale on hover of interactive elements
  const interactiveElements = document.querySelectorAll(
    'a, button, .service-card, .gallery__item, .hero__indicator, .nav__hamburger, input, textarea, [data-cursor-hover]'
  );

  interactiveElements.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      dot.classList.add('cursor-hover');
      ring.classList.add('cursor-hover');
    });
    el.addEventListener('mouseleave', () => {
      dot.classList.remove('cursor-hover');
      ring.classList.remove('cursor-hover');
    });
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });

  // Hide default cursor
  document.body.style.cursor = 'none';
  interactiveElements.forEach((el) => {
    el.style.cursor = 'none';
  });
}
