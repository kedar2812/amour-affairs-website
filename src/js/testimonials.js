/* ============================================================
   TESTIMONIALS.JS — Mount React testimonials carousel
   Amour Affairs · Premium Wedding Photography

   Renders the Framer-Motion-powered TestimonialsCarousel
   React component into the #testimonials-carousel mount point.
   ============================================================ */

import React from 'react';
import { createRoot } from 'react-dom/client';
import TestimonialsCarousel from './TestimonialsCarousel.jsx';

export function initTestimonials() {
  const mount = document.getElementById('testimonials-carousel');
  if (!mount) return;

  const root = createRoot(mount);
  root.render(React.createElement(TestimonialsCarousel));
}
