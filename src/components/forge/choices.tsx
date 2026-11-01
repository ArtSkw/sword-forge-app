import type { ReactNode } from 'react';
import { useConfigStore } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { ageLabel, DEFAULT_GRIP_SHAPE, HILT_NOTE, MESSER_CAPS, DYES, GRIP_SHAPES, GRIP_SHAPE_OFFERED, ECUSSON_NOTE, RING_CHOICES, TERMINALS, EDGE_CHOICES, FITTINGS, GRIPS, GUARDS, POMMELS, RICASSO_CHOICES, SECTIONS, SECTION_CHOICES, STEELS, type StationId } from '../../presets/forge';
import { currentForm, currentProfile, overlaps, periodNote, profileBlade, profilesOf, type PeriodNote } from '../../lib/forms';
import { bladeSpec, profileSpec } from '../../lib/bladeSpec';
import { POMMEL_FORM } from '../../presets/pommelProfiles';
import { GUARDS_BY_TYPE } from '../../presets/guardShapes';
import { BLADE_MARKINGS, INLAYS, INSCRIPTIONS, SMITH_MARKS } from '../../presets/inscriptions';
import { HILT_OPTIONS, defaultTerminal, hiltSpec } from '../../lib/hilt';
import { BladeSilhouette, CapSilhouette, GripSwatch, GuardSilhouette, PommelSilhouette, SteelSwatch } from './Silhouettes';

// The choices offered at each station, as one model shared by the chooser, the inspector and the keyboard.

