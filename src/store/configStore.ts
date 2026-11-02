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
export type GuardStyle =
  | 'vikingBar' | 'vikingCurved' | 'longBar' | 'bowtie' | 'curvedDown' | 'roundCross'
  | 'recurved' | 'flatBroad' | 'arched' | 'longQuillons' | 'scottish';
// Guard ends: plain domed, a ball knob, a turned (baluster) finial, flared, hooked toward the blade, a quatrefoil plate.
export type GuardTerminal = 'plain' | 'knob' | 'finial' | 'flared' | 'hooked' | 'quatrefoil';
export type GripLength = 'short' | 'long';
export type GripShape = 'straight' | 'swell' | 'waisted' | 'twoStage';
// Falchion only: a knife hilt (Messer) instead of a sword hilt, with its cap bent into a beak or plain.
export type MesserCap = 'beak' | 'cylinder';
export type PommelStyle =
  | 'wheel'
  | 'disc'
  | 'scentStopper'
  | 'brazilNut'
  | 'fishtail'
  | 'ornate'
  // Viking hilts: a pommel crown riveted to its own upper guard (Petersen types H, S and K)
  | 'pyramid'
  | 'lobed3'
  | 'lobed5'
  // c. 1500 South German / Swiss: a pear-shaped pommel with spiral flutes
  | 'writhen';
// The four named stages of a sword's life, used for tables and labels; the sword itself carries a continuous age.
export type SwordCondition = 'pristine' | 'used' | 'battleWorn' | 'ancient';
export type SteelFinish = 'polished' | 'satin' | 'patternWelded';
export type HardwareTone = 'steel' | 'brass' | 'bronze' | 'darkIron' | 'gilt';
// Viking wire inlay on the guards: silver and copper chequer, silver and brass lozenges, or bands.
export type WireInlay = 'chequer' | 'lozenge' | 'bands';
export type GripMaterial = 'leather' | 'wood' | 'cord' | 'wire';

export interface SwordConfig {
  archetype: ArchetypeKey;
  // form: the named starting point (presets/catalogue.ts). profile: the named blade (Geibig / Oakeshott);
  // shape overrides the archetype taper.
  form?: string;
  // section / ricasso / flame: the user's choices on top of the profile (omitted = the profile's own).
  blade: { length: BladeLength; width: BladeWidth; fuller: FullerStyle; profile?: string; shape?: BladeShape; section?: Section; ricasso?: 'none' | RicassoCover; flame?: boolean };
  // terminal / ecusson / rings: omitted = the guard style's own (see lib/hilt.ts).
  // cm: the cross tip to tip (omitted = the guard style's own length on this type).
  guard: { style: GuardStyle; engraved?: boolean; terminal?: GuardTerminal; ecusson?: boolean; rings?: 1 | 2; wire?: WireInlay; cm?: number };
  // shape omitted = the type's own (GRIP_SHAPES); hilt 'messer' = riveted scales, Nagel and cap (falchion).
  // cm: the grip's length (omitted = the type's own, SwordPreset.gripCm).
  grip: { length: GripLength; shape?: GripShape; hilt?: 'messer'; cap?: MesserCap; cm?: number };
  // enamel: the engraved medallion's recesses filled with coloured enamel (champlevé).
  pommel: { style: PommelStyle; engraved?: boolean; enamel?: 'azure' | 'gules' };
  finish: {
    age: number;              // 0 = from the forge … 1 = excavated (see AGE_STOPS)
    steelFinish: SteelFinish;
    hardwareTone: HardwareTone;
    gripMaterial: GripMaterial;
    gripColor: string;
  };
}

interface ConfigStore {
  config: SwordConfig;
  setArchetype: (key: ArchetypeKey) => void;
  setForm: (id: string) => void;
  update: <K extends keyof SwordConfig>(key: K, value: Partial<SwordConfig[K]>) => void;
  viewResetTick: number;
  bumpResetTick: () => void;
  // Back to default: the type as it opens (its first Form), and the camera back to its first view.
  resetSword: () => void;
  // Forge UI state: the part being worked on (edit mode) and the historical account.
  station: StationId | null;
  setStation: (id: StationId | null) => void;
  reading: boolean;
  setReading: (on: boolean) => void;
  // Phones: the edit sheet's height in px, so the camera frames the sword in the space above it.
  sheetPx: number;
  setSheetPx: (px: number) => void;
}

// A type opens on its first Form (the most iconic one).
export function typeConfig(key: ArchetypeKey): SwordConfig {
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
  resetSword: () => set((s) => ({ config: typeConfig(s.config.archetype), viewResetTick: s.viewResetTick + 1 })),
  station: null,
  setStation: (id) => set({ station: id, reading: false }),
  reading: false,
  setReading: (on) => set({ reading: on, station: null }),
  sheetPx: 200,
  setSheetPx: (px) => set({ sheetPx: px }),
}));
