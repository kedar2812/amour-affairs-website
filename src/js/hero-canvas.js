/* ============================================================
   HERO-CANVAS.JS — Scroll-driven 3D Frame Scrubbing
   Amour Affairs · Premium Wedding Photography
   
   Architecture:
   - Preloads all 120 WebP frames into Image[] array
   - Draws each frame onto a native <canvas>
   - GSAP ScrollTrigger maps scroll position → frame index
   - Hero section is pinned for 300vh; text layers animate in
   - mix-blend-mode: multiply makes the white bg invisible
   ============================================================ */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 120;
const frames       = new Array(TOTAL_FRAMES);
let   framesLoaded = 0;
let   canvasCtx    = null;
let   canvasEl     = null;
let   canvasW      = 0;
let   canvasH      = 0;

/* ─────────────────────────────────────────────────
   Pad number → "0042"
───────────────────────────────────────────────── */
function pad(n) {
  return String(n).padStart(4, '0');
}

/* ─────────────────────────────────────────────────
   Preload all frames, resolve when >= threshold loaded
   so we can start showing frames before all 120 are done
───────────────────────────────────────────────── */
function preloadFrames(onProgress) {
  return new Promise((resolve) => {
    let resolved = false;
    const EARLY_RESOLVE_THRESHOLD = 40; // Start animation after 40 frames loaded

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        frames[i] = img;
        framesLoaded++;
        onProgress(framesLoaded, TOTAL_FRAMES);

        // Resolve early once enough frames are ready
        if (!resolved && framesLoaded >= EARLY_RESOLVE_THRESHOLD) {
          resolved = true;
          resolve();
        }
        // Also resolve when 100% loaded (in case threshold never met)
        if (framesLoaded === TOTAL_FRAMES && !resolved) {
          resolved = true;
          resolve();
        }
      };

      img.onerror = () => {
        framesLoaded++;
        if (!resolved && framesLoaded >= EARLY_RESOLVE_THRESHOLD) {
          resolved = true;
          resolve();
        }
      };

      img.src = `/frames/frame-${pad(i + 1)}.webp`;
    }
  });
}

/* ─────────────────────────────────────────────────
   Size canvas to fill its CSS container
───────────────────────────────────────────────── */
function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x for perf
  const rect = canvasEl.getBoundingClientRect();
  canvasW = rect.width;
  canvasH = rect.height;
  canvasEl.width  = canvasW * dpr;
  canvasEl.height = canvasH * dpr;
  canvasCtx.scale(dpr, dpr);
}

/* ─────────────────────────────────────────────────
   Draw a single frame at a given scale (0–1 fraction
   of canvas height). Scale=1.25 = fills 125% of height.
───────────────────────────────────────────────── */
function drawFrame(index, scale) {
  const safeIdx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
  const img     = frames[safeIdx];
  if (!img || !canvasCtx) return;

  canvasCtx.clearRect(0, 0, canvasW, canvasH);

  const imgAspect = img.naturalWidth / img.naturalHeight;

  // Height-based scaling: scale=1.0 means model fills 100% of canvas height
  let drawH = canvasH * scale;
  let drawW = drawH * imgAspect;

  // Safety clamp — never exceed 98% of canvas width
  if (drawW > canvasW * 0.98) {
    drawW = canvasW * 0.98;
    drawH = drawW / imgAspect;
  }

  // Center horizontally; model center at 44% from top
  // (slightly above center so feet appear and text sits below)
  const drawX  = (canvasW - drawW) / 2;
  const centerY = canvasH * 0.44;
  const drawY  = centerY - drawH / 2;

  canvasCtx.drawImage(img, drawX, drawY, drawW, drawH);
}

