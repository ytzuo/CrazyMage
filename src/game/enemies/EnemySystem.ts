import Phaser from 'phaser';
import { ARENA, ENEMY, type Direction } from '../config';
import { Health } from '../combat/Health';
import type { Player } from '../entities/Player';
import { WaveClock } from './WaveClock';
import { WaveTracker } from './WaveTracker';
import { waveDifficulty } from './difficulty';
import { enemyKind, enemySpec, type EnemyKind, type EnemySpec } from './roster';
import { SlowStatus } from '../combat/SlowStatus';
import { EnemyShots } from './EnemyShots';
import { CombatEffects } from '../effects/CombatEffects';

export interface Enemy {
  id: number;
  wave: number;
  spec: EnemySpec;
  aim: Direction;
  aimLine: Phaser.GameObjects.Rectangle;
  view: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Rectangle;
  warning: Phaser.GameObjects.Arc;
  health: Health;
  slow: SlowStatus;
  spawning: number;
  windup: number;
  cooldown: number;
  attackTime: number;
  flash: number;
  knockback: Direction;
}

/** Bounded mixed enemies; scene owns cleanup. All timers use active game time. */
export class EnemySystem {
  readonly enemies: Enemy[] = [];
  kills = 0;
  readonly waveClock = new WaveClock(ENEMY.waveInterval);
  readonly waves = new WaveTracker();
  readonly shots: EnemyShots;
  readonly effects: CombatEffects;
  private spawnIndex = 0;
  private nextId = 0;

  constructor(private scene: Phaser.Scene, private onWaveClear: (wave: number) => void = () => {}) { this.prepareTexture(); this.shots = new EnemyShots(scene); this.effects = new CombatEffects(scene); }

  private prepareTexture(): void {
    for (const kind of ['chaser','ranged','brute','swift'] as EnemyKind[]) {
      const key = `enemy-${kind}`;
      if (this.scene.textures.exists(key)) continue;
      const g = this.scene.make.graphics({}, false);
      if (kind === 'chaser') {
        g.fillStyle(0x754c63).fillTriangle(11,18,8,2,24,15).fillTriangle(40,15,56,2,53,20);
        g.fillStyle(0xb77a85).fillRoundedRect(10,14,44,38,14);
        g.fillStyle(0xd39b96).fillEllipse(32,22,34,19);
      } else if (kind === 'swift') {
        g.fillStyle(0x7fa963).fillTriangle(8,48,32,8,56,48);
        g.fillStyle(0xc6dc79).fillTriangle(20,44,32,19,44,44);
        g.lineStyle(3,0xb4c78c).lineBetween(8,52,20,49).lineBetween(44,49,56,52);
      } else if (kind === 'ranged') {
        g.fillStyle(0x8165b5).fillTriangle(10,52,32,8,54,52);
        g.fillStyle(0xc4a0ec).fillCircle(32,23,12);
        g.lineStyle(4,0xd5baff).lineBetween(53,20,53,53);
        g.fillStyle(0xf0d2ff).fillCircle(53,16,5);
      } else {
        g.fillStyle(0x855e39).fillRoundedRect(3,13,58,43,8);
        g.fillStyle(0xc78f53).fillRoundedRect(12,6,40,33,7);
        g.fillStyle(0xe6ba78).fillRect(6,39,12,15).fillRect(46,39,12,15);
        g.fillStyle(0x675140).fillRect(23,46,18,10);
      }
      g.fillStyle(0x2b2430).fillCircle(24,29,4).fillCircle(40,29,4);
      g.fillStyle(0xffe3a0).fillCircle(25,28,2).fillCircle(41,28,2);
      g.generateTexture(key,64,64);g.destroy();
    }
  }

