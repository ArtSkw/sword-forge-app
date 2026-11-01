import type { ArchetypeKey, GuardStyle, GuardTerminal, SwordConfig } from '../store/configStore';
import { getGuardTerminalRecipe } from '../presets/archetypeDetails';

// The guard's ends, écusson and side rings: what a guard style brings by default, and what the sword has.

/** The ends a guard style has on this sword type when nothing else is chosen. */
export function defaultTerminal(archetype: ArchetypeKey, style: GuardStyle): GuardTerminal {
  if (style === 'ornate') return 'finial';
  if (archetype === 'vikingSword') return 'plain';
  return getGuardTerminalRecipe(archetype, style).kind === 'rounded' ? 'knob' : 'plain';
}

export type HiltSpec = { terminal: GuardTerminal; ecusson: boolean; rings: 0 | 1 | 2 };

export function hiltSpec(config: Pick<SwordConfig, 'archetype' | 'guard'>): HiltSpec {
  const g = config.guard;
  return { terminal: g.terminal ?? defaultTerminal(config.archetype, g.style), ecusson: !!g.ecusson, rings: g.rings ?? 0 };
}

/** Which of these a sword type offers in its Guard station. */
export const HILT_OPTIONS: Record<ArchetypeKey, { terminals: boolean; ecusson: boolean; rings: boolean }> = {
  armingSword: { terminals: true, ecusson: false, rings: false },
  longsword: { terminals: true, ecusson: true, rings: false },
  bastardSword: { terminals: true, ecusson: true, rings: true },
  vikingSword: { terminals: false, ecusson: false, rings: false },
  falchion: { terminals: true, ecusson: false, rings: false },
  estoc: { terminals: true, ecusson: false, rings: true },
  greatsword: { terminals: true, ecusson: true, rings: true },
};
