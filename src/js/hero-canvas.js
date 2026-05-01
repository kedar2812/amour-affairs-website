/* ============================================================
   HERO-CANVAS.JS — Dual-canvas scroll scrubbing
   Amour Affairs · Premium Wedding Photography

   Architecture:
   ┌─────────────────────────────────────────────────────────┐
   │  #bgCanvas     z:0  — landscape background (WebP seq)  │
   │  #coupleCanvas z:1  — 3D model (transparent WebP seq)  │
   └─────────────────────────────────────────────────────────┘

   Why image sequences, not <video>.currentTime?
   → Each video seek triggers a full decode cycle → choppy.
   → Pre-decoded Image[] drawn to canvas is GPU-composited
     in the same microtask as the ScrollTrigger tick → silky.

   Both canvases advance to the SAME frame index from a single
   GSAP ScrollTrigger onUpdate.

   Background: COVER fill (full-bleed, any aspect ratio)
   Model:      height-scale 1.20→0.72 as scroll progresses
   ============================================================ */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ─── Constants ─────────────────────────────────────────── */
const TOTAL_FRAMES = 120;

/* ─── Shared scroll state ────────────────────────────────── */
const scrollObj = { frame: 0, scale: 1.20 };

/* ─── Background canvas ──────────────────────────────────── */
const bgFrames = new Array(TOTAL_FRAMES);
let bgCtx      = null;
let bgEl       = null;

/* ─── Model canvas ───────────────────────────────────────── */
const modelFrames = new Array(TOTAL_FRAMES);
let modelCtx      = null;
let modelEl       = null;

/* ─── Helpers ────────────────────────────────────────────── */
function pad(n) { return String(n).padStart(4, '0'); }

function getDpr() { return Math.min(window.devicePixelRatio || 1, 2); }

function sizeCanvas(el, ctx) {
  const dpr  = getDpr();
  const rect = el.getBoundingClientRect();
  el.width   = rect.width  * dpr;
  el.height  = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: rect.width, h: rect.height };
}

/* ─── Draw background frame — COVER fill ────────────────── */
function drawBgFrame(idx) {
  const img = bgFrames[Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(idx)))];
  if (!img || !bgCtx) return;

  const dpr = getDpr();
  const cw  = bgEl.width  / dpr;
  const ch  = bgEl.height / dpr;
  const ia  = img.naturalWidth / img.naturalHeight;
  const ca  = cw / ch;

  // COVER: scale so the image fills all of the canvas, crop the overflow
  let dw, dh;
  if (ia > ca) { dh = ch; dw = ch * ia; }   // image wider → fit height
  else         { dw = cw; dh = cw / ia; }   // image taller → fit width

  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  bgCtx.clearRect(0, 0, cw, ch);
  bgCtx.drawImage(img, dx, dy, dw, dh);
}

/* ─── Draw model frame — height-based scale ─────────────── */
function drawModelFrame(idx, scale) {
  const img = modelFrames[Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(idx)))];
  if (!img || !modelCtx) return;

  const dpr = getDpr();
  const cw  = modelEl.width  / dpr;
  const ch  = modelEl.height / dpr;
  const ia  = img.naturalWidth / img.naturalHeight;

  let dh = ch * scale;
  let dw = dh * ia;
  if (dw > cw * 0.98) { dw = cw * 0.98; dh = dw / ia; }

  const dx  = (cw - dw) / 2;
  const dy  = ch * 0.44 - dh / 2;   // center-of-model at 44% height

  // Feet position (bottom of the drawn model area, offset slightly up)
  const feetY = dy + dh * 0.97;
  const cx    = cw / 2;

  modelCtx.clearRect(0, 0, cw, ch);

  // ── 1. Ground shadow ellipse — anchors the model to the landscape ──
  const shadowRadX = dw * 0.26;
  const shadowRadY = dh * 0.028;
  const shadowGrad = modelCtx.createRadialGradient(
    cx, feetY, 0,
    cx, feetY, shadowRadX
  );
  shadowGrad.addColorStop(0,   'rgba(20, 40, 10, 0.50)');
  shadowGrad.addColorStop(0.5, 'rgba(20, 40, 10, 0.22)');
  shadowGrad.addColorStop(1,   'rgba(20, 40, 10, 0)');
  modelCtx.save();
  modelCtx.scale(1, shadowRadY / shadowRadX);   // squash into an ellipse
  modelCtx.fillStyle = shadowGrad;
  modelCtx.beginPath();
  modelCtx.arc(cx, feetY * (shadowRadX / shadowRadY), shadowRadX, 0, Math.PI * 2);
  modelCtx.fill();
  modelCtx.restore();

  // ── 2. Drop shadow on the model — directional light from top-right ──
  modelCtx.save();
  modelCtx.shadowColor    = 'rgba(15, 35, 10, 0.55)';
  modelCtx.shadowBlur     = 28;
  modelCtx.shadowOffsetX  = 6;
  modelCtx.shadowOffsetY  = 14;
  modelCtx.drawImage(img, dx, dy, dw, dh);
  modelCtx.restore();
}


