import type { EnemyKind, EnemySpec } from './roster.ts';

export type EnemyVariant = 'normal' | 'splitter' | 'dasher' | 'volley' | 'guardian';
export const VARIANTS = {
  chance: 0.25,
  dashRange: 260,
  dashWindup: 550,
  dashDuration: 300,
  dashSpeed: 780,
  dashCooldown: 1800,
  volleyCount: 3,
  volleyInterval: 180,
  blockChance: 0.35,
  blockCooldown: 400,
  fragmentWarning: 350,
} as const;
const byKind: Record<EnemyKind, EnemyVariant> = {
  chaser: 'splitter', swift: 'dasher', ranged: 'volley', brute: 'guardian',
};
/** Roll once at spawn; offspring are explicitly normal and cannot recursively split. */
export function rollVariant(kind: EnemyKind, random: () => number): EnemyVariant {
  return random() < VARIANTS.chance ? byKind[kind] : 'normal';
}
export function fragmentSpec(parent: EnemySpec): EnemySpec {
  return Object.freeze({ ...parent, radius: Math.max(10, parent.radius * 0.65),
    health: Math.max(1, Math.round(parent.health * 0.45)),
    damage: Math.max(1, Math.round(parent.damage * 0.6)), speed: parent.speed * 1.15, range: 36 });
}
