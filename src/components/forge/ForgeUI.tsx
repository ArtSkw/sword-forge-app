import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './forge.css';
import { useConfigStore, type ArchetypeKey } from '../../store/configStore';
import { SWORD_TYPES, SWORD_TYPE_ORDER } from '../../presets/swordTypes';
import { ARCHETYPE_ERA, BLADE_PATTERNS, STATIONS, type StationId } from '../../presets/forge';
import { anchors, interaction, onAnchors } from '../../lib/anchors';
import { audioState, playBellows, playCling, playHiss, playOneShot, playTick, type ClingParams } from '../../lib/audio';
import { exportConfig } from '../../lib/exportConfig';
import { takeScreenshot } from '../../lib/screenshot';
import { useStationChoices, type Choice, type StationChoices } from './choices';
import { HistoricalScroll } from './HistoricalScroll';

const BASE = import.meta.env.BASE_URL;
const ANVIL = `${BASE}sounds/anvil.wav`, CLING = `${BASE}sounds/sword-cling.mp3`;
// Subtle per-sword colouring of the same cling: pitch within ±3%, gentle filtering.
const CLING_PARAMS: Record<ArchetypeKey, ClingParams> = {
  armingSword: { playbackRate: 1.00, filterType: 'peaking', filterFreq: 4000, volume: 0.40 },
  longsword: { playbackRate: 0.98, filterType: 'lowpass', filterFreq: 7000, volume: 0.41 },
  bastardSword: { playbackRate: 0.99, filterType: 'lowpass', filterFreq: 6500, volume: 0.41 },
  vikingSword: { playbackRate: 1.01, filterType: 'lowpass', filterFreq: 6000, volume: 0.41 },
  falchion: { playbackRate: 1.00, filterType: 'lowpass', filterFreq: 6500, volume: 0.41 },
  estoc: { playbackRate: 1.03, filterType: 'peaking', filterFreq: 5000, volume: 0.38 },
  greatsword: { playbackRate: 0.98, filterType: 'lowpass', filterFreq: 5500, volume: 0.41 },
};
const SHORT_NAMES: Record<ArchetypeKey, string> = { armingSword: 'Arming', longsword: 'Longsword', bastardSword: 'Bastard', vikingSword: 'Viking', falchion: 'Falchion', estoc: 'Estoc', greatsword: 'Greatsword' };
const RING_REACH = 90;   // px from the sword's line within which the rings appear
const TIP_DELAY = 450;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONS = {
  scroll: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 4 H17 A2 2 0 0 1 17 8 H8 V18 A2 2 0 0 1 4 18 V6 A2 2 0 0 1 6 4 Z" /><path d="M8 8 V18 H18 A2 2 0 0 0 18 14 H10" /><path d="M11 11 H15" /></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12 A8 8 0 1 0 7 5.8" /><path d="M4 4 V9 H9" /></svg>,
  sound: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" /><path d="M15.5 8.5 A5 5 0 0 1 15.5 15.5 M18.5 5.5 A9 9 0 0 1 18.5 18.5" /></svg>,
  muted: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 5 L6 9 H3 V15 H6 L11 19 Z" /><path d="M16 9 L22 15 M22 9 L16 15" /></svg>,
  export: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 15 V3 M7 8 L12 3 L17 8" /><path d="M4 14 V20 H20 V14" /></svg>,
  shot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7 L10 4 H14 L16 7" /></svg>,
  prev: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2 L4 6 L8 10" /></svg>,
  next: <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 2 L8 6 L4 10" /></svg>,
};

function forgeSound() { playTick(); setTimeout(() => playOneShot(ANVIL, 0.32), 60); setTimeout(() => playHiss(), 420); }

