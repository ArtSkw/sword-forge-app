import type { SwordConfig } from '../store/configStore';
import { SWORD_TYPES } from '../presets/swordTypes';

/** The grip's length in metres: the sword's own (from its Form) or the type's usual. */
export const gripLengthM = (config: Pick<SwordConfig, 'archetype' | 'grip'>) => (config.grip.cm ?? SWORD_TYPES[config.archetype].gripCm) / 100;
