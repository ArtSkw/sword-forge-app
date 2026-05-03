import type { CSSProperties } from 'react';

const MOTES = [
  { left: 9, top: 18, size: 2, delay: 0.1, duration: 11, drift: 58, opacity: 0.16 },
  { left: 18, top: 63, size: 3, delay: 1.0, duration: 15, drift: -64, opacity: 0.13 },
  { left: 29, top: 35, size: 2, delay: 0.6, duration: 13, drift: 66, opacity: 0.14 },
  { left: 42, top: 76, size: 2, delay: 1.7, duration: 16, drift: -78, opacity: 0.12 },
  { left: 57, top: 24, size: 3, delay: 1.2, duration: 14, drift: 26, opacity: 0.13 },
  { left: 64, top: 57, size: 2, delay: 0.3, duration: 12, drift: 62, opacity: 0.15 },
  { left: 73, top: 41, size: 2, delay: 2.0, duration: 17, drift: -34, opacity: 0.11 },
  { left: 86, top: 70, size: 3, delay: 1.5, duration: 15, drift: 76, opacity: 0.12 },
  { left: 91, top: 29, size: 2, delay: 0.8, duration: 13, drift: -52, opacity: 0.14 },
  { left: 36, top: 51, size: 1.5, delay: 2.4, duration: 18, drift: 18, opacity: 0.10 },
];

export function AtmosphereOverlay() {
  return (
    <div className="cc-atmosphere" aria-hidden="true">
      {MOTES.map((mote, index) => (
        <span
          key={index}
          className="cc-atmosphere__mote"
          style={{
            left: `${mote.left}%`,
            top: `${mote.top}%`,
            width: mote.size,
            height: mote.size,
            opacity: mote.opacity,
            '--mote-delay': `${mote.delay}s`,
            '--mote-duration': `${mote.duration}s`,
            '--mote-drift': `${mote.drift}px`,
            '--mote-sway': `${Math.max(14, Math.abs(mote.drift) * 0.36)}px`,
            '--mote-sway-duration': `${Math.max(5, mote.duration * 0.42)}s`,
          } as CSSProperties}
        >
          <span className="cc-atmosphere__mote-core" />
        </span>
      ))}
    </div>
  );
}
