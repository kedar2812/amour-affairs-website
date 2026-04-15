# Amour Affairs - Premium Wedding Photography Website

A high-end, production-ready website for Amour Affairs, a premium wedding photography studio based in Pune, India. Built with a focus on cinematic aesthetics, smooth scrolling, and immersive animations.

## Live Demo
Run locally using Vite: `npm run dev`

## Core Technologies
- **HTML5:** Semantic structure.
- **CSS3:** Custom variables, modern layouts (Grid/Flexbox), dark cinematic aesthetic (`#0A0A0A` base, `#C8A97E` gold accents). No CSS frameworks were used (strictly Vanilla CSS).
- **Vanilla JavaScript (ES6+):** Modular architecture for animations, navigation, and components.
- **GSAP & ScrollTrigger:** Powering complex, high-performance scroll-driven animations, parallax effects, text reveals, and staggered entry animations.
- **Lenis Smooth Scroll:** Providing buttery smooth, momentum-based scrolling synced seamlessly with GSAP's ticker.
- **Swiper.js:** Lightweight carousel implementation for the client testimonials section.
- **Vite:** Next-generation frontend tooling for rapid development and optimized production builds.

## Key Features
- **Custom Cursor:** GSAP-animated custom cursor that reacts to interactive elements.
- **Cinematic Hero:** Manual GSAP slider featuring parallax backgrounds, per-word text splitting reveals, and animated progress indicators.
- **Dynamic Scroll Animations:** 
  - Iterative fade-ups and slide-ins.
  - Parallax image reveals.
  - Interactive, scroll-scrubbed process timeline that illuminates as the user scrolls.
- **Masonry Gallery:** Responsive image grid with hover scale reveals and overlays.
- **Responsive Navigation:** Glassmorphism headers that hide/show dynamically based on scroll direction, plus an animated mobile overlay menu.
- **Performance Optimized:** Uses `loading="lazy"` on images, modern CSS properties (`will-change`, `transform`), and optimized asset loading.

## Project Structure
```text
├── index.html            // Main entry point
├── package.json          // Dependencies and scripts
├── vite.config.js        // Vite configuration and PostCSS
├── src/
│   ├── main.js           // JS entry point (initializes Lenis, GSAP, modular components)
│   ├── js/               // JavaScript modules
│   │   ├── animations.js // ScrollTrigger and global animation logic
│   │   ├── cursor.js     // Custom cursor logic
│   │   ├── gallery.js    // Swiper instances and gallery events
│   │   ├── hero.js       // Hero slider logic
│   │   └── nav.js        // Navigation states and mobile menu
│   └── styles/           // CSS architecture (Vanilla CSS + PostCSS)
│       ├── reset.css
│       ├── variables.css // Design system tokens
│       ├── typography.css
│       ├── components.css
│       └── sections/     // Component-scoped CSS files
```

## Setup & Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Design System
- **Palette**: Midnight Background (`#0A0A0A`), Charcoal Alternate (`#111111`), Champagne Gold Accent (`#C8A97E`), Pearl White (`#F5F0EA`).
- **Typography**: `Cormorant Garamond` (Display/Headings), `DM Sans` (Body/UI).

## Credits
Built with passion, conforming strictly to high-end agency standards and the visual benchmarks established by leading creative portfolios.