// `off` explains why a part sits outside the Form's age (shown as a badge on its card).
export type Choice = { id: string; name: string; era?: string; period: boolean; off: PeriodNote | null; selected: boolean; note: string; art: ReactNode; apply: () => void };
export type OptionRow = { label: string; kind: 'dots' | 'chips' | 'list' | 'age'; value?: number; set?: (v: number) => void; items: { id: string; name: string; swatch?: string; selected: boolean; apply: () => void }[] };
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
  let extraNote = '';

  if (station === 'blade') {
    const profiles = profilesOf(config);
    cards = profiles.map((p) => ({ id: p.id, name: p.name, era: p.era, period: true, off: null, selected: (config.blade.profile ?? profiles[0].id) === p.id, note: p.note,
      art: <BladeSilhouette archetype={arch} profile={p} />, apply: () => update('blade', profileBlade(p)) }));
    // Options on top of the profile. A choice equal to the profile's own is stored as "not changed",
    // so the Form still reads as itself.
    const spec = bladeSpec(config), profile = currentProfile(config), own = profile ? profileSpec(arch, profile) : spec;
    const offered = SECTION_CHOICES[arch];
    // The profile's own section is always offered, so it can be chosen back (Type XX is a lens).
    const sections = offered && (offered.includes(own.section) ? offered : [own.section, ...offered]);
    if (sections) {
      rows.push({ label: 'Section', kind: sections.length > 2 ? 'list' : 'chips', items: sections.map((id) => ({ id, name: SECTIONS.find((x) => x.id === id)?.name ?? id, selected: spec.section === id,
        apply: () => update('blade', { section: id === own.section ? undefined : id }) })) });
      extraNote = SECTIONS.find((x) => x.id === spec.section)?.note ?? '';
    }
    // Inscription (front + reverse), its inlay metal, and a smith's mark.
    const offer = BLADE_MARKINGS[arch], insc = INSCRIPTIONS.find((i) => i.id === config.blade.inscription);
    if (offer.inscriptions.length) {
      rows.push({ label: 'Inscription', kind: 'list', items: [{ id: 'none', name: 'None' }, ...INSCRIPTIONS.filter((i) => offer.inscriptions.includes(i.id))].map((i) => ({ id: i.id, name: i.name,
        selected: (config.blade.inscription ?? 'none') === i.id, apply: () => update('blade', { inscription: i.id === 'none' ? undefined : i.id, inlay: undefined }) })) });
      if (insc) {
        const inlay = config.blade.inlay ?? insc.inlay;
        rows.push({ label: 'Inlay', kind: 'chips', items: INLAYS.map((m) => ({ id: m.id, name: m.name, selected: inlay === m.id, apply: () => update('blade', { inlay: m.id === insc.inlay ? undefined : m.id }) })) });
        extraNote = `${extraNote} ${insc.note}`.trim();
      }
    }
    if (offer.marks.length) {
      rows.push({ label: 'Smith’s mark', kind: 'chips', items: [{ id: 'none', name: 'None' }, ...SMITH_MARKS.filter((m) => offer.marks.includes(m.id))].map((m) => ({ id: m.id, name: m.name,
        selected: (config.blade.mark ?? 'none') === m.id, apply: () => update('blade', { mark: m.id === 'none' ? undefined : m.id }) })) });
      const mk = SMITH_MARKS.find((m) => m.id === config.blade.mark);
      if (mk) extraNote = `${extraNote} ${mk.note}`.trim();
    }
    if (arch === 'greatsword') {
      const cover = spec.ricasso?.cover ?? 'none', ownCover = own.ricasso?.cover ?? 'none';
      rows.push({ label: 'Ricasso', kind: 'chips', items: RICASSO_CHOICES.map((r) => ({ id: r.id, name: r.name, selected: cover === r.id,
        apply: () => update('blade', { ricasso: r.id === ownCover ? undefined : r.id }) })) });
      rows.push({ label: 'Edge', kind: 'chips', items: EDGE_CHOICES.map((e) => ({ id: e.id, name: e.name, selected: (spec.flame ? 'flame' : 'straight') === e.id,
        apply: () => update('blade', { flame: e.id === 'flame' ? true : undefined }) })) });
      extraNote = [extraNote, cover !== ownCover ? RICASSO_CHOICES.find((r) => r.id === cover)?.note : '', spec.flame ? EDGE_CHOICES[1].note : ''].filter(Boolean).join(' ');
    }
  }
  // Engraving: a running scroll on the guard's faces, a medallion on the face of a wheel or disc pommel.
  const engraving = (part: 'guard' | 'pommel', on: boolean) =>
    rows.push({ label: 'Engraving', kind: 'chips', items: [false, true].map((v) => ({ id: v ? 'engraved' : 'plain', name: v ? 'Engraved' : 'Plain', selected: on === v, apply: () => update(part, { engraved: v || undefined }) })) });
  if (station === 'guard') {
    const opts = HILT_OPTIONS[arch], h = hiltSpec(config), base = defaultTerminal(arch, config.guard.style);
    if (opts.terminals) {
      rows.push({ label: 'Ends', kind: 'chips', items: TERMINALS.map((t) => ({ id: t.id, name: t.name, selected: h.terminal === t.id,
        apply: () => update('guard', { terminal: t.id === base ? undefined : t.id }) })) });
      if (h.terminal !== base) extraNote = TERMINALS.find((t) => t.id === h.terminal)?.note ?? '';
    }
    if (opts.ecusson) {
      rows.push({ label: 'Écusson', kind: 'chips', items: [false, true].map((v) => ({ id: String(v), name: v ? 'Leaf' : 'None', selected: h.ecusson === v, apply: () => update('guard', { ecusson: v || undefined }) })) });
      if (h.ecusson) extraNote = `${extraNote} ${ECUSSON_NOTE}`.trim();
    }
    if (opts.rings) {
      rows.push({ label: 'Side rings', kind: 'chips', items: RING_CHOICES.map((r) => ({ id: String(r.id), name: r.name, selected: h.rings === r.id, apply: () => update('guard', { rings: r.id || undefined }) })) });
      if (h.rings) extraNote = `${extraNote} ${RING_CHOICES[h.rings].note}`.trim();
    }
    engraving('guard', !!config.guard.engraved);
    cards = GUARDS.filter((g) => GUARDS_BY_TYPE[arch].includes(g.id)).sort((a, b) => GUARDS_BY_TYPE[arch].indexOf(a.id) - GUARDS_BY_TYPE[arch].indexOf(b.id)).map((g) => ({ ...g, period: ofForm(g, form?.guard), off: off(g, form?.guard), selected: config.guard.style === g.id, art: <GuardSilhouette archetype={arch} style={g.id} />, apply: () => update('guard', { style: g.id }) }));
  }
  if (station === 'pommel' && config.grip.hilt === 'messer') {
    // A Messer has a cap over the grip's end instead of a pommel.
    const own = form?.cap ?? 'beak', cur = config.grip.cap ?? 'beak';
    cards = MESSER_CAPS.map((m) => ({ ...m, period: m.id === own || ofAge(m.years), off: form ? periodNote(m, form, own) : null, selected: cur === m.id,
      art: <CapSilhouette cap={m.id} />, apply: () => update('grip', { cap: m.id === 'beak' ? undefined : m.id }) }));
  } else if (station === 'pommel') {
    if (POMMEL_FORM[config.pommel.style].axis === 'z') engraving('pommel', !!config.pommel.engraved);
    cards = POMMELS.map((g) => ({ ...g, period: ofForm(g, form?.pommel), off: off(g, form?.pommel), selected: config.pommel.style === g.id, art: <PommelSilhouette style={g.id} />, apply: () => update('pommel', { style: g.id }) }));
  }
  if (station === 'grip') {
    // A Messer's grip is wooden scales, bare or leather-covered.
    cards = GRIPS.filter((g) => config.grip.hilt !== 'messer' || g.id === 'wood' || g.id === 'leather').map((g) => ({ ...g, period: ofForm(g, form?.grip), off: off(g, form?.grip), selected: config.finish.gripMaterial === g.id, art: <GripSwatch material={g.id} color={config.finish.gripColor} />, apply: () => update('finish', { gripMaterial: g.id }) }));
    // Falchion: a sword hilt or the Messer's knife hilt.
    if (arch === 'falchion') {
      const knife = config.grip.hilt === 'messer';
      rows.push({ label: 'Hilt', kind: 'chips', items: [false, true].map((v) => ({ id: v ? 'messer' : 'sword', name: v ? 'Knife (Messer)' : 'Sword', selected: knife === v,
        apply: () => update('grip', { hilt: v ? 'messer' : undefined, cap: undefined }) })) });
      if (knife) extraNote = HILT_NOTE.messer;
    }
    if (GRIP_SHAPE_OFFERED.includes(arch) && config.grip.hilt !== 'messer') {
      const own = DEFAULT_GRIP_SHAPE[arch], cur = config.grip.shape ?? own;
      rows.push({ label: 'Shape', kind: 'chips', items: GRIP_SHAPES.map((g) => ({ id: g.id, name: g.name, selected: cur === g.id, apply: () => update('grip', { shape: g.id === own ? undefined : g.id }) })) });
      extraNote = GRIP_SHAPES.find((g) => g.id === cur)?.note ?? '';
    }
    const natural = preset.defaults.finish.gripColor.toLowerCase(), current = config.finish.gripColor.toLowerCase();
    // Only leather and cord take a dye: wood shows its grain, wire is metal.
    if (config.finish.gripMaterial === 'leather' || config.finish.gripMaterial === 'cord') rows.push({ label: 'Dye', kind: 'dots', items: DYES.map((d) => ({ id: d.id, name: d.name, swatch: d.color ?? natural, selected: (d.color ?? natural).toLowerCase() === current, apply: () => update('finish', { gripColor: d.color ?? preset.defaults.finish.gripColor }) })) });
  }
  if (station === 'finish') {
    cards = STEELS.map((s) => ({ ...s, period: ofForm(s, form?.steel), off: off(s, form?.steel), selected: config.finish.steelFinish === s.id, art: <SteelSwatch finish={s.id} />, apply: () => update('finish', { steelFinish: s.id }) }));
    rows.push({ label: 'Fittings', kind: 'dots', items: FITTINGS.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch, selected: config.finish.hardwareTone === f.id, apply: () => update('finish', { hardwareTone: f.id }) })) });
    rows.push({ label: 'Age', kind: 'age', value: config.finish.age, set: (v: number) => update('finish', { age: v }), items: [] });
  }
  const sel = cards.find((c) => c.selected);
  const note = station === 'finish' ? `${sel?.note ?? ''} ${ageLabel(config.finish.age).stop.note}`.trim() : `${sel?.note ?? ''} ${extraNote}`.trim();
  return { cards, rows, note };
}
