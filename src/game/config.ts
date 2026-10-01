import type { BuildSnapshot } from './upgrades/BuildStore';
export const ARENA = { width: 2400, height: 1800, inset: 96, tile: 80 } as const;
export const PLAYER = { speed: 300, radius: 18, health: 200, invulnerability: 900 } as const;
export const FIREBALL = { speed: 560, cooldown: 350, lifetime: 1400, damage: 20, radius: 10, maxProjectiles: 64 } as const;
export const ENEMY = { speed: 88, radius: 20, health: 40, damage: 10, waveInterval: 30000, clearDelay: 3000, waveSize: 6, spawnWarning: 500, maxCount: 36, attackWindup: 300, attackCooldown: 1200, attackRange: 50 } as const;
export interface Direction { x: number; y: number }

export interface MovementState {
  x: number;
  y: number;
  moving: boolean;
  paused: boolean;
  distance: number;
  attacking: boolean;
  casts: number;
  health: number;
  maxHealth: number;
  shield: number;
  waveRemaining: number;
  progression: BuildSnapshot;
  dead: boolean;
  enemies: number;
  kills: number;
  objects: number;
  projectiles: number;
  impacts: number;
  enemyPositions: { id: number; x: number; y: number }[];
  wave: number;
  nextWaveIn: number;
  elapsedTime: number;
}
