import type { StationId } from '../presets/forge';

// Screen positions of the sword's parts, written by the 3D scene every frame and read by the
// DOM overlay (hotspots, camera-relative UI). A plain mutable store keeps React out of the frame loop.
export type Anchor = { x: number; y: number; visible: boolean };

export const anchors: Record<StationId, Anchor> = {
  blade: { x: 0, y: 0, visible: false },
  guard: { x: 0, y: 0, visible: false },
  grip: { x: 0, y: 0, visible: false },
  pommel: { x: 0, y: 0, visible: false },
  finish: { x: 0, y: 0, visible: false },
};

// Interaction state shared with the overlay: the scene marks orbit drags, the overlay marks wheel
// zoom and tracks the pointer (rings appear near the sword; a tap on touch shows them for a while).
export const interaction = { dragging: false, zoomUntil: 0, touchUntil: 0, pointerX: -1e4, pointerY: -1e4 };

const listeners = new Set<() => void>();
export function publishAnchors() { listeners.forEach((fn) => fn()); }
export function onAnchors(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
