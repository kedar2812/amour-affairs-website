/* One-off: build src/js/testimonials-page-data.js from the extracted JSON. */
const fs = require('fs');
const d = require('./testimonials-extracted.json');

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const header = `/* ============================================================
   TESTIMONIALS-PAGE-DATA.JS — Bundled fallback testimonials
   Amour Affairs · Premium Wedding Photography

   The full client testimonial archive previously hard-coded in
   testimonials/index.html, split across three marquee rows.
   Used whenever the CMS API is unreachable or has no rows yet.
   Row direction is derived from position: odd rows scroll left,
   even rows scroll right — the alternating pattern is never
   stored, so it cannot be broken by content edits.
   ============================================================ */

export const fallbackTestimonialRows = [
`;

const rows = [d.slice(0, 18), d.slice(18, 36), d.slice(36)];
let out = header;
rows.forEach((row, i) => {
  out += `  // ── Row ${i + 1} ──\n  [\n`;
  row.forEach((t) => {
    out += `    {\n`;
    out += `      quote: '${esc(t.quote)}',\n`;
    out += `      name: '${esc(t.name)}',\n`;
    out += `      location: '${esc(t.location)}',\n`;
    out += `      src: '${esc(t.src)}',\n`;
    out += `    },\n`;
  });
  out += `  ],\n`;
});
out += `];\n`;

fs.writeFileSync(require('path').join(__dirname, '../src/js/testimonials-page-data.js'), out);
console.log('written', rows.map((r) => r.length).join('/'));