  private spawn(player: Player, wave: number, kind: EnemyKind): boolean {
    if (this.enemies.length >= ENEMY.maxCount) return false;
    const spec = enemySpec(kind, wave);
    // Rotate through the arena's four edges, retaining a safe distance near walls.
    const firstEdge = this.spawnIndex++ % 4;
    for (let attempt = 0; attempt < 8; attempt++) {
      const margin = ARENA.inset + spec.radius;
      const edge = (firstEdge + attempt) % 4;
      const x = edge === 0 ? ARENA.width - margin : edge === 2 ? margin : Phaser.Math.Between(margin, ARENA.width - margin);
      const y = edge === 1 ? ARENA.height - margin : edge === 3 ? margin : Phaser.Math.Between(margin, ARENA.height - margin);
      if (Phaser.Math.Distance.Squared(x, y, player.view.x, player.view.y) < 280 * 280) continue;
      const view = this.scene.add.container(x, y).setDepth(9);
      const shadow = this.scene.add.ellipse(0, 12, spec.radius * 2.2, spec.radius * 0.8, 0x000000, 0.3);
      const warning = this.scene.add.circle(0, 0, spec.radius + 8, 0xeea56e, 0.06).setStrokeStyle(2, 0xefb87d, 0.65);
      const body = this.scene.add.image(0, -3, `enemy-${kind}`).setScale(spec.radius / (kind === 'brute' ? 29 : 20));
      const aimLine = this.scene.add.rectangle(0, 0, 1, 3, 0xd9a8ff, 0.85).setOrigin(0, 0.5).setVisible(false);
      const background = this.scene.add.rectangle(0, -spec.radius - 18, spec.radius * 2, 5, 0x211d26).setStrokeStyle(1, 0x473843);
      const bar = this.scene.add.rectangle(-spec.radius, -spec.radius - 18, spec.radius * 2, 3, 0xe29a9c).setOrigin(0, 0.5);
      view.add([shadow, warning, aimLine, body, background, bar]).setAlpha(0.45);
      this.enemies.push({ spec, aim: { x: 0, y: 0 }, aimLine, id: this.nextId++, wave, view, body, bar, warning, health: new Health(spec.health), slow: new SlowStatus(), spawning: ENEMY.spawnWarning, windup: 0, cooldown: 0, attackTime: 0, flash: 0, knockback: { x: 0, y: 0 } });
      return true;
    }
    return false;
  }

  reset(player?: Player): void {
    for (const enemy of this.enemies) enemy.view.destroy();
    this.enemies.length = 0;
    this.shots.reset();
    this.effects.reset();
    this.kills = this.spawnIndex = this.nextId = 0;
    this.waveClock.reset();
    this.waves.reset();
    if (player) this.spawnWave(player);
  }

  private spawnWave(player: Player, wave = this.waveClock.wave): void {
    let spawned = 0;
    for (let i = 0; i < waveDifficulty(wave).count && this.enemies.length < ENEMY.maxCount; i++) if (this.spawn(player, wave, enemyKind(wave, i))) spawned++;
    this.waves.register(wave, spawned);
  }

  update(delta: number, player: Player): void {
    this.effects.update(delta);
    const waves = this.waveClock.update(delta);
    for (let i = 0; i < waves; i++) this.spawnWave(player, this.waveClock.wave - waves + i + 1);
    for (const enemy of this.enemies) {
      const spec = enemy.spec;
      if (enemy.health.dead) continue;
      if (enemy.spawning > 0) {
        enemy.spawning = Math.max(0, enemy.spawning - delta);
        enemy.view.setAlpha(enemy.spawning > 0 ? 0.45 : 1);
        if (enemy.spawning === 0) enemy.warning.setVisible(false);
        continue;
      }
      enemy.slow.update(delta);
      enemy.flash = Math.max(0, enemy.flash - delta);
      if (enemy.flash === 0) { if(enemy.slow.strength>0) enemy.body.setTint(0x91dafa); else enemy.body.clearTint(); }
      enemy.cooldown = Math.max(0, enemy.cooldown - delta);
      enemy.attackTime = Math.max(0, enemy.attackTime - delta);
      const dx = player.view.x - enemy.view.x;
      const dy = player.view.y - enemy.view.y;
      const distance = Math.hypot(dx, dy);
      if (enemy.windup > 0) {
        enemy.windup = Math.max(0, enemy.windup - delta);
        enemy.warning.setAlpha(0.55 + 0.45 * (1 - enemy.windup / spec.windup));
        if (enemy.windup === 0) {
          enemy.warning.setVisible(false);
          enemy.cooldown = spec.cooldown;
          enemy.attackTime = 230;
          enemy.aimLine.setVisible(false);
          this.effects.attack(enemy.view.x, enemy.view.y, enemy.aim, spec.kind === 'ranged');
          if (spec.kind === 'ranged') {
            this.shots.fire(enemy.view.x, enemy.view.y, enemy.aim, spec.damage);
          } else if (distance <= spec.range && player.hurt(spec.damage, enemy.view.x, enemy.view.y)) {
            if (player.health.dead) { this.animate(enemy); break; }
          }
        }
      } else if (distance <= spec.range && enemy.cooldown === 0) {
        enemy.windup = spec.windup;
        const ranged = spec.kind === 'ranged';
        enemy.aim.x = distance > 0 ? dx / distance : 1;
        enemy.aim.y = distance > 0 ? dy / distance : 0;
        enemy.warning.setRadius(ranged ? spec.radius + 10 : spec.range).setFillStyle(ranged ? 0xc79bf0 : 0xff8058, 0.12).setStrokeStyle(2, ranged ? 0xd9a8ff : 0xffa16b, 0.9).setAlpha(0.55).setVisible(true);
        if (ranged) enemy.aimLine.setDisplaySize(spec.range,3).setRotation(Math.atan2(dy,dx)).setVisible(true);
      } else if (distance > 0) {
        const movement = spec.kind === 'ranged' ? (distance < 180 ? -1 : distance > 320 ? 1 : 0) : Number(distance > spec.radius + 18);
        const step = spec.speed * (1 - enemy.slow.strength) * delta / 1000 * movement;
        enemy.view.x += dx / distance * step;
        enemy.view.y += dy / distance * step;
      }
      const margin = ARENA.inset + spec.radius;
      enemy.view.x = Phaser.Math.Clamp(enemy.view.x + enemy.knockback.x * delta / 1000, margin, ARENA.width - margin);
      enemy.view.y = Phaser.Math.Clamp(enemy.view.y + enemy.knockback.y * delta / 1000, margin, ARENA.height - margin);
      const decay = Math.exp(-delta / 100);
      enemy.knockback.x *= decay;
      enemy.knockback.y *= decay;
      this.animate(enemy);
    }
    if (!player.health.dead) this.shots.update(delta, player);
  }

