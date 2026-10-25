#!/usr/bin/env bash
# Builds a stand-in "walkthrough" (slow pan + zoom across photos) for when the real
# walkthrough.mp4 isn't ready, then turns it into the hero's scroll frames.
#
# Usage:  bash scripts/make-standin-walkthrough.sh [photo1.jpg photo2.jpg ...]
# Default photos: forest ledge → town square → gazebo. Use wide (landscape) photos.
# When the real video arrives, just run: bash scripts/build-frames.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PHOTOS=("$@")
[ ${#PHOTOS[@]} -gt 0 ] || PHOTOS=(assets/photos/grounds-forest.jpg assets/photos/town-square.jpg assets/photos/gazebo.jpg)
SEC=4; FADE=1; FPS=24; F=$((SEC*FPS))
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
i=0
for p in "${PHOTOS[@]}"; do
  # alternate zoom-in / zoom-out with a gentle drift; 2x upscale first keeps the motion smooth
  if [ $((i % 2)) -eq 0 ]; then Z="1+0.12*on/$F"; else Z="1.12-0.12*on/$F"; fi
  ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$p" -t $SEC \
    -vf "scale=3840:1664:force_original_aspect_ratio=increase,crop=3840:1664,zoompan=z='$Z':x='(iw-iw/zoom)*(0.35+0.3*on/$F)':y='(ih-ih/zoom)/2':d=$F:s=1920x832:fps=$FPS,format=yuv420p" \
    -c:v libx264 -crf 16 -preset fast "$TMP/c$i.mp4"
  i=$((i+1))
done
# crossfade the clips together
INPUTS=(); for ((k=0;k<i;k++)); do INPUTS+=(-i "$TMP/c$k.mp4"); done
FILTER=""; prev="0:v"; off=$((SEC-FADE))
for ((k=1;k<i;k++)); do
  FILTER+="[$prev][$k:v]xfade=transition=fade:duration=$FADE:offset=$off[v$k];"; prev="v$k"; off=$((off+SEC-FADE))
done
if [ $i -gt 1 ]; then
  ffmpeg -hide_banner -loglevel error -y "${INPUTS[@]}" -filter_complex "${FILTER%;}" -map "[$prev]" -c:v libx264 -crf 18 -pix_fmt yuv420p "$TMP/standin.mp4"
else cp "$TMP/c0.mp4" "$TMP/standin.mp4"; fi
SRC="$TMP/standin.mp4" bash scripts/build-frames.sh
