import type { School } from '../upgrades/definitions';
const DEFINITIONS = {
  fire: { name:'焚天火墙', radius:520, damage:70, targets:36, freeze:0, pulses:3, interval:450, description:'沿施法方向推出三轮扇形火墙，每轮向前扫过敌人。' },
  ice: { name:'冰封处决', radius:500, damage:25, targets:36, freeze:1800, pulses:1, interval:0, description:'将周围敌人封入冰块，短暂冻结；期间再次受到攻击会直接碎冰消灭。' },
  lightning: { name:'雷暴追猎', radius:650, damage:95, targets:4, freeze:0, pulses:3, interval:220, description:'连续三轮锁定近敌，每轮最多四次落雷，可重复打击幸存目标。' },
} as const;
export function ultimateSpec(school: School, level: number) {
  const bonus=15*(Math.max(1,Math.min(4,level))-1), base=DEFINITIONS[school];
  return Object.freeze({...base,school,damage:base.damage+bonus});
}
export type UltimateSpec = ReturnType<typeof ultimateSpec>;
export function ultimateSummary(school: School, level: number): string {
  const s=ultimateSpec(school,level);
  if(school==='fire')return `${s.name} · 三轮向前扇形火墙，每轮 ${s.damage} 伤害 · 半径 ${s.radius}`;
  if(school==='ice')return `${s.name} · ${s.damage} 伤害 · 冰封 1.8 秒，期间再次受击直接消灭 · 半径 ${s.radius}`;
  return `${s.name} · 三轮落雷，每轮最多 4 个目标 · 每击 ${s.damage} 伤害 · 半径 ${s.radius}`;
}
