import type { ArchetypeKey, GripMaterial, GuardStyle, PommelStyle, SteelFinish } from '../../store/configStore';
import { GUARD_DEFS, guardDef } from '../../presets/guardShapes';
import { BRAZIL_NUT, FISHTAIL_OUTLINE, POMMEL_FORM, POMMEL_PROFILES, VIKING_POMMELS } from '../../presets/pommelProfiles';
import type { BladeProfile } from '../../presets/forge';
import { RICASSO, halfWidths, profileSpec } from '../../lib/bladeSpec';
import { takesFuller } from '../../presets/bladeSections';

// Engraved-style silhouettes for the variant cards, drawn from the same data as the 3D parts.
// Upright like the sword (blade up, pommel down). 64×64 viewBox, gold line art.

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinejoin: 'round' as const };
const pts = (list: [number, number][]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export function GuardSilhouette({ archetype, style }: { archetype: ArchetypeKey; style: GuardStyle }) {
  const d = guardDef(style, archetype), t = GUARD_DEFS[style].terminal;
  // Fit the guard to the card: a two-hander's quillons are drawn at the same width as a Viking bar.
  const sc = 50 / Math.max(0.15, d.width), cx = 32, cy = 34, n = 20, top: [number, number][] = [], bot: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const tt = i / n, u = Math.abs(2 * tt - 1), x = cx + (tt - 0.5) * d.width * sc;
    const bend = (d.linear ? d.tipY * u : d.tipY * u * u) * sc;
    const flare = t === 'flared' ? 1 + 1.5 * Math.max(0, (u - 0.62) / 0.38) ** 2 : 1;
    const h = Math.max(0.9, d.secY * (1 - u * (1 - d.tipScale)) * flare * sc * 1.6);
    top.push([x, cy - bend - h]); bot.push([x, cy - bend + h]);
  }
  const endY = cy - (d.linear ? d.tipY : d.tipY) * sc, endX = (d.width / 2) * sc;
  const r = t === 'knob' ? 2.4 : t === 'finial' ? 2.2 : t === 'quatrefoil' ? 3 : 0;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d={`M32 4 V${cy - d.secY * sc * 1.6 - 1}`} {...STROKE} strokeWidth={2.4} opacity={0.45} />
      <path d={`M32 ${cy + d.secY * sc * 1.6 + 1} V60`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
      <polygon points={pts([...top, ...bot.reverse()])} {...STROKE} fill="currentColor" fillOpacity={0.14} />
      {r > 0 && <><circle cx={cx - endX - r * 0.6} cy={endY} r={r} {...STROKE} fill="currentColor" fillOpacity={0.14} /><circle cx={cx + endX + r * 0.6} cy={endY} r={r} {...STROKE} fill="currentColor" fillOpacity={0.14} /></>}
    </svg>
  );
}

