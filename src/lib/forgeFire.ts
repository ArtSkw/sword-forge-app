import { FIRE_FPS, FIRE_LEVEL, FIRE_WARMTH } from './fireCurve';

// The hearth in the background plate drives the forge light: its brightness and colour follow the fire in the
// video (measured offline, frame by frame, in fireCurve.ts, and looked up at the video's current time), and
// its place on screen sets where the light comes from.

// Where the fire sits in the plate (share of the frame; measured on background.mp4 and background.webp).
export const FIRE_UV = { x: 0.27, y: 0.54 };
// The hearth for the embers (plate UV, checked on a frame of background.mp4): the canvas covers `region`; sparks
// leave the coal bed (a segment) and the foot of the flame (a point with a spread). The lower ember pit is left
// out: its sparks would rise through the stone front of the hearth.
export const HEARTH = {
  region: { u0: 0.14, u1: 0.46, v0: 0.22, v1: 0.78 },
  coalBed: { u0: 0.235, v0: 0.604, u1: 0.335, v1: 0.604 },   // the top of the glowing coals
  flameFoot: { u: 0.285, v: 0.55, spread: 0.012 },
} as const;
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

// A portrait screen shows a narrow slice of the wide plate. Centred, that slice is the dark doorway; it is
// centred instead on the stone pillar beside the hearth, so more of the forge shows on the left.
const PORTRAIT_FOCUS_U = 0.46;

/** How far the plate is moved right of its centred (object-fit: cover) place on a viewport of w × h, in CSS px:
 *  0 on landscape screens, and never so far that its left edge comes into view. */
export function plateShift(w: number, h: number, aspect = 16 / 9): number {
  if (h <= w) return 0;
  const pw = w + INSET * 2, ph = h + INSET * 2;
  const W = Math.max(pw / aspect, ph) * aspect;
  return Math.max(0, Math.min((0.5 - PORTRAIT_FOCUS_U) * W, (W - pw) / 2));
}

/**
 * Where a point of the plate (u, v: share of the frame) lands on a viewport of w × h, in CSS px, and the plate's
 * height in px (`H`, the unit the embers move in). The plate covers the viewport the way object-fit: cover does,
 * drawn 16 px past each edge, moved right by plateShift.
 */
export function plateToScreen(u: number, v: number, w: number, h: number, aspect = 16 / 9): { x: number; y: number; H: number } {
  const pw = w + INSET * 2, ph = h + INSET * 2;
  const H = Math.max(pw / aspect, ph);               // plate height in px once it covers
  const W = H * aspect;
  return { x: u * W - (W - pw) / 2 - INSET + plateShift(w, h, aspect), y: v * H - (H - ph) / 2 - INSET, H };
}

/**
 * The fire's position on screen in normalised device coordinates (−1..1, y up), for a viewport of w × h.
 * On a narrow screen the fire moves out past the left edge, and the light swings round to the side with it.
 */
export function fireOnScreen(w: number, h: number, aspect = 16 / 9): { x: number; y: number } {
  const p = plateToScreen(FIRE_UV.x, FIRE_UV.y, w, h, aspect);
  return { x: (p.x / w) * 2 - 1, y: 1 - (p.y / h) * 2 };
}
