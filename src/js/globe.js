/* ============================================================
   GLOBE.JS — Revolving Globe (About section)
   Amour Affairs · Premium Wedding Photography

   A sculpted ivory globe turning on the page cream, painted into
   the section's existing <canvas>.

   There is deliberately no <video> element in the document. The
   plate is fetched as an ArrayBuffer, wrapped in a Blob, and handed
   to a decoder that only ever exists inside this module's closure,
   so the page offers no player chrome, no play/pause affordance,
   no "open video in new tab" and no media entry to save. The canvas
   is pointer-events:none (see about.css), so a right-click passes
   straight through it to the section beneath.

   The plate itself is a pre-rendered studio clip:
     · its backdrop is keyed out against a measured plate, so the
       globe and its cast shadow sit on the page cream with no
       rectangle edge — the border is feathered to page colour,
     · it is re-timed to constant angular velocity (the source
       accelerated ~2x across its run),
     · and it loops as a sinusoidal ping-pong. The source only ever
       sweeps ~110° of a revolution, so it cannot be cut-looped and
       a crossfade ghosts two hemispheres over each other; easing the
       angle on a cosine keeps velocity continuous through both
       turnarounds instead.

   Degradation, in order:
     plate decodes      → the globe turns
     reduced motion     → a single still frame, no playback
     autoplay refused   → whatever frame decoded, held still
     fetch/decode fails → canvas stays hidden, section reads fine
   ============================================================ */

/* Matches --color-bg-alt, which is what the plate was composited over. */
const PAGE = '#F5EDE2';

/* Two plates: the phone column tops out at 380px CSS, so it has no use
   for the large one and should not pay 1.3MB for it. */
const PLATE_LG = '/media/aa-globe-lg.bin';
const PLATE_SM = '/media/aa-globe-sm.bin';

/* Measured on the CSS box, not the backing store: about.css caps the column at
   380px on phones and 520px on tablets, so this cleanly sends only the phone
   layout to the small plate and never punishes a high-DPR phone for its DPR. */
const LARGE_MIN_CSS = 440;

export function initGlobe() {
  const canvas = document.getElementById('aboutGlobe');
  if (!canvas) return;

  /* alpha:false is both faster and honest — the plate is fully opaque. */
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  /* Size the backing store to the box. Returns false while the section is
     still display:none / zero-width so we can try again later. */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const w = Math.round(rect.width * dpr());
    const h = Math.round(rect.height * dpr());
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      /* Resizing clears the surface — repaint the ground immediately so an
         opaque context can never flash black behind the fade-in. */
      ctx.fillStyle = PAGE;
      ctx.fillRect(0, 0, w, h);
      return true;
    }
    return false;
  }

  resize();
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* Pick the plate from the box we are actually going to fill. If the section
     has not been laid out yet, fall back to the viewport — the visual column
     only goes wide on the two-column (>=1024px) layout. */
  const boxW =
    canvas.getBoundingClientRect().width ||
    (window.innerWidth >= 1024 ? 9999 : 0);
  const plate = boxW >= LARGE_MIN_CSS ? PLATE_LG : PLATE_SM;

  /* Declared before the fetch below resolves and reads it. */
  let visible = true;
  let video = null;
  let handle = 0;
  let running = false;
  let ready = false;
  let disposed = false;

  const useRVFC = () =>
    video && typeof video.requestVideoFrameCallback === 'function';

  function paint() {
    if (!video || !canvas.width) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch {
      return; /* frame not decodable yet */
    }
    if (!ready) {
      ready = true;
      canvas.classList.add('is-ready');
    }
  }

  function tick() {
    if (disposed || !running) return;
    paint();
    handle = useRVFC()
      ? video.requestVideoFrameCallback(tick)
      : requestAnimationFrame(tick);
  }

  function start() {
    if (disposed || running || !video || reduced) return;
    running = true;
    const p = video.play();
    if (p && p.catch) p.catch(() => {}); /* held still is an acceptable end state */
    tick();
  }

  function stop() {
    if (!running) return;
    running = false;
    if (handle) {
      if (useRVFC()) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      handle = 0;
    }
    if (video && !video.paused) video.pause();
  }

  /* ── Load ──────────────────────────────────────────────────── */
  fetch(plate, { credentials: 'same-origin' })
    .then((res) => {
      if (!res.ok) throw new Error('plate ' + res.status);
      return res.arrayBuffer();
    })
    .then((buf) => {
      if (disposed) return;
      /* The server sends this as an opaque blob; the media type is asserted
         here rather than by the URL, which is why the file needs no
         video extension to sit behind. */
      const url = URL.createObjectURL(new Blob([buf], { type: 'video/mp4' }));

      video = document.createElement('video'); /* never appended to the DOM */
      video.muted = true;
      video.defaultMuted = true;
      video.loop = !reduced;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.preload = 'auto';

      video.addEventListener('error', () => stop(), { once: true });

      video.addEventListener(
        'loadeddata',
        () => {
          if (disposed) return;
          resize();
          if (reduced) {
            paint(); /* one frame, then nothing moves */
            return;
          }
          if (visible && !document.hidden) start();
          else paint();
        },
        { once: true },
      );

      video.src = url;
      video.load();
    })
    .catch(() => {
      /* The section reads completely without the globe. */
    });

  /* ── Only run while it is actually on screen ───────────────── */
  if ('IntersectionObserver' in window) {
    visible = false;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible && !document.hidden) start();
        else stop();
      },
      { rootMargin: '120px 0px' },
    );
    io.observe(canvas);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      if (resize() && video) paint();
    });
    ro.observe(canvas);
  } else {
    window.addEventListener('resize', () => {
      if (resize() && video) paint();
    });
  }

  /* Belt and braces: the canvas is already pointer-events:none, so this only
     matters if that rule is ever relaxed. */
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
