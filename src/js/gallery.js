/* ============================================================
   GALLERY.JS — Instagram Feed via Behold.so JSON
   Amour Affairs · Premium Wedding Photography
   ============================================================ */

// ── Behold.so feed data (snapshot) ──────────────────────────
const INSTAGRAM_FEED = {
  "username": "amouraffairs",
  "profilePictureUrl": "https://cdn2.behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/17841401177543392/profile.webp",
  "followersCount": 6194,
  "posts": [
    {
      "id": "18098142785123787",
      "timestamp": "2026-05-01T17:26:14+0000",
      "permalink": "https://www.instagram.com/reel/DXzegEwzan7/",
      "mediaType": "VIDEO",
      "isReel": true,
      "sizes": {
        "medium": { "mediaUrl": "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/18098142785123787/medium.jpg" }
      },
      "prunedCaption": "Muhuraat dates for this wedding season are here.\nIf you've been waiting for the right time… this is it.\n\nDates are limited. Stories are not."
    },
    {
      "id": "17989018901959522",
      "timestamp": "2026-04-22T09:44:00+0000",
      "permalink": "https://www.instagram.com/reel/DXbeGT3je8A/",
      "mediaType": "VIDEO",
      "isReel": true,
      "sizes": {
        "medium": { "mediaUrl": "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17989018901959522/medium.jpg" }
      },
      "prunedCaption": "While the world moves fast, it's evenings like these that reminds us to pause. Music, connection, and a shared sense of gratitude.\nEid, celebrated beautifully with our loved ones."
    },
    {
      "id": "17985880007929855",
      "timestamp": "2026-01-21T14:52:20+0000",
      "permalink": "https://www.instagram.com/reel/DTxtZ3YDWye/",
      "mediaType": "VIDEO",
      "isReel": true,
      "sizes": {
        "medium": { "mediaUrl": "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17985880007929855/medium.jpg" }
      },
      "prunedCaption": "Some love stories don't follow a straight line.\nThey chase, they fight, they run… just like Tom & Jerry.\n\nForever isn't perfect. It's chosen. Again and again. 🤍"
    },
    {
      "id": "18542386666011475",
      "timestamp": "2025-12-27T13:32:57+0000",
      "permalink": "https://www.instagram.com/p/DSxMoYVjXqb/",
      "mediaType": "CAROUSEL_ALBUM",
      "isReel": false,
      "sizes": {
        "medium": { "mediaUrl": "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/18542386666011475/medium.jpg" }
      },
      "prunedCaption": "The dawn of new chapter, wrapped in tradition\n\nAmour Bride Anjali"
    },
    {
      "id": "17878118166439688",
      "timestamp": "2025-12-04T04:20:27+0000",
      "permalink": "https://www.instagram.com/reel/DR0-zLsCCS_/",
      "mediaType": "VIDEO",
      "isReel": true,
      "sizes": {
        "medium": { "mediaUrl": "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/17878118166439688/medium.jpg" }
      },
      "prunedCaption": "Sariha x Ashraf - Coming soon\n\nEvent - @theweddingarc\nPlanner - @the.bigdayproject\nMakeup - @glowzone_makeover_"
    },
    {
      "id": "18046744028551339",
      "timestamp": "2025-07-23T14:30:42+0000",
      "permalink": "https://www.instagram.com/reel/DMdB_YWJ9h4/",
      "mediaType": "VIDEO",
      "isReel": true,
      "sizes": {
        "medium": { "mediaUrl": "https://behold.pictures/09oPfVzJ1dM0CGrF9ehXMZgKzRq2/5zyZIu1WdFvY5icC6QCN/18046744028551339/medium.jpg" }
      },
      "prunedCaption": "Wrapped in love, barefoot on the sand, lost in each other. Just the two of them, the ocean, and a golden sky.\n\nAkshay x Barkha, 2025 | THE LOVE SEASONS"
    }
  ]
};

// ── Helpers ─────────────────────────────────────────────────

/**
 * Returns a type badge label for a post.
 */
function getPostBadge(post) {
  if (post.isReel) return 'Reel';
  if (post.mediaType === 'CAROUSEL_ALBUM') return 'Gallery';
  return null;
}

/**
 * Returns the SVG icon markup for a post type badge.
 */
function getBadgeIcon(post) {
  if (post.isReel) {
    // Play / Reel icon
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21"/>
    </svg>`;
  }
  if (post.mediaType === 'CAROUSEL_ALBUM') {
    // Stacked squares / carousel icon
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="13" height="13" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>
    </svg>`;
  }
  return '';
}

/**
 * Formats an ISO timestamp to a human readable string.
 */
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ── Renderer ─────────────────────────────────────────────────

export function initInstagramFeed() {
  const container = document.getElementById('instaFeed');
  if (!container) return;

  const { posts } = INSTAGRAM_FEED;

  // Build tiles HTML
  const tilesHTML = posts.map((post) => {
    const badge = getPostBadge(post);
    const badgeIcon = getBadgeIcon(post);
    const dateStr = formatDate(post.timestamp);
    const caption = post.prunedCaption
      ? post.prunedCaption.replace(/\n/g, ' ').slice(0, 120) + (post.prunedCaption.length > 120 ? '…' : '')
      : '';

    return `
      <a
        href="${post.permalink}"
        target="_blank"
        rel="noopener noreferrer"
        class="insta-tile"
        aria-label="View Instagram post from ${dateStr}"
        id="insta-post-${post.id}"
      >
        <div class="insta-tile__thumb">
          <img
            src="${post.sizes.medium.mediaUrl}"
            alt="${caption || 'Amour Affairs Instagram post'}"
            loading="lazy"
            class="insta-tile__img"
          >

          ${badge ? `
          <span class="insta-tile__badge">
            ${badgeIcon}
            ${badge}
          </span>` : ''}

          <div class="insta-tile__overlay">
            <div class="insta-tile__overlay-inner">
              <div class="insta-tile__overlay-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </div>
              ${caption ? `<p class="insta-tile__caption">${caption}</p>` : ''}
              <span class="insta-tile__view">View on Instagram ↗</span>
            </div>
          </div>
        </div>
      </a>
    `;
  }).join('');

  // Replace skeletons with real tiles
  container.innerHTML = tilesHTML;

  // Staggered reveal animation
  const tiles = container.querySelectorAll('.insta-tile');
  tiles.forEach((tile, i) => {
    tile.style.animationDelay = `${i * 0.08}s`;
    tile.classList.add('insta-tile--entering');
    // Trigger reflow, then add visible class
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tile.classList.add('insta-tile--visible');
      });
    });
  });
}

// Legacy export kept for backward compatibility
export function initGalleryHovers() {
  // No-op: hover effects now handled by CSS on .insta-tile
}
