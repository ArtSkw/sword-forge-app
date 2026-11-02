import { useEffect, useRef, useState } from 'react';
import { AGE_STOPS, ageLabel } from '../../presets/forge';
import { playStrike } from '../../lib/audio';

// The sword's age as one continuous slider with four named stops. Dragging ages the whole sword live;
// a stop's name glides to it; near a stop the thumb settles onto it. Keys: ←/→ fine steps,
// PageUp/PageDown or ↑/↓ the next stop, Home/End the ends.

const SHORT = ['Forge', 'Carried', 'Heirloom', 'Excavated'];
const SNAP = 0.045, STEP = 0.02, GLIDE_MS = 480;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function AgeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const glide = useRef(0);
  const last = useRef(value);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => cancelAnimationFrame(glide.current), []);

  // One soft strike per change (on release, a stop's name, or a key), never one per frame of a drag.
  const set = (raw: number) => {
    const v = clamp01(raw);
    last.current = v;
    onChange(v);
  };
  const glideTo = (target: number) => {
    cancelAnimationFrame(glide.current);
    if (Math.abs(target - last.current) > 0.001) playStrike('soft');
    if (reduceMotion()) { set(target); return; }
    const from = last.current, t0 = performance.now(), ms = GLIDE_MS * Math.max(0.35, Math.abs(target - from));
    const frame = (now: number) => {
      const k = clamp01((now - t0) / ms);   // rAF time can precede t0
      set(from + (target - from) * ease(k));
      if (k < 1) glide.current = requestAnimationFrame(frame);
    };
    glide.current = requestAnimationFrame(frame);
  };
  const atPointer = (x: number) => { const r = track.current!.getBoundingClientRect(); return clamp01((x - r.left) / r.width); };
  // Released: settle onto a nearby stop (its glide strikes), or strike where it was let go.
  const settle = (v: number) => { const near = AGE_STOPS.find((s) => Math.abs(s.at - v) < SNAP); if (near && Math.abs(near.at - v) > 0.001) glideTo(near.at); else playStrike('soft'); };

  const onKey = (e: React.KeyboardEvent) => {
    const next = AGE_STOPS.find((s) => s.at > value + 0.001)?.at ?? 1, prev = [...AGE_STOPS].reverse().find((s) => s.at < value - 0.001)?.at ?? 0;
    const to = { ArrowRight: clamp01(value + STEP), ArrowLeft: clamp01(value - STEP), ArrowUp: next, PageUp: next, ArrowDown: prev, PageDown: prev, Home: 0, End: 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault(); e.stopPropagation();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { cancelAnimationFrame(glide.current); if (to !== value) playStrike('soft'); set(to); } else glideTo(to);
  };

  const label = ageLabel(value);
  const text = label.between ? `Between ${label.between[0]} and ${label.between[1]}` : label.stop.name;
  return (
    <div className="age">
      <div className="age-track" ref={track}
        role="slider" tabIndex={0} aria-label="Age" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-valuetext={text}
        onKeyDown={onKey}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); cancelAnimationFrame(glide.current); setDragging(true); set(atPointer(e.clientX)); }}
        onPointerMove={(e) => { if (dragging) set(atPointer(e.clientX)); }}
        onPointerUp={(e) => { if (!dragging) return; setDragging(false); settle(atPointer(e.clientX)); }}
        onPointerCancel={() => setDragging(false)}>
        <i className="age-line" /><i className="age-fill" style={{ transform: `scaleX(${value})` }} />
        {AGE_STOPS.map((s) => <i key={s.id} className="age-stop" data-on={value >= s.at - 0.001} style={{ left: `${s.at * 100}%` }} />)}
        <i className="age-thumb" data-drag={dragging} style={{ left: `${value * 100}%` }} />
      </div>
      <div className="age-names" aria-hidden="true">
        {AGE_STOPS.map((s, i) => (
          <button key={s.id} tabIndex={-1} data-on={!label.between && label.stop.id === s.id} style={{ left: `${s.at * 100}%` }}
            onMouseDown={(e) => { e.preventDefault(); track.current?.focus({ preventScroll: true }); }} onClick={() => glideTo(s.at)}>{SHORT[i]}</button>
        ))}
      </div>
    </div>
  );
}
