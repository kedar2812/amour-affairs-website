#!/usr/bin/env bash
# Rebuilds the lead-magnet PDF from checklist.html with headless Chrome.
# Output: public/downloads/Amour-Affairs-Pune-Wedding-Photography-Checklist.pdf
set -euo pipefail
cd "$(dirname "$0")/../.."
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
SRC="$(cygpath -w "$PWD/scripts/checklist-pdf/checklist.html" 2>/dev/null || echo "$PWD/scripts/checklist-pdf/checklist.html")"
OUT="$(cygpath -w "$PWD/public/downloads/Amour-Affairs-Pune-Wedding-Photography-Checklist.pdf" 2>/dev/null || echo "$PWD/public/downloads/Amour-Affairs-Pune-Wedding-Photography-Checklist.pdf")"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=15000 \
  --run-all-compositor-stages-before-draw --print-to-pdf="$OUT" "file:///${SRC//\//}"
ls -la public/downloads/
# Optional: stamp document metadata (needs `pip install pymupdf`)
python - <<'PY' 2>/dev/null || echo "(skipped metadata: pymupdf not installed)"
import pymupdf, os
p = "public/downloads/Amour-Affairs-Pune-Wedding-Photography-Checklist.pdf"
d = pymupdf.open(p)
d.set_metadata({"title": "The Ultimate Pune Wedding Photography Checklist", "author": "Amour Affairs",
                "subject": "A practical checklist for couples planning their wedding photography in Pune",
                "creator": "Amour Affairs", "producer": "Amour Affairs"})
d.save(p + ".tmp", garbage=3, deflate=True); d.close(); os.replace(p + ".tmp", p)
print("metadata stamped,", os.path.getsize(p), "bytes")
PY
