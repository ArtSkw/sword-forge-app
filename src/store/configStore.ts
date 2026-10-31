import { create } from 'zustand';
import { SWORD_TYPES } from '../presets/swordTypes';
import type { BladeShape, StationId } from '../presets/forge';

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
  // pattern: a named historical blade form (presets/forge.ts); shape overrides the archetype taper.
  blade: { length: BladeLength; width: BladeWidth; fuller: FullerStyle; pattern?: string; shape?: BladeShape };
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
  viewResetTick: number;
  bumpResetTick: () => void;
  // Forge UI state: the part being worked on (edit mode) and the historical account.
  station: StationId | null;
  setStation: (id: StationId | null) => void;
  reading: boolean;
  setReading: (on: boolean) => void;
}

const DEFAULT_CONFIG: SwordConfig = {
  archetype: 'armingSword',
  ...SWORD_TYPES.armingSword.defaults,
};

export const useConfigStore = create<ConfigStore>((set) => ({
  config: DEFAULT_CONFIG,
  setArchetype: (key) => {
    const preset = SWORD_TYPES[key];
    set({ config: { archetype: key, ...preset.defaults }, station: null });
  },
  update: (key, value) =>
    set((state) => ({
      config: { ...state.config, [key]: { ...(state.config[key] as object), ...value } },
    })),
  viewResetTick: 0,
  bumpResetTick: () => set((s) => ({ viewResetTick: s.viewResetTick + 1 })),
  station: null,
  setStation: (id) => set({ station: id, reading: false }),
  reading: false,
  setReading: (on) => set({ reading: on, station: null }),
}));
