import type { BladeLength, GripLength } from '../../store/configStore';

export const BLADE_LENGTHS: Record<BladeLength, number> = {
  short: 0.70,
  medium: 0.82,
  long: 0.98,
  extraLong: 1.18,
};

export const GRIP_LENGTHS: Record<GripLength, number> = {
  short: 0.112,
  long: 0.220,
};
