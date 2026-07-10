/* ============================================================
   NOTICE.JS — Urgency / booking-availability notice
   Amour Affairs · Premium Wedding Photography

   Renders a site-wide announcement bar and (on the homepage) a
   floating availability badge. Every aspect — copy, CTA, colours,
   position, on/off, dismissibility — is driven by the dashboard
   (settings group `notice`). Fail-safe: any problem = no notice,
   the site is never blocked.
   ============================================================ */

import '../styles/sections/notice.css';
import { loadNotice } from './api.js';

const DISMISS_KEY = 'aa_notice_dismissed';
const BADGE_DISMISS_KEY = 'aa_notice_badge_dismissed';
const isOn = (v) => String(v) === '1' || String(v).toLowerCase() === 'true';

// Kick the fetch off at module load — well before the preloader finishes — so
// the data is ready the instant initNotice() runs and the bar paints on reveal,
// instead of being queued behind the homepage's heavy 3D-hero initialisation.
const noticePromise = loadNotice().catch(() => null);

/** Allow only safe link targets; anything else becomes a plain anchor. */
function safeLink(value) {
  const v = String(value || '').trim();
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(v)) return v;
  return '';
}

/** Validate a CSS hex colour, else return the fallback. */
function safeColor(value, fallback) {
  const v = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
}

export async function initNotice() {
  let n;
  try { n = await noticePromise; } catch { return; }
  if (!n || !isOn(n.notice_enabled)) return;

  const message = (n.notice_message || '').trim();
  const ctaLabel = (n.notice_cta_label || '').trim();
  const ctaLink = safeLink(n.notice_cta_link);
  const bg = safeColor(n.notice_bg_color, '#2A1E16');
  const fg = safeColor(n.notice_text_color, '#F5EDE2');

  if (isOn(n.notice_bar_enabled) && message) {
    renderBar({ message, ctaLabel, ctaLink, bg, fg, position: n.notice_bar_position, dismissible: isOn(n.notice_dismissible) });
  }

  // Floating badge — homepage only (where the hero lives).
  if (isOn(n.notice_badge_enabled) && document.querySelector('.hero--canvas')) {
    const badgeText = (n.notice_badge_text || message || '').trim();
    if (badgeText) renderBadge({ badgeText, ctaLink, bg, fg });
  }
}


/* ── Announcement bar ── */
function renderBar({ message, ctaLabel, ctaLink, bg, fg, position, dismissible }) {
  // Dismissal only lasts the current visit (sessionStorage) — the bar
  // returns on the next visit so the urgency message is never forgotten.
  if (dismissible) {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === message) return;
    } catch { /* storage blocked — just show it */ }
  }

  const atBottom = String(position).toLowerCase() === 'bottom';
  const bar = document.createElement('div');
  bar.className = `aa-notice-bar${atBottom ? ' aa-notice-bar--bottom' : ' aa-notice-bar--top'}`;
  bar.style.setProperty('--notice-bg', bg);
  bar.style.setProperty('--notice-fg', fg);
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Announcement');

  const inner = document.createElement('div');
  inner.className = 'aa-notice-bar__inner';

  const spark = document.createElement('span');
  spark.className = 'aa-notice-bar__spark';
  spark.setAttribute('aria-hidden', 'true');
  spark.textContent = '✦';
  inner.appendChild(spark);

  const msg = document.createElement('span');
  msg.className = 'aa-notice-bar__msg';
  msg.textContent = message;
  inner.appendChild(msg);

  if (ctaLabel && ctaLink) {
    const cta = document.createElement('a');
    cta.className = 'aa-notice-bar__cta';
    cta.href = ctaLink;
    cta.textContent = ctaLabel;
    if (/^https?:\/\//i.test(ctaLink)) { cta.target = '_blank'; cta.rel = 'noopener'; }
    inner.appendChild(cta);
  }

  bar.appendChild(inner);

  const offsetVar = atBottom ? '--notice-hb' : '--notice-h';

  if (dismissible) {
    const close = document.createElement('button');
    close.className = 'aa-notice-bar__close';
    close.setAttribute('aria-label', 'Dismiss announcement');
    close.innerHTML = '&times;';
    close.addEventListener('click', () => {
      try { sessionStorage.setItem(DISMISS_KEY, message); } catch { /* ignore */ }
      animateClose(bar, offsetVar);
    });
    bar.appendChild(close);
  }

  document.body.appendChild(bar);

  // Reserve space for the bar so it never overlaps the nav / hero. The page
  // reflows; tell ScrollTrigger (homepage pin) to recompute via a resize tick.
  const applyOffset = () => {
    document.documentElement.style.setProperty(offsetVar, `${bar.offsetHeight}px`);
  };
  applyOffset();
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  window.addEventListener('resize', applyOffset, { passive: true });
}

/* Collapse the bar smoothly: slide it off-screen while the page animates the
   reclaimed space shut, then remove it from the DOM. */
function animateClose(bar, offsetVar) {
  const root = document.documentElement;
  root.classList.add('aa-notice-animating');
  bar.classList.add('is-closing');
  root.style.setProperty(offsetVar, '0px');

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    bar.remove();
    root.classList.remove('aa-notice-animating');
    window.dispatchEvent(new Event('resize'));
  };
  bar.addEventListener('transitionend', (e) => {
    if (e.target === bar && e.propertyName === 'transform') finish();
  });
  setTimeout(finish, 700); // fallback if transitionend doesn't fire
}


/* ── Floating availability badge (homepage) ── */
function renderBadge({ badgeText, ctaLink, bg, fg }) {
  // Like the bar, a closed badge stays hidden only for the current visit.
  try {
    if (sessionStorage.getItem(BADGE_DISMISS_KEY) === badgeText) return;
  } catch { /* storage blocked — just show it */ }

  const tag = ctaLink ? 'a' : 'div';
  const badge = document.createElement(tag);
  badge.className = 'aa-notice-badge';
  badge.style.setProperty('--notice-bg', bg);
  badge.style.setProperty('--notice-fg', fg);
  if (ctaLink) {
    badge.href = ctaLink;
    if (/^https?:\/\//i.test(ctaLink)) { badge.target = '_blank'; badge.rel = 'noopener'; }
  }

  const dot = document.createElement('span');
  dot.className = 'aa-notice-badge__dot';
  dot.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'aa-notice-badge__label';
  label.textContent = badgeText;

  const close = document.createElement('button');
  close.className = 'aa-notice-badge__close';
  close.setAttribute('aria-label', 'Hide availability badge');
  close.innerHTML = '&times;';
  close.addEventListener('click', (e) => {
    // The badge itself may be a link — closing must not navigate.
    e.preventDefault();
    e.stopPropagation();
    try { sessionStorage.setItem(BADGE_DISMISS_KEY, badgeText); } catch { /* ignore */ }
    badge.classList.add('is-hidden');
    setTimeout(() => badge.remove(), 650);
  });

  badge.append(dot, label, close);
  document.body.appendChild(badge);

  // Reveal after a beat, then stay put while the visitor scrolls —
  // the × is how it goes away.
  requestAnimationFrame(() => badge.classList.add('is-in'));
}
