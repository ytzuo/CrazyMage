import type { BurnSpec } from '../combat/BurnSpec';
import type { GameMode } from '../modes';
import { skillSpec, type SkillSpec } from '../spells/skillDefinitions.ts';
import { ultimateSpec, type UltimateSpec } from '../ultimates/definitions.ts';
import { FIREBALL, ICE, LIGHTNING, PLAYER } from '../config.ts';
import { definition, SPELL_MAX_LEVEL, UPGRADES, ULTIMATE_UPGRADES, type SkillModule, type UltimateModule, type School, type SpellModule, type Passive, type UpgradeDefinition } from './definitions.ts';
export interface BuildState {
  readonly mode: GameMode;
  readonly runId: number;
  readonly revision: number;
  readonly school: School;
  readonly spellLevel: number;
  readonly modules: Readonly<Partial<Record<SpellModule, number>>>;
  readonly skillModules: Readonly<Partial<Record<SkillModule, number>>>;
  readonly ultimateModules: Readonly<Partial<Record<UltimateModule, number>>>;
  readonly passives: Readonly<Partial<Record<Passive, number>>>;
}
export interface FireFieldSpec {readonly damage:number;readonly radius:number;readonly duration:number}
export interface FireballSpec {
  readonly field?: FireFieldSpec | null;
  readonly burn?: BurnSpec | null;
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
  readonly skill: SkillSpec;
  readonly ultimate: UltimateSpec;
  readonly ice: IceSpec;
  readonly lightning: LightningSpec;
  readonly revision: number;
  readonly player: Readonly<{ speed: number; maximum: number; shield: number }>;
  readonly fireball: FireballSpec;
  readonly breakdown: readonly string[];
}
export const initialBuild = (runId: number, school: School = 'fire', mode: GameMode = 'race'): BuildState => Object.freeze({ mode, runId, revision: 0, school, spellLevel: 1, modules: Object.freeze({}), ultimateModules: Object.freeze({}), skillModules: Object.freeze({}), passives: Object.freeze({}) });
export function stacks(build: BuildState, card: UpgradeDefinition): number {
  if (card.effect.kind === 'skill') return card.effect.school === build.school ? build.skillModules[card.effect.module] ?? 0 : 0;
  if (card.effect.kind === 'ultimate') return card.effect.school === build.school ? build.ultimateModules[card.effect.module] ?? 0 : 0;
  if(card.effect.kind !== 'passive' && card.effect.kind !== build.school) return 0;
  return card.effect.kind !== 'passive' ? build.modules[card.effect.module] ?? 0 : build.passives[card.effect.stat] ?? 0;
}
export function canAcquire(build: BuildState, card: UpgradeDefinition): boolean {
  if (build.mode !== 'endless' && stacks(build, card) >= card.maxStacks) return false;
  if (card.effect.kind === 'ultimate' || card.effect.kind === 'skill') return card.effect.school === build.school;
  if (card.effect.kind !== 'passive') return card.effect.kind === build.school && (build.mode === 'endless' || build.spellLevel < SPELL_MAX_LEVEL);
  return build.mode === 'endless' || !!build.passives[card.effect.stat] || Object.keys(build.passives).length < 3;
}
export function applyUpgrade(build: BuildState, id: string): BuildState {
  const card = definition(id);
  if (!card || !canAcquire(build, card)) throw new Error('Upgrade is unavailable');
  const modules = { ...build.modules };
  const passives = { ...build.passives };
  const ultimateModules = { ...build.ultimateModules };
  const skillModules = { ...build.skillModules };
  if (card.effect.kind === 'skill') skillModules[card.effect.module] = stacks(build, card) + 1;
  else if (card.effect.kind === 'ultimate') ultimateModules[card.effect.module] = stacks(build, card) + 1;
  else if (card.effect.kind !== 'passive') modules[card.effect.module] = stacks(build, card) + 1;
  else passives[card.effect.stat] = stacks(build, card) + 1;
  return Object.freeze({ mode: build.mode, runId: build.runId, revision: build.revision + 1, school: build.school, spellLevel: build.spellLevel + Number(card.effect.kind !== 'passive' && card.effect.kind !== 'ultimate' && card.effect.kind !== 'skill'), modules: Object.freeze(modules), ultimateModules: Object.freeze(ultimateModules), skillModules: Object.freeze(skillModules), passives: Object.freeze(passives) });
}
/** Pure compilation, performed only when a choice is committed. Runtime and UI share this result. */
export function compileBuild(build: BuildState): EffectiveBuild {
  const endless = build.mode === 'endless';
  // Every endless choice adds lasting power even after coverage/object limits are reached.
  const growth = endless ? 1+0.02*build.revision : 1;
  const m = build.school === 'fire' ? build.modules : {}, i = build.school === 'ice' ? build.modules : {}, l = build.school === 'lightning' ? build.modules : {}, p = build.passives;
  const fireDamage = growth * FIREBALL.damage * (1 + 0.3 * (m.damage ?? 0)) * (1 + (endless ? 0.15 * Math.max(0,(m.multi??0)-4) + 0.1 * Math.max(0,(m.pierce??0)-35) : 0)) * (m.multi ? 0.65 : 1);
  const fireball = Object.freeze({
    field: m.embers ? Object.freeze({damage:fireDamage*0.18*(1+0.3*((m.embers??1)-1)),radius:Math.min(420,Math.max(90,m.explosion?Math.min(600,80*(1+0.15*((m.explosion??1)-1)))*1.25:90)*(1+0.15*((m.embers??1)-1))),duration:Math.min(6000,3000+500*((m.embers??1)-1))}) : null,
    burn: m.burn ? Object.freeze({damage:fireDamage*0.25*(1+0.35*((m.burn??1)-1)),duration:Math.min(6000,3000+500*((m.burn??1)-1)),radius:Math.min(300,140+20*((m.burn??1)-1)),targets:Math.min(8,3+(m.burn??1)-1)}) : null,
    damage: fireDamage,
    cooldown: Math.max(150, FIREBALL.cooldown * (endless ? 1/(1+0.15*(p.cooldown??0)) : 1 - 0.1 * (p.cooldown ?? 0))),
    count: Math.min(9,1 + 2 * (m.multi ?? 0)), maxTargets: Math.min(36,1 + (m.pierce ?? 0)),
    speed: FIREBALL.speed, lifetime: FIREBALL.lifetime,
    explosion: m.explosion ? Object.freeze({ radius: Math.min(600,80*(1+0.15*((m.explosion??1)-1))), multiplier: 0.35*(1+0.2*((m.explosion??1)-1)) }) : null,
  });
  const ice = Object.freeze({damage:growth*24*(1+0.3*(i.damage??0))*(i.echo?0.75:1)*(1+0.2*Math.max(0,(i.echo??0)-1)),cooldown:Math.max(400,ICE.cooldown*(endless?1/(1+0.15*(p.cooldown??0)):1-0.1*(p.cooldown??0))),radius:Math.min(900,160*(1+0.25*(i.radius??0))),slow:Math.min(0.75,0.3+0.1*(i.cold??0)),duration:1500+500*(i.cold??0),pulses:i.echo?2:1,echoDelay:180});
  const lightning = Object.freeze({damage:growth*20*(1+0.3*(l.damage??0))*(1+0.2*Math.max(0,(l.conduction??0)-1)+0.1*Math.max(0,(l.chain??0)-17)),cooldown:Math.max(300,LIGHTNING.cooldown*(endless?1/(1+0.15*(p.cooldown??0)):1-0.1*(p.cooldown??0))),range:Math.min(3000,440*(1+0.25*(l.range??0))),jumpRange:Math.min(2400,180*(1+0.25*(l.range??0))),maxTargets:Math.min(36,3+2*(l.chain??0)),falloff:l.conduction?0.95:0.8});
  return Object.freeze({ revision: build.revision, school:build.school, fireball, ice, lightning, skill:compileSkill(build), ultimate: compileUltimate(build,growth),
    player: Object.freeze({ speed: PLAYER.speed * (1 + (endless ? 0.8*(p.speed??0)/(10+(p.speed??0)) : 0.08*(p.speed??0))), maximum: PLAYER.health + 20 * (p.health ?? 0), shield: 20 * (p.shield ?? 0) }),
    breakdown: Object.freeze([...UPGRADES, ...ULTIMATE_UPGRADES].filter(card => stacks(build, card) > 0).map(card => `${card.name} ×${stacks(build, card)}：${card.description}`)),
  });
}

function compileSkill(build: BuildState): SkillSpec {
  if(build.mode !== 'endless') return skillSpec(build.school,build.skillModules);
  const modules=build.skillModules, spec=skillSpec(build.school,{...modules,tempo:0});
  return Object.freeze({...spec,damage:spec.damage*(1+0.02*build.revision),cooldown:Math.max(1200,spec.cooldown/(1+0.15*(modules.tempo??0))),radius:Math.min(900,spec.radius),reach:Math.min(3000,spec.reach),width:Math.min(280,spec.width)});
}

function compileUltimate(build: BuildState, growth: number): UltimateSpec {
  const spec=ultimateSpec(build.school,build.spellLevel,build.ultimateModules,build.mode==='endless');
  return Object.freeze({...spec,damage:spec.damage*growth});
}
