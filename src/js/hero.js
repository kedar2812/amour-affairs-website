/* ============================================================
   HERO.JS — Video Loop + Botanical Leaf Scroll-Bloom (6 layers)
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

export function initHero() {
  const video     = document.getElementById('heroVideo');
  const scrollCTA = document.querySelector('.scroll-indicator');

  if (video) { initVideoLoop(video); }

  if (scrollCTA) {
    scrollCTA.addEventListener('click', () => {
      const target = document.querySelector('#about');
      if (!target) return;
      if (window.__lenis) {
        window.__lenis.scrollTo(target, { offset: -80 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }


}

/* ──────────────────────────────────────────────────────────
   Botanical Leaf Bloom — 6 layers, beautifully arranged.
   Top layers bloom downward, mid layers slide from sides,
   bottom layers rise upward — staggered for organic density.
   ────────────────────────────────────────────────────────── */
function initLeafBloom() {
  /* Per-layer config:
     [selector, lerpSpeed, startTx, startTy, startScale, startRotate,
                           endTx,   endTy,   endScale,   endRotate,   endOpacity, isRight]

     Left/Right layers bloom from their own unique directions:
     • -1 (top) : arrives from upper-left, rotated slightly clockwise
     • -2 (mid) : drifts in from far left, slight tilt
     • -3 (btm) : rises from lower-left, gentle counter-tilt
  */
  const LAYERS = [
    /*  sel                   spd   sTx  sTy  sSc   sRo   eTx  eTy  eSc    eRo  eOp  isR */
    /* Top-left corner — blooms down-right from upper-left */
    ['.hero__leaf--left-1',  0.095,  -28, -38,  0.75, -14,   4,  -4,  1.00,  -2,  0.72, false],
    /* Mid-left — drifts in smoothly from the left */
    ['.hero__leaf--left-2',  0.080,  -40,   8,  0.72,  -6,   6,   2,  0.97,   1,  0.58, false],
    /* Bottom-left — rises upward and slides in */
    ['.hero__leaf--left-3',  0.070,  -32,  42,  0.74,  10,   5,  -2,  0.98,   3,  0.62, false],
    /* Top-right corner — sTx positive = pushed right (off-screen) via -tx negation + scaleX(-1) */
    ['.hero__leaf--right-1', 0.090,   28, -38,  0.75, -14,  -4,  -4,  1.00,  -2,  0.72, true ],
    /* Mid-right — same logic */
    ['.hero__leaf--right-2', 0.075,   40,   8,  0.72,  -6,  -6,   2,  0.97,   1,  0.58, true ],
    /* Bottom-right — same logic */
    ['.hero__leaf--right-3', 0.065,   32,  42,  0.74,  10,  -5,  -2,  0.98,   3,  0.62, true ],
  ];

  const lerp    = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease    = (t) => 1 - Math.pow(1 - t, 3); /* cubic ease-out */

  /* Build state objects — each layer carries its own start state */
  const states = LAYERS.map(([sel, speed, sTx, sTy, sSc, sRo, eTx, eTy, eSc, eRo, eOp, isRight]) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return {
      el, speed, isRight, lp: 0,
      start: { tx: sTx, ty: sTy, scale: sSc, rotate: sRo, opacity: 0 },
      end:   { tx: eTx, ty: eTy, scale: eSc, rotate: eRo, opacity: eOp },
    };
  }).filter(Boolean);

  if (!states.length) return;

  function applyLeaf(state, progress) {
    const { el, start, end, isRight } = state;
    const p  = ease(progress);
    const tx = lerp(start.tx,      end.tx,      p);
    const ty = lerp(start.ty,      end.ty,      p);
    const sc = lerp(start.scale,   end.scale,   p);
    const ro = lerp(start.rotate,  end.rotate,  p);
    const op = lerp(start.opacity, end.opacity, p);

    el.style.opacity = op.toFixed(3);

    if (isRight) {
      /* Mirror horizontally — flip tx and rotate signs */
      el.style.transform = `scaleX(-1) translateX(${(-tx).toFixed(2)}px) translateY(${ty.toFixed(2)}px) scale(${sc.toFixed(4)}) rotate(${(-ro).toFixed(2)}deg)`;
    } else {
      el.style.transform = `translateX(${tx.toFixed(2)}px) translateY(${ty.toFixed(2)}px) scale(${sc.toFixed(4)}) rotate(${ro.toFixed(2)}deg)`;
    }
  }

  let tgt = 0;
  const SCROLL_RANGE = 380; /* slightly longer range = more gradual, cinematic bloom */

  function tick() {
    states.forEach(s => {
      s.lp = lerp(s.lp, tgt, s.speed);
      applyLeaf(s, s.lp);
    });
    requestAnimationFrame(tick);
  }

  function onScroll() {
    const scrollY = window.__lenis ? window.__lenis.scroll : window.scrollY;
    tgt = clamp01(scrollY / SCROLL_RANGE);
  }

  /* Attach to Lenis if available, otherwise native scroll */
  if (window.__lenis) {
    window.__lenis.on('scroll', onScroll);
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Set initial fully-hidden state */
  states.forEach(s => applyLeaf(s, 0));
  requestAnimationFrame(tick);
}

/* ──────────────────────────────────────────────────────────
   Video loop — smooth fade-in at start, fade-out before end
   ────────────────────────────────────────────────────────── */
function initVideoLoop(video) {
  const FADE = 0.5;
  let rafId  = null;

  function tick() {
    const dur = video.duration;
    const cur = video.currentTime;
    if (dur && !isNaN(dur)) {
      const left = dur - cur;
      if      (cur  < FADE) video.style.opacity = String(Math.min(cur  / FADE, 1));
      else if (left < FADE) video.style.opacity = String(Math.max(left / FADE, 0));
      else                  video.style.opacity = '1';
    }
    rafId = requestAnimationFrame(tick);
  }

  video.addEventListener('ended', () => {
    video.style.opacity = '0';
    cancelAnimationFrame(rafId);
    setTimeout(() => {
      video.currentTime = 0;
      video.play().then(() => { rafId = requestAnimationFrame(tick); }).catch(() => {});
    }, 100);
  });

  function start() {
    video.play().then(() => { rafId = requestAnimationFrame(tick); }).catch(() => {});
  }

  if (video.readyState >= 3) { start(); }
  else {
    video.addEventListener('canplaythrough', start, { once: true });
    video.addEventListener('canplay',        start, { once: true });
  }
}
