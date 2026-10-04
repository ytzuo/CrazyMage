import { UPGRADES, ULTIMATE_UPGRADES, SCHOOL_INFO, type School, type UpgradeDefinition } from '../game/upgrades/definitions.ts';
import { initialBuild, applyUpgrade, compileBuild, type EffectiveBuild } from '../game/upgrades/build.ts';

export const CATALOG = [...UPGRADES, ...ULTIMATE_UPGRADES];
export type Category = 'spell' | 'skill' | 'ultimate' | 'passive';
export const CATEGORY_NAMES: Record<Category, string> = {spell:'普攻', skill:'E 技能', ultimate:'Q 大招', passive:'通用'};
export function category(card: UpgradeDefinition): Category {
  const kind=card.effect.kind;
  return kind==='skill'||kind==='ultimate'||kind==='passive'?kind:'spell';
}
export function schoolOf(card: UpgradeDefinition): School {
  const effect=card.effect;
  return effect.kind==='skill'||effect.kind==='ultimate'?effect.school:effect.kind==='passive'?'fire':effect.kind;
}
export function subject(card: UpgradeDefinition): string {
  const kind=category(card),school=schoolOf(card),base=compileBuild(initialBuild(0,school));
  return kind==='skill'?base.skill.name:kind==='ultimate'?base.ultimate.name:kind==='passive'?'通用强化':SCHOOL_INFO[school].spell;
}
/** Independent racing-mode card: the same immutable compiler feeds numbers and combat. */
export function previewBuild(card: UpgradeDefinition, layers: number): EffectiveBuild {
  let build=initialBuild(0,schoolOf(card));
  const count=Math.max(0,Math.min(card.maxStacks,Math.floor(layers)));
  for(let i=0;i<count;i++)build=applyUpgrade(build,card.id);
  return compileBuild(build);
}
const NOTES: Record<string,string> = {
  'fire.damage':'提高火球威力。', 'fire.multi':'增加扇形火球，每枚威力降低。',
  'fire.pierce':'火球贯穿更多目标。', 'fire.explosion':'首次命中产生溅射，同次施法不重复溅射。',
  'fire.burn':'点燃目标；燃烧目标死亡后传播火种并留下火区。',
  'fire.rebound':'火球折返，回程继承贯穿，不触发爆炸或灼烧。',
  'ice.damage':'提高冰矛及已获得冰棘、碎冰的威力。',
  'ice.radius':'命中迸出冰片；已有落地冰棘半径增加 50%。',
  'ice.cold':'加强并延长减速，重复命中刷新持续时间。',
  'ice.echo':'追加短程冰矛，每根威力降低；移动可铺开落点。',
  'ice.ground':'射程末端留下冰棘，持续伤害并减速。',
  'ice.shards':'寒霜目标死亡后，碎冰打击并减速近敌。',
  'lightning.damage':'提高整条连锁的威力。', 'lightning.chain':'连锁更多不同目标。',
  'lightning.range':'延长首击和连锁距离。', 'lightning.conduction':'降低每跳伤害衰减。',
  'lightning.fork':'向主链外的敌人分出较弱电弧。',
  'lightning.charge':'命中叠雷印，蓄满或死亡时放电。',
  'passive.speed':'提高移动速度。', 'passive.health':'增加最大生命，同时恢复新增生命。',
  'passive.shield':'护盾优先吸收伤害，10 秒未受伤后恢复。',
  'passive.cooldown':'缩短普攻间隔。',
};
export const note=(card:UpgradeDefinition):string=>NOTES[card.id]??card.description;
export interface Metric {label:string;before:string;after:string}
const fmt=(n:number,unit=''):string=>`${Number(n.toFixed(2))}${unit}`;
export function metrics(card:UpgradeDefinition,layers:number):Metric[] {
  const before=previewBuild(card,0),after=previewBuild(card,layers);
  const row=(label:string,get:(b:EffectiveBuild)=>number|null,unit='',scale=1):Metric=>{
    const format=(b:EffectiveBuild)=>{const n=get(b);return n===null?'—':fmt(n*scale,unit);};
    return {label,before:format(before),after:format(after)};
  };
  const e=card.effect;
  if(e.kind==='skill') {
    if(e.module==='tempo')return [row('充能时间',b=>b.skill.cooldown,' 秒',.001)];
    if(e.module==='reach')return [row(e.school==='lightning'?'射程':'覆盖半径',b=>e.school==='lightning'?b.skill.reach:b.skill.radius),row(e.school==='lightning'?'宽度':'射程',b=>e.school==='lightning'?b.skill.width:b.skill.reach)];
    return e.school==='ice'?[row('首击伤害',b=>b.skill.initialDamage),row('持续伤害 / 0.3 秒',b=>b.skill.damage)]:[row('命中伤害',b=>b.skill.damage)];
  }
  if(e.kind==='ultimate') {
    if(e.module==='power')return [row(e.school==='ice'?'伤害 / 0.4 秒':'每轮伤害',b=>b.ultimate.damage)];
    if(e.module==='reach')return [row('覆盖半径',b=>b.ultimate.radius)];
    return e.school==='ice'?[row('持续时间',b=>b.ultimate.duration,' 秒',.001),row('冻结时间',b=>b.ultimate.freeze,' 秒',.001),row('每次寒霜',b=>b.ultimate.frostGain)]:[row('攻击轮数',b=>b.ultimate.pulses),row('每轮间隔',b=>b.ultimate.interval,' 秒',.001)];
  }
  if(e.kind==='passive') {
    if(e.stat==='speed')return [row('移动速度',b=>b.player.speed)];
    if(e.stat==='health')return [row('最大生命',b=>b.player.maximum),row('获得时恢复',b=>b.player.maximum-before.player.maximum)];
    if(e.stat==='shield')return [row('护盾容量',b=>b.player.shield),row('恢复等待',b=>b.player.shield?10:null,' 秒')];
    return [row('火球间隔',b=>b.fireball.cooldown,' 秒',.001),row('冰矛间隔',b=>b.ice.cooldown,' 秒',.001),row('闪电间隔',b=>b.lightning.cooldown,' 秒',.001)];
  }
  if(e.kind==='fire')switch(e.module) {
    case 'damage':return [row('单枚伤害',b=>b.fireball.damage)];
    case 'multi':return [row('火球数量',b=>b.fireball.count),row('单枚伤害',b=>b.fireball.damage)];
    case 'pierce':return [row('单枚命中上限',b=>b.fireball.maxTargets)];
    case 'explosion':return [row('溅射伤害',b=>b.fireball.explosion?b.fireball.damage*b.fireball.explosion.multiplier:null),row('爆炸半径',b=>b.fireball.explosion?.radius??null)];
    case 'rebound':return [row('回程伤害',b=>b.fireball.rebound?b.fireball.damage*b.fireball.rebound.damageMultiplier:null),row('返程最长',b=>b.fireball.rebound?.lifetime??null,' 秒',.001)];
    case 'burn':return [row('灼烧伤害 / 0.5 秒',b=>b.fireball.burn?.damage??null),row('燃烧时间',b=>b.fireball.burn?.duration??null,' 秒',.001),row('传播目标上限',b=>b.fireball.burn?.targets??0)];
  }
  if(e.kind==='ice')switch(e.module) {
    case 'damage':return [row('冰矛伤害',b=>b.ice.damage)];
    case 'radius':return [row('命中冰片伤害',b=>b.ice.effects?.hitShards?.damage??null),row('冰片目标上限',b=>b.ice.effects?.hitShards?.targets??0)];
    case 'cold':return [row('减速',b=>b.ice.slow,'%',100),row('持续时间',b=>b.ice.duration,' 秒',.001)];
    case 'echo':return [row('冰矛数量',b=>b.ice.pulses),row('单根伤害',b=>b.ice.damage),row('追袭间隔',b=>b.ice.pulses>1?b.ice.echoDelay:null,' 秒',.001)];
    case 'ground':return [row('冰棘伤害 / 0.3 秒',b=>b.ice.ground?.damage??null),row('冰棘半径',b=>b.ice.ground?.radius??null),row('驻留时间',b=>b.ice.ground?.duration??null,' 秒',.001)];
    case 'shards':return [row('碎冰伤害',b=>b.ice.effects?.shards?.damage??null),row('目标上限',b=>b.ice.effects?.shards?.targets??0),row('覆盖半径',b=>b.ice.effects?.shards?.radius??null)];
  }
  switch(e.module) {
    case 'damage':return [row('首击伤害',b=>b.lightning.damage)];
    case 'chain':return [row('主链目标上限',b=>b.lightning.maxTargets)];
    case 'range':return [row('首击距离',b=>b.lightning.range),row('跳跃距离',b=>b.lightning.jumpRange)];
    case 'conduction':return [row('每跳伤害保留',b=>b.lightning.falloff,'%',100),row('第三击伤害',b=>b.lightning.damage*b.lightning.falloff**2)];
    case 'fork':return [row('分叉伤害系数',b=>b.lightning.fork?.multiplier??null,'%',100),row('每跳分叉上限',b=>b.lightning.fork?.perHop??0)];
    case 'charge':return [row('放电所需命中',b=>b.lightning.charge?.threshold??null),row('满印放电伤害',b=>b.lightning.charge?.damage??null),row('放电半径',b=>b.lightning.charge?.radius??null)];
    default:return [];
  }
}
