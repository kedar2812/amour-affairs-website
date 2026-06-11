$play = '<svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19" fill="currentColor"/></svg>'
$eye = '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>'

$gallery = @(
  @{id='53z3LB8dXo0'; title='Neha × Gaurav'; caption='Wedding Teaser'; views='3.2K'},
  @{id='WN0VRFZKPTA'; title='Bhairavi × Apurv'; caption='Wedding Trailer 2019'; views='2.5K'},
  @{id='I2lyZU1mL7U'; title='Suraksha × Harsh'; caption='Oxford Golf Resort, Pune'; views='2.3K'},
  @{id='llT0dTpTGQU'; title='Medini × Abishal'; caption='Final Trailer'; views='2K'},
  @{id='xPad7IwJumE'; title='Medini & Abishal'; caption='A Tale of Two Hearts'; views='1.1K'},
  @{id='gxecVMBOajM'; title='Bansri & Chintan'; caption='Dream Wedding, Rishikesh'; views='1K'}
)

$cards = ""
foreach ($v in $gallery) {
  $cards += @"

        <a href="https://www.youtube.com/watch?v=$($v.id)" target="_blank" rel="noopener" class="fpage-card">
          <div class="fpage-card__thumb">
            <img src="https://img.youtube.com/vi/$($v.id)/maxresdefault.jpg" alt="$($v.title)" loading="lazy" />
            <div class="fpage-card__play">$play</div>
          </div>
          <div class="fpage-card__body">
            <span class="fpage-card__title">$($v.title)</span>
            <span class="fpage-card__caption">$($v.caption)</span>
            <span class="fpage-card__views">$eye $($v.views) views</span>
          </div>
        </a>
"@
}

$footerHtml = Get-Content "f:\projects kedar\amour affairs final website\films\index.html" -Raw
$footerMatch = [regex]::Match($footerHtml, '(?s)(  <!-- FOOTER -->.*?</footer>)')
$footer = $footerMatch.Groups[1].Value

$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cinematic Wedding Films | Amour Affairs — Love Stories in Motion</title>
  <meta name="description" content="Cinematic wedding films crafted for couples who feel deeply. Highlight reels, documentary films, same-day edits — in 4K, color graded to a warm cinematic look.">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=Montserrat:ital,wght@0,400;0,500;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet">

  <script type="module" src="/src/js/films-page-init.js"></script>
</head>
<body class="is-loading fpage">

  <!-- PRELOADER -->
  <div class="preloader" id="preloader">
    <img src="/logo.svg" alt="Amour Affairs Logo" class="preloader__logo-svg" />
    <div class="preloader__progress">
      <div class="preloader__progress-fill"></div>
    </div>
  </div>

  <!-- CURSOR -->
  <div class="cursor-dot" style="opacity:0"></div>
  <div class="cursor-ring" style="opacity:0"></div>

  <!-- ═══════════ NAVIGATION ═══════════ -->
  <nav class="nav" id="nav">
    <a href="/" class="nav__logo">
      <img src="/logo.png" alt="" class="nav__logo-img" />
      <span class="logo-amour">Amour</span><span class="logo-affairs">Affairs</span><sup>&reg;</sup>
    </a>
    <div class="nav__links hide-mobile">
      <a href="/" class="nav__link">Home</a>
      <a href="/weddings/" class="nav__link">Weddings</a>
      <a href="/couple-shoots/" class="nav__link">Couples</a>
      <a href="/films/" class="nav__link nav__link--active">Films</a>
      <a href="/about/" class="nav__link">About</a>
      <a href="/testimonials/" class="nav__link">Testimonials</a>
      <a href="/shop/" class="nav__link">Shop</a>
      <a href="#contact" class="nav__link">Contact</a>
      <a href="https://wa.me/919921000052" target="_blank" rel="noopener" class="btn--nav-book nav__book hide-mobile">Book Now</a>
    </div>
    <div class="nav__hamburger hide-desktop" id="hamburger">
      <span></span><span></span><span></span>
    </div>
  </nav>

  <div class="nav__mobile-menu" id="mobileMenu">
    <a href="/" class="nav__mobile-link">Home</a>
    <a href="/weddings/" class="nav__mobile-link">Weddings</a>
    <a href="/couple-shoots/" class="nav__mobile-link">Couples</a>
    <a href="/films/" class="nav__mobile-link">Films</a>
    <a href="/about/" class="nav__mobile-link">About</a>
    <a href="/testimonials/" class="nav__mobile-link">Testimonials</a>
    <a href="/shop/" class="nav__mobile-link">Shop</a>
    <a href="#contact" class="nav__mobile-link">Contact</a>
    <div class="nav__mobile-footer">
      <a href="https://www.instagram.com/amouraffairs/" target="_blank" rel="noopener">Instagram</a>
      <a href="https://vimeo.com/amouraffairs" target="_blank" rel="noopener">Vimeo</a>
    </div>
  </div>

  <!-- ═══════════ HERO ═══════════ -->
  <section class="fpage-hero">
    <span class="fpage-hero__eyebrow">Wedding Cinema &middot; 4K &middot; Colour Graded</span>
    <h1 class="fpage-hero__title">Love Stories, <em>In Motion.</em></h1>
    <p class="fpage-hero__sub">Every frame a feeling. Every cut a heartbeat. Our films don't just document your day &mdash; they let you relive it.</p>
  </section>

  <!-- ═══════════ FEATURED FILM ═══════════ -->
  <section class="fpage-featured">
    <div class="fpage-featured__inner">
      <div class="fpage-featured__label">
        <span class="fpage-featured__label-dot"></span>
        Now Showing
      </div>
      <div class="fpage-featured__embed">
        <iframe id="featuredIframe" src="" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
      </div>
      <div class="fpage-featured__meta">
        <span class="fpage-featured__film-title" id="featuredTitle"></span>
        <span class="fpage-featured__film-type" id="featuredType"></span>
      </div>
    </div>
  </section>

  <!-- ═══════════ GALLERY ═══════════ -->
  <section class="fpage-gallery">
    <div class="fpage-gallery__inner">
      <div class="fpage-gallery__header">
        <span class="fpage-gallery__eyebrow">From Our Collection</span>
        <h2 class="fpage-gallery__heading">More <em>Love Stories</em></h2>
      </div>
      <div class="fpage-gallery__grid">
