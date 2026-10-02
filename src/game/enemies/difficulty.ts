import type { GameMode } from '../modes';
import { ENEMY } from '../config.ts';
/** Wave growth is bounded independently of the global live-enemy budget. */
export const WAVE_LIMITS = { initialCount: 6, countStep: 2, maximumCount: 48, healthStep: 0.12, healthCurve: 0.0015, damageStep: 0.085, speedStep: 0.02, maximumSpeed: 1.2 } as const;
export function enemyCapacity(wave: number): number {
  return Math.min(ENEMY.maxCount, ENEMY.initialCapacity + Math.max(0, Math.floor(wave) - 1) * ENEMY.capacityStep);
}
export function waveDifficulty(wave: number, mode: GameMode = 'race') {
  const progress = Math.max(0, Math.floor(wave) - 1);
  if(mode === 'endless') return {count:6+progress*2,health:1+progress*0.16+progress*progress*0.003,damage:1+progress*0.1,speed:1+0.6*progress/(progress+25)};
  return {
    count: Math.min(WAVE_LIMITS.maximumCount, WAVE_LIMITS.initialCount + progress * WAVE_LIMITS.countStep),
    health: 1 + progress * WAVE_LIMITS.healthStep + progress * progress * WAVE_LIMITS.healthCurve,
    damage: 1 + progress * WAVE_LIMITS.damageStep,
    speed: Math.min(WAVE_LIMITS.maximumSpeed, 1 + progress * WAVE_LIMITS.speedStep),
  };
}
