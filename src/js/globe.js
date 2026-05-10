/* ============================================================
   GLOBE.JS — Animated Champagne Wireframe Globe
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

export function initGlobe() {
  const canvas = document.getElementById('aboutGlobe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const C_DARK = 'rgba(158, 122, 78,';
  const C_LITE = 'rgba(201, 169, 124,';

  const LAT   = 14;
  const LON   = 18;
  const SEG   = 64;
  const SPEED = 0.0018;

  let rotY = 0;
  const rotX = Math.PI / 10;
  let W, H, cx, cy, R;
  let raf = null;

  // ── Reliable resize using getBoundingClientRect on section ──
  function resize() {
    const section = document.getElementById('about');
    // getBoundingClientRect is synchronous and always returns
    // the rendered box — works even before first paint commit
    const rect = section.getBoundingClientRect();
    W = rect.width;
    H = rect.height;

    // Fallback if section hasn't painted yet (H would be 0)
    if (!W || !H) {
      W = window.innerWidth;
      H = 600;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx = W / 2;
    cy = H / 2;
    R  = Math.min(W, H) * 0.42;
  }

  function proj(phi, theta) {
    const x0 =  Math.sin(phi) * Math.cos(theta);
    const y0 =  Math.cos(phi);
    const z0 =  Math.sin(phi) * Math.sin(theta);
    const x1 = x0 * Math.cos(rotY) + z0 * Math.sin(rotY);
    const z1 = -x0 * Math.sin(rotY) + z0 * Math.cos(rotY);
    const y2 = y0 * Math.cos(rotX) - z1 * Math.sin(rotX);
    const z2 = y0 * Math.sin(rotX) + z1 * Math.cos(rotX);
    return { sx: cx + x1 * R, sy: cy + y2 * R, depth: z2 };
  }

  function strokeArc(pts, color, alpha, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
    ctx.strokeStyle = `${color} ${alpha.toFixed(3)})`;
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 1; i < LAT; i++) {
      const phi = (i / LAT) * Math.PI;
      const pts = [];
      for (let j = 0; j <= SEG; j++)
        pts.push(proj(phi, (j / SEG) * Math.PI * 2));
      const dep = pts.reduce((s, p) => s + p.depth, 0) / pts.length;
      strokeArc(pts, C_DARK, 0.18 + 0.52 * ((dep + 1) / 2), 1.0);
    }

    for (let i = 0; i < LON; i++) {
      const theta = (i / LON) * Math.PI * 2;
      const pts   = [];
      for (let j = 0; j <= SEG; j++)
        pts.push(proj((j / SEG) * Math.PI, theta));
      const dep = pts.reduce((s, p) => s + p.depth, 0) / pts.length;
      strokeArc(pts, C_DARK, 0.15 + 0.48 * ((dep + 1) / 2), 0.85);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = `${C_LITE} 0.35)`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    const grd = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.15);
    grd.addColorStop(0, `${C_LITE} 0.07)`);
    grd.addColorStop(1, `${C_LITE} 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
    ctx.fill();

    rotY += SPEED;
  }

  function tick() { draw(); raf = requestAnimationFrame(tick); }
  function start() { if (!raf) tick(); }
  function stop()  { cancelAnimationFrame(raf); raf = null; }

  // ── IntersectionObserver to pause when not in view ─────────
  const io = new IntersectionObserver(
    (entries) => entries[0].isIntersecting ? start() : stop(),
    { threshold: 0.05 }
  );
  io.observe(canvas);

  // ── Boot: setTimeout(0) fires after browser has painted ────
  // This guarantees getBoundingClientRect returns real values
  setTimeout(() => {
    resize();
    start();

    window.addEventListener('resize', () => {
      stop();
      resize();
      start();
    });
  }, 0);
}
