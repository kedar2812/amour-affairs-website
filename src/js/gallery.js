/* ============================================================
   GALLERY.JS — Gallery Hover Interactions
   Amour Affairs · Premium Wedding Photography
   (Testimonials now use pure CSS infinite-scroll columns)
   ============================================================ */

export function initGalleryHovers() {
  const items = document.querySelectorAll('.gallery__item');
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => item.classList.add('hovered'));
    item.addEventListener('mouseleave', () => item.classList.remove('hovered'));
  });
}
