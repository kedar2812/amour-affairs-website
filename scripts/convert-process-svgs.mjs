/**
 * convert-process-svgs.mjs
 * The /public/process/step-*.svg files are 2–4 MB each — they are full-res
 * raster PNGs (2170×1984) wrapped in an <svg>. They display at ≤180px, so we
 * rasterise them to small, sharp WebP (≈30–60 KB each). ~17 MB -> ~0.2 MB.
 *
 * Run once:  node scripts/convert-process-svgs.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '..', 'public', 'process');

// Rendered at ~2.7× the largest display width (180px) for retina sharpness.
const OUT_WIDTH = 480;

for (let i = 1; i <= 5; i++) {
  const src = path.join(DIR, `step-${i}.svg`);
  const out = path.join(DIR, `step-${i}.webp`);
  if (!fs.existsSync(src)) { console.warn('missing', src); continue; }

  const before = fs.statSync(src).size;
  await sharp(src, { density: 200 })
    .resize({ width: OUT_WIDTH, withoutEnlargement: false })
    .webp({ quality: 80, effort: 6 })
    .toFile(out);
  const after = fs.statSync(out).size;

  console.log(
    `step-${i}: ${(before / 1048576).toFixed(2)} MB SVG  ->  ${(after / 1024).toFixed(1)} KB WebP`
  );
}
console.log('Done.');
