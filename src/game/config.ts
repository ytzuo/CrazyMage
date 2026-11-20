import type { GameMode } from './modes';
import type { BuildSnapshot } from './upgrades/BuildStore';
export const ARENA = { width: 2400, height: 1800, inset: 96, tile: 80 } as const;
export const PLAYER = { speed: 300, radius: 18, health: 120, waveHealing: 15, invulnerability: 900 } as const;
export const FIREBALL = { speed: 560, cooldown: 550, lifetime: 1400, damage: 20, radius: 10, maxProjectiles: 64 } as const;
export const ICE = { cooldown: 1000 } as const;
export const LIGHTNING = { cooldown: 900 } as const;
export const ENEMY = { waveInterval: 30000, bossWaveInterval: 45000, clearDelay: 3000, spawnWarning: 500, initialCapacity: 48, capacityStep: 2, maxCount: 72 } as const;
export const START_COUNTDOWN_MS = 3000;
export interface Direction { x: number; y: number }

export function stepStartCountdown(remainingMs: number, deltaMs: number): { remainingMs: number; beforeSeconds: number; afterSeconds: number; changed: boolean } {
  const safeRemaining = Math.max(0, remainingMs);
  const beforeSeconds = Math.ceil(safeRemaining / 1000);
  const step = Math.min(Math.max(0, deltaMs), 50);
  const nextRemaining = Math.max(0, safeRemaining - step);
  const afterSeconds = Math.ceil(nextRemaining / 1000);
  return { remainingMs: nextRemaining, beforeSeconds, afterSeconds, changed: afterSeconds !== beforeSeconds };
}

export interface MovementState {
  mode: GameMode;
  won: boolean;
  clearedWaves: number;
  selectingSchool: boolean;
  countdown: number;
  skillEnergy: number;
  skillRemaining: number;
  ultimateEnergy: number;
  ultimateKills: number;
  ultimateKillsRequired: number;
  ultimateCasts: number;
  ultimateEffects: number;
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
  enemyPositions: { id: number; x: number; y: number; boss: boolean }[];
  wave: number;
  nextWaveIn: number;
  elapsedTime: number;
}
