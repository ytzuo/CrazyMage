import type { School } from '../upgrades/definitions';
const DEFINITIONS = {
  fire: { name:'烈焰新星', radius:400, damage:100, targets:36, freeze:0, description:'以自身为中心爆发烈焰，重创周围敌人。' },
  ice: { name:'绝对零度', radius:500, damage:40, targets:36, freeze:3000, description:'寒潮席卷周围，造成伤害并冻结幸存敌人 3 秒。' },
  lightning: { name:'雷霆审判', radius:650, damage:85, targets:12, freeze:0, description:'雷击附近最多 12 名敌人，每个目标只受击一次。' },
} as const;
export function ultimateSpec(school: School, level: number) {
  return Object.freeze({ ...DEFINITIONS[school], school, damage: DEFINITIONS[school].damage + 15 * (Math.max(1, Math.min(4, level)) - 1) });
}
export type UltimateSpec = ReturnType<typeof ultimateSpec>;
export function ultimateSummary(school: School, level: number): string {
  const spec = ultimateSpec(school, level);
  return `${spec.name} · ${spec.damage} 伤害 · 半径 ${spec.radius}${spec.freeze ? ' · 冻结 3 秒' : ''}${school === 'lightning' ? ' · 最多 12 个目标' : ''}`;
}
