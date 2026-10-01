import Phaser from 'phaser';
import { ARENA, ENEMY, type Direction } from '../config';
import { Health } from '../combat/Health';
import type { Player } from '../entities/Player';
import { WaveClock } from './WaveClock';
import { WaveTracker } from './WaveTracker';

export interface Enemy {
  id: number;
  wave: number;
  view: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Rectangle;
  warning: Phaser.GameObjects.Arc;
  health: Health;
  spawning: number;
  windup: number;
  cooldown: number;
  flash: number;
  knockback: Direction;
}

/** Bounded chasers; scene owns cleanup. All timers use active game time. */
export class EnemySystem {
  readonly enemies: Enemy[] = [];
  kills = 0;
  readonly waveClock = new WaveClock(ENEMY.waveInterval);
  readonly waves = new WaveTracker();
  private spawnIndex = 0;
  private nextId = 0;

  constructor(private scene: Phaser.Scene, private onWaveClear: (wave: number) => void = () => {}) { this.prepareTexture(); }

  private prepareTexture(): void {
    if (this.scene.textures.exists('enemy-chaser')) return;
    const g = this.scene.make.graphics({}, false);
    g.fillStyle(0x754c63).fillTriangle(11, 18, 8, 2, 24, 15).fillTriangle(40, 15, 56, 2, 53, 20);
    g.fillStyle(0xb77a85).fillRoundedRect(10, 14, 44, 38, 14);
    g.fillStyle(0xd39b96).fillEllipse(32, 22, 34, 19);
    g.fillStyle(0x2b2430).fillCircle(23, 29, 5).fillCircle(41, 29, 5);
    g.fillStyle(0xffd385).fillCircle(24, 28, 2).fillCircle(40, 28, 2);
    g.fillStyle(0x694553).fillRoundedRect(23, 41, 18, 5, 2);
    g.generateTexture('enemy-chaser', 64, 64);
    g.destroy();
  }

  private spawn(player: Player, wave: number): boolean {
    if (this.enemies.length >= ENEMY.maxCount) return false;
    // Rotate through the arena's four edges, retaining a safe distance near walls.
    const firstEdge = this.spawnIndex++ % 4;
    for (let attempt = 0; attempt < 8; attempt++) {
      const margin = ARENA.inset + ENEMY.radius;
      const edge = (firstEdge + attempt) % 4;
      const x = edge === 0 ? ARENA.width - margin : edge === 2 ? margin : Phaser.Math.Between(margin, ARENA.width - margin);
      const y = edge === 1 ? ARENA.height - margin : edge === 3 ? margin : Phaser.Math.Between(margin, ARENA.height - margin);
      if (Phaser.Math.Distance.Squared(x, y, player.view.x, player.view.y) < 280 * 280) continue;
      const view = this.scene.add.container(x, y).setDepth(9);
      const shadow = this.scene.add.ellipse(0, 12, 43, 16, 0x000000, 0.3);
      const warning = this.scene.add.circle(0, 0, ENEMY.radius + 8, 0xeea56e, 0.06).setStrokeStyle(2, 0xefb87d, 0.65);
      const body = this.scene.add.image(0, -3, 'enemy-chaser');
      const background = this.scene.add.rectangle(0, -38, 38, 5, 0x211d26).setStrokeStyle(1, 0x473843);
      const bar = this.scene.add.rectangle(-18, -38, 36, 3, 0xe29a9c).setOrigin(0, 0.5);
      view.add([shadow, warning, body, background, bar]).setAlpha(0.45);
      this.enemies.push({ id: this.nextId++, wave, view, body, bar, warning, health: new Health(ENEMY.health), spawning: ENEMY.spawnWarning, windup: 0, cooldown: 0, flash: 0, knockback: { x: 0, y: 0 } });
      return true;
    }
    return false;
  }

  reset(player?: Player): void {
    for (const enemy of this.enemies) enemy.view.destroy();
    this.enemies.length = 0;
    this.kills = this.spawnIndex = this.nextId = 0;
    this.waveClock.reset();
    this.waves.reset();
    if (player) this.spawnWave(player);
  }

