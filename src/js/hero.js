/* ============================================================
   HERO.JS — Cinematic Video Background with Fade Loop
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

export function initHero() {
  const video   = document.getElementById('heroVideo');
  const scrollCTA = document.querySelector('.scroll-indicator');

  /* ── Video looping with fade-in / fade-out ── */
  if (video) {
    initVideoLoop(video);
  }

  /* ── Scroll CTA ── */
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


/* ────────────────────────────────────────────────────────────
   Video loop with smooth fade-in and fade-out
   - Fade in over FADE_DURATION seconds at the start
   - Fade out over FADE_DURATION seconds before the end
   - On 'ended': wait 100ms, reset currentTime, play again
   Uses requestAnimationFrame to continuously sample currentTime
   ──────────────────────────────────────────────────────────── */

function initVideoLoop(video) {
  const FADE_DURATION = 0.5; // seconds

  let rafId = null;

  /* Continuously monitor playback and control opacity */
  function tick() {
    const dur  = video.duration;
    const cur  = video.currentTime;

    if (dur && !isNaN(dur)) {
      const timeLeft = dur - cur;

      if (cur < FADE_DURATION) {
        // Fading IN at the very start
        video.style.opacity = String(Math.min(cur / FADE_DURATION, 1));
      } else if (timeLeft < FADE_DURATION) {
        // Fading OUT near the end
        video.style.opacity = String(Math.max(timeLeft / FADE_DURATION, 0));
      } else {
        // Fully visible
        video.style.opacity = '1';
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  /* Loop: when video ends, set opacity to 0, wait, then restart */
  video.addEventListener('ended', () => {
    video.style.opacity = '0';
    cancelAnimationFrame(rafId);

    setTimeout(() => {
      video.currentTime = 0;
      video.play()
        .then(() => {
          rafId = requestAnimationFrame(tick);
        })
        .catch(() => {});
    }, 100);
  });

  /* Start playback as soon as the browser has enough data */
  function startVideo() {
    video.play()
      .then(() => {
        rafId = requestAnimationFrame(tick);
      })
      .catch(() => {
        /* Autoplay blocked (e.g. mobile data-saver) — silently ignore */
      });
  }

  if (video.readyState >= 3) {
    // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA — can play right now
    startVideo();
  } else {
    video.addEventListener('canplaythrough', startVideo, { once: true });
    // Also try on canplay in case canplaythrough takes too long
    video.addEventListener('canplay', startVideo, { once: true });
  }
}
