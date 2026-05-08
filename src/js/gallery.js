/* ============================================================
   GALLERY.JS — Custom Instagram Feed Renderer
   Amour Affairs · Premium Wedding Photography
   Image-only posts from Behold.so JSON, theme-matched
   ============================================================ */

const FEED_POSTS = [
  {
    id: "17854456763905680",
    permalink: "https://www.instagram.com/p/Cn7Iqt9Jr94/",
    caption: "Vidita X Ishan",
    thumb: "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17854456763905680/medium.jpg",
    aspect: "square"   // 700×700
  },
  {
    id: "17997597283577506",
    permalink: "https://www.instagram.com/p/Cnwtvd_LIR-/",
    caption: "Zainab X Taher",
    thumb: "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17997597283577506/medium.jpg",
    aspect: "portrait"  // 560×700
  },
  {
    id: "17970520613087377",
    permalink: "https://www.instagram.com/p/CneuJFGr89D/",
    caption: "Zainab X Taher",
    thumb: "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17970520613087377/medium.jpg",
    aspect: "square"
  },
  {
    id: "17947517657320167",
    permalink: "https://www.instagram.com/p/CnZg1cJrzSP/",
    caption: "Zainab X Taher",
    thumb: "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17947517657320167/medium.jpg",
    aspect: "portrait"
  },
  {
    id: "17966020040297511",
    permalink: "https://www.instagram.com/p/CnRteGvLi3x/",
    caption: "Zainab x Taher",
    thumb: "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17966020040297511/medium.jpg",
    aspect: "portrait"
  },
  {
    id: "17950568912387999",
    permalink: "https://www.instagram.com/p/CnJ-WLqL5b8/",
    caption: "Zainab X Taher",
    thumb: "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17950568912387999/medium.jpg",
    aspect: "portrait"
  }
];

export function initInstagramFeed() {
  const container = document.getElementById('instaFeed');
  if (!container) return;

  // Build tiles
  container.innerHTML = FEED_POSTS.map((post, i) => `
    <a
      href="${post.permalink}"
      target="_blank"
      rel="noopener noreferrer"
      class="insta-tile insta-tile--${post.aspect}"
      id="insta-post-${post.id}"
      style="animation-delay: ${i * 0.1}s"
      aria-label="View ${post.caption} on Instagram"
    >
      <div class="insta-tile__inner">
        <img
          src="${post.thumb}"
          alt="${post.caption} — Amour Affairs"
          loading="lazy"
          class="insta-tile__img"
        >
        <div class="insta-tile__overlay">
          <div class="insta-tile__overlay-body">
            <svg class="insta-tile__ig-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            <p class="insta-tile__caption">${post.caption}</p>
            <span class="insta-tile__cta">View Post ↗</span>
          </div>
        </div>
      </div>
    </a>
  `).join('');

  // Staggered reveal
  const tiles = container.querySelectorAll('.insta-tile');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('insta-tile--visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  tiles.forEach(tile => observer.observe(tile));
}

export function initGalleryHovers() {
  // Hover handled by CSS
}
