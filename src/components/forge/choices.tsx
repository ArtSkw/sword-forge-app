import type { ReactNode } from 'react';
import { useConfigStore } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { CONDITIONS, DYES, FITTINGS, GRIPS, GUARDS, POMMELS, STEELS, type StationId } from '../../presets/forge';
import { currentForm, overlaps, periodNote, profilesOf, type PeriodNote } from '../../lib/forms';
import { BladeSilhouette, GripSwatch, GuardSilhouette, PommelSilhouette, SteelSwatch } from './Silhouettes';

// The choices offered at each station, as one model shared by the chooser, the inspector and the keyboard.

// `off` explains why a part sits outside the Form's age (shown as a badge on its card).
export type Choice = { id: string; name: string; era?: string; period: boolean; off: PeriodNote | null; selected: boolean; note: string; art: ReactNode; apply: () => void };
export type OptionRow = { label: string; kind: 'dots' | 'chips'; items: { id: string; name: string; swatch?: string; selected: boolean; apply: () => void }[] };
export type StationChoices = { cards: Choice[]; rows: OptionRow[]; note: string };

export function useStationChoices(station: StationId | null): StationChoices | null {
  const config = useConfigStore((s) => s.config);
  const update = useConfigStore((s) => s.update);
  if (!station) return null;
  const arch = config.archetype, preset = SWORD_TYPES[arch];
  // "Own age" = in use during the current Form's years; everything else sits under Other ages.
  const form = currentForm(config), years = form?.years ?? [0, 3000] as [number, number];
  const ofAge = (y?: [number, number]) => overlaps(y, years);
  const off = (part: { id: string; years?: [number, number] }, own?: string) => (form && own ? periodNote(part, form, own) : null);
  // A Form's own part always counts as of its age (the badge agrees: it never marks one).
  const ofForm = (part: { id: string; years?: [number, number] }, own?: string) => part.id === own || ofAge(part.years);
  let cards: Choice[] = [];
  const rows: OptionRow[] = [];

  if (station === 'blade') {
    const profiles = profilesOf(config);
    cards = profiles.length
      ? profiles.map((p) => ({ id: p.id, name: p.name, era: p.era, period: true, off: null, selected: (config.blade.profile ?? profiles[0].id) === p.id, note: p.note,
          art: <BladeSilhouette pattern={p} />,
          apply: () => update('blade', { length: p.length, width: p.width, fuller: p.fuller, profile: p.id, shape: p.shape }) }))
      : [{ id: 'classic', name: 'Classic', period: true, off: null, selected: true, note: preset.description, art: <BladeSilhouette pattern={preset.defaults.blade} />, apply: () => {} }];
  }
  if (station === 'guard') {
    cards = GUARDS.map((g) => ({ ...g, period: ofForm(g, form?.guard), off: off(g, form?.guard), selected: config.guard.style === g.id, art: <GuardSilhouette archetype={arch} style={g.id} />, apply: () => update('guard', { style: g.id }) }));
  }
  if (station === 'pommel') {
    cards = POMMELS.map((g) => ({ ...g, period: ofForm(g, form?.pommel), off: off(g, form?.pommel), selected: config.pommel.style === g.id, art: <PommelSilhouette style={g.id} />, apply: () => update('pommel', { style: g.id }) }));
  }
  if (station === 'grip') {
    cards = GRIPS.map((g) => ({ ...g, period: ofForm(g, form?.grip), off: off(g, form?.grip), selected: config.finish.gripMaterial === g.id, art: <GripSwatch material={g.id} color={config.finish.gripColor} />, apply: () => update('finish', { gripMaterial: g.id }) }));
    const natural = preset.defaults.finish.gripColor.toLowerCase(), current = config.finish.gripColor.toLowerCase();
    rows.push({ label: 'Dye', kind: 'dots', items: DYES.map((d) => ({ id: d.id, name: d.name, swatch: d.color ?? natural, selected: (d.color ?? natural).toLowerCase() === current, apply: () => update('finish', { gripColor: d.color ?? preset.defaults.finish.gripColor }) })) });
  }
  if (station === 'finish') {
    cards = STEELS.map((s) => ({ ...s, period: ofForm(s, form?.steel), off: off(s, form?.steel), selected: config.finish.steelFinish === s.id, art: <SteelSwatch finish={s.id} />, apply: () => update('finish', { steelFinish: s.id }) }));
    rows.push({ label: 'Fittings', kind: 'dots', items: FITTINGS.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch, selected: config.finish.hardwareTone === f.id, apply: () => update('finish', { hardwareTone: f.id }) })) });
    rows.push({ label: 'Condition', kind: 'chips', items: CONDITIONS.map((c) => ({ id: c.id, name: c.name, selected: config.finish.condition === c.id, apply: () => update('finish', { condition: c.id }) })) });
  }
  const sel = cards.find((c) => c.selected);
  const note = station === 'finish' ? `${sel?.note ?? ''} ${CONDITIONS.find((c) => c.id === config.finish.condition)?.note ?? ''}`.trim() : sel?.note ?? '';
  return { cards, rows, note };
}