export function PommelSilhouette({ style }: { style: PommelStyle }) {
  const prof = POMMEL_PROFILES[style] ?? [], sc = 680, cx = 32, cy = 38;
  const form = POMMEL_FORM[style].axis;
  // Viking hilts: the upper guard bar with the crown beneath it.
  if (form === 'viking') {
    const v = VIKING_POMMELS[style as keyof typeof VIKING_POMMELS], k = 640, top = 14, gh = v.upper.halfHeight * 2 * k;
    const crown = v.crown.map(([x, y]): [number, number] => [cx + x * k, top + gh + -y * k]);
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d={`M32 2 V${top}`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
        <rect x={cx - v.upper.halfWidth * k} y={top} width={v.upper.halfWidth * 2 * k} height={gh} rx={gh / 2} {...STROKE} fill="currentColor" fillOpacity={0.18} />
        <polygon points={pts(crown)} {...STROKE} fill="currentColor" fillOpacity={0.14} />
      </svg>
    );
  }
  // Flat and shaped pommels: their front outline, from the same data as the 3D solid.
  if (form === 'solid' || form === 'plate') {
    const k = 780, c = 34;
    const outline: [number, number][] = form === 'plate'
      ? FISHTAIL_OUTLINE.map(([x, y]) => [cx + x * k, c - y * k])
      : Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), p = BRAZIL_NUT.power;
          const y = (dy > 0 ? BRAZIL_NUT.top : BRAZIL_NUT.bottom) * Math.sign(dy) * Math.abs(dy) ** p + (BRAZIL_NUT.bottom - BRAZIL_NUT.top) / 2;
          return [cx + BRAZIL_NUT.halfWidth * Math.sign(dx) * Math.abs(dx) ** p * k, c - y * k];
        });
    const top = Math.min(...outline.map((q) => q[1]));
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d={`M32 2 V${top - 1}`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
        <polygon points={pts(outline)} {...STROKE} fill="currentColor" fillOpacity={0.14} />
      </svg>
    );
  }
  if (form === 'writhen') {
    const right = prof.map(([r, y]) => [cx + r * sc, cy - y * sc] as [number, number]);
    const left = [...prof].reverse().map(([r, y]) => [cx - r * sc, cy - y * sc] as [number, number]);
    const top = Math.min(...right.map((q) => q[1]));
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d={`M32 4 V${top - 1}`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
        <polygon points={pts([...right, ...left])} {...STROKE} fill="currentColor" fillOpacity={0.14} />
        {[-8, -3, 2, 7].map((dx) => <path key={dx} d={`M${cx + dx - 4} ${cy - 11} Q ${cx + dx + 2} ${cy}, ${cx + dx + 5} ${cy + 12}`} {...STROKE} strokeWidth={0.8} opacity={0.55} />)}
      </svg>
    );
  }
  // A wheel or disc faces you: draw its face, rim and (for the wheel) the boss.
  if (form === 'z') {
    const r = Math.max(...prof.map(([x]) => x)) * sc * 0.82, boss = style === 'wheel' ? 0.012 * sc * 0.82 : style === 'ornate' ? 0.0155 * sc * 0.82 : 0, c = cy - 4;
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d={`M32 2 V${c - r - 1}`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
        <circle cx={cx} cy={c} r={r} {...STROKE} fill="currentColor" fillOpacity={0.14} />
        <circle cx={cx} cy={c} r={r * 0.8} {...STROKE} strokeWidth={0.8} opacity={0.6} />
        {boss > 0 && <circle cx={cx} cy={c} r={boss} {...STROKE} fill="currentColor" fillOpacity={0.22} />}
      </svg>
    );
  }
  const right = prof.map(([r, y]) => [cx + r * sc, cy - y * sc] as [number, number]);
  const left = [...prof].reverse().map(([r, y]) => [cx - r * sc, cy - y * sc] as [number, number]);
  const topY = Math.min(...right.map((q) => q[1]));
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d={`M32 4 V${topY - 1}`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
      <polygon points={pts([...right, ...left])} {...STROKE} fill="currentColor" fillOpacity={0.14} />
    </svg>
  );
}

// Messer caps, side view (edge side to the right): the end of the grip under a plain cap or a bird's beak.
export function CapSilhouette({ cap }: { cap: 'beak' | 'cylinder' }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="22" y="4" width="20" height="30" rx="3" {...STROKE} fill="currentColor" fillOpacity={0.1} />
      {cap === 'beak'
        ? <path d="M20 32 H44 V36 C50 37 55 41 57 50 C52 47 48 46 44 46 L24 45 C21 44 20 42 20 40 Z" {...STROKE} fill="currentColor" fillOpacity={0.2} />
        : <rect x="20" y="32" width="24" height="12" rx="2.5" {...STROKE} fill="currentColor" fillOpacity={0.2} />}
    </svg>
  );
}