$cards
      </div>
    </div>
  </section>

  <!-- ═══════════ YOUTUBE CTA ═══════════ -->
  <section class="fpage-cta">
    <span class="fpage-cta__label">Our Film Library</span>
    <h2 class="fpage-cta__heading">Every Story Deserves to Be <em>Seen</em></h2>
    <a href="https://www.youtube.com/@amouraffairs" target="_blank" rel="noopener" class="fpage-cta__btn">Watch More on YouTube <span class="fpage-cta__btn-arrow" aria-hidden="true">&#8594;</span></a>
  </section>

$footer

  <script>
    document.querySelectorAll('.dynamic-year').forEach(el => el.textContent = new Date().getFullYear());
  </script>

  <!-- Floating WhatsApp Button -->
  <a href="https://wa.me/919921000052" class="floating-whatsapp" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
    <svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34"><path d="M12.031 0C5.397 0 0 5.397 0 12.031c0 2.115.553 4.181 1.606 6.002L.15 23.363l5.485-1.439a11.967 11.967 0 006.396 1.834h.005c6.634 0 12.03-5.398 12.03-12.032C24.066 5.397 18.665 0 12.031 0zm0 21.758c-1.782 0-3.528-.48-5.06-1.388l-.363-.214-3.766.988.995-3.674-.235-.373A9.972 9.972 0 012.001 12.03c0-5.526 4.498-10.024 10.03-10.024 5.525 0 10.024 4.497 10.024 10.024 0 5.526-4.499 10.028-10.024 10.028zm5.508-7.531c-.302-.152-1.785-.882-2.062-.982-.277-.101-.48-.152-.682.152-.202.304-.78 .982-.956 1.185-.177.202-.353.227-.655.076-2.04-.982-3.414-1.92-4.636-3.992-.126-.214.126-.202.417-.783.101-.202.05-.38-.025-.532-.076-.152-.682-1.643-.933-2.25-.246-.593-.497-.512-.682-.522-.177-.01-.38-.01-.583-.01-.202 0-.53.076-.807.38-.277.303-1.06 1.036-1.06 2.527s1.085 2.932 1.236 3.134c.152.202 2.138 3.264 5.176 4.573.722.311 1.285.497 1.724.636.724.23 1.384.197 1.905.12.584-.087 1.785-.73 2.037-1.436.252-.705.252-1.309.177-1.436-.076-.126-.277-.202-.579-.354z"/></svg>
  </a>
</body>
</html>
"@

Set-Content -Path "f:\projects kedar\amour affairs final website\films\index.html" -Value $html -Encoding UTF8
Write-Host "Films page generated successfully!"
