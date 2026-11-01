import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, Camera01Icon, InformationCircleIcon, UndoIcon, ScrollTextIcon, VolumeHighIcon, VolumeMute02Icon } from '@hugeicons/core-free-icons';
import './forge.css';
import { useConfigStore, type ArchetypeKey } from '../../store/configStore';
import { SWORD_TYPES, SWORD_TYPE_ORDER } from '../../presets/swordTypes';
import { ARCHETYPE_ERA, STATIONS, ageLabel, type StationId } from '../../presets/forge';
import { currentForm, formsOf, matchesForm } from '../../lib/forms';
import { anchors, interaction, onAnchors } from '../../lib/anchors';
import { audioState, playBellows, playCling, playHiss, playOneShot, playTick, type ClingParams } from '../../lib/audio';
import { takeScreenshot } from '../../lib/screenshot';
import { useStationChoices, type Choice, type StationChoices } from './choices';
import { HistoricalScroll } from './HistoricalScroll';
import { AgeSlider } from './AgeSlider';

const ageName = (age: number) => { const l = ageLabel(age); return l.between ? `${l.between[0]} → ${l.between[1]}` : l.stop.name; };
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
const RING_DWELL = 280;  // ms the pointer must rest near the sword before the rings appear
const RING_GRACE = 380;  // ms they linger after the pointer leaves, so brushing past doesn't flicker
const TIP_DELAY = 450;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const icon = (svg: IconSvgElement) => <HugeiconsIcon icon={svg} size={16} strokeWidth={1.5} />;
const ICONS = {
  scroll: icon(ScrollTextIcon), reset: icon(UndoIcon), sound: icon(VolumeHighIcon), muted: icon(VolumeMute02Icon),
  shot: icon(Camera01Icon), prev: icon(ArrowLeft01Icon), next: icon(ArrowRight01Icon),
  info: <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.5} />,
};

// True while the forge moves keyboard focus itself (focusin fires synchronously inside focus()).
let autoFocusing = false;

function forgeSound() { playTick(); setTimeout(() => playOneShot(ANVIL, 0.32), 60); setTimeout(() => playHiss(), 420); }

