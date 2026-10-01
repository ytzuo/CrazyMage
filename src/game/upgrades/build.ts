import { FIREBALL, PLAYER } from '../config.ts';
import { definition, UPGRADES, type FireModule, type Passive, type UpgradeDefinition } from './definitions.ts';
export interface BuildState {
  readonly runId: number;
  readonly revision: number;
  readonly fireLevel: number;
  readonly modules: Readonly<Partial<Record<FireModule, number>>>;
  readonly passives: Readonly<Partial<Record<Passive, number>>>;
}
export interface FireballSpec {
  readonly damage: number; readonly cooldown: number; readonly count: number;
  readonly maxTargets: number; readonly speed: number; readonly lifetime: number;
  readonly explosion: Readonly<{ radius: number; multiplier: number }> | null;
}
export interface EffectiveBuild {
  readonly revision: number;
  readonly player: Readonly<{ speed: number; maximum: number; shield: number }>;
  readonly fireball: FireballSpec;
  readonly breakdown: readonly string[];
}
export const initialBuild = (runId: number): BuildState => Object.freeze({ runId, revision: 0, fireLevel: 1, modules: Object.freeze({}), passives: Object.freeze({}) });
export function stacks(build: BuildState, card: UpgradeDefinition): number {
  return card.effect.kind === 'fire' ? build.modules[card.effect.module] ?? 0 : build.passives[card.effect.stat] ?? 0;
}
export function canAcquire(build: BuildState, card: UpgradeDefinition): boolean {
  if (stacks(build, card) >= card.maxStacks) return false;
  if (card.effect.kind === 'fire') return build.fireLevel < 4;
  return !!build.passives[card.effect.stat] || Object.keys(build.passives).length < 3;
}
export function applyUpgrade(build: BuildState, id: string): BuildState {
  const card = definition(id);
  if (!card || !canAcquire(build, card)) throw new Error('Upgrade is unavailable');
  const modules = { ...build.modules };
  const passives = { ...build.passives };
  if (card.effect.kind === 'fire') modules[card.effect.module] = stacks(build, card) + 1;
  else passives[card.effect.stat] = stacks(build, card) + 1;
  return Object.freeze({ runId: build.runId, revision: build.revision + 1, fireLevel: build.fireLevel + Number(card.effect.kind === 'fire'), modules: Object.freeze(modules), passives: Object.freeze(passives) });
}
/** Pure compilation, performed only when a choice is committed. Runtime and UI share this result. */
export function compileBuild(build: BuildState): EffectiveBuild {
  const m = build.modules, p = build.passives;
  const fireball = Object.freeze({
    damage: FIREBALL.damage * (1 + 0.3 * (m.damage ?? 0)) * (m.multi ? 0.65 : 1),
    cooldown: Math.max(150, FIREBALL.cooldown * (1 - 0.1 * (p.cooldown ?? 0))),
    count: 1 + 2 * (m.multi ?? 0), maxTargets: 1 + (m.pierce ?? 0),
    speed: FIREBALL.speed, lifetime: FIREBALL.lifetime,
    explosion: m.explosion ? Object.freeze({ radius: 80, multiplier: 0.35 }) : null,
  });
  return Object.freeze({ revision: build.revision, fireball,
    player: Object.freeze({ speed: PLAYER.speed * (1 + 0.08 * (p.speed ?? 0)), maximum: PLAYER.health + 20 * (p.health ?? 0), shield: 20 * (p.shield ?? 0) }),
    breakdown: Object.freeze(UPGRADES.filter(card => stacks(build, card) > 0).map(card => `${card.name} ×${stacks(build, card)}：${card.description}`)),
  });
}
