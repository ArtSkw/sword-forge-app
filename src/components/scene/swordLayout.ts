import type { SwordConfig } from '../../store/configStore';
import { guardDef, guardHalfHeight } from '../../presets/guardShapes';
import { POMMEL_HALF_HEIGHTS, POMMEL_SCALE } from '../../presets/pommelProfiles';
import { bladeSpec } from '../../lib/bladeSpec';
import { gripLengthM } from '../../lib/hiltSize';

export const MESSER_CAP_HALF = 0.0065;

// Each part runs this far into the next (blade into cross, cross onto the grip's ferrule, grip into the
// pommel), so the joints close without a hairline of light between them.
const JOIN = 0.0005;

// Vertical layout of the sword's parts (sword space, origin at the middle), shared by the
// sword assembly, the scene's anchors and the camera focus. The parts are stacked by their real heights:
// the cross by its own section (it differs from guard to guard), so nothing floats apart.
export function getSwordLayout(config: SwordConfig) {
  const bladeLen    = bladeSpec(config).length;
  const gripLen     = gripLengthM(config);
  const guardHalf   = guardHalfHeight(guardDef(config.guard.style, config.archetype, config.guard.cm));
  // A Messer ends in a short cap over the grip instead of a pommel.
  const pommelHalfH = config.archetype === 'falchion' && config.grip.hilt === 'messer' ? MESSER_CAP_HALF : POMMEL_HALF_HEIGHTS[config.pommel.style] * (POMMEL_SCALE[config.archetype] ?? 1);
  const total       = bladeLen + guardHalf * 2 + gripLen + pommelHalfH * 2 - JOIN * 3;
  const tipY        = total / 2;
  const guardY      = tipY - bladeLen + JOIN - guardHalf;
  const gripTopY    = guardY - guardHalf + JOIN;
  return {
    bladeLen, gripLen, pommelHalfH, total, tipY,
    bladeY: tipY - bladeLen / 2,
    guardY,
    gripY: gripTopY - gripLen / 2,
    pommelY: -total / 2 + pommelHalfH,
  };
}
