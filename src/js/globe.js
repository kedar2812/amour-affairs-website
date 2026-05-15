/* ============================================================
   GLOBE.JS — Animated Champagne Wireframe Globe (Dual)
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

  let rotY1 = 0;          // rotation for left globe
  let rotY2 = Math.PI;    // rotation for right globe (offset)
  const rotX = Math.PI / 10;
  let W, H, R;
  let raf = null;

  // Globe centers
  let globe1 = { cx: 0, cy: 0 };
  let globe2 = { cx: 0, cy: 0 };

  // ── Reliable resize using getBoundingClientRect on section ──
  function resize() {
    const section = document.getElementById('about');
    const rect = section.getBoundingClientRect();
    W = rect.width;
    H = rect.height;

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

    // Determine layout based on viewport width
    const isMobile = W < 600;

    if (isMobile) {
      // ── Vertical stack on mobile ──
      globe1.cx = W * 0.50;
      globe1.cy = H * 0.30;
      globe2.cx = W * 0.50;
      globe2.cy = H * 0.70;

      // Max radius: half the vertical gap between centres, minus generous padding
      const vertGap = Math.abs(globe2.cy - globe1.cy);
      const maxR    = (vertGap / 2) - 20;
      // Also prevent bleeding past left/right canvas edges
      R = Math.min(W * 0.44, H * 0.26, maxR);
    } else {
      // ── Side-by-side on desktop / tablet ──
      globe1.cx = W * 0.26;
      globe1.cy = H * 0.50;
      globe2.cx = W * 0.74;
      globe2.cy = H * 0.50;

      // Max radius: half the horizontal gap between centres, minus generous padding
      const horizGap = Math.abs(globe2.cx - globe1.cx);
      const maxR     = (horizGap / 2) - 30;
      // Also prevent bleeding past top/bottom canvas edges
      R = Math.min(H * 0.44, maxR, globe1.cx - 10);
    }
  }

  function proj(phi, theta, rotY, cx, cy) {
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

  function drawGlobe(cx, cy, rotY) {
    // Latitude rings
    for (let i = 1; i < LAT; i++) {
      const phi = (i / LAT) * Math.PI;
      const pts = [];
      for (let j = 0; j <= SEG; j++)
        pts.push(proj(phi, (j / SEG) * Math.PI * 2, rotY, cx, cy));
      const dep = pts.reduce((s, p) => s + p.depth, 0) / pts.length;
      strokeArc(pts, C_DARK, 0.18 + 0.52 * ((dep + 1) / 2), 1.0);
    }

    // Longitude meridians
    for (let i = 0; i < LON; i++) {
      const theta = (i / LON) * Math.PI * 2;
      const pts   = [];
      for (let j = 0; j <= SEG; j++)
        pts.push(proj((j / SEG) * Math.PI, theta, rotY, cx, cy));
      const dep = pts.reduce((s, p) => s + p.depth, 0) / pts.length;
      strokeArc(pts, C_DARK, 0.15 + 0.48 * ((dep + 1) / 2), 0.85);
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = `${C_LITE} 0.35)`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Radial glow
    const grd = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.15);
    grd.addColorStop(0, `${C_LITE} 0.07)`);
    grd.addColorStop(1, `${C_LITE} 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw both globes
    drawGlobe(globe1.cx, globe1.cy, rotY1);
    drawGlobe(globe2.cx, globe2.cy, rotY2);

    // Spin in opposite directions for visual interest
    rotY1 += SPEED;
    rotY2 -= SPEED;
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
