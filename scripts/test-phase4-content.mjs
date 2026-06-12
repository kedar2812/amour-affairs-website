/* ============================================================
   Phase 4 content test — testimonial marquee rows + site_content
   settings, end to end against the live local API, including the
   real src/js/api.js loaders the website uses.
   Requires: MariaDB running, php -S localhost:8080 serving repo
   root, admin user test@test.in / test123.
   ============================================================ */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const API = 'http://localhost:8080/api';

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

const live = await loadApiModule(API);
const dead = await loadApiModule('http://localhost:9');

// ── Auth ──
const loginRes = await fetch(`${API}/auth.php?action=login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.in', password: 'test123' }),
});
const login = await loginRes.json();
check('auth: login works', !!login.access_token, JSON.stringify(login).slice(0, 120));
const auth = { Authorization: `Bearer ${login.access_token}` };

const apiJSON = (method, url, body) =>
  fetch(`${API}/${url}`, {
    method,
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());

/* ════════════════ Testimonial marquee rows ════════════════ */

// Seeded DB: 30 testimonials spread 10/10/10 across rows 1-3
const seeded = await fetch(`${API}/testimonials.php`).then(r => r.json());
const rowsOf = (list) => list.reduce((m, t) => {
  const r = Math.max(1, parseInt(t.marquee_row, 10) || 1);
  m[r] = (m[r] || 0) + 1;
  return m;
}, {});
// The migration spreads seeds across rows 1-3; the dashboard may have
// re-curated individual rows since, so assert structure, not exact counts.
const seedDist = rowsOf(seeded.testimonials);
const seedTotal = Object.values(seedDist).reduce((a, b) => a + b, 0);
check('rows: all seeded reviews sit in rows 1-3',
  seedTotal === 30 && seedDist[1] > 0 && seedDist[2] > 0 && seedDist[3] > 0 && Object.keys(seedDist).length === 3,
  JSON.stringify(seedDist));

// Create on a brand-new row 4 (multipart, like the dashboard form)
const createForm = new FormData();
createForm.append('client_name', 'Row & Test');
createForm.append('review_text', 'A "quoted" review — with entities & asterisks *kept*');
createForm.append('city', 'Pune');
createForm.append('marquee_row', '4');
const created = await fetch(`${API}/testimonials.php`, { method: 'POST', headers: auth, body: createForm }).then(r => r.json());
check('rows: create accepts marquee_row=4', Number(created.marquee_row) === 4, JSON.stringify(created).slice(0, 160));

// Update moves it to row 2
const moved = await apiJSON('PUT', `testimonials.php?id=${created.id}`, { marquee_row: 2 });
check('rows: update moves testimonial to row 2', Number(moved.marquee_row) === 2, `got ${moved.marquee_row}`);

// Out-of-range values are clamped server-side
const low = await apiJSON('PUT', `testimonials.php?id=${created.id}`, { marquee_row: 0 });
check('rows: marquee_row=0 clamps to 1', Number(low.marquee_row) === 1, `got ${low.marquee_row}`);
const high = await apiJSON('PUT', `testimonials.php?id=${created.id}`, { marquee_row: 500 });
check('rows: marquee_row=500 clamps to 99', Number(high.marquee_row) === 99, `got ${high.marquee_row}`);

// Website loader groups rows in order and decodes entities
await apiJSON('PUT', `testimonials.php?id=${created.id}`, { marquee_row: 4 });
const loaderRows = await live.loadTestimonialRows(['stock.jpg']);
check('loader: returns 4 ordered rows', Array.isArray(loaderRows) && loaderRows.length === 4, `got ${loaderRows?.length}`);
check('loader: rows 1-3 carry the 30 seeds, row 4 the new card',
  loaderRows?.slice(0, 3).reduce((n, r) => n + r.length, 0) === 30 && loaderRows?.[3]?.length === 1,
  JSON.stringify(loaderRows?.map(r => r.length)));
const newCard = loaderRows?.[3]?.[0];
check('loader: entities decoded in card', newCard?.name === 'Row & Test' && newCard?.quote.includes('"quoted"') && newCard?.quote.includes('&'), JSON.stringify(newCard).slice(0, 160));
check('loader: stock photo fills missing photo', newCard?.src === 'stock.jpg', newCard?.src);

const deadRows = await dead.loadTestimonialRows(['s.jpg']);
check('loader: unreachable API returns null (bundled rows kept)', deadRows === null);

// Cleanup the test testimonial
const del = await fetch(`${API}/testimonials.php?id=${created.id}`, { method: 'DELETE', headers: auth }).then(r => r.json());
check('rows: cleanup delete', !!del.message, JSON.stringify(del));

/* ════════════════ site_content settings ════════════════ */

// Empty group → loader returns null → website keeps bundled defaults
const before = await dead.loadSiteContent();
check('content: unreachable API returns null', before === null);

// Save the same payload the dashboard /website page sends, with the
// nastiest realistic characters: quotes, ampersands, apostrophes.
const packagesPayload = {
  packages: [
    { name: 'The Stills & Cinema "Combo"', tagline: "Photos + film, of course", rows: [{ label: 'Coverage', value: '4–5 hours' }] },
  ],
};
const put = await apiJSON('PUT', 'settings.php', {
  settings: {
    site_weddings_enq_title: 'Book Your *Wedding* — "Now" & Forever',
    site_couple_enq_text: "We'd love to hear from you & yours.",
    site_couple_packages_json: JSON.stringify(packagesPayload),
  },
});
check('content: settings PUT succeeds', put.updated === 3, JSON.stringify(put));

// Raw GET confirms grouping under site_content
const grouped = await fetch(`${API}/settings.php?group=site_content`).then(r => r.json());
check('content: keys grouped as site_content', Object.keys(grouped.settings).length === 3, JSON.stringify(Object.keys(grouped.settings)));

// Website loader round-trip: entities decoded, _json parsed
const content = await live.loadSiteContent();
check('content: title round-trips with quotes & ampersand',
  content?.site_weddings_enq_title === 'Book Your *Wedding* — "Now" & Forever',
  JSON.stringify(content?.site_weddings_enq_title));
check('content: apostrophe round-trips',
  content?.site_couple_enq_text === "We'd love to hear from you & yours.",
  JSON.stringify(content?.site_couple_enq_text));
const pkgs = content?.site_couple_packages_json;
check('content: _json key parsed to object', !!pkgs && Array.isArray(pkgs.packages), JSON.stringify(pkgs)?.slice(0, 120));
check('content: JSON survives entity encoding (quotes in values)',
  pkgs?.packages?.[0]?.name === 'The Stills & Cinema "Combo"' && pkgs?.packages?.[0]?.rows?.[0]?.value === '4–5 hours',
  JSON.stringify(pkgs?.packages?.[0]));

// Re-save (simulates editing again in the dashboard) — must stay stable
const put2 = await apiJSON('PUT', 'settings.php', {
  settings: { site_couple_packages_json: JSON.stringify(packagesPayload) },
});
const content2 = await live.loadSiteContent();
check('content: second save round-trips identically',
  put2.updated === 1 && JSON.stringify(content2?.site_couple_packages_json) === JSON.stringify(pkgs),
  JSON.stringify(content2?.site_couple_packages_json)?.slice(0, 120));

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
