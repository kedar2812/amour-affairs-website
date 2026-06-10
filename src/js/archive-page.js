/* ============================================================
   ARCHIVE-PAGE.JS — Shared "folder archive" page behaviour
   Amour Affairs · Premium Wedding Photography

   Used by the Weddings and Couple Shoots pages: renders the
   folder card grid, drives the full-page album view and the
   photo lightbox, and runs the standard page animations.

   The page supplies its albums data and a class prefix
   (e.g. 'wpage' / 'cpage'); element IDs are shared across
   pages (archiveGrid, albumOverlay, lightbox, ...).
   ============================================================ */

import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { initNav } from './nav.js';
import { initPreloader } from './animations.js';

gsap.registerPlugin(ScrollTrigger);

const pad2 = (n) => String(n + 1).padStart(2, '0');

// "Aarohi & Vedant" → "Aarohi <em>&</em> Vedant"
const formatCouple = (couple) => couple.replace(' & ', ' <em>&amp;</em> ');

export function initArchivePage({
  albums,
  prefix,
  onReady,
  folderWord = 'Folder',
  openWord = 'Open Folder',
}) {
  const p = prefix;

  // ── Lenis Smooth Scroll ──
  const lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 2,
  });

  window.__lenis = lenis;

  gsap.ticker.add((time) => { lenis.raf(time * 1000); });

  lenis.on('scroll', () => { ScrollTrigger.update(); });

  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) lenis.scrollTo(value, { immediate: true });
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
    pinType: document.body.style.transform ? 'transform' : 'fixed',
  });

  ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  ScrollTrigger.defaults({ scroller: document.body });

  // ── Elements ──
  const albumView = document.getElementById('albumOverlay');
  const albumScroll = document.getElementById('albumOverlayScroll');
  const masonry = document.getElementById('albumMasonry');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCounter = document.getElementById('lightboxCounter');

  let currentAlbumIndex = -1;
  let currentPhotoIndex = 0;
  let lastFocusedCard = null;

  /* ── Folder grid ── */

  function renderArchive() {
    const grid = document.getElementById('archiveGrid');
    if (!grid) return;

    grid.innerHTML = albums
      .map((album, i) => `
        <article class="${p}-card" data-album="${i}" tabindex="0" role="button"
                 aria-label="${openWord}: ${album.couple}">
          <div class="${p}-card__thumb">
            <img src="${album.cover}" alt="${album.couple} — cover photograph" loading="lazy" />
            <span class="${p}-card__chip">${folderWord} ${pad2(i)}</span>
            <span class="${p}-card__open">${openWord} <span aria-hidden="true">&#8594;</span></span>
          </div>
          <div class="${p}-card__body">
            <span class="${p}-card__title">${formatCouple(album.couple)}</span>
            <span class="${p}-card__caption">${album.location} &middot; ${album.date} &middot; ${album.photos.length} Photographs</span>
          </div>
        </article>
      `)
      .join('');

    grid.querySelectorAll(`.${p}-card`).forEach((card) => {
      const open = () => openAlbum(Number(card.dataset.album), card);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  /* ── Album view (the opened folder) ── */

  function openAlbum(index, sourceCard = null) {
    const album = albums[index];
    if (!album || !albumView) return;

    currentAlbumIndex = index;
    if (sourceCard) lastFocusedCard = sourceCard;

    document.getElementById('overlayFolderLabel').textContent = `${folderWord} ${pad2(index)}`;
    document.getElementById('overlayTitle').innerHTML = formatCouple(album.couple);
    document.getElementById('overlayMeta').innerHTML =
      `${album.location} &middot; ${album.date} &middot; ${album.photos.length} Photographs`;
    document.getElementById('overlayDesc').textContent = album.description;

    const next = albums[(index + 1) % albums.length];
    document.getElementById('overlayNext').innerHTML =
      `${next.couple} <span aria-hidden="true">&#8594;</span>`;

    masonry.innerHTML = album.photos
      .map((src, i) => `
        <button class="${p}-album__photo" data-photo="${i}" aria-label="View photograph ${i + 1} of ${album.couple}">
          <img src="${src}" alt="${album.couple} — photograph ${i + 1}" loading="lazy" />
        </button>
      `)
      .join('');

    masonry.querySelectorAll(`.${p}-album__photo`).forEach((btn) => {
      btn.addEventListener('click', () => openLightbox(Number(btn.dataset.photo)));
    });

    albumScroll.scrollTop = 0;
    albumView.classList.add('is-open');
    albumView.setAttribute('aria-hidden', 'false');
    lenis.stop();

    gsap.fromTo(
      `.${p}-album__head > *`,
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out', delay: 0.15 }
    );
    gsap.fromTo(
      `.${p}-album__photo`,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.05, duration: 0.85, ease: 'power3.out', delay: 0.3 }
    );

    document.getElementById('overlayClose').focus({ preventScroll: true });
  }

  function closeAlbum() {
    if (!albumView || !albumView.classList.contains('is-open')) return;
    albumView.classList.remove('is-open');
    albumView.setAttribute('aria-hidden', 'true');
    currentAlbumIndex = -1;
    lenis.start();
    if (lastFocusedCard) lastFocusedCard.focus({ preventScroll: true });
  }

  /* ── Photo lightbox ── */

  function showPhoto(index) {
    const album = albums[currentAlbumIndex];
    if (!album) return;
    currentPhotoIndex = (index + album.photos.length) % album.photos.length;
    lightboxImg.src = album.photos[currentPhotoIndex];
    lightboxImg.alt = `${album.couple} — photograph ${currentPhotoIndex + 1}`;
    lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${album.photos.length}`;
    gsap.fromTo(lightboxImg, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
  }

  function openLightbox(index) {
    showPhoto(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  function initOverlayControls() {
    if (!albumView || !lightbox) return;

    document.getElementById('overlayClose').addEventListener('click', closeAlbum);
    document.getElementById('overlayNext').addEventListener('click', () => {
      openAlbum((currentAlbumIndex + 1) % albums.length);
    });

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', () => showPhoto(currentPhotoIndex - 1));
    document.getElementById('lightboxNext').addEventListener('click', () => showPhoto(currentPhotoIndex + 1));
    lightbox.querySelector(`.${p}-lightbox__backdrop`).addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (e) => {
      if (lightbox.classList.contains('is-open')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPhoto(currentPhotoIndex - 1);
        if (e.key === 'ArrowRight') showPhoto(currentPhotoIndex + 1);
        return;
      }
      if (albumView.classList.contains('is-open') && e.key === 'Escape') closeAlbum();
    });
  }

  /* ── Animations ── */

  function initHeroEntrance() {
    const tl = gsap.timeline({ delay: 0.15 });

    tl.from(`.${p}-hero__eyebrow`, {
      y: 20, opacity: 0, duration: 1.0, ease: 'power3.out'
    });
    tl.from(`.${p}-hero__title`, {
      y: 35, opacity: 0, duration: 1.2, ease: 'power3.out'
    }, '-=0.7');
    tl.from(`.${p}-hero__sub`, {
      y: 20, opacity: 0, duration: 1.0, ease: 'power3.out'
    }, '-=0.7');
  }

  function initScrollReveals() {
    if (document.querySelector(`.${p}-archive__header`)) {
      gsap.from(`.${p}-archive__header > *`, {
        scrollTrigger: {
          trigger: `.${p}-archive`,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 1.0,
        ease: 'power2.out'
      });
    }

    gsap.utils.toArray(`.${p}-card`).forEach((card) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
        y: 45,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out'
      });
    });

    if (document.querySelector(`.${p}-cta`)) {
      gsap.from(`.${p}-cta > *`, {
        scrollTrigger: {
          trigger: `.${p}-cta`,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 35,
        opacity: 0,
        stagger: 0.15,
        duration: 1.0,
        ease: 'power2.out'
      });
    }
  }

  /* ── Boot sequence ── */

  async function init() {
    renderArchive();
    initOverlayControls();
    await initPreloader();
    initNav(lenis);
    initHeroEntrance();
    initScrollReveals();
    if (typeof onReady === 'function') onReady({ gsap, ScrollTrigger, lenis });
    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
