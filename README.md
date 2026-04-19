# Amour Affairs Photography

A premium, highly interactive portfolio website for a luxury wedding photography and filmmaking studio based in Pune, India. 

## Overview

This project delivers a cinematic, award-winning user experience utilizing advanced scroll-driven animations and a custom 3D canvas rendering engine. The core feature is "The Reveal" — a seamless 360-degree interactive 3D model of a dancing couple, rendered frame-by-frame on a HTML5 Canvas synchronized to the user's scroll.

## Architecture & Tech Stack

* **Core Build Tool**: Vite
* **Frontend Languages**: HTML5, Vanilla JavaScript, Vanilla CSS (Custom Design System with variables)
* **Animation Engine**: GSAP (GreenSock Animation Platform)
* **Scroll Physics**: Lenis Smooth Scroll
* **Scroll Interaction**: GSAP ScrollTrigger combined with a custom `scrollerProxy` to connect Lenis scroll physics with GSAP pinning.
* **Canvas Rendering**: Custom module `hero-canvas.js` preloads compressed WebP frames and maps browser scroll events directly to a 3D model rotation and scale transformation.

## Key Features

1. **3D Interactive Hero Sequence**:
   * Uses 120 sequentially pre-rendered frames of a 3D couple.
   * `mix-blend-mode: multiply` automatically strips away the white environment, placing the model directly into the website's DOM.
   * Frame scrubbing is tied to `ScrollTrigger` progress, combined with dynamic scaling (1.20 opening scale shrinking to 0.72 display scale).
   * Sequential fade-ins for typography based on specific scroll-progress milestones.

2. **Custom Typography & Aesthetic System**:
   * "Bridal/Gallery" aesthetic focusing on large negative space, typography (`Instrument Serif` & `Inter`), and a warm champagne color palette.
   * Fluid typography bridging `clamp()` functions across all viewpoints.

3. **Performance First**:
   * High-fidelity PNG sequences compressed to lightweight WebP using Sharp (custom `compress-frames.mjs` script), yielding a 97% reduction in size.
   * DOM elements pinned without jitter using `anticipatePin` and dedicated Lenis frame synchronization.

## Setup & Development

### Requirements
* Node.js (v16+ recommended)
* npm 

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the local development server:
```bash
npm run dev
```

### Building for Production

Compile optimized static assets:
```bash
npm run build
```
This generates a `dist/` directory ready for deployment. Compressed WebP sequences in `/public/frames` are mapped statically without bundling for optimal load performance.

## License

This is a proprietary website tailored specifically for Amour Affairs. All photography assets, branding, and structural code are reserved.
