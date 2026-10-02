import { waveDifficulty } from './difficulty.ts';
export type EnemyKind = 'chaser' | 'ranged' | 'brute' | 'swift' | 'boss' | 'artillery';
export interface EnemySpec {
  readonly kind: EnemyKind;
  readonly speed: number;
  readonly radius: number;
  readonly health: number;
  readonly damage: number;
  readonly range: number;
  readonly windup: number;
  readonly cooldown: number;
  readonly knockback: number;
}
export const ENEMY_TYPES: Readonly<Record<EnemyKind, EnemySpec>> = {
  artillery: {kind:'artillery',speed:62,radius:18,health:32,damage:14,range:620,windup:1100,cooldown:3200,knockback:260},
  boss: {kind:'boss',speed:64,radius:54,health:900,damage:30,range:165,windup:900,cooldown:2100,knockback:15},
  chaser: {kind:'chaser',speed:88,radius:20,health:40,damage:10,range:50,windup:300,cooldown:1200,knockback:240},
  swift: {kind:'swift',speed:160,radius:14,health:18,damage:6,range:40,windup:350,cooldown:1000,knockback:280},
  ranged: {kind:'ranged',speed:72,radius:16,health:24,damage:8,range:520,windup:700,cooldown:2000,knockback:260},
  brute: {kind:'brute',speed:58,radius:36,health:120,damage:24,range:74,windup:850,cooldown:1800,knockback:100},
};
/** Introduce one threat at a time while retaining a mixed, deterministic roster. */
export function enemyKind(wave: number, index: number): EnemyKind {
  if(wave>=4&&index%7===6) return 'artillery';
  if(wave>=4&&index%6===5) return 'brute';
  if(wave>=3&&index%5===4) return 'ranged';
  if(wave>=2&&index%3===2) return 'swift';
  return 'chaser';
}
export function enemySpec(kind: EnemyKind, wave: number): EnemySpec {
  const base=ENEMY_TYPES[kind], growth=waveDifficulty(wave);
  return Object.freeze({...base, health:Math.round(base.health*growth.health),damage:Math.round(base.damage*growth.damage),speed:base.speed*growth.speed});
}
export const ENEMY_SHOTS = {maximum:32, speed:210, radius:7, lifetime:3200} as const;
