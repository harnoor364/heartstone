# Heartstone Inn · demo homepage

One-page static demo (HTML, CSS, vanilla JS). No build step, no backend.
Libraries load from CDNs: GSAP 3.12.5 + ScrollTrigger (cdnjs), Lenis 1.1.13 (unpkg), Google Fonts.
Private demo: `noindex, nofollow` is set in the page and as an HTTP header (`_headers`).

## Files

```
index.html                 the page
css/styles.css             all styles (mobile-first)
js/main.js                 smooth scroll, hero frame scrub, 3D rooms carousel, parallax, reveals
_headers                   Netlify headers (noindex + caching)
scripts/build-frames.sh    video → WebP frame sequences + manifest + small fallback video
scripts/optimize-photos.sh photos → compressed WebP (800px + 1600px)
assets/video/walkthrough.mp4        ← you add this
assets/photos/*.jpg                 ← you add these (names in assets/photos/PHOTO-NAMES.md)
assets/frames/                      ← made by build-frames.sh
assets/photos/optimized/            ← made by optimize-photos.sh
```

## 1. Prepare the assets (needs ffmpeg)

```bash
# put walkthrough.mp4 in assets/video/ and the photos in assets/photos/ (see PHOTO-NAMES.md)
bash scripts/build-frames.sh          # or: TRIM=15 bash scripts/build-frames.sh  (first 15 s only)
bash scripts/optimize-photos.sh
```

The exact ffmpeg commands the script runs:

```bash
mkdir -p assets/frames/desktop assets/frames/mobile

# Desktop: 24 fps, 1600 px wide
ffmpeg -i assets/video/walkthrough.mp4 -an \
  -vf "fps=24,scale=1600:-2:flags=lanczos" \
  -c:v libwebp -quality 72 -compression_level 6 -preset photo \
  -start_number 1 assets/frames/desktop/frame_%04d.webp

# Mobile: 24 fps, 900 px wide, centre-cropped to portrait 9:16 (sharp on phones)
ffmpeg -i assets/video/walkthrough.mp4 -an \
  -vf "fps=24,crop='min(iw,ih*9/16)':ih,scale=900:-2:flags=lanczos" \
  -c:v libwebp -quality 62 -compression_level 6 -preset photo \
  -start_number 1 assets/frames/mobile/frame_%04d.webp

# Small fallback video (reduced motion / slow data / frames fail)
ffmpeg -i assets/video/walkthrough.mp4 -an -vf "scale='min(1280,iw)':-2" \
  -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart \
  assets/video/walkthrough-web.mp4
```

Then write `assets/frames/manifest.json` with the frame counts (the script does this for you):

```json
{ "fps": 24,
  "desktop": { "count": 480, "width": 1600, "path": "assets/frames/desktop/" },
  "mobile":  { "count": 480, "width": 900,  "path": "assets/frames/mobile/" } }
```

To use a horizontal (non-cropped) mobile set instead, replace the mobile `-vf` with
`"fps=24,scale=900:-2:flags=lanczos"`.

**Keep the walkthrough short.** 24 fps × 20 s = 480 frames. Expect about 100 KB per desktop frame
and 60 KB per mobile frame, so 10–15 s of video (`TRIM=15`) is the sweet spot. The page loads a
coarse pass first (every 6th frame), so scrubbing works within a second or two, then fills in the rest.
Phones skip every other frame when a video has more than 240 frames.

## 2. Deploy on Netlify (drag and drop)

1. Run the two scripts above so `assets/frames/` and `assets/photos/optimized/` exist.
2. Go to https://app.netlify.com/drop (sign in or create a free account).
3. Drag the whole site folder (the one containing `index.html`) onto the page.
4. Wait for the upload. Netlify gives you a link like `https://random-name-123.netlify.app`.
5. Optional: **Site configuration → Change site name** to get e.g. `heartstone-inn-demo.netlify.app`.
6. Share that link. To update, open the site → **Deploys** → drag the folder onto the deploy area again.

The `scripts/` folder and this README can be uploaded too; they are harmless.

## How the hero works

- `assets/frames/manifest.json` is fetched; phones (or portrait screens) get the 900 px set, others 1600 px.
- Frames are drawn on a `<canvas>` while the 400vh-tall section is pinned (CSS `position: sticky`).
- The preloader shows the % of the first pass loaded; a thin gold line shows the rest.
- Falls back to the muted, autoplaying, looping video if: `prefers-reduced-motion`, Save-Data or 2G,
  no manifest, the first frame fails, or more than 25% of frames fail.

## Replacing placeholders

- Reviews: search `index.html` for `REPLACE WITH REAL REVIEW`. Also update the duplicated list just
  below it (it makes the marquee loop seamlessly).
- Any missing photo shows as a labelled burgundy panel instead of a broken image.
