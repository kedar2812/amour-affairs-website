# Amour Affairs Dashboard

A premium, modern dashboard designed for managing a photography studio's pipeline, lead sources, upcoming shoots, and overall financial performance. The dashboard features a clean geometry, frosted glass components, dynamic Framer Motion animations, and a comprehensive semantic dark mode.

## Features

- **Semantic Dark Mode:** Fully dynamic, system-aware light and dark themes using CSS variables and Tailwind CSS.
- **Micro-Animations:** Fluid, staggered reveal animations across data cards using Framer Motion.
- **Frosted Glass UI:** Premium floating header with backdrop-blur and responsive semi-transparent surfaces.
- **Actionable KPI Cards:** Dynamic tracking of gross revenue, bookings, active inquiries, and shoots.
- **Conversion Funnel Visualization:** Stage-by-stage client pipeline breakdown.
- **Interactive Revenue Chart:** Smooth data visualization built with Recharts.
- **Lead Source Breakdown:** Visual allocation of traffic derived from various campaigns and social platforms.

## Architecture & Tech Stack

This project is built using:
- **Next.js (App Router):** Fast, server-side rendered React framework.
- **Tailwind CSS v4:** Utility-first styling utilizing the new `@theme` API and semantic CSS properties for theme persistence.
- **Framer Motion:** High-performance physics-based animations for UI interactions.
- **Recharts:** Composable charting library for React.
- **Lucide React:** Beautiful and consistent iconography.
- **Next-Themes:** Theme state persistence and SSR-safe toggle mechanism.

## Getting Started

First, install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore the dashboard.

## Development Context

### Theming System
Theming is handled via `next-themes` appending the `.dark` class to the HTML root alongside a `suppressHydrationWarning`. Tailwind accesses the exact theme tokens via the custom CSS variables configured in `src/app/globals.css`.

- To edit the primary Terracotta color globally, modify the `--primary` variables inside `globals.css`.
- Core interactive components are located in `src/components/dashboard`.
- Global UI structure (Sidebar and Header) resides in `src/components/layout`.
