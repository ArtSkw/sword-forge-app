export const tokens = {
  color: {
    bgDeep: '#0A0907',
    bgPanel: '#13100C',
    bgRaised: '#1C1814',
    borderSubtle: '#2A2520',
    borderAccent: '#8B6F47',
    borderAccentBright: '#C9A961',
    textPrimary: '#E8E0D4',
    textSecondary: '#9A8F7F',
    textMuted: '#5A5248',
    accentCrimson: '#8B2028',
  },
  shadow: {
    panel: '0 12px 40px rgba(0, 0, 0, 0.6)',
    brassGlow: '0 0 12px rgba(201, 169, 97, 0.2)',
  },
  radius: {
    none: '0px',
    sharp: '2px',
  },
  font: {
    display: '"Cinzel", serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  letterSpacing: {
    display: '0.1em',
  },
} as const;
