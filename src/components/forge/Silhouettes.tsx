import type { ArchetypeKey, GripMaterial, GuardStyle, PommelStyle, SteelFinish } from '../../store/configStore';
import { getGuardParams } from '../../presets/guardShapes';
import { getGuardTerminalRecipe } from '../../presets/archetypeDetails';
import { POMMEL_PROFILES } from '../../presets/pommelProfiles';
import type { BladeProfile } from '../../presets/forge';

// Engraved-style silhouettes for the variant cards, drawn from the same data as the 3D parts.
// Upright like the sword (blade up, pommel down). 64×64 viewBox, gold line art.

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.25, strokeLinejoin: 'round' as const };
const pts = (list: [number, number][]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export function GuardSilhouette({ archetype, style }: { archetype: ArchetypeKey; style: GuardStyle }) {
  const p = getGuardParams(style, archetype);
  const sc = 54 / 0.29, cx = 32, cy = 33, n = 16, top: [number, number][] = [], bot: [number, number][] = [];
  const half = 0.009 * (p.sectionScale ?? 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = Math.abs(2 * t - 1), x = cx + (t - 0.5) * p.width * sc;
    const y = cy - p.tipY * u * u * sc, h = half * (1 - u * (1 - p.tipScale)) * sc;
    top.push([x, y - h]); bot.push([x, y + h]);
  }
  const term = getGuardTerminalRecipe(archetype, style);
  const endY = cy - p.tipY * sc, endX = (p.width / 2) * sc;
  const r = term.kind !== 'none' ? (term.radius ?? 0.01) * sc * 0.9 : style === 'ornate' ? 2.6 : 0;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d={`M32 4 V${cy - half * sc - 1}`} {...STROKE} strokeWidth={2.4} opacity={0.45} />
      <path d={`M32 ${cy + half * sc + 1} V60`} {...STROKE} strokeWidth={3.2} opacity={0.45} />
      <polygon points={pts([...top, ...bot.reverse()])} {...STROKE} fill="currentColor" fillOpacity={0.14} />
      {r > 0 && <><circle cx={cx - endX} cy={endY} r={r} {...STROKE} fill="currentColor" fillOpacity={0.14} /><circle cx={cx + endX} cy={endY} r={r} {...STROKE} fill="currentColor" fillOpacity={0.14} /></>}
    </svg>
  );
}

export function PommelSilhouette({ style }: { style: PommelStyle }) {
  const prof = POMMEL_PROFILES[style], sc = 680, cx = 32, cy = 38;
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
  darkened: ['#24272a', '#6a6660', '#1d1f21'],
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

const WIDTH_CM = { narrow: 2.8, standard: 4.4, wide: 6.0 } as const;
const LENGTH_CM = { short: 70, medium: 82, long: 98, extraLong: 118 } as const;
// Drawn for legibility, not to scale: width, taper and point are exaggerated so patterns read apart.
export function BladeSilhouette({ pattern }: { pattern: Pick<BladeProfile, 'length' | 'width' | 'fuller' | 'shape'> }) {
  const len = 0.78 + (LENGTH_CM[pattern.length] - 70) / 180, base = 2 + (WIDTH_CM[pattern.width] - 2.4) * 1.05;
  const mid = 1 - (1 - (pattern.shape?.bodyTaperMidWidth ?? 0.88)) * 1.5, te = pattern.shape?.bodyTaperEnd ?? 0.9, round = (pattern.shape?.tipShoulderRound ?? 0.07) > 0.05;
  const L = 50 * len, top: [number, number][] = [], bot: [number, number][] = [], cy = 32;
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    let w = t < te ? base * (1 - (t / te) * (1 - mid)) : base * mid * (1 - (t - te) / (1 - te));
    if (round && t > te) w = base * mid * Math.sqrt(Math.max(0, 1 - ((t - te) / (1 - te)) ** 2));
    const x = 9 + t * L; top.push([x, cy - w]); bot.push([x, cy + w]);
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d={`M2 ${cy} H8`} {...STROKE} strokeWidth={3} />
      <path d={`M8 ${cy - base - 3} V${cy + base + 3}`} {...STROKE} strokeWidth={2.2} />
      <polygon points={pts([...top, ...bot.reverse()])} {...STROKE} fill="currentColor" fillOpacity={0.12} />
      {pattern.fuller !== 'none' && <path d={`M11 ${cy} H${(9 + L * 0.62).toFixed(1)}`} stroke="currentColor" strokeWidth={base * 0.5} strokeLinecap="round" opacity={0.32} />}
    </svg>
  );
}
