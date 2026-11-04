import { FIRE_FPS, FIRE_LEVEL, FIRE_WARMTH } from './fireCurve';

// The hearth in the background plate drives the forge light: its brightness and colour follow the fire in the
// video (measured offline, frame by frame, in fireCurve.ts, and looked up at the video's current time), and
// its place on screen sets where the light comes from.

// Where the fire sits in the plate (share of the frame; measured on background.mp4 and background.webp).
export const FIRE_UV = { x: 0.27, y: 0.54 };
const INSET = 16;   // the plate is drawn 16 px past each edge of the viewport (AppShell), then cropped to cover

let video: HTMLVideoElement | null = null;
const MEAN = { level: 1, warmth: 0 };
const reading = { level: 1, warmth: 0 };

/** AppShell hands over its background video (null when it unmounts or on low-tier devices, which show a still). */
export function setFireVideo(el: HTMLVideoElement | null) { video = el; }

/**
 * The fire now, relative to its mean: `level` ~0.8–1.25, `warmth` −1 (paler, yellower) to 1 (deeper, redder),
 * eased between the video's frames. Without a playing video it stays at the mean.
 */
export function readFire(): { level: number; warmth: number } {
  if (!video || video.readyState < 1 || video.paused) return MEAN;
  const n = FIRE_LEVEL.length, f = (video.currentTime * FIRE_FPS) % n, i = Math.floor(f), j = (i + 1) % n, k = f - i;
  reading.level = FIRE_LEVEL[i] + (FIRE_LEVEL[j] - FIRE_LEVEL[i]) * k;
  reading.warmth = FIRE_WARMTH[i] + (FIRE_WARMTH[j] - FIRE_WARMTH[i]) * k;
  return reading;
}

/**
 * The fire's position on screen in normalised device coordinates (−1..1, y up), for a viewport of w × h.
 * The plate covers the viewport the way object-fit: cover does, so on a narrow screen the fire moves out
 * past the left edge, and the light swings round to the side with it.
 */
export function fireOnScreen(w: number, h: number, aspect = 16 / 9): { x: number; y: number } {
  const pw = w + INSET * 2, ph = h + INSET * 2;
  const scale = Math.max(pw / aspect, ph);           // plate height in px once it covers
  const plateW = scale * aspect, plateH = scale;
  const px = FIRE_UV.x * plateW - (plateW - pw) / 2 - INSET, py = FIRE_UV.y * plateH - (plateH - ph) / 2 - INSET;
  return { x: (px / w) * 2 - 1, y: 1 - (py / h) * 2 };
}