  private spawnWave(player: Player, wave = this.waveClock.wave): void {
    let spawned = 0;
    for (let i = 0; i < ENEMY.waveSize && this.enemies.length < ENEMY.maxCount; i++) if (this.spawn(player, wave)) spawned++;
    this.waves.register(wave, spawned);
  }

  update(delta: number, player: Player): void {
    const waves = this.waveClock.update(delta);
    for (let i = 0; i < waves; i++) this.spawnWave(player, this.waveClock.wave - waves + i + 1);
    for (const enemy of this.enemies) {
      if (enemy.health.dead) continue;
      if (enemy.spawning > 0) {
        enemy.spawning = Math.max(0, enemy.spawning - delta);
        enemy.view.setAlpha(enemy.spawning > 0 ? 0.45 : 1);
        if (enemy.spawning === 0) enemy.warning.setVisible(false);
        continue;
      }
      enemy.flash = Math.max(0, enemy.flash - delta);
      if (enemy.flash === 0) enemy.body.clearTint();
      enemy.cooldown = Math.max(0, enemy.cooldown - delta);
      const dx = player.view.x - enemy.view.x;
      const dy = player.view.y - enemy.view.y;
      const distance = Math.hypot(dx, dy);
      if (enemy.windup > 0) {
        enemy.windup = Math.max(0, enemy.windup - delta);
        enemy.warning.setAlpha(0.55 + 0.45 * (1 - enemy.windup / ENEMY.attackWindup));
        if (enemy.windup === 0) {
          enemy.warning.setVisible(false);
          enemy.cooldown = ENEMY.attackCooldown;
          if (distance <= ENEMY.attackRange && player.hurt(ENEMY.damage, enemy.view.x, enemy.view.y)) {
            if (player.health.dead) break;
          }
        }
      } else if (distance <= ENEMY.attackRange && enemy.cooldown === 0) {
        enemy.windup = ENEMY.attackWindup;
        enemy.warning.setRadius(ENEMY.attackRange).setFillStyle(0xff8058, 0.12).setStrokeStyle(2, 0xffa16b, 0.9).setAlpha(0.55).setVisible(true);
      } else if (distance > ENEMY.radius + 18) {
        const step = ENEMY.speed * delta / 1000;
        enemy.view.x += dx / distance * step;
        enemy.view.y += dy / distance * step;
      }
      const margin = ARENA.inset + ENEMY.radius;
      enemy.view.x = Phaser.Math.Clamp(enemy.view.x + enemy.knockback.x * delta / 1000, margin, ARENA.width - margin);
      enemy.view.y = Phaser.Math.Clamp(enemy.view.y + enemy.knockback.y * delta / 1000, margin, ARENA.height - margin);
      const decay = Math.exp(-delta / 100);
      enemy.knockback.x *= decay;
      enemy.knockback.y *= decay;
    }
  }

  hit(enemy: Enemy, damage: number, direction: Direction): boolean {
    if (enemy.spawning > 0 || enemy.health.dead || !this.enemies.includes(enemy) || !enemy.health.hurt(damage)) return false;
    enemy.bar.scaleX = enemy.health.current / enemy.health.maximum;
    enemy.body.setTintFill(0xffe1b6);
    enemy.flash = 120;
    enemy.knockback.x = direction.x * 240;
    enemy.knockback.y = direction.y * 240;
    // A hit interrupts a pending contact attack, allowing a close-range escape.
    enemy.windup = 0;
    enemy.cooldown = Math.max(enemy.cooldown, 250);
    enemy.warning.setVisible(false);
    if (enemy.health.dead) {
      this.kills++;
      enemy.view.destroy();
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
      // Clearing the arena schedules the next wave even when upgrades are exhausted.
      if (this.enemies.length === 0) this.waveClock.scheduleNext(ENEMY.clearDelay);
      if (this.waves.defeat(enemy.wave)) this.onWaveClear(enemy.wave);
    }
    return true;
  }
}