export function GripSwatch({ material, color }: { material: GripMaterial; color: string }) {
  const id = `g-${material}`;
  const fill = material === 'wire' ? '#b9a27a' : color;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset=".45" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#000" stopOpacity=".6" /></linearGradient>
        <clipPath id={`${id}-c`}><rect x="22" y="6" width="20" height="52" rx="6" /></clipPath>
      </defs>
      <rect x="22" y="6" width="20" height="52" rx="6" fill={fill} />
      <g clipPath={`url(#${id}-c)`} stroke="currentColor" strokeOpacity=".55" strokeWidth="1" fill="none">
        {material === 'wood' && [0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${25 + i * 3.6} 6 C ${23 + i * 3.6} 22, ${28 + i * 3.6} 40, ${25 + i * 3.6} 58`} />)}
        {material === 'leather' && Array.from({ length: 9 }, (_, i) => <path key={i} d={`M20 ${10 + i * 6} L44 ${6 + i * 6}`} strokeOpacity=".3" />)}
        {material === 'cord' && Array.from({ length: 13 }, (_, i) => <path key={i} d={`M20 ${6 + i * 4} L44 ${2 + i * 4}`} strokeWidth="1.6" />)}
        {material === 'wire' && Array.from({ length: 22 }, (_, i) => <path key={i} d={`M20 ${6 + i * 2.4} L44 ${3 + i * 2.4}`} strokeWidth=".9" strokeOpacity=".8" />)}
      </g>
      <rect x="22" y="6" width="20" height="52" rx="6" fill={`url(#${id}-s)`} />
      <rect x="22" y="6" width="20" height="52" rx="6" {...STROKE} />
    </svg>
  );
}

const STEEL_TONES: Record<SteelFinish, [string, string, string]> = {
  satin: ['#5d666b', '#b8c0c2', '#4b5357'],
  polished: ['#3e4549', '#f2f6f8', '#353b3f'],
  patternWelded: ['#566064', '#bfc7c8', '#475054'],
};
export function SteelSwatch({ finish }: { finish: SteelFinish }) {
  const [a, b, c] = STEEL_TONES[finish], id = `s-${finish}`;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor={a} /><stop offset=".48" stopColor={b} /><stop offset="1" stopColor={c} /></linearGradient>
        <clipPath id={`${id}-c`}><polygon points="20,4 44,4 44,60 20,60" /></clipPath>
      </defs>
      <polygon points="20,4 44,4 44,60 20,60" fill={`url(#${id})`} />
      {finish === 'patternWelded' && (
        <g clipPath={`url(#${id}-c)`} stroke="#2c3236" strokeOpacity=".55" fill="none" strokeWidth="1.1">
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M20 ${6 + i * 6.5} q 6 -4 12 0 t 12 0`} />)}
        </g>
      )}
      {finish === 'polished' && <rect x="30" y="4" width="2.4" height="56" fill="#fff" opacity=".7" />}
      <line x1="32" y1="4" x2="32" y2="60" stroke="#000" strokeOpacity=".25" strokeWidth="5" />
      <polygon points="20,4 44,4 44,60 20,60" {...STROKE} />
    </svg>
  );
}

// Drawn from the same outline as the 3D blade (lib/bladeSpec.ts), lying point-right; widths are doubled so
// profiles read apart at card size. Shows the swell and clip of a single edge, the ricasso and its hooks.
const LENGTH_PX = { short: 44, medium: 48, long: 52, extraLong: 54 } as const;
export function BladeSilhouette({ archetype, profile }: { archetype: ArchetypeKey; profile: BladeProfile }) {
  const s = profileSpec(archetype, profile), L = LENGTH_PX[profile.length], k = 190, cy = 32, x0 = 9;
  const top: [number, number][] = [], bot: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, w = halfWidths(s, t), x = x0 + t * L;
    top.push([x, cy - w.spine * k]); bot.push([x, cy + w.edge * k]);
  }
  const base = s.halfWidth * k, ric = s.ricasso, rx = x0 + (ric?.t ?? 0) * L, rw = s.halfWidth * RICASSO.width * k;
  const hook = (dir: 1 | -1) => ric?.hooks === 'crescent'
    ? `M${rx - 0.6} ${cy + dir * rw} q 1 ${dir * 3.5} -2.6 ${dir * 6.2} q 2.4 ${-dir * 1.2} 4.4 ${-dir * 6.2}`
    : `M${rx - 0.6} ${cy + dir * rw} l -1.4 ${dir * 3.2} l 2.6 ${-dir * 3.2}`;
  const fuller = s.fuller !== 'none' && takesFuller(s.section);
  const fy = s.singleEdged ? cy - base * 0.35 : cy;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d={`M2 ${cy} H8`} {...STROKE} strokeWidth={3} />
      <path d={`M8 ${cy - base - 3} V${cy + base + 3}`} {...STROKE} strokeWidth={2.2} />
      {ric?.cover === 'leather' && <rect x={x0} y={cy - rw} width={rx - x0 - 0.8} height={rw * 2} fill="currentColor" opacity={0.42} />}
      <polygon points={pts([...top, ...bot.reverse()])} {...STROKE} fill="currentColor" fillOpacity={0.12} />
      {ric && <><path d={hook(-1)} {...STROKE} fill="currentColor" fillOpacity={0.2} /><path d={hook(1)} {...STROKE} fill="currentColor" fillOpacity={0.2} /></>}
      {fuller && <path d={`M${(x0 + s.fullerStart * L).toFixed(1)} ${fy} H${(x0 + s.fullerEnd * L).toFixed(1)}`} stroke="currentColor" strokeWidth={s.singleEdged ? 1 : base * 0.5} strokeLinecap="round" opacity={0.32} />}
      {!fuller && (s.section === 'diamond' || s.section === 'hollow' || s.section === 'triangular' || s.section === 'square') && (
        <path d={`M${(x0 + (ric ? ric.t + 0.03 : 0.02) * L).toFixed(1)} ${cy} L${(x0 + L * 0.97).toFixed(1)} ${cy}`} stroke="currentColor" strokeWidth={0.7} opacity={0.5} />
      )}
    </svg>
  );
}
