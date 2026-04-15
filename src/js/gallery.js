/* ============================================================
   GALLERY.JS — Swiper Testimonials + Gallery Interactions
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

import Swiper from 'swiper';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

export function initTestimonials() {
  const container = document.querySelector('#testimonialSwiper');
  if (!container) return;

  const swiper = new Swiper(container, {
    modules: [Autoplay, Pagination, Navigation, EffectFade],
    effect: 'fade',
    fadeEffect: {
      crossFade: true,
    },
    loop: true,
    speed: 900,
    autoplay: {
      delay: 6500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: '#testimPagination',
      clickable: true,
    },
    // Manual navigation — we wire the buttons ourselves
    on: {
      init() {
        const prevBtn = document.getElementById('testimPrev');
        const nextBtn = document.getElementById('testimNext');
        if (prevBtn) prevBtn.addEventListener('click', () => swiper.slidePrev());
        if (nextBtn) nextBtn.addEventListener('click', () => swiper.slideNext());
      },
    },
  });
}

export function initGalleryHovers() {
  const items = document.querySelectorAll('.gallery__item');
  items.forEach((item) => {
    item.addEventListener('mouseenter', () => item.classList.add('hovered'));
    item.addEventListener('mouseleave', () => item.classList.remove('hovered'));
  });
}