// ── Tooltips: styled, delayed, shared by every element with data-tip ──────────
// Usage: data-tip="Title" (+ optional data-tip-body="One line"). Shows above the element, or below it near the top edge.
// The text is read from the element on every render, so a label that changes (Copied, Sound off) stays true.
function Tooltip({ mode }: { mode: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ el: HTMLElement; x: number; top: number; bottom: number } | null>(null);
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
        setTip({ el, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
      }, delay);
    };
    const hide = () => { clearTimeout(timer); current?.removeAttribute('aria-describedby'); current = null; setTip(null); };
    hideRef.current = hide;
    const over = (e: Event) => { const el = (e.target as HTMLElement).closest<HTMLElement>('.forge [data-tip]'); if (el && el !== current) show(el, TIP_DELAY); else if (!el && current) hide(); };
    const focus = (e: FocusEvent) => { const el = (e.target as HTMLElement).closest<HTMLElement>('.forge [data-tip]'); if (el && el.matches(':focus-visible') && !autoFocusing) show(el, 0); };
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
    const below = tip.top - 10 - el.offsetHeight < 12;
    el.dataset.place = below ? 'below' : 'above';
    el.style.left = `${x}px`; el.style.top = `${below ? tip.bottom + 10 : tip.top - 10}px`;
    // The arrow keeps pointing at the element when the box is pushed in from a screen edge.
    el.style.setProperty('--arrow-x', `${Math.max(-(w / 2 - 12), Math.min(w / 2 - 12, tip.x - x))}px`);
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
  const timing = useRef({ nearSince: 0, farSince: 0 });
  useEffect(() => { const el = layer.current; const off = onAnchors(() => {
    // Distance from the pointer to the sword's line (finish → pommel, extended to the tip side).
    const a = anchors.finish, b = anchors.pommel, px = interaction.pointerX, py = interaction.pointerY;
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(-0.25, Math.min(1.05, ((px - a.x) * dx + (py - a.y) * dy) / len2));
    const near = Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy)) < RING_REACH;
    const now = performance.now(), tm = timing.current;
    const allowed = !hidden && !interaction.dragging && now > interaction.zoomUntil && anchors.pommel.visible;
    if (!allowed) tm.nearSince = 0;   // after a drag or zoom the dwell starts over
    else if (near) { tm.farSince = 0; tm.nearSince ||= now; } else { tm.nearSince = 0; tm.farSince ||= now; }
    const wants = now < interaction.touchUntil || (shown.current ? !tm.farSince || now - tm.farSince < RING_GRACE : near && now - tm.nearSince >= RING_DWELL);
    const show = allowed && wants;
    if (layer.current && show !== shown.current) { shown.current = show; interaction.rings = show; layer.current.dataset.show = String(show); }
    for (const { id } of STATIONS) {
      const ring = rings.current[id], p = anchors[id];
      if (ring) ring.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
  });
  return () => {
    off();
    shown.current = false; interaction.rings = false;
    if (el) el.dataset.show = 'false';
  }; }, [hidden]);
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
          <button key="more" className="item more" onClick={() => toggle(true)} data-tip="Other ages" data-tip-body={`${rest.length} ${station === 'grip' ? 'materials' : 'forms'} from other ages${rest.some((c) => c.era === 'Fantasy') ? ' and from legend' : ''}`}>
            <div className="card glass"><span className="count">+{rest.length}</span></div>
            <span className="nm">Other ages</span>
          </button>
        );
        if (it === 'back') return (
          <button key="back" className="item back" onClick={() => toggle(false)} data-tip="Back" data-tip-body="Forms of this sword's own age">
            <div className="card glass">{ICONS.prev}</div>
            <span className="nm">Back</span>
          </button>
        );
        return (
          <button key={it.id} className="item" aria-pressed={it.selected} data-tip={it.name} data-tip-body={it.note} onClick={() => { if (!it.selected) { it.apply(); forgeSound(); } }}>
            <div className="card glass">
              {it.art}
              {it.off && <span className="badge" data-tip={it.off.title} data-tip-body={it.off.body} aria-hidden="true">{ICONS.info}</span>}
            </div>
            <span className="nm">{it.name}</span>
            {it.off && <span className="sr">{`${it.off.title}. ${it.off.body}`}</span>}
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
          <div className="insp-row"><span>{row.label}</span><b>{row.kind === 'age' ? ageName(row.value ?? 0) : row.items.find((x) => x.selected)?.name}</b></div>
          {row.kind === 'age' && row.set && <AgeSlider value={row.value ?? 0} onChange={row.set} />}
          {row.kind !== 'age' && <div className={row.kind === 'dots' ? 'insp-swatches' : row.kind === 'list' ? 'insp-seg insp-list' : 'insp-seg'}>
            {row.items.map((it) => row.kind === 'dots'
              ? <button key={it.id} className="dot" aria-label={it.name} aria-pressed={it.selected} data-tip={it.name} style={{ background: it.swatch }} onClick={() => { if (!it.selected) { it.apply(); playTick(); } }} />
              : <button key={it.id} className="seg" aria-pressed={it.selected} onClick={() => { if (!it.selected) { it.apply(); forgeSound(); } }}>{it.name}</button>)}
          </div>}
        </section>
      ))}
    </aside>
  );
}

