const fs = require('fs');
const path = require('path');

// All HTML files in the project
const glob = require('fs');

function findHtmlFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findHtmlFiles(full, results);
    } else if (entry.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

const allHtml = findHtmlFiles(__dirname);
console.log(`Found ${allHtml.length} HTML files`);

// Map of mojibake sequences → correct characters
const fixes = [
  // Em dash — (U+2014)
  [/Ã¢â‚¬â€œ/g,   '\u201C'],  // left double quote "
  [/Ã¢â‚¬â€/g,    '\u2014'],  // em dash —
  [/â€"/g,         '\u2014'],  // em dash —
  [/â€™/g,         '\u2019'],  // right single quote '
  [/â€˜/g,         '\u2018'],  // left single quote '
  [/â€œ/g,         '\u201C'],  // left double quote "
  [/â€/g,          '\u201D'],  // right double quote "
  // Registered trademark ®
  [/Â®/g,          '\u00AE'],  // ®
  // Box-drawing chars ═ (U+2550)
  [/Ã¢â€¢Â/g,      '\u2550'], // ═
  [/â•/g,           '\u2550'], // ═
  // Bullet •
  [/Ã¢â‚¬Â¢/g,    '\u2022'], // •
  // Non-breaking space
  [/Â /g,           '\u00A0'],
  // Copyright ©
  [/Â©/g,           '\u00A9'],
  // En dash –
  [/â€"/g,          '\u2013'],
  // Ellipsis …
  [/â€¦/g,          '\u2026'],
];

let totalFixed = 0;

allHtml.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  fixes.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const rel = path.relative(__dirname, filePath);
    console.log(`FIXED: ${rel}`);
    totalFixed++;
  }
});

console.log(`\nDone. Fixed ${totalFixed} files.`);

// Quick verification
const remaining = allHtml.filter(f => {
  const c = fs.readFileSync(f, 'utf8');
  return c.includes('Ã¢') || c.includes('â€') || c.includes('Â®');
});
if (remaining.length) {
  console.log('\nStill has issues:');
  remaining.forEach(f => console.log(' -', path.relative(__dirname, f)));
} else {
  console.log('All clean!');
}
