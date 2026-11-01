import { create } from 'zustand';
import { SWORD_TYPES } from '../presets/swordTypes';
import { applyForm, formsOf } from '../lib/forms';
import type { BladeShape, RicassoCover, StationId } from '../presets/forge';
import type { Section } from '../presets/bladeSections';

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
  // form: the named starting point (presets/catalogue.ts). profile: the named blade (Geibig / Oakeshott);
  // shape overrides the archetype taper.
  form?: string;
  // section / ricasso / flame: the user's choices on top of the profile (omitted = the profile's own).
  blade: { length: BladeLength; width: BladeWidth; fuller: FullerStyle; profile?: string; shape?: BladeShape; section?: Section; ricasso?: 'none' | RicassoCover; flame?: boolean };
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
  setForm: (id: string) => void;
  update: <K extends keyof SwordConfig>(key: K, value: Partial<SwordConfig[K]>) => void;
  viewResetTick: number;
  bumpResetTick: () => void;
  // Forge UI state: the part being worked on (edit mode) and the historical account.
  station: StationId | null;
  setStation: (id: StationId | null) => void;
  reading: boolean;
  setReading: (on: boolean) => void;
}

// A type opens on its first Form (the most iconic one).
function typeConfig(key: ArchetypeKey): SwordConfig {
  const base: SwordConfig = { archetype: key, ...SWORD_TYPES[key].defaults };
  const first = formsOf(base)[0];
  return first ? applyForm(base, first) : base;
}

const DEFAULT_CONFIG = typeConfig('armingSword');

export const useConfigStore = create<ConfigStore>((set) => ({
  config: DEFAULT_CONFIG,
  setArchetype: (key) => set({ config: typeConfig(key), station: null }),
  setForm: (id) => set((state) => {
    const form = formsOf(state.config).find((f) => f.id === id);
    return form ? { config: applyForm(state.config, form) } : {};
  }),
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
