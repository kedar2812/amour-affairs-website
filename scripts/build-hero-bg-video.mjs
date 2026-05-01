/**
 * build-hero-bg-video.mjs
 * Converts the 120 background PNGs → hero-bg.mp4 (H.264, web-optimised)
 *
 * Run once:  node scripts/build-hero-bg-video.mjs
 * Output:    public/hero-bg.mp4
 */

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import Ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

Ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const SRC_DIR = path.join(ROOT, 'hero section background video frames');
const OUT_DIR = path.join(ROOT, 'public');
const OUT_FILE = path.join(OUT_DIR, 'hero-bg.mp4');

fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Sort files numerically ──────────────────────────────────
const srcFiles = fs.readdirSync(SRC_DIR)
  .filter(f => f.endsWith('.png'))
  .sort();

if (srcFiles.length === 0) {
  console.error('❌  No PNG files found in:', SRC_DIR);
  process.exit(1);
}

console.log(`Found ${srcFiles.length} frames. Building hero-bg.mp4 …\n`);

// We need to rename/link files so ffmpeg can glob them as %04d.png
// Easiest: write a concat list file
const listFile = path.join(ROOT, '.ffmpeg-concat-list.txt');
const listContent = srcFiles
  .map(f => `file '${path.join(SRC_DIR, f).replace(/\\/g, '/')}'`)
  .join('\n');
fs.writeFileSync(listFile, listContent, 'utf8');

// ── Build ─────────────────────────────────────────────────
Ffmpeg()
  .input(listFile)
  .inputOptions([
    '-f concat',        // use concat demuxer
    '-safe 0',          // allow absolute paths
    '-r 24',            // treat source as 24 fps
  ])
  .videoCodec('libx264')
  .outputOptions([
    '-pix_fmt yuv420p',       // max browser compat
    '-crf 23',                // quality (18=lossless, 28=low). 23 = great web quality
    '-preset slow',           // better compression
    '-movflags +faststart',   // MP4 header at front → streams immediately
    '-r 24',                  // 24 fps output
    '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2', // ensure even dimensions
  ])
  .output(OUT_FILE)
  .on('start', cmd => console.log('ffmpeg cmd:', cmd))
  .on('progress', p => {
    if (p.percent) process.stdout.write(`\r  Encoding… ${Math.round(p.percent)}%   `);
  })
  .on('end', () => {
    const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
    console.log(`\n\n✅  hero-bg.mp4  (${sizeMB} MB)  →  ${OUT_FILE}`);
    fs.unlinkSync(listFile); // cleanup temp file
  })
  .on('error', err => {
    console.error('\n❌  ffmpeg error:', err.message);
    if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
    process.exit(1);
  })
  .run();
