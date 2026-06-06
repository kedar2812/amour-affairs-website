/* ============================================================
   TESTIMONIALS-CAROUSEL.JSX — Framer Motion Testimonial Carousel
   Amour Affairs · Premium Wedding Photography

   React island component with buttery-smooth Framer Motion
   animations. No autoplay — user-controlled navigation only.
   ============================================================ */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const testimonials = [
  {
    quote: "Planning a wedding can be a very stressful time, but Taher immediately put our minds at ease with his calm, measured approach. On the day he blended into the background, capturing an array of shots we didn\u2019t think were possible. The end results are truly amazing, something we will cherish for the rest of our lives together. You are utterly brilliant, and we are already recommending you to others.",
    name: "Sarrah & Aliasgar",
    location: "Pune",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80&auto=format&fit=crop",
  },
  {
    quote: "Amour Affairs is the perfect combination of everything a team of wedding photographers should be. Taher and his team surpassed every expectation. Not only were they magically present wherever a shot was required, they were punctual and worked well with the family and guests. The photographs take you back to the almost fairytale-like dream that the wedding was. The images are crisp, the colours vibrant, and the moments unforgettable.",
    name: "Tasneem & Ammar",
    location: "Dubai",
    src: "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80&auto=format&fit=crop",
  },
  {
    quote: "As a little girl I dreamed of piecing my wedding together bit by bit as I flipped through vintage photographs of my parents \u2014 picturing what it would be like one day for me. Amour Affairs has given us just that. We will always cherish the moments captured of our big day and I\u2019m certain so will our little ones. Amour Affairs did a remarkable job in capturing the essence of our wedding \u2014 the laughter, the tears, promises made \u2014 we couldn\u2019t ask for anything better.",
    name: "Shaista & Ali",
    location: "Abu Dhabi",
    src: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80&auto=format&fit=crop",
  },
  {
    quote: "We wanted to thank Amour Affairs for their incredible ability to capture the essence of our wedding day in such an enchanting way. We have gotten some unbelievable comments from friends and family \u2014 they say we look like we are in a movie, out of a magazine. Our wedding photographs captured and preserved our many memories of our magical day. We couldn\u2019t be happier with the choice of photographer that we made.",
    name: "Prianca & Karan",
    location: "Mumbai",
    src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80&auto=format&fit=crop",
  },
  {
    quote: "Taher and team added a lot of thought process, effort and planning even before arriving for the shoot. Innumerable candid shots bring detail to the memories and we will cherish them for life. Amour Affairs felt like family. All the pictures are truly mesmerizing and a wonderful reminder of an amazing time we had. The team is highly professional and always try to attain perfection.",
    name: "Zoya & Azhar",
    location: "U.S.",
    src: "https://images.unsplash.com/photo-1604017011826-d3b4c23f8914?w=800&q=80&auto=format&fit=crop",
  },
];

/* ── Arrow SVG icons ── */
const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

/* ── Stacked Photo Cards ── */
function PhotoStack({ active, total }) {
  const randomRotate = useCallback(() => {
    return Math.floor(Math.random() * 14) - 7;
  }, []);

  return (
    <div className="testi__photos">
      <div className="testi__photo-stack">
        <AnimatePresence>
          {testimonials.map((t, i) => {
            const isActive = i === active;
            const distance = Math.abs(i - active);

            return (
              <motion.div
                key={t.name}
                className="testi__photo-card"
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0.4,
                  scale: isActive ? 1 : 0.88,
                  rotate: isActive ? 0 : randomRotate(),
                  y: isActive ? 0 : 20,
                  zIndex: isActive ? total : total - distance,
                }}
                transition={{
                  duration: 0.7,
                  ease: [0.32, 0.72, 0, 1], // custom smooth cubic bezier
                  opacity: { duration: 0.5 },
                }}
                style={{ position: 'absolute', inset: 0, transformOrigin: 'center bottom' }}
              >
                <img
                  src={t.src}
                  alt={t.name}
                  draggable={false}
                  loading="lazy"
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Text Content with crossfade ── */
function QuoteContent({ active }) {
  const t = testimonials[active];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={active}
        initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
        transition={{
          duration: 0.5,
          ease: [0.32, 0.72, 0, 1],
        }}
        className="testi__slide-content"
      >
        <span className="testi__quote-mark">&ldquo;</span>
        <p className="testi__quote">{t.quote}</p>
        <div className="testi__author">
          <motion.div
            className="testi__author-line"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
            style={{ transformOrigin: 'left' }}
          />
          <div className="testi__author-info">
            <span className="testi__name">{t.name}</span>
            <span className="testi__location">{t.location}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main Carousel Component ── */
export default function TestimonialsCarousel() {
  const [active, setActive] = useState(0);
  const total = testimonials.length;

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % total);
  }, [total]);

  const handleDot = useCallback((i) => {
    setActive(i);
  }, []);

  return (
    <div className="testi__carousel">
      {/* LEFT — Stacked Photo Cards */}
      <PhotoStack active={active} total={total} />

      {/* RIGHT — Quote + Nav */}
      <div className="testi__content">
        <QuoteContent active={active} />

        {/* Navigation */}
        <div className="testi__nav">
          <div className="testi__arrows">
            <button
              className="testi__arrow testi__arrow--prev"
              onClick={handlePrev}
              aria-label="Previous testimonial"
            >
              <ChevronLeft />
            </button>
            <button
              className="testi__arrow testi__arrow--next"
              onClick={handleNext}
              aria-label="Next testimonial"
            >
              <ChevronRight />
            </button>
          </div>
          <div className="testi__dots">
            {testimonials.map((_, i) => (
              <button
                key={i}
                className={`testi__dot${i === active ? ' active' : ''}`}
                onClick={() => handleDot(i)}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
