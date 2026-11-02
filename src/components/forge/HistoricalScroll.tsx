import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useConfigStore } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { ACCOUNT, ageLabel, DYES, FITTINGS, GRIPS, GUARDS, POMMELS, STEELS } from '../../presets/forge';
import { currentForm, currentProfile } from '../../lib/forms';
import { swordPhysics } from '../../lib/physics';
import { playScroll } from '../../lib/audio';

const UNROLL_MS = 750;
const ROLL_MS = 380;
// Closing: the sheet rolls up and, before it is done, the rolled scroll lifts away, so the rollers
// are gone by the time the overview (title, sword types) fades back in.
const LIFT_AT = 0.45, LIFT_MS = 200;
const easeOut = (k: number) => 1 - (1 - k) ** 4;
const easeIn = (k: number) => k ** 2.4;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Painted rollers, vellum and deckled edges (see .scroll in forge.css), served from public/scroll.
const BASE = import.meta.env.BASE_URL;
const SCROLL_ART = {
  '--roller': `url(${BASE}scroll/roller.webp)`, '--paper': `url(${BASE}scroll/parchment.webp)`,
  '--edge-l': `url(${BASE}scroll/edge-l.svg)`, '--edge-r': `url(${BASE}scroll/edge-r.svg)`,
} as CSSProperties;

export function HistoricalScroll() {
  const reading = useConfigStore((s) => s.reading);
  const setReading = useConfigStore((s) => s.setReading);
  const config = useConfigStore((s) => s.config);
  const scrollRef = useRef<HTMLDivElement>(null), sheetRef = useRef<HTMLDivElement>(null), rodRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  // 0 = rolled up, 1 = open. The sheet's clip and the lower roller are set together in one frame
  // loop, so the paper edge never trails the roller (a compositor transform and a main-thread clip
  // animation can drift apart while the 3D scene is busy). A reversal starts from where it is.
  const progress = useRef(0);
  const stopTween = useRef<(() => void) | null>(null);
  useEffect(() => () => stopTween.current?.(), []);

  useEffect(() => {
    const sc = scrollRef.current, sheet = sheetRef.current, rod = rodRef.current;
    if (!sc || !sheet || !rod) return;
    if (reading === opened.current) return;
    opened.current = reading;
    stopTween.current?.();
    sc.getAnimations().forEach((a) => a.cancel());
    if (reading) { sc.classList.add('open'); sheet.scrollTop = 0; sheet.querySelector<HTMLButtonElement>('.close')?.focus({ preventScroll: true }); }
    const h = sheet.offsetHeight, from = progress.current, to = reading ? 1 : 0;
    const ms = reduceMotion() ? 1 : (reading ? UNROLL_MS : ROLL_MS) * Math.max(0.3, Math.abs(to - from)), ease = reading ? easeOut : easeIn;
    const apply = (p: number) => { progress.current = p; sheet.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`; rod.style.transform = `translateY(${-(1 - p) * h}px)`; };
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      apply(from + (to - from) * ease(k));
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    stopTween.current = () => cancelAnimationFrame(raf);
    if (!reading) {
      sc.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: reduceMotion() ? 1 : LIFT_MS, delay: ms * LIFT_AT, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' })
        .onfinish = () => { if (!opened.current) sc.classList.remove('open'); };
    }
    playScroll(reading);
  }, [reading]);

  const content = useMemo(() => {
    const acc = ACCOUNT[config.archetype], preset = SWORD_TYPES[config.archetype];
    const pattern = currentProfile(config), form = currentForm(config);
    const ph = swordPhysics(config);
    const feel = ph.balanceCm < 11 ? 'lively in the hand, quick to recover after a blow' : ph.balanceCm < 15 ? 'well balanced, neither sluggish nor flighty' : 'blade-heavy, made for strong cuts';
    const dye = DYES.find((d) => d.color && d.color.toLowerCase() === config.finish.gripColor.toLowerCase());
    return { acc, preset, pattern, form, ph, feel, dye };
  }, [config]);

  const { acc, pattern, form, ph, feel, dye } = content;
  const name = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
  const note = (list: { id: string; note: string }[], id: string) => list.find((x) => x.id === id)?.note ?? '';
  return (
    <>
    <div className="scroll-veil" aria-hidden="true" onClick={() => setReading(false)} />
    <div className="scroll" ref={scrollRef} inert={!reading} style={SCROLL_ART}>
      <div className="rod" />
      <div className="sheet" ref={sheetRef} role="dialog" aria-label="History & use">
        <button className="close seal" aria-label="Close" data-tip="Close" data-tip-body="Back to the forge (Esc)" onClick={() => setReading(false)}>
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
        </button>
        <h2>{acc.title}</h2>
        <div className="era">{form ? `${form.name} · ${form.era}` : content.preset.description}</div>
        <div className="orn"><i /></div>
        <p className="lead">{acc.lead}</p>
        {form && <><h3>This form</h3><p>{form.story}</p>
          <p className="after">{form.anchorUrl ? <a href={form.anchorUrl} target="_blank" rel="noreferrer">{form.anchor}</a> : form.anchor}</p></>}
        {pattern && <><h3>This blade · {pattern.name}</h3><p>{pattern.story}</p></>}
        <h3>In the hand</h3>
        <p>This sword weighs about {ph.massKg.toFixed(2)}&nbsp;kg, with {ph.bladeCm}&nbsp;cm of blade. Its point of balance lies some {Math.round(ph.balanceCm)}&nbsp;cm in front of the guard. It feels {feel}.</p>
        <h3>How it was fought</h3>
        <p>{acc.fighting}</p>
        <h3>Its fittings</h3>
        <dl>
          <dt>Guard</dt><dd>{name(GUARDS, config.guard.style)}. {note(GUARDS, config.guard.style)}</dd>
          <dt>Grip</dt><dd>{name(GRIPS, config.finish.gripMaterial)}{dye ? `, dyed ${dye.name.toLowerCase()}` : ''}. {note(GRIPS, config.finish.gripMaterial)}</dd>
          <dt>Pommel</dt><dd>{name(POMMELS, config.pommel.style)}. {note(POMMELS, config.pommel.style)}</dd>
          <dt>Steel</dt><dd>{name(STEELS, config.finish.steelFinish)}, {name(FITTINGS, config.finish.hardwareTone).toLowerCase()} fittings, {ageLabel(config.finish.age).stop.name.toLowerCase()}. {note(STEELS, config.finish.steelFinish)}</dd>
        </dl>
        <div className="foot">Weight and balance are estimates, reckoned from this sword’s model.</div>
      </div>
      <div className="rod" ref={rodRef} />
    </div>
    </>
  );
}
