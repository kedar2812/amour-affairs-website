/* ============================================================
   API.JS — Website ↔ CMS API bridge
   Amour Affairs · Premium Wedding Photography

   Fetches content published from the dashboard. Every helper
   is fail-safe: on any network/server problem it returns null
   so callers can keep the bundled fallback content — the site
   must never break because the API is unreachable.

   In production the API lives on the same domain (/api).
   For local development set VITE_API_URL in .env.development.
   ============================================================ */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// /uploads/... paths are served by the API host, not the Vite dev server
const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const FETCH_TIMEOUT_MS = 8000;

/** Resolve an /uploads/... path returned by the API to a full URL. */
export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_ORIGIN}${path}`;
}

/** The PHP API stores text HTML-encoded — decode for JS rendering. */
function decodeEntities(value) {
  if (!value) return '';
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * GET a JSON endpoint with a hard timeout.
 * Returns the parsed body, or null on any failure.
 */
export async function fetchFromAPI(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit a website inquiry to the leads pipeline.
 * Returns { ok: true, leadRef } on success,
 * { ok: false, error } on validation/server errors (error is user-safe),
 * { ok: false, error: null } when the API is unreachable.
 */
export async function submitInquiry(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/leads.php?action=inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (response.ok) {
      return { ok: true, leadRef: data?.lead_ref || '' };
    }
    return { ok: false, error: data?.error || null };
  } catch {
    return { ok: false, error: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load albums for an archive page ('wedding' | 'couple_shoot' | 'premium_album'),
 * mapped to the shape archive-page.js expects. Returns the fallback when the
 * API is unreachable or has no usable albums yet.
 */
export async function loadArchiveAlbums(type, fallback) {
  const data = await fetchFromAPI(`albums.php?type=${type}&with_photos=1`);
  if (!data || !Array.isArray(data.albums)) return fallback;

  const albums = data.albums
    .filter((a) => Array.isArray(a.photos) && a.photos.length > 0)
    .map((a) => ({
      couple: decodeEntities(a.couple),
      location: decodeEntities(a.location),
      date: decodeEntities(a.date_label),
      description: decodeEntities(a.description),
      film: a.film_youtube_id || '',
      cover: assetUrl(a.cover),
      photos: a.photos.map((p) => assetUrl(p.file_path)),
    }));

  // An empty archive looks broken — keep the fallback until real albums exist
  return albums.length > 0 ? albums : fallback;
}

/**
 * Load the film library: { featured, gallery } or null.
 * `featured` is the "Now Showing" pool; `gallery` is every active film.
 */
export async function loadFilms() {
  const data = await fetchFromAPI('films.php');
  if (!data || !Array.isArray(data.films) || data.films.length === 0) return null;

  const films = data.films.map((f) => ({
    id: f.youtube_id,
    title: decodeEntities(f.title),
    type: decodeEntities(f.caption),
  }));

  const featured = data.films
    .filter((f) => Number(f.is_featured) === 1)
    .map((f) => ({
      id: f.youtube_id,
      title: decodeEntities(f.title),
      type: decodeEntities(f.caption),
    }));

  return { featured: featured.length > 0 ? featured : films, gallery: films };
}

/**
 * Load featured testimonials for the home carousel, or null.
 * `stockPhotos` fills in for testimonials saved without a photo.
 */
export async function loadTestimonials(stockPhotos = []) {
  const data = await fetchFromAPI('testimonials.php?featured=1');
  if (!data || !Array.isArray(data.testimonials) || data.testimonials.length === 0) return null;

  return data.testimonials.map((t, i) => ({
    quote: decodeEntities(t.review_text),
    name: decodeEntities(t.client_name),
    location: decodeEntities(t.city || t.event_type || ''),
    src: t.photo_path
      ? assetUrl(t.photo_path)
      : stockPhotos[i % Math.max(stockPhotos.length, 1)] || '',
  }));
}

/**
 * Load testimonials flagged for the weddings-page marquee, or null.
 * Mirrors the testimonials-page card shape ({ quote, name, location, src }).
 * Testimonials saved without a photo borrow a stock couple shot so every
 * marquee card keeps its image.
 */
export async function loadWeddingsTestimonials(stockPhotos = []) {
  const data = await fetchFromAPI('testimonials.php?weddings=1');
  if (!data || !Array.isArray(data.testimonials) || data.testimonials.length === 0) return null;

  return data.testimonials.map((t, i) => ({
    quote: decodeEntities(t.review_text),
    name: decodeEntities(t.client_name),
    location: decodeEntities(t.city || ''),
    src: t.photo_path
      ? assetUrl(t.photo_path)
      : stockPhotos[i % Math.max(stockPhotos.length, 1)] || '',
  }));
}

/**
 * Load every active testimonial grouped into marquee rows for the
 * Testimonials page, or null. Returns an array of rows (each an array
 * of { quote, name, location, src }) ordered by row number; empty rows
 * are dropped. Scroll direction is NOT part of the data — pages derive
 * it from row position so the alternating pattern can never break.
 * `stockPhotos` fills in for testimonials saved without a photo.
 */
export async function loadTestimonialRows(stockPhotos = []) {
  const data = await fetchFromAPI('testimonials.php');
  if (!data || !Array.isArray(data.testimonials) || data.testimonials.length === 0) return null;

  const byRow = new Map();
  data.testimonials.forEach((t, i) => {
    const row = Math.max(1, parseInt(t.marquee_row, 10) || 1);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({
      quote: decodeEntities(t.review_text),
      name: decodeEntities(t.client_name),
      location: decodeEntities(t.city || ''),
      src: t.photo_path
        ? assetUrl(t.photo_path)
        : stockPhotos[i % Math.max(stockPhotos.length, 1)] || '',
    });
  });

  const rows = [...byRow.keys()].sort((a, b) => a - b).map((k) => byRow.get(k));

  // A sparse marquee looks broken — keep the bundled archive until the
  // CMS holds a healthy amount of reviews.
  const total = rows.reduce((sum, r) => sum + r.length, 0);
  return total >= 9 ? rows : null;
}

/**
 * Load dashboard-editable website copy (settings group `site_content`),
 * or null. Values arrive HTML-encoded from the PHP API — they are
 * decoded here; keys ending in `_json` are parsed into objects.
 */
export async function loadSiteContent() {
  const data = await fetchFromAPI('settings.php?group=site_content');
  if (!data || !data.settings || typeof data.settings !== 'object') return null;

  const content = {};
  for (const [key, raw] of Object.entries(data.settings)) {
    const value = decodeEntities(raw);
    if (key.endsWith('_json')) {
      try { content[key] = JSON.parse(value); } catch { /* skip malformed */ }
    } else if (value !== '') {
      content[key] = value;
    }
  }
  return Object.keys(content).length > 0 ? content : null;
}

/**
 * Load active team members (with photos) for the about-page marquee, or null.
 */
export async function loadTeam() {
  const data = await fetchFromAPI('team.php');
  if (!data || !Array.isArray(data.team)) return null;

  const members = data.team
    .filter((m) => m.photo_path)
    .map((m) => ({
      name: decodeEntities(m.name),
      role: decodeEntities(m.role),
      photo: assetUrl(m.photo_path),
    }));

  // The marquee needs enough cards to scroll seamlessly
  return members.length >= 4 ? members : null;
}
