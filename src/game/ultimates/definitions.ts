import type { School } from '../upgrades/definitions';
const DEFINITIONS = {
  fire: { name:'炼狱爆燃', radius:400, damage:70, targets:36, freeze:0, pulses:3, interval:450, secondaryDamage:0, description:'在释放位置连续爆燃三次，敌人留在范围内会反复受伤。' },
  ice: { name:'永冻碎裂', radius:500, damage:25, targets:36, freeze:3000, pulses:2, interval:1200, secondaryDamage:85, description:'先冻结周围敌人，随后引爆仍被冻结的目标。' },
  lightning: { name:'雷暴追猎', radius:650, damage:95, targets:4, freeze:0, pulses:3, interval:220, secondaryDamage:0, description:'连续三轮锁定近敌，每轮最多四次落雷，可重复打击幸存目标。' },
} as const;
export function ultimateSpec(school: School, level: number) {
  const bonus=15*(Math.max(1,Math.min(4,level))-1), base=DEFINITIONS[school];
  return Object.freeze({...base,school,damage:base.damage+bonus,secondaryDamage:base.secondaryDamage?base.secondaryDamage+bonus:0});
}
export type UltimateSpec = ReturnType<typeof ultimateSpec>;
export function ultimateSummary(school: School, level: number): string {
  const s=ultimateSpec(school,level);
  if(school==='fire')return `${s.name} · 三次爆燃，每次 ${s.damage} 伤害 · 半径 ${s.radius}`;
  if(school==='ice')return `${s.name} · ${s.damage} 伤害与冻结 3 秒 · 1.2 秒后碎裂 ${s.secondaryDamage} 伤害 · 半径 ${s.radius}`;
  return `${s.name} · 三轮落雷，每轮最多 4 个目标 · 每击 ${s.damage} 伤害 · 半径 ${s.radius}`;
}
