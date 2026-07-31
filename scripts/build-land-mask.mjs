/* ============================================================
   BUILD-LAND-MASK.MJS — one-off asset generator
   Amour Affairs · Premium Wedding Photography

   Rasterises Natural Earth 110m land polygons into an
   equirectangular black/white mask used by the About-section
   globe to decide which sphere points sit on land.

   Source data: Natural Earth (naturalearthdata.com) — public
   domain, no attribution or licence restrictions.

   Run:  node scripts/build-land-mask.mjs <path-to-geojson>
   Out:  public/land-mask.png   (1024 x 512, 8-bit greyscale)

   This only needs re-running if the mask resolution changes;
   the generated PNG is committed.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W = 1024;
const H = 512;

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/build-land-mask.mjs <ne_110m_land.geojson>');
  process.exit(1);
}

const geo = JSON.parse(fs.readFileSync(src, 'utf8'));

/* ── Flatten every Polygon / MultiPolygon into a flat ring list ── */
const rings = [];
for (const f of geo.features) {
  const g = f.geometry;
  if (!g) continue;
  if (g.type === 'Polygon') rings.push(...g.coordinates);
  else if (g.type === 'MultiPolygon') for (const poly of g.coordinates) rings.push(...poly);
}

/* ── Scanline fill, even-odd rule ──
   One pass per output row: find where every ring edge crosses this
   row's latitude, sort the crossings, fill between pairs. Holes
   (lakes, the Caspian) fall out of even-odd for free. */
const mask = new Uint8Array(W * H); // 0 = ocean

for (let y = 0; y < H; y++) {
  const lat = 90 - ((y + 0.5) * 180) / H;
  const xs = [];

  for (const ring of rings) {
    for (let i = 0, n = ring.length; i < n; i++) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[(i + 1) % n];
      if ((lat1 > lat) === (lat2 > lat)) continue; // edge doesn't straddle this row
      const t = (lat - lat1) / (lat2 - lat1);
      const lon = lon1 + t * (lon2 - lon1);
      xs.push(((lon + 180) / 360) * W);
    }
  }

  if (xs.length < 2) continue;
  xs.sort((a, b) => a - b);

  for (let i = 0; i + 1 < xs.length; i += 2) {
    const x0 = Math.max(0, Math.round(xs[i]));
    const x1 = Math.min(W - 1, Math.round(xs[i + 1]));
    for (let x = x0; x <= x1; x++) mask[y * W + x] = 255;
  }
}

const land = mask.reduce((n, v) => n + (v ? 1 : 0), 0);
const out = path.resolve('public/land-mask.png');

await sharp(Buffer.from(mask), { raw: { width: W, height: H, channels: 1 } })
  .png({ compressionLevel: 9, palette: true, colours: 2 })
  .toFile(out);

const { size } = fs.statSync(out);
console.log(`${out}  ${W}x${H}  land=${((land / (W * H)) * 100).toFixed(1)}%  ${(size / 1024).toFixed(1)} KB`);
