/**
 * convert-bg-frames.mjs  —  120 background PNGs → WebP
 * Output: public/bg-frames/bg-frame-XXXX.webp
 * Run once: node scripts/convert-bg-frames.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'hero section background video frames');
const OUT_DIR = path.join(ROOT, 'public', 'bg-frames');
const QUALITY = 82;

fs.mkdirSync(OUT_DIR, { recursive: true });

const srcFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.png')).sort();
console.log(`Converting ${srcFiles.length} background frames…\n`);

let done = 0;
const BATCH = 6;

async function convert(srcName, frameNum) {
  const outPath = path.join(OUT_DIR, `bg-frame-${String(frameNum).padStart(4,'0')}.webp`);
  if (fs.existsSync(outPath)) { done++; process.stdout.write(`\r  ${done}/${srcFiles.length}`); return; }
  await sharp(path.join(SRC_DIR, srcName)).webp({ quality: QUALITY, effort: 4 }).toFile(outPath);
  done++;
  process.stdout.write(`\r  ${done}/${srcFiles.length}`);
}

for (let i = 0; i < srcFiles.length; i += BATCH) {
  await Promise.all(srcFiles.slice(i, i + BATCH).map((f, j) => convert(f, i + j + 1)));
}
console.log(`\n\n✅  ${done} bg frames done`);
