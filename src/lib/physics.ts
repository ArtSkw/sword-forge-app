import type { SwordConfig } from '../store/configStore';
import { gripLengthM } from './hiltSize';
import { sectionArea, takesFuller } from '../presets/bladeSections';
import { bladeSpec, halfWidths } from './bladeSpec';

// Approximate mass and point of balance from the sword's parameters, for the historical account.
// A coarse physical model (steel blade with distal taper and fuller + typical fittings), not CAD.

const WIDTH_PER_HALF = 2.8 / 0.014 / 2;   // cm of real blade width per metre of model half-width (narrow = 2.8 cm)
const FULLER_CUT = { none: 0, single: 0.12, double: 0.15, decorative: 0.1 } as const;
const GUARD_G = { vikingBar: 190, vikingCurved: 190, longBar: 160, bowtie: 170, curvedDown: 150, roundCross: 165, recurved: 160, flatBroad: 190, arched: 140, longQuillons: 420, scottish: 380 } as const;
// Viking pommels include their upper guard.
const POMMEL_G = { brazilNut: 260, disc: 190, wheel: 230, scentStopper: 210, fishtail: 245, ornate: 250, pyramid: 230, lobed3: 310, lobed5: 260, writhen: 240 } as const;
const GRIP_G = { wood: 45, leather: 55, cord: 60, wire: 90 } as const;
const STEEL = 7.85; // g/cm³

export function swordPhysics(config: SwordConfig) {
  const spec = bladeSpec(config), L = spec.length * 100;
  const grip = gripLengthM(config) * 100;
  // Calibrated on a lens section ~0.6 cm thick at the base. Other sections scale by their real area and
  // thickness; blades past ~90 cm are thicker at the forte (two-handers run 7–9 mm).
  const fill = 0.62 * sectionArea(spec.section, spec.archetype) * (spec.halfThick / 0.005);
  const forte = 1 + Math.max(0, (L - 90) / 45);
  const fullerCut = !takesFuller(spec.section) ? 0 : spec.singleEdged ? (config.blade.fuller === 'none' ? 0 : 0.04) : FULLER_CUT[config.blade.fuller];
  const n = 60;
  let mass = 0, moment = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, hw = halfWidths(spec, t);
    const w = (hw.spine + hw.edge) * WIDTH_PER_HALF;
    const dm = w * (0.6 - 0.42 * t) * forte * fill * (1 - fullerCut) * (L / n) * STEEL;
    mass += dm; moment += dm * t * L;
  }
  if (spec.ricasso?.cover === 'leather') mass += spec.ricasso.t * L * 6;   // wood and leather over the ricasso, ~6 g/cm
  const gripG = GRIP_G[config.finish.gripMaterial] * (grip / 11.2) + grip * 1.5 * 0.55 * STEEL * 0.8; // grip + tang
  const pommelG = POMMEL_G[config.pommel.style];
  // Two-hander hilts are far heavier: long quillons, side rings, a big pommel.
  const big = config.archetype === 'greatsword';
  const guardG = GUARD_G[config.guard.style] * (big && config.guard.style !== 'longQuillons' && config.guard.style !== 'scottish' ? 1.8 : 1), pommelBig = pommelG * (big ? 1.6 : 1);
  mass += guardG + gripG + pommelBig;
  moment += -(grip / 2) * gripG - (grip + 1.8) * pommelBig;
  return { massKg: mass / 1000, bladeCm: Math.round(L), balanceCm: moment / mass };
}
