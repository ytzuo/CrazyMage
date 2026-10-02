import { ultimateSpec, type UltimateSpec } from '../ultimates/definitions.ts';
import { FIREBALL, ICE, LIGHTNING, PLAYER } from '../config.ts';
import { definition, UPGRADES, ULTIMATE_UPGRADES, type UltimateModule, type School, type SpellModule, type Passive, type UpgradeDefinition } from './definitions.ts';
export interface BuildState {
  readonly runId: number;
  readonly revision: number;
  readonly school: School;
  readonly spellLevel: number;
  readonly modules: Readonly<Partial<Record<SpellModule, number>>>;
  readonly ultimateModules: Readonly<Partial<Record<UltimateModule, number>>>;
  readonly passives: Readonly<Partial<Record<Passive, number>>>;
}
export interface FireballSpec {
  readonly damage: number; readonly cooldown: number; readonly count: number;
  readonly maxTargets: number; readonly speed: number; readonly lifetime: number;
  readonly explosion: Readonly<{ radius: number; multiplier: number }> | null;
}
export interface IceSpec {
  readonly damage:number; readonly cooldown:number; readonly radius:number;
  readonly slow:number; readonly duration:number; readonly pulses:number; readonly echoDelay:number;
}
export interface LightningSpec {
  readonly damage:number; readonly cooldown:number; readonly range:number;
  readonly jumpRange:number; readonly maxTargets:number; readonly falloff:number;
}
export interface EffectiveBuild {
  readonly school: School;
  readonly ultimate: UltimateSpec;
  readonly ice: IceSpec;
  readonly lightning: LightningSpec;
  readonly revision: number;
  readonly player: Readonly<{ speed: number; maximum: number; shield: number }>;
  readonly fireball: FireballSpec;
  readonly breakdown: readonly string[];
}
export const initialBuild = (runId: number, school: School = 'fire'): BuildState => Object.freeze({ runId, revision: 0, school, spellLevel: 1, modules: Object.freeze({}), ultimateModules: Object.freeze({}), passives: Object.freeze({}) });
export function stacks(build: BuildState, card: UpgradeDefinition): number {
  if (card.effect.kind === 'ultimate') return card.effect.school === build.school ? build.ultimateModules[card.effect.module] ?? 0 : 0;
  if(card.effect.kind !== 'passive' && card.effect.kind !== build.school) return 0;
  return card.effect.kind !== 'passive' ? build.modules[card.effect.module] ?? 0 : build.passives[card.effect.stat] ?? 0;
}
export function canAcquire(build: BuildState, card: UpgradeDefinition): boolean {
  if (stacks(build, card) >= card.maxStacks) return false;
  if (card.effect.kind === 'ultimate') return card.effect.school === build.school;
  if (card.effect.kind !== 'passive') return card.effect.kind === build.school && build.spellLevel < 4;
  return !!build.passives[card.effect.stat] || Object.keys(build.passives).length < 3;
}
export function applyUpgrade(build: BuildState, id: string): BuildState {
  const card = definition(id);
  if (!card || !canAcquire(build, card)) throw new Error('Upgrade is unavailable');
  const modules = { ...build.modules };
  const passives = { ...build.passives };
  const ultimateModules = { ...build.ultimateModules };
  if (card.effect.kind === 'ultimate') ultimateModules[card.effect.module] = stacks(build, card) + 1;
  else if (card.effect.kind !== 'passive') modules[card.effect.module] = stacks(build, card) + 1;
  else passives[card.effect.stat] = stacks(build, card) + 1;
  return Object.freeze({ runId: build.runId, revision: build.revision + 1, school: build.school, spellLevel: build.spellLevel + Number(card.effect.kind !== 'passive' && card.effect.kind !== 'ultimate'), modules: Object.freeze(modules), ultimateModules: Object.freeze(ultimateModules), passives: Object.freeze(passives) });
}
/** Pure compilation, performed only when a choice is committed. Runtime and UI share this result. */
export function compileBuild(build: BuildState): EffectiveBuild {
  const m = build.school === 'fire' ? build.modules : {}, i = build.school === 'ice' ? build.modules : {}, l = build.school === 'lightning' ? build.modules : {}, p = build.passives;
  const fireball = Object.freeze({
    damage: FIREBALL.damage * (1 + 0.3 * (m.damage ?? 0)) * (m.multi ? 0.65 : 1),
    cooldown: Math.max(150, FIREBALL.cooldown * (1 - 0.1 * (p.cooldown ?? 0))),
    count: 1 + 2 * (m.multi ?? 0), maxTargets: 1 + (m.pierce ?? 0),
    speed: FIREBALL.speed, lifetime: FIREBALL.lifetime,
    explosion: m.explosion ? Object.freeze({ radius: 80, multiplier: 0.35 }) : null,
  });
  const ice = Object.freeze({damage:24*(1+0.3*(i.damage??0))*(i.echo?0.75:1),cooldown:Math.max(400,ICE.cooldown*(1-0.1*(p.cooldown??0))),radius:160*(1+0.25*(i.radius??0)),slow:Math.min(0.75,0.3+0.1*(i.cold??0)),duration:1500+500*(i.cold??0),pulses:i.echo?2:1,echoDelay:180});
  const lightning = Object.freeze({damage:20*(1+0.3*(l.damage??0)),cooldown:Math.max(300,LIGHTNING.cooldown*(1-0.1*(p.cooldown??0))),range:440*(1+0.25*(l.range??0)),jumpRange:180*(1+0.25*(l.range??0)),maxTargets:3+2*(l.chain??0),falloff:l.conduction?0.95:0.8});
  return Object.freeze({ revision: build.revision, school:build.school, fireball, ice, lightning, ultimate: ultimateSpec(build.school, build.spellLevel, build.ultimateModules),
    player: Object.freeze({ speed: PLAYER.speed * (1 + 0.08 * (p.speed ?? 0)), maximum: PLAYER.health + 20 * (p.health ?? 0), shield: 20 * (p.shield ?? 0) }),
    breakdown: Object.freeze([...UPGRADES, ...ULTIMATE_UPGRADES].filter(card => stacks(build, card) > 0).map(card => `${card.name} ×${stacks(build, card)}：${card.description}`)),
  });
}
