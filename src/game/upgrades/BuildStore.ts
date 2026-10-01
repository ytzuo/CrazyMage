import { applyUpgrade, canAcquire, compileBuild, initialBuild, stacks, type BuildState, type EffectiveBuild } from './build.ts';
import { UPGRADES, definition } from './definitions.ts';
export interface HistoryEntry { readonly sequence: number; readonly id: string; readonly wave: number; readonly elapsed: number; readonly level: number }
export interface ChoiceBatch { readonly id: string; readonly wave: number; readonly options: readonly string[] }
export interface BuildSnapshot { readonly build: BuildState; readonly effective: EffectiveBuild; readonly history: readonly HistoryEntry[]; readonly choice: ChoiceBatch | null; readonly completedWaves: number; readonly pendingRewards: number; readonly exhausted: boolean }
/** Owns atomic choices; previews consume neither wave rewards nor randomness. */
export class BuildStore {
  private runId = 0;
  private batchId = 0;
  private build = initialBuild(0);
  private effective = compileBuild(this.build);
  private history: readonly HistoryEntry[] = Object.freeze([]);
  private choice: ChoiceBatch | null = null;
  private rewardedWaves = new Set<number>();
  private rewards: number[] = [];
  private random: () => number;
  constructor(random: () => number = Math.random) { this.random = random; }
  get effectiveBuild(): EffectiveBuild { return this.effective; }
  get pendingChoice(): ChoiceBatch | null { return this.choice; }
  get snapshot(): BuildSnapshot { return { build: this.build, effective: this.effective, history: this.history, choice: this.choice, completedWaves: this.rewardedWaves.size, pendingRewards: this.rewards.length, exhausted: !UPGRADES.some(card => canAcquire(this.build, card)) }; }
  reset(): void {
    this.build = initialBuild(++this.runId); this.effective = compileBuild(this.build);
    this.history = Object.freeze([]); this.choice = null; this.rewards = []; this.rewardedWaves.clear(); this.batchId = 0;
  }
  completeWave(wave: number): void {
    if (!Number.isInteger(wave) || wave < 1 || this.rewardedWaves.has(wave)) return;
    if (this.snapshot.exhausted) return;
    this.rewardedWaves.add(wave);
    this.rewards.push(wave);
    this.offer();
  }
  preview(id: string): EffectiveBuild {
    if (!this.choice?.options.includes(id)) throw new Error('Not in current choice');
    return compileBuild(applyUpgrade(this.build, id));
  }
  choose(batchId: string, id: string, elapsed: number): boolean {
    if (!this.choice || this.choice.id !== batchId || !this.choice.options.includes(id)) return false;
    const card = definition(id);
    if (!card || !canAcquire(this.build, card)) return false;
    const next = applyUpgrade(this.build, id);
    const effective = compileBuild(next);
    const history = Object.freeze([...this.history, Object.freeze({ sequence: this.history.length + 1, id, wave: this.choice.wave, elapsed, level: card.effect.kind === 'fire' ? next.fireLevel : stacks(next, card) })]);
    this.rewards.shift();
    this.build = next; this.effective = effective; this.history = history; this.choice = null;
    this.offer();
    return true;
  }
  private offer(): void {
    if (this.choice || !this.rewards.length) return;
    const pool = UPGRADES.filter(card => canAcquire(this.build, card));
    const options: string[] = [];
    const draw = (onlyFire = false): boolean => {
      const eligible = pool.filter(card => !onlyFire || card.effect.kind === 'fire');
      if (!eligible.length) return false;
      const weights = eligible.map(card => card.effect.kind === 'fire' ? 3 + Number(card.id === 'fire.pierce' && !!this.build.modules.multi) : stacks(this.build, card) ? 2 : 1);
      let roll = Math.max(0, Math.min(0.999999, this.random())) * weights.reduce((sum, n) => sum + n, 0);
      let index = 0;
      for (; index < weights.length - 1 && roll >= weights[index]; index++) roll -= weights[index];
      const card = eligible[index]; options.push(card.id); pool.splice(pool.indexOf(card), 1); return true;
    };
    draw(true);
    while (options.length < 3 && draw()) { /* weighted draw without replacement */ }
    if (!options.length) this.rewards = [];
    if (options.length) this.choice = Object.freeze({ id: `${this.build.runId}:${++this.batchId}`, wave: this.rewards[0], options: Object.freeze(options) });
  }
}
