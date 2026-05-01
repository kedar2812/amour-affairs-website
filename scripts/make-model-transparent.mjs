/**
 * make-model-transparent.mjs  —  remove white bg from 3D model frames
 * Source: 3d model/XXXX.png  →  public/frames/frame-XXXX.webp (alpha transparent)
 * Run once: node scripts/make-model-transparent.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, '3d model');
const OUT_DIR = path.join(ROOT, 'public', 'frames');

fs.mkdirSync(OUT_DIR, { recursive: true });

const srcFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.png')).sort();
console.log(`Processing ${srcFiles.length} model frames (white bg → transparent)…\n`);

let done = 0;
const BATCH = 4;
// Threshold: pixels brighter than HARD on all channels → fully transparent
// Pixels between SOFT and HARD → smooth alpha fade (anti-aliased edge)
const HARD = 248, SOFT = 215;

async function processFrame(srcName, frameNum) {
  const outPath = path.join(OUT_DIR, `frame-${String(frameNum).padStart(4,'0')}.webp`);
  const { data, info } = await sharp(path.join(SRC_DIR, srcName))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const w = Math.min(data[i], data[i+1], data[i+2]); // "whiteness" = min channel
    if (w >= HARD)      data[i+3] = 0;
    else if (w >= SOFT) data[i+3] = Math.round(255 * (1 - (w - SOFT) / (HARD - SOFT)));
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 92, effort: 4 }).toFile(outPath);

  done++;
  process.stdout.write(`\r  ${done}/${srcFiles.length}`);
}

for (let i = 0; i < srcFiles.length; i += BATCH) {
  await Promise.all(srcFiles.slice(i, i + BATCH).map((f, j) => processFrame(f, i + j + 1)));
}
console.log(`\n\n✅  ${done} model frames with transparent bg`);
