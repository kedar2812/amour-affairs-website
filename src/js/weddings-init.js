/* ============================================================
   WEDDINGS-INIT.JS — Dedicated init for Weddings page
   Amour Affairs · Premium Wedding Photography
   The Wedding Archive: folder grid → album view → lightbox,
   plus a love-letter testimonial marquee near the page end.
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/service-pages.css';
import '../styles/testimonials-page.css'; // reuse the exact testimonial card + marquee design
import '../styles/weddings-page.css';

// ── Shared archive page behaviour + data ──
import { initArchivePage } from './archive-page.js';
import { albums as fallbackAlbums } from './weddings-albums-data.js';
import { loadArchiveAlbums, loadWeddingsTestimonials } from './api.js';
import { fallbackWeddingsTestimonials } from './weddings-testimonials-data.js';

/* ── Testimonial marquee ─────────────────────────────────── */

const MAX_MARQUEE_CARDS = 15;

// Stock couple shots fill in for any testimonial saved without a photo
const STOCK_PHOTOS = fallbackWeddingsTestimonials.map((t) => t.src);

const escapeHTML = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Fisher–Yates shuffle on a copy — keeps the marquee feeling fresh per visit
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// "Sana & Mustafa" → "SM"  ·  "Neha" → "NE"
const initialsOf = (name) => {
  const words = String(name).replace(/&/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || '?').slice(0, 2).toUpperCase();
};

// Identical structure/classes to the testimonials page card (tcard-page)
const cardHTML = (t) => {
  const name = escapeHTML(t.name);
  return `
    <div class="tcard-page">
      ${t.src ? `
      <div class="tcard-page__photo">
        <img src="${escapeHTML(t.src)}" alt="${name}" loading="lazy" />
      </div>` : ''}
      <div class="tcard-page__body">
        <div class="tcard-page__icon">&ldquo;&ldquo;</div>
        <p class="tcard-page__text">${escapeHTML(t.quote)}</p>
        <div class="tcard-page__author">
          <div class="tcard-page__avatar">${escapeHTML(initialsOf(t.name))}</div>
          <div>
            <div class="tcard-page__name">${name}</div>
            ${t.location ? `<div class="tcard-page__loc">${escapeHTML(t.location)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;
};

function renderMarquee(testimonials) {
  const mount = document.getElementById('weddingsTestiMarquee');
  if (!mount) return;

  const list = shuffle(testimonials).slice(0, MAX_MARQUEE_CARDS);
  if (list.length === 0) {
    mount.closest('.wpage-testi')?.remove();
    return;
  }

  // Cards rendered twice so the marqueeLeft (-50%) loop is seamless
  const cards = list.map(cardHTML).join('');
  mount.innerHTML = `
    <div class="tpage-marquee-wrap">
      <div class="tpage-row tpage-row--left">
        <div class="tpage-row__track">${cards}${cards}</div>
      </div>
    </div>`;
}

/* ── Boot ────────────────────────────────────────────────── */

// Fetch testimonials in parallel with albums so neither blocks the other
const testimonialsPromise = loadWeddingsTestimonials(STOCK_PHOTOS).catch(() => null);

loadArchiveAlbums('wedding', fallbackAlbums).then((albums) => {
  initArchivePage({
    albums,
    prefix: 'wpage',
    onReady: async ({ ScrollTrigger }) => {
      const cms = await testimonialsPromise;
      const testimonials = cms && cms.length >= 4 ? cms : fallbackWeddingsTestimonials;
      renderMarquee(testimonials);
      // The marquee changes page height — recompute scroll-triggered reveals
      if (ScrollTrigger) ScrollTrigger.refresh();
    },
  });
});
