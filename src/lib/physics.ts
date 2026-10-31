import type { SwordConfig } from '../store/configStore';
import { SWORD_TYPES } from '../presets/swordTypes';
import { BLADE_LENGTHS, GRIP_LENGTHS } from '../components/scene/dimensions';

// Approximate mass and point of balance from the sword's parameters, for the historical account.
// A coarse physical model (steel blade with distal taper and fuller + typical fittings), not CAD.

const BLADE_WIDTH_CM = { narrow: 2.8, standard: 4.4, wide: 6.0 } as const;
const FULLER_CUT = { none: 0, single: 0.12, double: 0.15, decorative: 0.1 } as const;
const GUARD_G = { straight: 160, curved: 150, ornate: 175, fantasy: 220 } as const;
const POMMEL_G = { brazilNut: 260, disc: 190, wheel: 230, scentStopper: 210, fishtail: 245, ornate: 250, fantasy: 230 } as const;
const GRIP_G = { wood: 45, leather: 55, cord: 60, wire: 90 } as const;
const STEEL = 7.85; // g/cm³

export function swordPhysics(config: SwordConfig) {
  const preset = SWORD_TYPES[config.archetype];
  const L = BLADE_LENGTHS[config.blade.length] * 100, W = BLADE_WIDTH_CM[config.blade.width];
  const grip = GRIP_LENGTHS[config.grip.length] * 100;
  const te = config.blade.shape?.bodyTaperEnd ?? preset.bodyTaperEnd;
  const mid = config.blade.shape?.bodyTaperMidWidth ?? preset.bodyTaperMidWidth;
  const n = 60;
  let mass = 0, moment = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const w = t < te ? W * (1 - (t / te) * (1 - mid)) : W * mid * (1 - (t - te) / (1 - te));
    const dm = w * (0.6 - 0.42 * t) * 0.62 * (1 - FULLER_CUT[config.blade.fuller]) * (L / n) * STEEL;
    mass += dm; moment += dm * t * L;
  }
  const gripG = GRIP_G[config.finish.gripMaterial] * (grip / 11.2) + grip * 1.5 * 0.55 * STEEL * 0.8; // grip + tang
  const pommelG = POMMEL_G[config.pommel.style];
  mass += GUARD_G[config.guard.style] + gripG + pommelG;
  moment += -(grip / 2) * gripG - (grip + 1.8) * pommelG;
  return { massKg: mass / 1000, bladeCm: Math.round(L), balanceCm: moment / mass };
}
