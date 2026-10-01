import type { BuildSnapshot } from './upgrades/BuildStore';
export const ARENA = { width: 2400, height: 1800, inset: 96, tile: 80 } as const;
export const PLAYER = { speed: 300, radius: 18, health: 200, invulnerability: 900 } as const;
export const FIREBALL = { speed: 560, cooldown: 350, lifetime: 1400, damage: 20, radius: 10, maxProjectiles: 64 } as const;
export const ENEMY = { waveInterval: 30000, clearDelay: 3000, spawnWarning: 500, maxCount: 36 } as const;
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
