import type { SwordConfig } from '../../store/configStore';
import { GUARD_HEIGHT } from './Crossguard';
import { POMMEL_HALF_HEIGHTS } from '../../presets/pommelProfiles';
import { BLADE_LENGTHS, GRIP_LENGTHS } from './dimensions';

// Vertical layout of the sword's parts (sword space, origin at the middle), shared by the
// sword assembly, the scene's anchors and the camera focus.
export function getSwordLayout(config: SwordConfig) {
  const bladeLen    = BLADE_LENGTHS[config.blade.length];
  const gripLen     = GRIP_LENGTHS[config.grip.length];
  const pommelHalfH = POMMEL_HALF_HEIGHTS[config.pommel.style];
  const total       = bladeLen + GUARD_HEIGHT + gripLen + pommelHalfH * 2;
  const tipY        = total / 2;
  return {
    bladeLen, gripLen, pommelHalfH, total, tipY,
    bladeY: tipY - bladeLen / 2,
    guardY: tipY - bladeLen - GUARD_HEIGHT / 2,
    gripY: tipY - bladeLen - GUARD_HEIGHT - gripLen / 2,
    pommelY: -total / 2 + pommelHalfH,
  };
}
