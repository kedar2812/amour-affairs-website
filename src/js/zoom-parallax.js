/* ============================================================
   ZOOM-PARALLAX.JS — Scroll-driven collage → zoom reveal
   Amour Affairs · Premium Wedding Photography

   Uses GSAP ScrollTrigger (already loaded globally).

   Phase 1 (0–40%): cards fly in from centre to their
                     collage positions + fade in
   Phase 2 (40–100%): all layers simultaneously zoom in;
                      Layer 0 (zoom-hero) hits full-bleed
   ============================================================ */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/*
  Collage layout — where each layer card sits relative to
  the sticky viewport centre after Phase 1 lands.
  x/y are translateX/Y percentages of the *viewport*.
  Units: vw / vh translated to pixels at runtime.
*/
const COLLAGE_OFFSETS = [
  // Layer 0 — zoom-hero, dead centre
  { x: '0vw',   y: '0vh'    },
  // Layer 1 — top-left landscape
  { x: '-27vw', y: '-28vh'  },
  // Layer 2 — top-right portrait
  { x: '30vw',  y: '-20vh'  },
  // Layer 3 — mid-left portrait
  { x: '-28vw', y: '10vh'   },
  // Layer 4 — mid-right landscape
  { x: '28vw',  y: '16vh'   },
  // Layer 5 — bottom-left small
  { x: '-12vw', y: '30vh'   },
  // Layer 6 — bottom-right small
  { x: '20vw',  y: '-2vh'   },
];

export function initZoomParallax() {
  const section = document.getElementById('zoomGallery');
  if (!section) return;

  const layers = section.querySelectorAll('.zp-layer');
  if (!layers.length) return;

  // ── INITIAL STATE — all cards at centre, invisible ──
  layers.forEach((layer) => {
    gsap.set(layer, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 0,
    });
  });

  // ─────────────────────────────────────────────────
  //  MASTER TIMELINE
  //  ScrollTrigger scrubs through the entire 400vh
  // ─────────────────────────────────────────────────
  const tl = gsap.timeline();

  // ── PHASE 1 (0 → 40% of scroll): cards fly into collage ──
  layers.forEach((layer, i) => {
    const offset = COLLAGE_OFFSETS[i] || { x: '0vw', y: '0vh' };

    tl.to(layer, {
      x: offset.x,
      y: offset.y,
      opacity: 1,
      duration: 0.4,          // relative timeline units (not seconds)
      ease: 'power3.out',
    }, i * 0.05);             // stagger entry — cards arrive sequentially
  });

  // ── PHASE 2 (40 → 100% of scroll): everything zooms in ──
  //    Each layer's scale drives from 1 up to its data attribute
  tl.addLabel('zooming', 0.4);

  layers.forEach((layer) => {
    const scaleTo = parseFloat(layer.dataset.zpScaleTo) || 5;
    tl.to(layer, {
      scale: scaleTo,
      ease: 'none',
      duration: 0.6,
    }, 'zooming');
  });

  // Layer 0 also fades back to fill the entire screen at the very end
  // (the others scale offscreen naturally)

  // ── Bind TIMELINE to scroll ──
  ScrollTrigger.create({
    animation: tl,
    trigger:   section,
    start:     'top top',
    end:       'bottom bottom',
    scrub:     1.2,           // silky smooth lag
  });
}
