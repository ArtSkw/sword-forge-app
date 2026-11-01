import type { SwordConfig } from '../store/configStore';
import { SWORD_TYPES } from '../presets/swordTypes';
import { BLADE_PROFILES, FORMS } from '../presets/catalogue';
import { GRIPS, GUARDS, POMMELS, STEELS, type BladeProfile, type Form } from '../presets/forge';

// Forms are named starting points per sword type. A Form sets the blade profile and the hilt parts;
// the user may then change any part. Period harmony compares a chosen part's years with the Form's.

export const formsOf = (config: SwordConfig): Form[] => FORMS[config.archetype] ?? [];
export const profilesOf = (config: SwordConfig): BladeProfile[] => BLADE_PROFILES[config.archetype] ?? [];

/** The Form the sword started from (falls back to the type's first Form). */
export function currentForm(config: SwordConfig): Form | undefined {
  const forms = formsOf(config);
  return forms.find((f) => f.id === config.form) ?? forms[0];
}

export function currentProfile(config: SwordConfig): BladeProfile | undefined {
  const profiles = profilesOf(config);
  return profiles.find((p) => p.id === config.blade.profile) ?? profiles[0];
}

/** The config a Form produces on this sword type (condition is kept: it is the sword's history, not its form). */
export function applyForm(config: SwordConfig, form: Form): SwordConfig {
  const preset = SWORD_TYPES[config.archetype];
  const profile = profilesOf(config).find((p) => p.id === form.blade);
  return {
    ...config,
    form: form.id,
    blade: profile
      ? { ...config.blade, length: profile.length, width: profile.width, fuller: profile.fuller, profile: profile.id, shape: profile.shape }
      : config.blade,
    guard: { ...config.guard, style: form.guard },
    pommel: { ...config.pommel, style: form.pommel },
    finish: {
      ...config.finish,
      gripMaterial: form.grip,
      gripColor: form.gripColor ?? preset.defaults.finish.gripColor,
      steelFinish: form.steel,
      hardwareTone: form.fittings,
    },
  };
}

/** True while every part the Form sets is still as the Form left it. */
export function matchesForm(config: SwordConfig, form: Form): boolean {
  const preset = SWORD_TYPES[config.archetype];
  return (config.blade.profile ?? profilesOf(config)[0]?.id) === form.blade
    && config.guard.style === form.guard
    && config.pommel.style === form.pommel
    && config.finish.gripMaterial === form.grip
    && config.finish.gripColor.toLowerCase() === (form.gripColor ?? preset.defaults.finish.gripColor).toLowerCase()
    && config.finish.steelFinish === form.steel
    && config.finish.hardwareTone === form.fittings;
}

export const overlaps = (a: [number, number] | undefined, b: [number, number]) => !!a && a[0] <= b[1] && a[1] >= b[0];

export type PeriodNote = { title: string; body: string };

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const century = (year: number) => ordinal(Math.floor((year - 1) / 100) + 1);

// Why a part sits outside the current Form's age, for the badge on its card (null when it belongs).
// The Form's own part always belongs to it, whatever the tables say.
export function periodNote(part: { id: string; years?: [number, number] }, form: Form | undefined, own: string): PeriodNote | null {
  if (!form || part.id === own || overlaps(part.years, form.years)) return null;
  const era = form.era.endsWith('.') ? form.era : `${form.era}.`;
  // Three kinds, each one fact: when the part was in use against when this Form was made, or that it is invented.
  if (!part.years) return { title: 'Fantasy', body: 'Invented for legend and games; no surviving sword has one.' };
  return part.years[0] > form.years[1]
    ? { title: 'Later than this form', body: `In use from the ${century(part.years[0])} century. ${form.name} dates to ${era}` }
    : { title: 'Earlier than this form', body: `Out of use by about ${part.years[1]}. ${form.name} dates to ${era}` };
}

// Self-check (dev only): every Form's blade exists, and every Form's own parts sit in its period.
if (import.meta.env.DEV) {
  for (const [type, forms] of Object.entries(FORMS)) {
    for (const form of forms) {
      if (!BLADE_PROFILES[type as keyof typeof BLADE_PROFILES]?.some((p) => p.id === form.blade)) console.warn(`[forms] ${type}/${form.id}: unknown blade "${form.blade}"`);
      const parts: [string, { years?: [number, number] } | undefined][] = [
        ['guard', GUARDS.find((g) => g.id === form.guard)], ['pommel', POMMELS.find((p) => p.id === form.pommel)],
        ['grip', GRIPS.find((g) => g.id === form.grip)], ['steel', STEELS.find((x) => x.id === form.steel)],
      ];
      for (const [name, part] of parts) if (!overlaps(part?.years, form.years)) console.warn(`[forms] ${type}/${form.id}: ${name} is outside ${form.years.join('–')}`);
    }
  }
}
