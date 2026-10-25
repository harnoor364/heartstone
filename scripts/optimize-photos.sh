#!/usr/bin/env bash
# Compresses every photo in assets/photos/ to WebP at 800px and 1600px wide,
# into assets/photos/optimized/<name>-800.webp and <name>-1600.webp.
# The page loads those first and falls back to assets/photos/<name>.jpg.
#
# Usage (from the site folder):   bash scripts/optimize-photos.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets/photos/optimized
shopt -s nullglob nocaseglob
for f in assets/photos/*.{jpg,jpeg,png,webp}; do
  name=$(basename "${f%.*}" | tr '[:upper:]' '[:lower:]')
  for w in 800 1600; do
    ffmpeg -hide_banner -loglevel error -y -i "$f" \
      -vf "scale='min($w,iw)':-2:flags=lanczos" \
      -c:v libwebp -quality 76 -compression_level 6 -preset photo \
      "assets/photos/optimized/$name-$w.webp"
  done
  echo "✓ $name"
done
du -sh assets/photos/optimized