  /** Pose only moves the sprite inside its container; collision and warning stay fixed. */
  private animate(enemy: Enemy): void {
    const {spec, body, aim} = enemy;
    const base = spec.radius / (spec.kind === 'brute' ? 29 : 20);
    const charge = enemy.windup > 0 ? 1 - enemy.windup / spec.windup : 0;
    const strike = enemy.attackTime > 0 ? Math.sin((1 - enemy.attackTime / 230) * Math.PI) : 0;
    const ranged = spec.kind === 'ranged', brute = spec.kind === 'brute';
    const thrust = (ranged ? -6 : brute ? 18 : 12) * strike - charge * 6;
    body.setPosition(aim.x * thrust, -3 + aim.y * thrust - charge * (brute ? 12 : 4));
    body.setScale(base * (1 - charge * 0.12 + strike * 0.12), base * (1 + charge * 0.12 - strike * 0.1));
    body.setRotation((aim.x < 0 ? -1 : 1) * (-charge * 0.16 + strike * (ranged ? -0.16 : 0.22)));
    body.setFlipX(aim.x < 0);
  }

  slow(enemy: Enemy, strength:number, duration:number): void {
    if(enemy.spawning===0&&!enemy.health.dead&&this.enemies.includes(enemy)) enemy.slow.apply(strength,duration);
  }

  hit(enemy: Enemy, damage: number, direction: Direction): boolean {
    if (enemy.spawning > 0 || enemy.health.dead || !this.enemies.includes(enemy) || !enemy.health.hurt(damage)) return false;
    this.effects.hit(enemy.view.x, enemy.view.y, direction);
    enemy.bar.scaleX = enemy.health.current / enemy.health.maximum;
    enemy.body.setTintFill(0xffe1b6);
    enemy.flash = 120;
    enemy.knockback.x = direction.x * enemy.spec.knockback;
    enemy.knockback.y = direction.y * enemy.spec.knockback;
    // A hit interrupts a pending contact attack, allowing a close-range escape.
    enemy.windup = enemy.attackTime = 0;
    this.animate(enemy);
    enemy.cooldown = Math.max(enemy.cooldown, 250);
    enemy.warning.setVisible(false);
    enemy.aimLine.setVisible(false);
    if (enemy.health.dead) {
      this.kills++;
      const color = { chaser:0xd39b96, ranged:0xc4a0ec, brute:0xe6ba78, swift:0xc6dc79 }[enemy.spec.kind];
      this.effects.death(enemy.view.x, enemy.view.y, color, enemy.spec.radius);
      enemy.view.destroy();
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
      // Clearing the arena schedules the next wave even when upgrades are exhausted.
      if (this.enemies.length === 0) { this.waveClock.scheduleNext(ENEMY.clearDelay); this.shots.reset(); this.effects.clear(enemy.view.x, enemy.view.y); }
      if (this.waves.defeat(enemy.wave)) this.onWaveClear(enemy.wave);
    }
    return true;
  }
}
