import { tokens } from './tokens';

export const levaTheme = {
  colors: {
    elevation1: tokens.color.bgDeep,
    elevation2: tokens.color.bgPanel,
    elevation3: tokens.color.bgRaised,
    accent1:    tokens.color.borderAccent,
    accent2:    tokens.color.borderAccentBright,
    accent3:    tokens.color.borderAccentBright,
    highlight1: tokens.color.textMuted,
    highlight2: tokens.color.textSecondary,
    highlight3: tokens.color.textPrimary,
    vivid1:     tokens.color.borderAccentBright,
  },
  radii: { xs: '0px', sm: '2px', lg: '2px' },
  fonts: { mono: tokens.font.mono, sans: tokens.font.body },
  fontSizes: { root: '11px' },
  sizes: { rootWidth: '260px', rowHeight: '24px', titleBarHeight: '32px' },
  space: { sm: '6px', md: '10px', rowGap: '4px', colGap: '4px' },
};
