/**
 * compress-frames.mjs
 * Converts 120 PNG frames → optimised WebP for canvas scrubbing
 * Output: public/frames/ (served statically by Vite)
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR   = path.resolve(__dirname, '../3d model');
const OUT_DIR   = path.resolve(__dirname, '../public/frames');

// Quality 82 = excellent visual quality, ~50-70KB per frame
const WEBP_QUALITY = 82;
// Resize to max 900px wide — canvas will scale to fit anyway
const MAX_WIDTH = 900;

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
    console.log('✓ Created public/frames/');
  }

  const files = (await readdir(SRC_DIR))
    .filter(f => f.endsWith('.png'))
    .sort();

  console.log(`\nConverting ${files.length} frames → WebP (quality ${WEBP_QUALITY})...\n`);

  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < files.length; i++) {
    const file    = files[i];
    const srcPath = path.join(SRC_DIR, file);
    // Name output as 4-digit padded: frame-0001.webp
    const num     = String(i + 1).padStart(4, '0');
    const outPath = path.join(OUT_DIR, `frame-${num}.webp`);

    const srcStat = (await import('fs')).statSync(srcPath);
    totalIn += srcStat.size;

    await sharp(srcPath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(outPath);

    const outStat = (await import('fs')).statSync(outPath);
    totalOut += outStat.size;

    const pct = Math.round((i + 1) / files.length * 100);
    process.stdout.write(`  [${String(pct).padStart(3)}%] ${file} → frame-${num}.webp (${Math.round(outStat.size / 1024)}KB)\r`);
  }

  console.log('\n\n══════════════════════════════════════');
  console.log(`✓ Done! ${files.length} frames converted`);
  console.log(`  Input:  ${(totalIn  / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Output: ${(totalOut / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Saved:  ${((1 - totalOut / totalIn) * 100).toFixed(0)}% reduction`);
  console.log('══════════════════════════════════════\n');
}

main().catch(err => { console.error(err); process.exit(1); });
