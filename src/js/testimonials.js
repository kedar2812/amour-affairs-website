/* ============================================================
   TESTIMONIALS.JS — Mount React testimonials carousel
   Amour Affairs · Premium Wedding Photography

   Loads featured testimonials from the CMS (falling back to
   the bundled slides) and renders the Framer-Motion-powered
   TestimonialsCarousel into #testimonials-carousel.
   ============================================================ */

import React from 'react';
import { createRoot } from 'react-dom/client';
import TestimonialsCarousel, { FALLBACK_TESTIMONIALS } from './TestimonialsCarousel.jsx';
import { loadTestimonials } from './api.js';

export async function initTestimonials() {
  const mount = document.getElementById('testimonials-carousel');
  if (!mount) return;

  // Testimonials saved without a photo borrow the bundled stock shots
  const stockPhotos = FALLBACK_TESTIMONIALS.map((t) => t.src);
  const cmsTestimonials = await loadTestimonials(stockPhotos);

  const root = createRoot(mount);
  root.render(
    React.createElement(TestimonialsCarousel, {
      testimonials: cmsTestimonials || FALLBACK_TESTIMONIALS,
    })
  );
}
