import type { School } from './upgrades/definitions';
export type GameMode = 'race' | 'endless';
export const RACE_WAVES = 20;
export const MODE_NAMES = { race: '竞速模式', endless: '无尽模式' } as const;
export const isGameMode = (value: string): value is GameMode => value === 'race' || value === 'endless';
export interface SchoolRecord { fastestMs?: number; mostWaves?: number }
const KEY = 'mage-mode-records-v1';
/** Records are local to this browser; malformed or unavailable storage never blocks play. */
export function readRecords(): Partial<Record<School, SchoolRecord>> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const records: Partial<Record<School, SchoolRecord>> = {};
    for (const school of ['fire', 'ice', 'lightning'] as const) {
      const entry = raw?.[school];
      if (!entry || typeof entry !== 'object') continue;
      records[school] = {
        fastestMs: Number.isFinite(entry.fastestMs) && entry.fastestMs > 0 ? entry.fastestMs : undefined,
        mostWaves: Number.isInteger(entry.mostWaves) && entry.mostWaves >= 0 ? entry.mostWaves : undefined,
      };
    }
    return records;
  } catch { return {}; }
}
export function saveRecord(mode: GameMode, school: School, value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  const records = readRecords(), old = records[school] ?? {};
  if (mode === 'race') {
    if (old.fastestMs !== undefined && old.fastestMs <= value) return false;
    old.fastestMs = value;
  } else {
    if (!Number.isInteger(value) || (old.mostWaves ?? 0) >= value) return false;
    old.mostWaves = value;
  }
  records[school] = old;
  try { localStorage.setItem(KEY, JSON.stringify(records)); return true; } catch { return false; }
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${Math.floor(ms % 1000 / 100)}`;
}