// ── Tooltips: styled, delayed, shared by every element with data-tip ──────────
// Usage: data-tip="Title" (+ optional data-tip-body="One line"). Shows above the element.
// The text is read from the element on every render, so a label that changes (Copied, Sound off) stays true.
function Tooltip({ mode }: { mode: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ el: HTMLElement; x: number; y: number } | null>(null);
  const hideRef = useRef<() => void>(() => {});
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined, current: HTMLElement | null = null;
    const usable = (el: HTMLElement) => el.isConnected && !el.closest('[inert]');
    const show = (el: HTMLElement, delay: number) => {
      clearTimeout(timer); current = el;
      timer = setTimeout(() => {
        if (!usable(el)) return;
        const r = el.getBoundingClientRect();
        el.setAttribute('aria-describedby', 'forge-tip');
        setTip({ el, x: r.left + r.width / 2, y: r.top });
      }, delay);
    };
    const hide = () => { clearTimeout(timer); current?.removeAttribute('aria-describedby'); current = null; setTip(null); };
    hideRef.current = hide;
    const over = (e: Event) => { const el = (e.target as HTMLElement).closest<HTMLElement>('.forge [data-tip]'); if (el && el !== current) show(el, TIP_DELAY); else if (!el && current) hide(); };
    const focus = (e: FocusEvent) => { const el = (e.target as HTMLElement).closest<HTMLElement>('.forge [data-tip]'); if (el && el.matches(':focus-visible')) show(el, 0); };
    const down = (e: PointerEvent) => { if (!current || !current.contains(e.target as Node)) hide(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    addEventListener('pointerover', over); addEventListener('focusin', focus); addEventListener('focusout', hide);
    addEventListener('pointerdown', down); addEventListener('keydown', key); addEventListener('wheel', hide, { passive: true });
    return () => { hide(); removeEventListener('pointerover', over); removeEventListener('focusin', focus); removeEventListener('focusout', hide); removeEventListener('pointerdown', down); removeEventListener('keydown', key); removeEventListener('wheel', hide); };
  }, []);
  // Switching between overview, edit and reading moves everything: drop the tooltip.
  useEffect(() => { hideRef.current(); }, [mode]);
  // Keep the tooltip on screen once its width is known.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !tip) return;
    const w = el.offsetWidth, x = Math.max(12 + w / 2, Math.min(innerWidth - 12 - w / 2, tip.x));
    el.style.left = `${x}px`; el.style.top = `${tip.y - 10}px`;
  });
  const title = tip?.el.dataset.tip, body = tip?.el.dataset.tipBody;
  return tip ? (
    <div ref={ref} id="forge-tip" className="tooltip glass" role="tooltip">
      <b>{title}</b>{body && <span>{body}</span>}
    </div>
  ) : null;
}

