import { Leva, useControls, useCreateStore, folder } from 'leva';
import { useConfigStore } from '../../store/configStore';
import type {
  BladeLength, BladeWidth, FullerStyle,
  GuardStyle, PommelStyle,
  BladeFinish, MetalTone, GemstoneType,
} from '../../store/configStore';
import { levaTheme } from '../../styles/levaTheme';

const BLADE_LENGTH_OPTIONS = { Short: 'short', Medium: 'medium', Long: 'long', 'Extra Long': 'extraLong' };
const BLADE_WIDTH_OPTIONS  = { Narrow: 'narrow', Standard: 'standard', Wide: 'wide' };
const FULLER_OPTIONS       = { None: 'none', Single: 'single', Double: 'double', Decorative: 'decorative' };
const GUARD_OPTIONS        = { Straight: 'straight', Curved: 'curved', Ornate: 'ornate', Fantasy: 'fantasy' };
const POMMEL_OPTIONS       = { Wheel: 'wheel', Disc: 'disc', 'Scent Stopper': 'scentStopper', 'Brazil Nut': 'brazilNut', Fishtail: 'fishtail', Ornate: 'ornate', Fantasy: 'fantasy' };
const FINISH_OPTIONS       = { Pristine: 'pristine', Used: 'used', 'Battle-Worn': 'battleWorn', Ancient: 'ancient' };
const TONE_OPTIONS         = { Steel: 'steel', Darkened: 'darkened', 'Golden Accents': 'goldenAccents' };
const GEM_OPTIONS          = { None: 'none', Ruby: 'ruby', Sapphire: 'sapphire', Emerald: 'emerald', Amber: 'amber' };

// This component is mounted with key={archetype} in AppShell.
// useCreateStore() creates a FRESH Leva store on every mount, so controls
// always initialize from the current preset values — no global store caching.
export function ControlPanel({ flat = false }: { flat?: boolean }) {
  const { config, update } = useConfigStore();
  const store = useCreateStore();

  useControls({
    Blade: folder({
      length: {
        label: 'Length',
        value: config.blade.length,
        options: BLADE_LENGTH_OPTIONS,
        onChange: (v: BladeLength) => update('blade', { length: v }),
      },
      width: {
        label: 'Width',
        value: config.blade.width,
        options: BLADE_WIDTH_OPTIONS,
        onChange: (v: BladeWidth) => update('blade', { width: v }),
      },
      fuller: {
        label: 'Fuller',
        value: config.blade.fuller,
        options: FULLER_OPTIONS,
        onChange: (v: FullerStyle) => update('blade', { fuller: v }),
      },
    }),

    'Guard & Pommel': folder({
      guardStyle: {
        label: 'Guard',
        value: config.guard.style,
        options: GUARD_OPTIONS,
        onChange: (v: GuardStyle) => update('guard', { style: v }),
      },
      pommelStyle: {
        label: 'Pommel',
        value: config.pommel.style,
        options: POMMEL_OPTIONS,
        onChange: (v: PommelStyle) => update('pommel', { style: v }),
      },
    }),

    Finish: folder({
      bladeFinish: {
        label: 'Blade',
        value: config.finish.blade,
        options: FINISH_OPTIONS,
        onChange: (v: BladeFinish) => update('finish', { blade: v }),
      },
      metalTone: {
        label: 'Metal Tone',
        value: config.finish.metalTone,
        options: TONE_OPTIONS,
        onChange: (v: MetalTone) => update('finish', { metalTone: v }),
      },
      gripColor: {
        label: 'Grip Color',
        value: config.finish.gripColor,
        onChange: (v: string) => update('finish', { gripColor: v }),
      },
    }),

    'Fantasy Mode': folder({
      enabled: {
        label: 'Enabled',
        value: config.fantasy.enabled,
        onChange: (v: boolean) => update('fantasy', { enabled: v }),
      },
      runes: {
        label: 'Runes',
        value: config.fantasy.runes,
        onChange: (v: boolean) => update('fantasy', { runes: v }),
      },
      gemstone: {
        label: 'Gemstone',
        value: config.fantasy.gemstone,
        options: GEM_OPTIONS,
        onChange: (v: GemstoneType) => update('fantasy', { gemstone: v }),
      },
    }),
  }, { store });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Leva {...{ store, flat } as any} theme={levaTheme} titleBar={{ title: 'Customize', drag: false }} />;
}
