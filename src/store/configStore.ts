import { create } from 'zustand';
import { SWORD_TYPES } from '../presets/swordTypes';

export type ArchetypeKey =
  | 'armingSword'
  | 'longsword'
  | 'bastardSword'
  | 'vikingSword'
  | 'falchion'
  | 'estoc'
  | 'greatsword';

export type BladeLength = 'short' | 'medium' | 'long' | 'extraLong';
export type BladeWidth = 'narrow' | 'standard' | 'wide';
export type FullerStyle = 'none' | 'single' | 'double' | 'decorative';
export type GuardStyle = 'straight' | 'curved' | 'ornate' | 'fantasy';
export type GripLength = 'short' | 'long';
export type PommelStyle =
  | 'wheel'
  | 'disc'
  | 'scentStopper'
  | 'brazilNut'
  | 'fishtail'
  | 'ornate'
  | 'fantasy';
export type SwordCondition = 'pristine' | 'used' | 'battleWorn' | 'ancient';
export type SteelFinish = 'polished' | 'satin' | 'darkened' | 'patternWelded';
export type HardwareTone = 'steel' | 'brass' | 'bronze' | 'darkIron';
export type GripMaterial = 'leather' | 'wood' | 'cord' | 'wire';
export type GemstoneType = 'none' | 'ruby' | 'sapphire' | 'emerald' | 'amber';

export interface SwordConfig {
  archetype: ArchetypeKey;
  blade: { length: BladeLength; width: BladeWidth; fuller: FullerStyle };
  guard: { style: GuardStyle };
  grip: { length: GripLength };
  pommel: { style: PommelStyle };
  finish: {
    condition: SwordCondition;
    steelFinish: SteelFinish;
    hardwareTone: HardwareTone;
    gripMaterial: GripMaterial;
    gripColor: string;
  };
  fantasy: { enabled: boolean; runes: boolean; gemstone: GemstoneType };
}

interface ConfigStore {
  config: SwordConfig;
  setArchetype: (key: ArchetypeKey) => void;
  update: <K extends keyof SwordConfig>(key: K, value: Partial<SwordConfig[K]>) => void;
  reset: () => void;
  viewResetTick: number;
  bumpResetTick: () => void;
}

const DEFAULT_CONFIG: SwordConfig = {
  archetype: 'armingSword',
  ...SWORD_TYPES.armingSword.defaults,
};

export const useConfigStore = create<ConfigStore>((set) => ({
  config: DEFAULT_CONFIG,
  setArchetype: (key) => {
    const preset = SWORD_TYPES[key];
    set({ config: { archetype: key, ...preset.defaults } });
  },
  update: (key, value) =>
    set((state) => ({
      config: { ...state.config, [key]: { ...(state.config[key] as object), ...value } },
    })),
  reset: () => set({ config: DEFAULT_CONFIG }),
  viewResetTick: 0,
  bumpResetTick: () => set((s) => ({ viewResetTick: s.viewResetTick + 1 })),
}));