// ── Form switcher: the subtitle under the sword's name. Arrows step through the type's Forms; the name
// opens the list. "Your variant" shows once any part has been changed from the Form.
function FormSwitcher() {
  const config = useConfigStore((s) => s.config);
  const setForm = useConfigStore((s) => s.setForm);
  const busy = useConfigStore((s) => s.station !== null || s.reading);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null), nameRef = useRef<HTMLButtonElement>(null), listRef = useRef<HTMLDivElement>(null);
  const forms = formsOf(config), form = currentForm(config);
  const close = (refocus: boolean) => { setOpen(false); if (refocus) nameRef.current?.focus({ preventScroll: true }); };
  // The list belongs to the overview: leaving it (edit mode, the account) closes it.
  const [wasBusy, setWasBusy] = useState(busy);
  if (wasBusy !== busy) { setWasBusy(busy); if (busy && open) setOpen(false); }
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    // While the list is open it owns the keyboard: ↑/↓ move, Esc closes; nothing reaches the forge's shortcuts.
    const keys = (e: KeyboardEvent) => {
      const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
      if (e.key === 'Escape') { e.stopPropagation(); close(true); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      } else if (['ArrowLeft', 'ArrowRight', 'h', 'H'].includes(e.key)) e.stopPropagation();
    };
    addEventListener('pointerdown', away); addEventListener('keydown', keys, true);
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', keys, true); };
  }, [open]);
  if (!form) return null;
  const i = forms.indexOf(form);
  const altered = !matchesForm(config, form);
  const pick = (id: string, fromList: boolean) => {
    if (id !== form.id || altered) { setForm(id); forgeSound(); }
    if (fromList) close(true);
  };
  const step = (d: number) => pick(forms[(i + d + forms.length) % forms.length].id, false);
  return (
    <div className="formsw" ref={ref}>
      {forms.length > 1 && <button className="fs-step" aria-label="Previous form" onClick={() => step(-1)}>{ICONS.prev}</button>}
      <button ref={nameRef} className="fs-name" aria-expanded={open} aria-controls="forge-forms" onClick={() => setOpen(!open)}
        data-tip={form.name} data-tip-body={`${form.note} ${form.anchor}.`}>
        <span>{form.name}</span><span className="fs-era">{form.era}</span>{altered && <span className="fs-alt">your variant</span>}
      </button>
      {forms.length > 1 && <button className="fs-step" aria-label="Next form" onClick={() => step(1)}>{ICONS.next}</button>}
      {open && (
        <div id="forge-forms" ref={listRef} className="fs-list glass" role="group" aria-label="Forms">
          {forms.map((f) => (
            <button key={f.id} aria-current={f.id === form.id} onClick={() => pick(f.id, true)}>
              <b>{f.name}</b><span className="fs-era">{f.era}</span>
              <span className="fs-note">{f.note}</span>
              <span className="fs-anchor">{f.anchor}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
    const el = target ? document.querySelector<HTMLElement>(target) : null;
    // Moving focus for the user shouldn't pop a tooltip (the inspector already says the same).
    if (el) { autoFocusing = true; el.focus({ preventScroll: true }); autoFocusing = false; }
  }, [station, reading]);

  // Keyboard: ←/→ parts, ↑/↓ variants, Esc back, H account (no modifiers, no auto-repeat bursts)
  const live = useRef({ station, reading, choices, step, open, setReading });
  useLayoutEffect(() => { live.current = { station, reading, choices, step, open, setReading }; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest('input, textarea, [role="slider"]')) return;
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

  const preset = SWORD_TYPES[config.archetype];
  const mode = `forge${station ? ' focus' : ''}${reading ? ' reading' : ''}`;
  const overviewOff = !!station || reading;

  return (
    <div className={mode} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto' }}>
        <header className="title fade hide-focus hide-reading" inert={overviewOff}>
          <h1>{preset.name}</h1>
          <FormSwitcher />
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
              data-tip={SWORD_TYPES[k].name} data-tip-body={`${ARCHETYPE_ERA[k]} · ${SWORD_TYPES[k].description}`}
              onClick={() => { if (k !== config.archetype) setArchetype(k); playCling(CLING, CLING_PARAMS[k]); }}>
              <img src={`${BASE}sword-icons/${k}.png`} alt="" /><span>{SHORT_NAMES[k]}</span>
            </button>
          ))}
        </div>
        <div className="corner-l fade hide-focus" inert={!!station}>
          <button className="btn" onClick={() => setReading(!reading)} data-tip={reading ? 'Close the account' : 'Historical account'} data-tip-body={reading ? 'Back to the forge (Esc)' : 'Where this sword comes from, how it was fought, how it handles (H)'}>
            {ICONS.scroll}<span>{reading ? 'Close account' : 'Historical account'}</span>
          </button>
        </div>
        <div className="corner-r fade hide-focus hide-reading" inert={overviewOff}>
          <button className="btn icon" aria-label="Reset view" data-tip="Reset view" data-tip-body="Return the camera to where it started" onClick={() => { open(null); bumpResetTick(); }}>{ICONS.reset}</button>
          <button className="btn icon" aria-label={muted ? 'Unmute' : 'Mute'} data-tip={muted ? 'Sound off' : 'Sound on'} data-tip-body="Forge ambience, music and the clang of the anvil" onClick={() => audioState.toggle()}>{muted ? ICONS.muted : ICONS.sound}</button>
          <button className="btn icon" aria-label="Screenshot" data-tip="Screenshot" data-tip-body="Save a picture of your sword" onClick={() => takeScreenshot()}>{ICONS.shot}</button>
        </div>
        <div className="corner-r focus-only" inert={!station}>
          <button className="btn icon" aria-label="Reset view" data-tip="Reset view" data-tip-body="Back to this part's first shot (or double-click the sword)" onClick={() => bumpResetTick()}>{ICONS.reset}</button>
          <button className="btn primary" onClick={() => open(null)} data-tip="Done" data-tip-body="Back to the whole sword (Esc)">Done</button>
        </div>
        <HistoricalScroll />
        <Tooltip mode={mode} />
      </div>
    </div>
  );
}