/* ─── Composite draw ─────────────────────────────────────── */
function drawAll() {
  drawBgFrame(scrollObj.frame);
  drawModelFrame(scrollObj.frame, scrollObj.scale);
}

/* ─── Preload a frame set ────────────────────────────────── */
function preloadFrameSet({ frames, urlFn, earlyCount, onProgress }) {
  return new Promise((resolve) => {
    let loaded = 0, resolved = false;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        frames[i] = img;
        loaded++;
        onProgress(loaded);
        if (!resolved && loaded >= earlyCount) { resolved = true; resolve(); }
        if (!resolved && loaded === TOTAL_FRAMES) { resolved = true; resolve(); }
      };
      img.onerror = () => {
        loaded++;
        if (!resolved && loaded >= earlyCount) { resolved = true; resolve(); }
      };
      img.src = urlFn(i + 1);
    }
  });
}

/* ─── Loading bar ────────────────────────────────────────── */
function createLoadingBar(heroEl) {
  const bar = document.createElement('div');
  bar.className = 'canvas-loader';
  bar.innerHTML = `
    <div class="canvas-loader__track">
      <div class="canvas-loader__fill" id="canvasLoaderFill"></div>
    </div>
    <span class="canvas-loader__label" id="canvasLoaderLabel">Loading…</span>
  `;
  heroEl.appendChild(bar);
  return {
    bar,
    fill:  bar.querySelector('#canvasLoaderFill'),
    label: bar.querySelector('#canvasLoaderLabel'),
  };
}

/* ─── MAIN ───────────────────────────────────────────────── */
export async function initHeroCanvas() {
  const heroEl = document.querySelector('.hero');
  const bodyEl = document.querySelector('.hero__body');
  bgEl         = document.getElementById('bgCanvas');
  modelEl      = document.getElementById('coupleCanvas');

  if (!heroEl || !modelEl) return;

  bgCtx    = bgEl ? bgEl.getContext('2d') : null;
  modelCtx = modelEl.getContext('2d');

  if (bgCtx) sizeCanvas(bgEl, bgCtx);
  sizeCanvas(modelEl, modelCtx);

  gsap.set(bodyEl, { opacity: 0 });

  // ── ScrollTrigger created synchronously (pin-spacer must exist immediately) ──
  const scrubTl = gsap.timeline().to(scrollObj, {
    frame: TOTAL_FRAMES - 1,
    scale: 0.72,
    ease:  'none',
    onUpdate: drawAll,
  });

  ScrollTrigger.create({
    animation:     scrubTl,
    trigger:       heroEl,
    start:         'top top',
    end:           '+=350%',
    scrub:         0.5,
    pin:           true,
    pinSpacing:    true,
    anticipatePin: 1,
    onUpdate: (self) => updateHeroTextLayers(self.progress, bodyEl),
  });

  setupTextLayerAnimations(bodyEl);

  // ── Resize ──
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (bgCtx) sizeCanvas(bgEl, bgCtx);
      sizeCanvas(modelEl, modelCtx);
      drawAll();
    }, 100);
  });

  // ── Loading bar ──
  const loader = createLoadingBar(heroEl);
  let bgDone = 0, mdDone = 0;

  function updateLoader() {
    const pct = (bgDone + mdDone) / (TOTAL_FRAMES * 2);
    loader.fill.style.width  = `${pct * 100}%`;
    loader.label.textContent = pct < 1 ? `${Math.round(pct * 100)}%` : 'Ready';
    // Render whatever we have so far
    if (bgFrames[0]) drawBgFrame(0);
    if (modelFrames[0]) drawModelFrame(0, 1.20);
  }

  // ── Preload BOTH frame sets in parallel, resolve early at 35 frames each ──
  await Promise.all([
    bgEl
      ? preloadFrameSet({
          frames:     bgFrames,
          urlFn:      (n) => `/bg-frames/bg-frame-${pad(n)}.webp`,
          earlyCount: 35,
          onProgress: (n) => { bgDone = n; updateLoader(); },
        })
      : Promise.resolve(),

    preloadFrameSet({
      frames:     modelFrames,
      urlFn:      (n) => `/frames/frame-${pad(n)}.webp`,
      earlyCount: 35,
      onProgress: (n) => { mdDone = n; updateLoader(); },
    }),
  ]);

  // ── Hide loader ──
  gsap.to(loader.bar, {
    opacity: 0, duration: 0.5, ease: 'power2.out',
    onComplete: () => loader.bar.remove(),
  });

  // ── Fade in both canvases ──
  gsap.fromTo(
    [bgEl, modelEl].filter(Boolean),
    { opacity: 0 },
    { opacity: 1, duration: 1.0, ease: 'power2.out' }
  );

  drawAll();
}