// ── Hotspots: appear while the pointer is over the sword; a name only on the ring you point at ──
function Hotspots({ hidden, onOpen }: { hidden: boolean; onOpen: (id: StationId) => void }) {
  const rings = useRef<Partial<Record<StationId, HTMLButtonElement | null>>>({});
  const layer = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  useEffect(() => onAnchors(() => {
    // Distance from the pointer to the sword's line (finish → pommel, extended to the tip side).
    const a = anchors.finish, b = anchors.pommel, px = interaction.pointerX, py = interaction.pointerY;
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(-0.25, Math.min(1.05, ((px - a.x) * dx + (py - a.y) * dy) / len2));
    const near = Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)) < RING_REACH;
    const now = performance.now();
    const show = (near || now < interaction.touchUntil) && !hidden && !interaction.dragging && now > interaction.zoomUntil && anchors.pommel.visible;
    if (layer.current && show !== shown.current) { shown.current = show; layer.current.dataset.show = String(show); }
    for (const { id } of STATIONS) {
      const ring = rings.current[id], p = anchors[id];
      if (ring) ring.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  }), [hidden]);
  return (
    <div className="hots" ref={layer} data-show="false">
      {STATIONS.map((s) => (
        <button key={s.id} ref={(el) => { rings.current[s.id] = el; }} className="hot" aria-label={`Work on the ${s.name.toLowerCase()}`} onClick={() => onOpen(s.id)}>
          <i /><span className="hlabel glass">{s.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── Chooser: the variant row at the bottom centre (replaces the sword types in edit mode) ──
function Chooser({ station, choices }: { station: StationId; choices: StationChoices }) {
  const now = choices.cards.filter((c) => c.period), rest = choices.cards.filter((c) => !c.period);
  // One extra option is simply shown; more open as their own set with a way back.
  const grouped = rest.length > 1;
  const selectedInRest = rest.some((c) => c.selected);
  const [view, setView] = useState({ rest: grouped && selectedInRest, flip: false });
  const showRest = view.rest;
  // Follow the selection into whichever set holds it (↑/↓ keys).
  const selId = choices.cards.find((c) => c.selected)?.id;
  const [prevSel, setPrevSel] = useState(selId);
  if (prevSel !== selId) { setPrevSel(selId); if (grouped && selectedInRest !== showRest) setView({ rest: selectedInRest, flip: true }); }
  const rowRef = useRef<HTMLDivElement>(null);
  const items: (Choice | 'more' | 'back')[] = !grouped ? [...now, ...rest] : showRest ? ['back', ...rest] : [...now, 'more'];

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || reduceMotion()) return;
    const els = [...row.children] as HTMLElement[];
    els.forEach((el, k) => el.animate(view.flip
      ? [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }]
      : [{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }],
    { duration: view.flip ? 240 : 380, delay: (view.flip ? 0 : 140) + k * 30, easing: 'cubic-bezier(.2,.85,.25,1.04)', fill: 'backwards' }));
  }, [view]);

  const toggle = (on: boolean) => { setView({ rest: on, flip: true }); playTick(); };
  return (
    <div className="chooser" ref={rowRef}>
      {items.map((it) => {
        if (it === 'more') return (
          <button key="more" className="item more" onClick={() => toggle(true)} data-tip="Other ages" data-tip-body={`${rest.length} ${station === 'grip' ? 'materials' : 'forms'} from other ages and legend`}>
            <div className="card glass"><span className="count">+{rest.length}</span></div>
            <span className="nm">Other ages</span><span className="er">&nbsp;</span>
          </button>
        );
        if (it === 'back') return (
          <button key="back" className="item back" onClick={() => toggle(false)} data-tip="Back" data-tip-body="Forms of this sword's own age">
            <div className="card glass">{ICONS.prev}</div>
            <span className="nm">Back</span><span className="er">&nbsp;</span>
          </button>
        );
        return (
          <button key={it.id} className="item" aria-pressed={it.selected} data-tip={it.name} data-tip-body={it.note} onClick={() => { if (!it.selected) { it.apply(); forgeSound(); } }}>
            <div className="card glass">{it.art}</div>
            <span className="nm">{it.name}</span>
            <span className="er">{it.period ? '\u00a0' : it.era}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Inspector: properties of the chosen part, on the right (Figma / Framer pattern) ──
function Inspector({ station, choices }: { station: StationId; choices: StationChoices }) {
  const sel = choices.cards.find((c) => c.selected);
  const name = STATIONS.find((s) => s.id === station)?.name ?? '';
  return (
    <aside className="inspector glass" aria-label={`${name} properties`}>
      <div className="insp-head">
        <span className="insp-kicker">{name}</span>
        <h2>{sel?.name}</h2>
        {sel?.era && <span className="insp-era">{sel.era}</span>}
      </div>
      <p className="insp-note">{choices.note}</p>
      {choices.rows.map((row) => (
        <section key={row.label} className="insp-group">
          <div className="insp-row"><span>{row.label}</span><b>{row.items.find((x) => x.selected)?.name}</b></div>
          <div className={row.kind === 'dots' ? 'insp-swatches' : 'insp-seg'}>
            {row.items.map((it) => row.kind === 'dots'
              ? <button key={it.id} className="dot" aria-label={it.name} aria-pressed={it.selected} data-tip={it.name} style={{ background: it.swatch }} onClick={() => { if (!it.selected) { it.apply(); playTick(); } }} />
              : <button key={it.id} className="seg" aria-pressed={it.selected} onClick={() => { if (!it.selected) { it.apply(); forgeSound(); } }}>{it.name}</button>)}
          </div>
        </section>
      ))}
    </aside>
  );
}

// ── Nav: previous · part · next (no text below it, so nothing can push it around) ──
function Nav({ station, onStep }: { station: StationId | null; onStep: (d: number) => void }) {
  const i = station ? STATIONS.findIndex((s) => s.id === station) : 0;
  const prev = STATIONS[(i + STATIONS.length - 1) % STATIONS.length], next = STATIONS[(i + 1) % STATIONS.length];
  return (
    <div className="nav" inert={!station}>
      <div className="navbar glass">
        <button className="step" onClick={() => onStep(-1)} aria-label={`Previous part: ${prev.name}`}>{ICONS.prev}<span>{prev.name}</span></button>
        <div className="cur"><b>{station ? STATIONS[i].name : ''}</b><div className="pips">{STATIONS.map((s, k) => <i key={s.id} className={k === i ? 'on' : ''} />)}</div></div>
        <button className="step" onClick={() => onStep(1)} aria-label={`Next part: ${next.name}`}><span>{next.name}</span>{ICONS.next}</button>
      </div>
    </div>
  );
}

export function ForgeUI() {
  const config = useConfigStore((s) => s.config);
  const station = useConfigStore((s) => s.station);
  const reading = useConfigStore((s) => s.reading);
  const setStation = useConfigStore((s) => s.setStation);
  const setReading = useConfigStore((s) => s.setReading);
  const setArchetype = useConfigStore((s) => s.setArchetype);
  const bumpResetTick = useConfigStore((s) => s.bumpResetTick);
  // The last station stays rendered while the edit panels fade out after Done.
  const [last, setLast] = useState<StationId | null>(station);
  if (station && station !== last) setLast(station);
  // Each fresh open (from the overview) remounts the panels, so they enter anew.
  const [prevStation, setPrevStation] = useState(station);
  const [opens, setOpens] = useState(0);
  if (station !== prevStation) { if (station && !prevStation) setOpens((n) => n + 1); setPrevStation(station); }
  const shown = station ?? last;
  const choices = useStationChoices(shown);
  const [muted, setMuted] = useState(audioState.muted);
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');
  useEffect(() => { const off = audioState.subscribe(setMuted); return () => { off(); }; }, []);

  const open = (id: StationId | null) => { if (id && id !== station) playBellows(); setStation(id); };
  const step = (d: number) => {
    const i = station ? STATIONS.findIndex((s) => s.id === station) : -1;
    open(STATIONS[(i + d + STATIONS.length) % STATIONS.length].id);
  };

  // Pointer position for the hotspot reveal; wheel zoom hides the rings for a moment.
  useEffect(() => {
    // Mouse: rings follow the pointer. Touch/pen: a tap without a drag shows them for a few seconds.
    let tap: { x: number; y: number } | null = null;
    const move = (e: PointerEvent) => { if (e.pointerType === 'mouse') { interaction.pointerX = e.clientX; interaction.pointerY = e.clientY; } };
    const down = (e: PointerEvent) => { if (e.pointerType === 'mouse') move(e); else tap = { x: e.clientX, y: e.clientY }; };
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !tap) return;
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) interaction.touchUntil = performance.now() + 4000;
      tap = null;
    };
    const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') { interaction.pointerX = -1e4; interaction.pointerY = -1e4; } };
    const wheel = () => { interaction.zoomUntil = performance.now() + 500; };
    addEventListener('pointermove', move); addEventListener('pointerdown', down); addEventListener('pointerup', up); document.addEventListener('pointerleave', leave); addEventListener('wheel', wheel, { passive: true });
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerdown', down); removeEventListener('pointerup', up); document.removeEventListener('pointerleave', leave); removeEventListener('wheel', wheel); };
  }, []);

  // When a group goes inert under the keyboard focus, move focus to where the work continues.
  useEffect(() => {
    const a = document.activeElement;
    if (a && a !== document.body && !a.closest('[inert]')) return;
    const target = station ? '.forge .chooser .item[aria-pressed="true"], .forge .chooser .item' : reading ? null : '.forge .acard[aria-pressed="true"]';
    if (target) document.querySelector<HTMLElement>(target)?.focus({ preventScroll: true });
  }, [station, reading]);

  // Keyboard: ←/→ parts, ↑/↓ variants, Esc back, H account (no modifiers, no auto-repeat bursts)
  const live = useRef({ station, reading, choices, step, open, setReading });
  useLayoutEffect(() => { live.current = { station, reading, choices, step, open, setReading }; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest('input, textarea')) return;
      const L = live.current;
      if (e.key === 'Escape') { if (L.reading) L.setReading(false); else L.open(null); return; }
      if (e.repeat) return;
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !L.reading) L.step(e.key === 'ArrowRight' ? 1 : -1);
      else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && L.station && L.choices) {
        const list = L.choices.cards, i = list.findIndex((c) => c.selected), n = list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
        e.preventDefault(); if (n && !n.selected) { n.apply(); forgeSound(); }
      } else if (e.key.toLowerCase() === 'h') L.setReading(!L.reading);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  // Swipe across the scene moves between parts while one is being worked on.
  useEffect(() => {
    let start: { x: number; y: number; id: number } | null = null;
    const down = (e: PointerEvent) => { if (live.current.station && e.isPrimary && !(e.target as HTMLElement).closest('button')) start = { x: e.clientX, y: e.clientY, id: e.pointerId }; };
    const up = (e: PointerEvent) => { if (!start || e.pointerId !== start.id) return; const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) live.current.step(dx < 0 ? 1 : -1); };
    addEventListener('pointerdown', down); addEventListener('pointerup', up);
    return () => { removeEventListener('pointerdown', down); removeEventListener('pointerup', up); };
  }, []);

  const preset = SWORD_TYPES[config.archetype];
  const patterns = BLADE_PATTERNS[config.archetype];
  const pattern = patterns.find((p) => p.id === config.blade.pattern) ?? patterns[0];
  const mode = `forge${station ? ' focus' : ''}${reading ? ' reading' : ''}`;
  const overviewOff = !!station || reading;

  return (
    <div className={mode} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto' }}>
        <header className="title fade hide-focus hide-reading" inert={overviewOff}>
          <h1>{preset.name}</h1>
          <p>{pattern ? `${pattern.name} pattern · ${pattern.era}` : 'Classic form'}</p>
        </header>
        <div inert={overviewOff}><Hotspots hidden={overviewOff} onOpen={open} /></div>

        <div className="edit-layer" inert={!station}>
          {shown && choices && (
            <>
              <Chooser key={`${shown}-${config.archetype}-${opens}`} station={shown} choices={choices} />
              <Inspector key={`i-${shown}-${opens}`} station={shown} choices={choices} />
            </>
          )}
        </div>
        <Nav station={station} onStep={step} />

        <div className="arch fade hide-focus hide-reading" inert={overviewOff}>
          {SWORD_TYPE_ORDER.map((k) => (
            <button key={k} className="acard glass" aria-pressed={config.archetype === k} aria-label={SWORD_TYPES[k].name}
              data-tip={SWORD_TYPES[k].name} data-tip-body={`${ARCHETYPE_ERA[k]} — ${SWORD_TYPES[k].description}`}
              onClick={() => { if (k !== config.archetype) setArchetype(k); playCling(CLING, CLING_PARAMS[k]); }}>
              <img src={`${BASE}sword-icons/${k}.png`} alt="" /><span>{SHORT_NAMES[k]}</span>
            </button>
          ))}
        </div>
        <div className="corner-l fade hide-focus" inert={!!station}>
          <button className="btn" onClick={() => setReading(!reading)} data-tip={reading ? 'Close the account' : 'Historical account'} data-tip-body={reading ? 'Back to the forge (Esc)' : 'The story of this sword, how it was fought and how it handles (H)'}>
            {ICONS.scroll}<span>{reading ? 'Close account' : 'Historical account'}</span>
          </button>
        </div>
        <div className="corner-r fade hide-focus hide-reading" inert={overviewOff}>
          <button className="btn icon" aria-label="Reset view" data-tip="Reset view" data-tip-body="Back to the presentation angle" onClick={() => { open(null); bumpResetTick(); }}>{ICONS.reset}</button>
          <button className="btn icon" aria-label={muted ? 'Unmute' : 'Mute'} data-tip={muted ? 'Sound off' : 'Sound on'} data-tip-body="Forge ambience, music and the clang of the anvil" onClick={() => audioState.toggle()}>{muted ? ICONS.muted : ICONS.sound}</button>
          <button className="btn icon" aria-label="Export configuration"
            data-tip={copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Could not copy' : 'Export'} data-tip-body={copied === 'fail' ? 'The browser blocked the clipboard' : 'Copy this sword’s configuration'}
            onClick={async () => { try { await exportConfig(config); setCopied('ok'); } catch { setCopied('fail'); } setTimeout(() => setCopied(''), 1800); }}>{ICONS.export}</button>
          <button className="btn icon" aria-label="Screenshot" data-tip="Screenshot" data-tip-body="Save a picture of your sword" onClick={() => takeScreenshot()}>{ICONS.shot}</button>
        </div>
        <div className="corner-r focus-only" inert={!station}>
          <button className="btn primary" onClick={() => open(null)} data-tip="Done" data-tip-body="Back to the whole sword (Esc)">Done</button>
        </div>
        <span className="sr-only" role="status">{copied === 'ok' ? 'Configuration copied' : copied === 'fail' ? 'Could not copy the configuration' : ''}</span>
        <HistoricalScroll />
        <Tooltip mode={mode} />
      </div>
    </div>
  );
}
