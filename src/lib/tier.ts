// Touch devices and small screens get the light tier: smaller textures and HDRI, a lighter grip mesh, a still
// background instead of the video. Decided once at start (a phone does not become a desktop).
export const LOW_TIER = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700);
