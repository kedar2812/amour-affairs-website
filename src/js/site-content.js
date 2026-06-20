/* ============================================================
   SITE-CONTENT.JS — Dashboard-editable page copy
   Amour Affairs · Premium Wedding Photography

   Defaults + DOM helpers for the copy blocks an admin can edit
   from the dashboard's "Website Content" page (settings group
   `site_content`): the enquiry sections inside the Weddings and
   Couple Shoots folders, and the couple-shoot session packages.

   Every page renders its bundled defaults first; when the CMS
   returns overrides they are applied on top, so the site reads
   perfectly even when the API is unreachable.

   Convention: text wrapped in *asterisks* renders italic accent
   (<em>), e.g. "Book Your *Wedding*".
   ============================================================ */

import { escapeHTML } from './testimonial-cards.js';

/** "Book Your *Wedding*" → "Book Your <em>Wedding</em>" (escaped first). */
export const emphasize = (value) =>
  escapeHTML(value).replace(/\*([^*]+)\*/g, '<em>$1</em>');

/* ── Studio profile (settings group `profile`) → footer/contact + map ──
   Applied on every page so the studio edits contact details + the map embed
   once in the dashboard Settings and the whole site reflects it. */
export function applyStudioProfile(p) {
  if (!p) return;

  // WhatsApp links (Book Now / CTAs / footer) → wa.me/<number>
  if (p.studio_whatsapp) {
    const num = String(p.studio_whatsapp).replace(/[^0-9]/g, '');
    if (num) document.querySelectorAll('a[href*="wa.me"]').forEach((a) => { a.href = `https://wa.me/${num}`; });
  }

  // Email links → mailto + visible text where it shows an address
  if (p.studio_email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      a.href = `mailto:${p.studio_email}`;
      if (a.textContent && a.textContent.includes('@')) a.textContent = p.studio_email;
    });
  }

  // Phone: tel: links + the footer/inquiry phone-number link text
  if (p.studio_phone) {
    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      a.href = `tel:${String(p.studio_phone).replace(/\s/g, '')}`;
      a.textContent = p.studio_phone;
    });
    document.querySelectorAll('.footer__contact-links a[href*="wa.me"], .inquiry__contact-link[href*="wa.me"]')
      .forEach((a) => { a.textContent = p.studio_phone; });
  }

  // Address (one string, comma/newline separated) → footer address block
  if (p.studio_address) {
    const addr = document.querySelector('.footer__address');
    if (addr) {
      addr.innerHTML = escapeHTML(p.studio_address)
        .split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean).join(',<br>');
    }
  }

  // Google Maps embed — accepts a raw embed URL or a pasted <iframe …> snippet
  if (p.studio_map_embed) {
    const m = String(p.studio_map_embed).match(/src=["']([^"']+)["']/);
    const src = m ? m[1] : (/^https?:\/\//.test(String(p.studio_map_embed).trim()) ? String(p.studio_map_embed).trim() : '');
    if (src) document.querySelectorAll('iframe[src*="google.com/maps"], .footer__map iframe').forEach((f) => { f.src = src; });
  }
}

/* ── Defaults (mirrors the seed values in api/database.sql) ── */

