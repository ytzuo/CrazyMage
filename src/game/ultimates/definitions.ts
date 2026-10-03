import type { School, UltimateModule } from '../upgrades/definitions';
const DEFINITIONS = {
  fire: { killsRequired:15, name:'焚天火墙', radius:520, damage:70, targets:36, freeze:0, pulses:3, interval:450, description:'沿施法方向推出多轮扇形火墙，命中敌人引发爆炸，爆炸击杀可回充。' },
  ice: { killsRequired:10, name:'永冬寒域', radius:320, damage:4, targets:72, freeze:1000, pulses:1, interval:400, description:'随玩家移动的寒域，持续伤害并积累寒霜，将敌人逐渐冻结。' },
  lightning: { killsRequired:15, name:'雷暴追猎', radius:650, damage:95, targets:4, freeze:0, pulses:3, interval:220, description:'连续多轮锁定近敌，每轮最多四次落雷，可重复打击幸存目标。' },
} as const;
export function ultimateSpec(school: School, level: number, modules: Readonly<Partial<Record<UltimateModule, number>>> = {}, endless = false) {
  const bonus=(school==='ice'?2:15)*(Math.max(1,Math.min(4,level))-1), base=DEFINITIONS[school];
  const power = Math.min(endless ? Infinity : 3, Math.max(0, modules.power ?? 0));
  const reach = Math.min(endless ? Infinity : 3, Math.max(0, modules.reach ?? 0));
  const mastery = Math.min(endless ? Infinity : 3, Math.max(0, modules.mastery ?? 0));
  return Object.freeze({...base, school, duration:school==='ice'?Math.min(8000,4500+600*mastery):0, frostGain:school==='ice'?Math.min(1.5,1+0.1*mastery):0, damage:(base.damage+bonus)*(1+0.3*power)*(1+0.15*Math.max(0,mastery-3)), radius:Math.min(1500,base.radius*(1+0.15*reach)),
    explosion:school==='fire'?Object.freeze({radius:Math.min(360,100*(1+0.15*reach)),multiplier:0.4}):null,
    pulses:base.pulses+(school==='ice'?0:Math.min(3,mastery)), freeze:base.freeze+(school==='ice'?Math.min(800,200*mastery):0)});
}
export type UltimateSpec = ReturnType<typeof ultimateSpec>;
export function ultimateSummary(school: School, level: number, modules: Readonly<Partial<Record<UltimateModule, number>>> = {}): string {
  return describeUltimate(ultimateSpec(school,level,modules));
}
export function describeUltimate(s: UltimateSpec): string {
  const school=s.school;
  if(school==='fire')return `${s.name} · ${s.pulses} 轮向前扇形火墙，每轮 ${s.damage} 伤害 · 命中爆炸，爆炸击杀回充 · 半径 ${s.radius}`;
  if(school==='ice')return `${s.name} · 持续 ${s.duration/1000} 秒，每次寒潮 ${s.damage} 伤害并积累冻结 · 半径 ${s.radius}`;
  return `${s.name} · ${s.pulses} 轮落雷，每轮最多 ${s.targets} 个目标 · 每击 ${s.damage} 伤害 · 半径 ${s.radius}`;
}
