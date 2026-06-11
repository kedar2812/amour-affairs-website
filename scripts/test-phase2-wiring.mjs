/* ============================================================
   Phase 2 wiring test — runs the real src/js/api.js mappers in
   Node against the live local API. import.meta.env is Vite-only,
   so the module is loaded with that one expression substituted.
   ============================================================ */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}  ${detail}`); }
};

async function loadApiModule(apiUrl) {
  const src = readFileSync('src/js/api.js', 'utf8')
    .replace("import.meta.env.VITE_API_URL || '/api'", JSON.stringify(apiUrl));
  const file = join(tmpdir(), `aa_api_${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(file, src);
  const mod = await import(pathToFileURL(file).href);
  unlinkSync(file);
  return mod;
}

const live = await loadApiModule('http://localhost:8080/api');
const dead = await loadApiModule('http://localhost:9');   // nothing listens here

const FALLBACK = [{ couple: 'Stock & Couple', location: 'X', date: 'Y', description: 'Z', cover: 'c.jpg', photos: ['1.jpg'] }];

// ── Albums: live API ──
const albums = await live.loadArchiveAlbums('wedding', FALLBACK);
const a = albums[0];
check('albums: CMS album replaces fallback', albums.length === 1 && a.couple === 'Verify & Wiring', JSON.stringify(a));
check('albums: entities decoded ("&" restored)', a.couple.includes(' & '), a.couple);
check('albums: photos mapped to full URLs', a.photos.length === 2 && a.photos[0].startsWith('http://localhost:8080/uploads/albums/'), JSON.stringify(a.photos));
check('albums: cover falls back to first photo', a.cover === a.photos[0], a.cover);
check('albums: meta fields mapped', a.location === 'Pune' && a.date === 'June 2026', `${a.location} / ${a.date}`);

// photos actually downloadable?
const imgRes = await fetch(a.photos[0]);
check('albums: photo URL serves a WebP file', imgRes.ok && imgRes.headers.get('content-type')?.includes('webp'), `${imgRes.status} ${imgRes.headers.get('content-type')}`);

// empty archive type keeps fallback
const couples = await live.loadArchiveAlbums('couple_shoot', FALLBACK);
check('albums: empty CMS type keeps fallback', couples === FALLBACK);

// ── Albums: dead API keeps fallback (after timeout/refusal) ──
const offline = await dead.loadArchiveAlbums('wedding', FALLBACK);
check('albums: unreachable API keeps fallback', offline === FALLBACK);

// ── Films ──
const films = await live.loadFilms();
check('films: gallery has 11 seeded films', films?.gallery.length === 11, `got ${films?.gallery.length}`);
check('films: featured pool has 6', films?.featured.length === 6, `got ${films?.featured.length}`);
check('films: shape matches FEATURED_FILMS contract', !!(films.featured[0].id && films.featured[0].title && 'type' in films.featured[0]), JSON.stringify(films.featured[0]));

const filmsOffline = await dead.loadFilms();
check('films: unreachable API returns null', filmsOffline === null);

// ── Testimonials (30 seeded, 6 featured → carousel gets the featured set) ──
const testi = await live.loadTestimonials(['s1.jpg', 's2.jpg']);
check('testimonials: featured set loaded from CMS', Array.isArray(testi) && testi.length === 6, `got ${testi?.length}`);
check('testimonials: shape matches carousel contract', !!(testi?.[0]?.quote && testi[0].name && 'location' in testi[0]), JSON.stringify(testi?.[0])?.slice(0, 120));
check('testimonials: stock photos cycle in when CMS has none', testi?.[0]?.src === 's1.jpg' && testi?.[1]?.src === 's2.jpg' && testi?.[2]?.src === 's1.jpg', `${testi?.[0]?.src} ${testi?.[1]?.src} ${testi?.[2]?.src}`);

const testiOffline = await dead.loadTestimonials(['s1.jpg']);
check('testimonials: unreachable API returns null (fallback path)', testiOffline === null);

// ── Team (none seeded yet → null → static marquee kept) ──
const team = await live.loadTeam();
check('team: empty CMS returns null (static marquee kept)', team === null);

// ── assetUrl ──
check('assetUrl: resolves uploads against API host', live.assetUrl('/uploads/x.webp') === 'http://localhost:8080/uploads/x.webp');
check('assetUrl: passes absolute URLs through', live.assetUrl('https://img.youtube.com/x.jpg') === 'https://img.youtube.com/x.jpg');
check('assetUrl: empty-safe', live.assetUrl(null) === '');

// ── submitInquiry (Phase 3) ──
const sent = await live.submitInquiry({
  client_name: 'Wiring Test',
  phone: '+91 1234567890',
  event_type: 'Wedding',
  message: 'submitInquiry wiring check',
  website: '',
});
check('inquiry: valid submit returns ok + lead ref', sent.ok === true && sent.leadRef.startsWith('#LD-'), JSON.stringify(sent));

const rejected = await live.submitInquiry({ client_name: '', phone: '1234567890' });
check('inquiry: server validation message surfaces', rejected.ok === false && typeof rejected.error === 'string' && rejected.error.length > 0, JSON.stringify(rejected));

const unreachable = await dead.submitInquiry({ client_name: 'X Y', phone: '1234567890' });
check('inquiry: unreachable API -> ok:false, error:null (WhatsApp fallback)', unreachable.ok === false && unreachable.error === null, JSON.stringify(unreachable));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