export const SITE_CONTENT_DEFAULTS = {
  site_weddings_enq_label: 'Begin Your Story',
  site_weddings_enq_title: 'Book Your *Wedding*',
  site_weddings_enq_text:
    'Loved what you found in this folder? Tell us about your celebration and ' +
    'we’ll get back within 24 hours — with ideas, availability and a fair quote.',
  site_weddings_enq_button: 'Send Inquiry',

  site_couple_enq_label: 'Your Story, Before The Wedding',
  site_couple_enq_title: 'Book Your *Couple Shoot*',
  site_couple_enq_text:
    'Pictured yourselves in one of these folders? Share a few details about ' +
    'the two of you and we’ll get back within 24 hours with dates, locations and ideas.',
  site_couple_enq_button: 'Send Inquiry',

  site_couple_pkg_eyebrow: 'What to Expect',
  site_couple_pkg_heading: 'Choose Your *Session*',
  site_couple_packages_json: {
    packages: [
      {
        name: 'The Stills Collection',
        tagline: 'Photographs only',
        rows: [
          { label: 'Coverage', value: '2–3 hours' },
          { label: 'Deliverables', value: '80–120 fully edited images' },
          { label: 'Turnaround', value: '2–3 weeks' },
          { label: 'Locations', value: 'Pune + outstation on request' },
          { label: 'Outfit Changes', value: 'Up to 2 included' },
        ],
      },
      {
        name: 'The Cinema Collection',
        tagline: 'A cinematic couple film',
        rows: [
          { label: 'Coverage', value: '2–3 hours' },
          { label: 'Deliverables', value: 'A 60–90 second cinematic film' },
          { label: 'Turnaround', value: '3–4 weeks' },
          { label: 'Locations', value: 'Pune + outstation on request' },
          { label: 'Outfit Changes', value: 'Up to 2 included' },
        ],
      },
      {
        name: 'The Signature Collection',
        tagline: 'Photographs + cinematic film',
        rows: [
          { label: 'Coverage', value: '4–5 hours' },
          { label: 'Deliverables', value: '80–120 edited images + cinematic film' },
          { label: 'Turnaround', value: '3–4 weeks' },
          { label: 'Locations', value: 'Pune + outstation on request' },
          { label: 'Outfit Changes', value: 'Up to 3 included' },
        ],
      },
    ],
  },
};

/* ── Enquiry section copy ──
   Fills the [data-enq] slots inside an overlay enquiry section.
   `prefix` is the settings-key prefix: 'site_weddings_enq' | 'site_couple_enq'. */
export function applyEnquiryContent(prefix, content = {}) {
  const get = (suffix) =>
    content[`${prefix}_${suffix}`] || SITE_CONTENT_DEFAULTS[`${prefix}_${suffix}`];

  const slots = {
    label: document.querySelector('[data-enq="label"]'),
    title: document.querySelector('[data-enq="title"]'),
    text: document.querySelector('[data-enq="text"]'),
    button: document.querySelector('[data-enq="button"]'),
  };

  if (slots.label) slots.label.textContent = get('label');
  if (slots.title) slots.title.innerHTML = emphasize(get('title'));
  if (slots.text) slots.text.textContent = get('text');
  if (slots.button) slots.button.textContent = get('button');
}

/* ── Couple-shoot session packages ── */

const packageCardHTML = (pkg) => `
  <div class="cpage-session__card cpage-session__card--package">
    <div class="cpage-session__pkg-head">
      <h3 class="cpage-session__pkg-name">${escapeHTML(pkg.name)}</h3>
      ${pkg.tagline ? `<span class="cpage-session__pkg-tagline">${escapeHTML(pkg.tagline)}</span>` : ''}
    </div>
    ${(pkg.rows || [])
      .filter((row) => row && row.label && row.value)
      .map((row) => `
        <div class="cpage-session__row">
          <span class="cpage-session__label">${escapeHTML(row.label)}</span>
          <span class="cpage-session__value">${escapeHTML(row.value)}</span>
        </div>`)
      .join('')}
  </div>`;

export function renderSessionPackages(content = {}) {
  const mount = document.getElementById('sessionPackages');
  if (!mount) return;

  const data = content.site_couple_packages_json;
  const packages =
    data && Array.isArray(data.packages) && data.packages.length > 0
      ? data.packages
      : SITE_CONTENT_DEFAULTS.site_couple_packages_json.packages;

  const eyebrowEl = document.querySelector('[data-pkg="eyebrow"]');
  const headingEl = document.querySelector('[data-pkg="heading"]');
  if (eyebrowEl) {
    eyebrowEl.textContent =
      content.site_couple_pkg_eyebrow || SITE_CONTENT_DEFAULTS.site_couple_pkg_eyebrow;
  }
  if (headingEl) {
    headingEl.innerHTML = emphasize(
      content.site_couple_pkg_heading || SITE_CONTENT_DEFAULTS.site_couple_pkg_heading
    );
  }

  mount.innerHTML = packages.map(packageCardHTML).join('');
}