/* ─── Text layer state machine ───────────────────────────── */
let textState = -1;

/* Split the <em> inside headline into per-char <span>s for blur shimmer */
function splitEmChars(bodyEl) {
  const em = bodyEl.querySelector('.hero__headline em');
  if (!em || em.dataset.split) return;
  em.dataset.split = 'true';

  const text = em.textContent;
  em.textContent = '';

  text.split('').forEach((ch) => {
    const span = document.createElement('span');
    span.className  = 'em-char';
    span.textContent = ch;
    // Preserve spaces — inline-block collapses them otherwise
    span.style.display     = ch === ' ' ? 'inline' : 'inline-block';
    span.style.whiteSpace  = 'pre';
    em.appendChild(span);
  });

  // Set initial blur state
  gsap.set(em.querySelectorAll('.em-char'), { opacity: 0, filter: 'blur(12px)' });
}

function setupTextLayerAnimations(bodyEl) {
  splitEmChars(bodyEl);
  gsap.set(
    bodyEl.querySelectorAll('.hero__eyebrow, .hero__headline, .hero__desc, .hero__cta, .hero__proof'),
    { opacity: 0, y: 30 }
  );
  gsap.to(bodyEl, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 });
}

function updateHeroTextLayers(p, bodyEl) {
  const q = (sel) => bodyEl.querySelector(sel);

  const show = (el, delay = 0) =>
    gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay });
  const hide = (el) =>
    gsap.to(el, { opacity: 0, y: 30, duration: 0.4 });

  if (p > 0.05 && textState < 0)  { textState = 0; show(q('.hero__eyebrow')); }
  if (p <= 0.05 && textState >= 0) { textState = -1; hide(q('.hero__eyebrow')); }

  if (p > 0.18 && textState < 1) {
    textState = 1;
    const headline = q('.hero__headline');
    show(headline, 0.05);
    // ── Per-char blur shimmer on the em (framer-motion blur preset equivalent) ──
    gsap.to(headline.querySelectorAll('.em-char'), {
      opacity: 1,
      filter:   'blur(0px)',
      duration: 0.55,
      stagger:  0.04,
      ease:     'power2.out',
      delay:    0.3,
    });
  }
  if (p <= 0.18 && textState >= 1) {
    textState = 0;
    const headline = q('.hero__headline');
    hide(headline);
    // Reset chars for next entrance
    gsap.set(headline.querySelectorAll('.em-char'), { opacity: 0, filter: 'blur(12px)' });
  }

  if (p > 0.38 && textState < 2)  { textState = 2; show(q('.hero__desc')); }
  if (p <= 0.38 && textState >= 2) { textState = 1; hide(q('.hero__desc')); }

  if (p > 0.50 && textState < 3)  { textState = 3; show(q('.hero__cta')); }
  if (p <= 0.50 && textState >= 3) { textState = 2; hide(q('.hero__cta')); }

  if (p > 0.68 && textState < 4)  { textState = 4; show(q('.hero__proof')); }
  if (p <= 0.68 && textState >= 4) { textState = 3; hide(q('.hero__proof')); }
}
