/* One-off: parse the static testimonials page into structured data.
   Emits JSON rows to stdout for building testimonials-page-data.js. */
const fs = require('fs');
const html = fs.readFileSync('testimonials/index.html', 'utf8');

const rowBlocks = [...html.matchAll(/<div class="tpage-row (tpage-row--\w+)">([\s\S]*?)<\/div>\s*<\/div>\s*(?=<div class="tpage-row|<\/div>\s*<!--|$)/g)];

// Simpler: split on row markers
const parts = html.split(/<div class="tpage-row tpage-row--(left|right)">/).slice(1);
const rows = [];
for (let i = 0; i < parts.length; i += 2) {
  rows.push({ dir: parts[i], body: parts[i + 1] });
}

const out = [];
rows.forEach((row, rowIdx) => {
  const cards = [...row.body.matchAll(
    /<div class="tcard-page">\s*<div class="tcard-page__photo">\s*<img src="([^"]+)"[\s\S]*?<p class="tcard-page__text">([\s\S]*?)<\/p>[\s\S]*?<div class="tcard-page__name">([\s\S]*?)<\/div>\s*<div class="tcard-page__loc">([\s\S]*?)<\/div>/g
  )];
  const seen = new Set();
  cards.forEach((m) => {
    const key = m[3].trim() + '|' + m[2].trim().slice(0, 40);
    if (seen.has(key)) return; // tracks duplicate every card for the loop
    seen.add(key);
    out.push({
      sourceRow: rowIdx + 1,
      dir: row.dir,
      src: m[1].trim(),
      quote: m[2].trim().replace(/\s+/g, ' '),
      name: m[3].trim(),
      location: m[4].trim(),
    });
  });
});

console.log(JSON.stringify(out, null, 2));
console.error(`rows: ${rows.length}, unique cards: ${out.length}`);
