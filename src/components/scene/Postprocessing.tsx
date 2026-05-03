export function Postprocessing() {
  // Deferred: screen-space bloom/vignette caused flashing and artificial glow
  // over the transparent canvas + live background video composition.
  return null;
}
