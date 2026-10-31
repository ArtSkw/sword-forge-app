import type { ArchetypeKey, GuardStyle } from '../store/configStore';

// Crossguard shape parameters, kept free of three.js so the UI can draw guard
// silhouettes without pulling the 3D bundle into the main chunk.

export interface GuardParams {
  width:    number; // total guard length
  tipScale: number; // cross-section scale at tip — <1 taper, >1 flare
  tipY:     number; // path Y offset at tip (positive = toward blade)
  tipZ:     number; // path Z offset at tip (positive = toward viewer)
  segments: number;
  sectionScale?: number;
}

const GUARD_PARAMS: Record<GuardStyle, GuardParams> = {
  // Chamfered bar, arms taper toward the ends.
  straight: { width: 0.220, tipScale: 0.60, tipY: 0,      tipZ: 0,      segments: 20 },
  // Same proportions; arms follow a parabolic curve upward toward the blade.
  curved:   { width: 0.220, tipScale: 0.62, tipY:  0.022, tipZ: 0,      segments: 24 },
  // Arms taper aggressively so the scroll terminals read as the visual endpoint.
  ornate:   { width: 0.220, tipScale: 0.20, tipY: 0,      tipZ: 0,      segments: 20 },
  // Wider, flared tips, double-axis sweep (upward + forward) for dramatic flair.
  fantasy:  { width: 0.260, tipScale: 1.25, tipY:  0.030, tipZ: 0.012,  segments: 28 },
};

const VIKING_GUARD_PARAMS: GuardParams = {
  width: 0.165,
  tipScale: 0.82,
  tipY: 0,
  tipZ: 0,
  segments: 18,
  sectionScale: 1.28,
};

const ARMING_GUARD_PARAMS: GuardParams = {
  width: 0.205,
  tipScale: 0.68,
  tipY: 0.010,
  tipZ: 0,
  segments: 22,
  sectionScale: 0.92,
};

const LONGSWORD_GUARD_PARAMS: GuardParams = {
  width: 0.238,
  tipScale: 0.56,
  tipY: 0.012,
  tipZ: 0,
  segments: 24,
  sectionScale: 0.96,
};

const BASTARD_GUARD_PARAMS: GuardParams = {
  width: 0.232,
  tipScale: 0.48,
  tipY: 0.029,
  tipZ: 0,
  segments: 26,
  sectionScale: 0.90,
};

const FALCHION_GUARD_PARAMS: GuardParams = {
  width: 0.206,
  tipScale: 0.52,
  tipY: 0.026,
  tipZ: 0,
  segments: 24,
  sectionScale: 0.88,
};

const ESTOC_GUARD_PARAMS: GuardParams = {
  width: 0.228,
  tipScale: 0.42,
  tipY: 0.006,
  tipZ: 0,
  segments: 24,
  sectionScale: 0.58,
};

const GREATSWORD_GUARD_PARAMS: GuardParams = {
  width: 0.285,
  tipScale: 0.50,
  tipY: 0.034,
  tipZ: 0,
  segments: 30,
  sectionScale: 1.04,
};

export function getGuardParams(style: GuardStyle, archetype: ArchetypeKey): GuardParams {
  if (archetype === 'armingSword' && style === 'straight') {
    return ARMING_GUARD_PARAMS;
  }
  if (archetype === 'longsword' && style === 'straight') {
    return LONGSWORD_GUARD_PARAMS;
  }
  if (archetype === 'bastardSword' && style === 'curved') {
    return BASTARD_GUARD_PARAMS;
  }
  if (archetype === 'falchion' && style === 'curved') {
    return FALCHION_GUARD_PARAMS;
  }
  if (archetype === 'estoc' && style === 'straight') {
    return ESTOC_GUARD_PARAMS;
  }
  if (archetype === 'greatsword' && style === 'curved') {
    return GREATSWORD_GUARD_PARAMS;
  }
  if (archetype === 'vikingSword' && style === 'straight') {
    return VIKING_GUARD_PARAMS;
  }
  return GUARD_PARAMS[style];
}
