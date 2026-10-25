#!/usr/bin/env bash
# Turns assets/video/walkthrough.mp4 into the WebP image sequences the hero scrubs through,
# writes assets/frames/manifest.json, and makes a small fallback video.
#
# Usage (from the site folder):   bash scripts/build-frames.sh
# Optional: only use the first N seconds (fewer frames = faster load):   TRIM=15 bash scripts/build-frames.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="assets/video/walkthrough.mp4"
[ -f "$SRC" ] || { echo "Missing $SRC"; exit 1; }
TRIM_ARGS=()
[ -n "${TRIM:-}" ] && TRIM_ARGS=(-t "$TRIM")

rm -rf assets/frames/desktop assets/frames/mobile
mkdir -p assets/frames/desktop assets/frames/mobile

# Desktop: 24 fps, 1600px wide, keeps the video's aspect ratio
ffmpeg -hide_banner -loglevel error -i "$SRC" "${TRIM_ARGS[@]}" -an \
  -vf "fps=24,scale=1600:-2:flags=lanczos" \
  -c:v libwebp -quality 72 -compression_level 6 -preset photo \
  -start_number 1 assets/frames/desktop/frame_%04d.webp

# Mobile: 24 fps, 900px wide, centre-cropped to portrait 9:16 so it stays sharp on phones
ffmpeg -hide_banner -loglevel error -i "$SRC" "${TRIM_ARGS[@]}" -an \
  -vf "fps=24,crop='min(iw,ih*9/16)':ih,scale=900:-2:flags=lanczos" \
  -c:v libwebp -quality 62 -compression_level 6 -preset photo \
  -start_number 1 assets/frames/mobile/frame_%04d.webp

# Small fallback video (reduced-motion users, slow data, or if frames fail)
ffmpeg -hide_banner -loglevel error -y -i "$SRC" "${TRIM_ARGS[@]}" -an \
  -vf "scale='min(1280,iw)':-2" -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p \
  -movflags +faststart assets/video/walkthrough-web.mp4

D=$(ls assets/frames/desktop | wc -l | tr -d ' ')
M=$(ls assets/frames/mobile | wc -l | tr -d ' ')
cat > assets/frames/manifest.json <<JSON
{
  "fps": 24,
  "desktop": { "count": $D, "width": 1600, "path": "assets/frames/desktop/" },
  "mobile":  { "count": $M, "width": 900,  "path": "assets/frames/mobile/" }
}
JSON
echo "Done: $D desktop frames ($(du -sh assets/frames/desktop | cut -f1)), $M mobile frames ($(du -sh assets/frames/mobile | cut -f1))"
