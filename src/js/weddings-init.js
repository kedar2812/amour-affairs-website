/* ============================================================
   WEDDINGS-INIT.JS — Dedicated init for Weddings page
   Amour Affairs · Premium Wedding Photography
   The Wedding Archive: folder grid → album view → lightbox
   ============================================================ */

// ── Styles ──
import '../styles/reset.css';
import '../styles/variables.css';
import '../styles/typography.css';
import '../styles/components.css';
import '../styles/sections/hero.css';
import '../styles/sections/contact.css';
import '../styles/service-pages.css';
import '../styles/weddings-page.css';

// ── Shared archive page behaviour + data ──
import { initArchivePage } from './archive-page.js';
import { albums } from './weddings-albums-data.js';

initArchivePage({ albums, prefix: 'wpage' });
