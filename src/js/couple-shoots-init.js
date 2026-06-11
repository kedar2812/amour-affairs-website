/* ============================================================
   COUPLE-SHOOTS-INIT.JS — Dedicated init for Couple Shoots page
   Amour Affairs · Premium Wedding Photography
   The Couples Archive: folder grid → album view → lightbox
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/service-pages.css';
import '../styles/couple-shoots-page.css';

// ── Shared archive page behaviour + data ──
import { initArchivePage } from './archive-page.js';
import { albums as fallbackAlbums } from './couple-shoots-albums-data.js';
import { loadArchiveAlbums } from './api.js';

// CMS albums first; bundled stock data if the API is unreachable
loadArchiveAlbums('couple_shoot', fallbackAlbums).then((albums) => initArchivePage({
  albums,
  prefix: 'cpage',
  onReady({ gsap }) {
    // Session details card reveal (section unique to this page)
    if (document.querySelector('.cpage-session')) {
      gsap.from('.cpage-session__inner > *', {
        scrollTrigger: {
          trigger: '.cpage-session',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 35,
        opacity: 0,
        stagger: 0.15,
        duration: 1.0,
        ease: 'power2.out',
      });
    }
  },
}));
