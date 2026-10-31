import { useEffect, useMemo, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useConfigStore } from '../../store/configStore';
import { SWORD_TYPES } from '../../presets/swordTypes';
import { ACCOUNT, BLADE_PATTERNS, CONDITIONS, DYES, FITTINGS, GRIPS, GUARDS, POMMELS, STEELS } from '../../presets/forge';
import { swordPhysics } from '../../lib/physics';
import { playPaper } from '../../lib/audio';

const UNROLL_MS = 750;
const ROLL_MS = 420;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Parchment generated once: mottled, grained, darker at the rolled edges.
let paperUrl: string | null = null;
function paper() {
  if (paperUrl) return paperUrl;
  const c = document.createElement('canvas'); c.width = 860; c.height = 1400;
  const x = c.getContext('2d');
  if (!x) return '';
  x.fillStyle = '#EFE3C6'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 90; i++) {
    const cx = Math.random() * c.width, cy = Math.random() * c.height, r = 60 + Math.random() * 260, g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(176,150,104,${0.04 + Math.random() * 0.05})`); g.addColorStop(1, 'rgba(176,150,104,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  }
  const im = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - 0.5) * 10; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n * 0.8; }
  x.putImageData(im, 0, 0);
  const v = x.createLinearGradient(0, 0, c.width, 0);
  v.addColorStop(0, 'rgba(120,90,50,.18)'); v.addColorStop(0.12, 'rgba(120,90,50,0)'); v.addColorStop(0.88, 'rgba(120,90,50,0)'); v.addColorStop(1, 'rgba(120,90,50,.18)');
  x.fillStyle = v; x.fillRect(0, 0, c.width, c.height);
  paperUrl = c.toDataURL('image/jpeg', 0.9);
  return paperUrl;
}

export function HistoricalScroll() {
  const reading = useConfigStore((s) => s.reading);
  const setReading = useConfigStore((s) => s.setReading);
  const config = useConfigStore((s) => s.config);
  const scrollRef = useRef<HTMLDivElement>(null), sheetRef = useRef<HTMLDivElement>(null), rodRef = useRef<HTMLDivElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    const sc = scrollRef.current, sheet = sheetRef.current, rod = rodRef.current;
    if (!sc || !sheet || !rod) return;
    if (reading === opened.current) return;
    opened.current = reading;
    const ms = reduceMotion() ? 1 : reading ? UNROLL_MS : ROLL_MS, easing = reading ? 'cubic-bezier(.2,0,0,1)' : 'cubic-bezier(.4,0,1,1)';
    sheet.getAnimations().forEach((a) => a.cancel()); rod.getAnimations().forEach((a) => a.cancel());
    const h = sheet.offsetHeight;
    if (reading) { sheet.style.backgroundImage = `url(${paper()})`; sc.classList.add('open'); sheet.scrollTop = 0; sheet.querySelector<HTMLButtonElement>('.close')?.focus({ preventScroll: true }); }
    const from = reading ? 'inset(0 0 100% 0)' : 'inset(0 0 0% 0)', to = reading ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)';
    sheet.animate([{ clipPath: from }, { clipPath: to }], { duration: ms, easing, fill: 'forwards' });
    rod.animate([{ transform: `translateY(${reading ? -h : 0}px)` }, { transform: `translateY(${reading ? 0 : -h}px)` }], { duration: ms, easing, fill: 'forwards' })
      .onfinish = () => { if (!opened.current) sc.classList.remove('open'); };
    playPaper();
  }, [reading]);

  const content = useMemo(() => {
    const acc = ACCOUNT[config.archetype], preset = SWORD_TYPES[config.archetype];
    const patterns = BLADE_PATTERNS[config.archetype];
    const pattern = patterns.find((p) => p.id === config.blade.pattern) ?? patterns[0];
    const ph = swordPhysics(config);
    const feel = ph.balanceCm < 11 ? 'lively in the hand, quick to recover after a blow' : ph.balanceCm < 15 ? 'well balanced, neither sluggish nor flighty' : 'blade-heavy, made for strong cuts';
    const dye = DYES.find((d) => d.color && d.color.toLowerCase() === config.finish.gripColor.toLowerCase());
    return { acc, preset, pattern, ph, feel, dye };
  }, [config]);

  const { acc, pattern, ph, feel, dye } = content;
  const name = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? id;
  const note = (list: { id: string; note: string }[], id: string) => list.find((x) => x.id === id)?.note ?? '';
  return (
    <div className="scroll" ref={scrollRef} inert={!reading}>
      <div className="rod" />
      <div className="sheet" ref={sheetRef} role="dialog" aria-label="Historical account">
        <button className="close" aria-label="Close" onClick={() => setReading(false)}>
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
        </button>
        <h2>{acc.title}</h2>
        <div className="era">{pattern ? `${pattern.name} pattern · ${pattern.era}` : content.preset.description}</div>
        <div className="orn"><i /></div>
        <p className="lead">{acc.lead}</p>
        {pattern && <><h3>This blade</h3><p>{pattern.story}</p></>}
        <h3>In the hand</h3>
        <p>This sword weighs about {ph.massKg.toFixed(2)}&nbsp;kg, with {ph.bladeCm}&nbsp;cm of blade. Its point of balance lies some {Math.round(ph.balanceCm)}&nbsp;cm in front of the guard. It feels {feel}.</p>
        <h3>How it was fought</h3>
        <p>{acc.fighting}</p>
        <h3>Its fittings</h3>
        <dl>
          <dt>Guard</dt><dd>{name(GUARDS, config.guard.style)}. {note(GUARDS, config.guard.style)}</dd>
          <dt>Grip</dt><dd>{name(GRIPS, config.finish.gripMaterial)}{dye ? `, dyed ${dye.name.toLowerCase()}` : ''}. {note(GRIPS, config.finish.gripMaterial)}</dd>
          <dt>Pommel</dt><dd>{name(POMMELS, config.pommel.style)}. {note(POMMELS, config.pommel.style)}</dd>
          <dt>Steel</dt><dd>{name(STEELS, config.finish.steelFinish)}, {name(FITTINGS, config.finish.hardwareTone).toLowerCase()} fittings, {name(CONDITIONS, config.finish.condition).toLowerCase()}. {note(STEELS, config.finish.steelFinish)}</dd>
        </dl>
        <div className="foot">Weight and balance are estimates, reckoned from this sword’s model.</div>
      </div>
      <div className="rod" ref={rodRef} />
    </div>
  );
}