/* ─────────────────────────────────────────────────
   Loading bar UI  (sits inside the hero)
───────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────
   Main export
───────────────────────────────────────────────── */
export async function initHeroCanvas() {
  const heroEl   = document.querySelector('.hero');
  const bodyEl   = document.querySelector('.hero__body');
  canvasEl       = document.getElementById('coupleCanvas');

  if (!canvasEl || !heroEl) return;

  canvasCtx = canvasEl.getContext('2d');
  sizeCanvas();

  // Draw frame 0 immediately as placeholder while loading
  // (will blank, that's fine)

  // ── Create loading indicator ──
  const loader = createLoadingBar(heroEl);

  // Hide hero body until frames ready (will fade in)
  gsap.set(bodyEl, { opacity: 0 });

  // ── Preload frames, show progress ──
  await preloadFrames((loaded, total) => {
    const pct = loaded / total;
    loader.fill.style.width  = `${pct * 100}%`;
    loader.label.textContent = loaded < total
      ? `${Math.round(pct * 100)}%`
      : 'Ready';

    // Draw whatever frame we have for visual progress (at full opening scale)
    if (frames[0]) drawFrame(0, 1.20);
  });

  // ── Hide loader ──
  gsap.to(loader.bar, {
    opacity: 0, duration: 0.5, ease: 'power2.out',
    onComplete: () => loader.bar.remove(),
  });

  // ── Fade in canvas ──
  gsap.fromTo(canvasEl,
    { opacity: 0 },
    { opacity: 1, duration: 1.0, ease: 'power2.out' }
  );

  // ── Scroll-driven state object ──
  // frame: 0 → 119  (rotation)
  // scale: 1.20 → 0.72  (model shrinks as user scrolls)
  //   1.20 = starts huge/dramatic on load
  //   0.72 = settles to a refined, slightly larger than "normal" size
  const scrollObj = {
    frame: 0,
    scale: 1.20,
  };

  // ── Draw the very first frame at full big scale ──
  drawFrame(0, 1.20);

  // ── Resize handler — redraw current state ──
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeCanvas();
      drawFrame(scrollObj.frame, scrollObj.scale);
    }, 100);
  });

  // ── GSAP timeline: animate both frame + scale together ──
  // Both are driven by the same single scrub so they are perfectly in sync
  const scrubTl = gsap.timeline()
    .to(scrollObj, {
      frame: TOTAL_FRAMES - 1,   // full 360° rotation
      scale: 0.72,               // shrinks to refined resting size
      ease: 'none',              // linear — scrub controls pacing
      onUpdate: () => drawFrame(scrollObj.frame, scrollObj.scale),
    });

  ScrollTrigger.create({
    animation:     scrubTl,
    trigger:       heroEl,
    start:         'top top',
    end:           '+=350%',  // 3.5x viewport = slow, cinematic
    scrub:         1.0,       // 1s lag = silky, never feels rushed
    pin:           true,
    pinSpacing:    true,
    anticipatePin: 1,
    onUpdate: (self) => {
      updateHeroTextLayers(self.progress, bodyEl);
    },
  });

  // ── Hero text layers animate in based on scroll progress ──
  setupTextLayerAnimations(bodyEl);
}

/* ─────────────────────────────────────────────────
   Text layer state machine — driven by scroll progress
   0–15%:  eyebrow fades in, canvas fades in
   15–40%: headline fades in, scales up
   40–65%: description + CTA fade in
   65–100%: proof strip fades in
───────────────────────────────────────────────── */
let textState = -1; // Track which state we're in to avoid re-running

function setupTextLayerAnimations(bodyEl) {
  // Start all hero body children invisible
  const children = bodyEl.querySelectorAll(
    '.hero__eyebrow, .hero__headline, .hero__desc, .hero__cta, .hero__proof'
  );
  gsap.set(children, { opacity: 0, y: 30 });

  // Fade in the body wrapper itself immediately
  gsap.to(bodyEl, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.3 });
}

function updateHeroTextLayers(progress, bodyEl) {
  const eyebrow  = bodyEl.querySelector('.hero__eyebrow');
  const headline = bodyEl.querySelector('.hero__headline');
  const desc     = bodyEl.querySelector('.hero__desc');
  const cta      = bodyEl.querySelector('.hero__cta');
  const proof    = bodyEl.querySelector('.hero__proof');

  // State 0: eyebrow visible (progress > 5%)
  if (progress > 0.05 && textState < 0) {
    textState = 0;
    gsap.to(eyebrow, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
  } else if (progress <= 0.05 && textState >= 0) {
    textState = -1;
    gsap.to(eyebrow, { opacity: 0, y: 30, duration: 0.4 });
  }

  // State 1: headline (progress > 18%)
  if (progress > 0.18 && textState < 1) {
    textState = 1;
    gsap.to(headline, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 0.05 });
  } else if (progress <= 0.18 && textState >= 1) {
    textState = 0;
    gsap.to(headline, { opacity: 0, y: 30, duration: 0.4 });
  }

  // State 2: desc (progress > 38%)
  if (progress > 0.38 && textState < 2) {
    textState = 2;
    gsap.to(desc, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
  } else if (progress <= 0.38 && textState >= 2) {
    textState = 1;
    gsap.to(desc, { opacity: 0, y: 30, duration: 0.4 });
  }

  // State 3: CTA (progress > 50%)
  if (progress > 0.50 && textState < 3) {
    textState = 3;
    gsap.to(cta, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
  } else if (progress <= 0.50 && textState >= 3) {
    textState = 2;
    gsap.to(cta, { opacity: 0, y: 30, duration: 0.4 });
  }

  // State 4: proof strip (progress > 68%)
  if (progress > 0.68 && textState < 4) {
    textState = 4;
    gsap.to(proof, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
  } else if (progress <= 0.68 && textState >= 4) {
    textState = 3;
    gsap.to(proof, { opacity: 0, y: 30, duration: 0.4 });
  }
}
