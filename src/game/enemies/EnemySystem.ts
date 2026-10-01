import Phaser from 'phaser';
import { ARENA, ENEMY, PLAYER, type Direction } from '../config';
import { Health } from '../combat/Health';
import type { Player } from '../entities/Player';
import { WaveClock } from './WaveClock';
import { WaveTracker } from './WaveTracker';
import { waveDifficulty } from './difficulty';
import { enemyKind, enemySpec, type EnemyKind, type EnemySpec } from './roster';
import { VARIANTS, rollVariant, fragmentSpec, type EnemyVariant } from './variants';
import { segmentCircleHit } from '../combat/collision';
import { SlowStatus } from '../combat/SlowStatus';
import { EnemyShots } from './EnemyShots';
import type { DamageSource } from '../ultimates/UltimateCharge';
import { CombatEffects } from '../effects/CombatEffects';
import { prepareEnemyTextures, enemyTexture, enemyArtScale } from '../art/CharacterTextures';

export interface Enemy {
  id: number;
  wave: number;
  spec: EnemySpec;
  variant: EnemyVariant;
  dashTime: number;
  dashHit: boolean;
  burstRemaining: number;
  burstWait: number;
  blockCooldown: number;
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
  frozen: number;
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

  constructor(private scene: Phaser.Scene, private onWaveClear: (wave: number) => void = () => {}, private onKill: (source: DamageSource) => void = () => {}, private random: () => number = Math.random) { prepareEnemyTextures(scene); this.shots = new EnemyShots(scene); this.effects = new CombatEffects(scene); }

  private spawn(player: Player, wave: number, kind: EnemyKind): boolean {
    if (this.enemies.length >= ENEMY.maxCount) return false;
    const spec = enemySpec(kind, wave);
    const variant = rollVariant(kind, this.random);
    // Rotate through the arena's four edges, retaining a safe distance near walls.
    const firstEdge = this.spawnIndex++ % 4;
    for (let attempt = 0; attempt < 8; attempt++) {
      const margin = ARENA.inset + spec.radius;
      const edge = (firstEdge + attempt) % 4;
      const x = edge === 0 ? ARENA.width - margin : edge === 2 ? margin : margin + this.random() * (ARENA.width - margin * 2);
      const y = edge === 1 ? ARENA.height - margin : edge === 3 ? margin : margin + this.random() * (ARENA.height - margin * 2);
      if (Phaser.Math.Distance.Squared(x, y, player.view.x, player.view.y) < 280 * 280) continue;
      this.createEnemy(x, y, wave, spec, variant);
      return true;
    }
    return false;
  }

  private createEnemy(x: number, y: number, wave: number, spec: EnemySpec, variant: EnemyVariant, warningTime: number = ENEMY.spawnWarning): void {
    const view = this.scene.add.container(x, y).setDepth(9);
    const shadow = this.scene.add.ellipse(0, 12, spec.radius * 2.2, spec.radius * 0.8, 0x000000, 0.3);
    const warning = this.scene.add.circle(0, 0, spec.radius + 8, 0xeea56e, 0.06).setStrokeStyle(2, 0xefb87d, 0.65);
    const body = this.scene.add.image(0, -3, enemyTexture(spec.kind, variant)).setScale(enemyArtScale(spec.kind, spec.radius));
    const aimLine = this.scene.add.rectangle(0, 0, 1, 3, 0xd9a8ff, 0.85).setOrigin(0, 0.5).setVisible(false);
    const background = this.scene.add.rectangle(0, -spec.radius - 18, spec.radius * 2, 5, 0x211d26).setStrokeStyle(1, 0x473843);
    const bar = this.scene.add.rectangle(-spec.radius, -spec.radius - 18, spec.radius * 2, 3, 0xe29a9c).setOrigin(0, 0.5);
    view.add([shadow, warning, aimLine, body, background, bar]).setAlpha(0.45);
    this.enemies.push({ spec, variant, dashTime: 0, dashHit: false, burstRemaining: 0, burstWait: 0, blockCooldown: 0, aim: { x: 0, y: 0 }, aimLine, id: this.nextId++, wave, view, body, bar, warning, health: new Health(spec.health), slow: new SlowStatus(), spawning: warningTime, windup: 0, cooldown: 0, attackTime: 0, frozen: 0, flash: 0, knockback: { x: 0, y: 0 } });
  }

  private attackRange(enemy: Enemy): number { return enemy.variant === 'dasher' ? VARIANTS.dashRange : enemy.spec.range; }
  private attackWindup(enemy: Enemy): number { return enemy.variant === 'dasher' ? VARIANTS.dashWindup : enemy.spec.windup; }

  private split(enemy: Enemy, x: number, y: number): void {
    // Spawn a complete pair or skip at capacity; never exceed the arena cap.
    if (enemy.variant !== 'splitter' || this.enemies.length + 2 > ENEMY.maxCount) return;
    const spec = fragmentSpec(enemy.spec), margin = ARENA.inset + spec.radius;
    for (const side of [-1, 1]) {
      this.createEnemy(Phaser.Math.Clamp(x + side * (spec.radius + 6), margin, ARENA.width - margin),
        Phaser.Math.Clamp(y, margin, ARENA.height - margin), enemy.wave, spec, 'normal', VARIANTS.fragmentWarning);
    }
    this.waves.add(enemy.wave, 2);
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
      if (enemy.frozen > 0) {
        enemy.frozen = Math.max(0, enemy.frozen - delta);
        if (enemy.frozen > 0) { enemy.knockback.x = enemy.knockback.y = 0; enemy.body.setTint(0x80dfff); continue; }
      }
      enemy.flash = Math.max(0, enemy.flash - delta);
      if (enemy.flash === 0) { if(enemy.slow.strength>0) enemy.body.setTint(0x91dafa); else enemy.body.clearTint(); }
      enemy.cooldown = Math.max(0, enemy.cooldown - delta);
      enemy.blockCooldown = Math.max(0, enemy.blockCooldown - delta);
      enemy.attackTime = Math.max(0, enemy.attackTime - delta);
      const dx = player.view.x - enemy.view.x;
      const dy = player.view.y - enemy.view.y;
      const distance = Math.hypot(dx, dy);
      if (enemy.dashTime > 0) {
        const step = VARIANTS.dashSpeed * (1 - enemy.slow.strength) * Math.min(delta, enemy.dashTime) / 1000;
        const margin = ARENA.inset + spec.radius, x = enemy.view.x, y = enemy.view.y;
        const nx = Phaser.Math.Clamp(x + enemy.aim.x * step, margin, ARENA.width - margin);
        const ny = Phaser.Math.Clamp(y + enemy.aim.y * step, margin, ARENA.height - margin);
        if (!enemy.dashHit && segmentCircleHit(x, y, nx, ny, player.view.x, player.view.y, spec.radius + PLAYER.radius) !== null) {
          enemy.dashHit = true;
          player.hurt(spec.damage, x, y);
        }
        enemy.view.setPosition(nx, ny);
        enemy.dashTime = Math.max(0, enemy.dashTime - delta);
        if (player.health.dead) { this.animate(enemy); break; }
      } else if (enemy.burstRemaining > 0) {
        enemy.burstWait = Math.max(0, enemy.burstWait - delta);
        if (enemy.burstWait === 0) {
          this.shots.fire(enemy.view.x, enemy.view.y, enemy.aim, spec.damage);
          this.effects.attack(enemy.view.x, enemy.view.y, enemy.aim, true);
          enemy.burstRemaining--; enemy.burstWait = VARIANTS.volleyInterval; enemy.attackTime = 230;
          if (enemy.burstRemaining === 0) enemy.aimLine.setVisible(false);
        }
      } else if (enemy.windup > 0) {
        enemy.windup = Math.max(0, enemy.windup - delta);
        enemy.warning.setAlpha(0.55 + 0.45 * (1 - enemy.windup / this.attackWindup(enemy)));
        if (enemy.windup === 0) {
          enemy.warning.setVisible(false);
          enemy.cooldown = enemy.variant === 'dasher' ? VARIANTS.dashCooldown : spec.cooldown;
          enemy.attackTime = 230;
          enemy.aimLine.setVisible(false);
          this.effects.attack(enemy.view.x, enemy.view.y, enemy.aim, spec.kind === 'ranged');
          if (spec.kind === 'ranged') {
            this.shots.fire(enemy.view.x, enemy.view.y, enemy.aim, spec.damage);
            if (enemy.variant === 'volley') {
              enemy.burstRemaining = VARIANTS.volleyCount - 1; enemy.burstWait = VARIANTS.volleyInterval;
              enemy.aimLine.setAlpha(0.45).setVisible(true);
              enemy.cooldown += enemy.burstRemaining * VARIANTS.volleyInterval;
            }
          } else if (enemy.variant === 'dasher') {
            enemy.dashTime = VARIANTS.dashDuration; enemy.dashHit = false;
          } else if (distance <= spec.range && player.hurt(spec.damage, enemy.view.x, enemy.view.y)) {
            if (player.health.dead) { this.animate(enemy); break; }
          }
        }
      } else if (distance <= this.attackRange(enemy) && enemy.cooldown === 0) {
        enemy.windup = this.attackWindup(enemy);
        const ranged = spec.kind === 'ranged';
        enemy.aim.x = distance > 0 ? dx / distance : 1;
        enemy.aim.y = distance > 0 ? dy / distance : 0;
        enemy.warning.setRadius(ranged ? spec.radius + 10 : spec.range).setFillStyle(ranged ? 0xc79bf0 : 0xff8058, 0.12).setStrokeStyle(2, ranged ? 0xd9a8ff : 0xffa16b, 0.9).setAlpha(0.55).setVisible(true);
        if (ranged || enemy.variant === 'dasher') enemy.aimLine.setDisplaySize(this.attackRange(enemy), enemy.variant === 'dasher' ? 8 : 3)
          .setFillStyle(enemy.variant === 'dasher' ? 0xffad75 : enemy.variant === 'volley' ? 0xff94d5 : 0xd9a8ff)
          .setRotation(Math.atan2(dy,dx)).setAlpha(1).setVisible(true);
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
    const base = enemyArtScale(spec.kind, spec.radius);
    const charge = enemy.windup > 0 ? 1 - enemy.windup / this.attackWindup(enemy) : 0;
    const strike = enemy.attackTime > 0 ? Math.sin((1 - enemy.attackTime / 230) * Math.PI) : 0;
    const ranged = spec.kind === 'ranged', brute = spec.kind === 'brute';
    const thrust = (ranged ? -6 : brute ? 18 : 12) * strike - charge * 6;
    body.setPosition(aim.x * thrust, -3 + aim.y * thrust - charge * (brute ? 12 : 4));
    body.setScale(base * (1 - charge * 0.12 + strike * 0.12), base * (1 + charge * 0.12 - strike * 0.1));
    body.setRotation((aim.x < 0 ? -1 : 1) * (-charge * 0.16 + strike * (ranged ? -0.16 : 0.22)));
    body.setFlipX(aim.x < 0);
  }

  freeze(enemy: Enemy, duration: number): void {
    if (enemy.spawning > 0 || enemy.health.dead || !this.enemies.includes(enemy)) return;
    enemy.frozen = Math.max(enemy.frozen, Math.min(3000, duration));
    enemy.windup = enemy.attackTime = enemy.dashTime = enemy.burstRemaining = enemy.burstWait = 0;
    enemy.knockback.x = enemy.knockback.y = 0;
    enemy.warning.setVisible(false); enemy.aimLine.setVisible(false);
    this.animate(enemy); enemy.body.setTint(0x80dfff);
  }

  slow(enemy: Enemy, strength:number, duration:number): void {
    if(enemy.spawning===0&&!enemy.health.dead&&this.enemies.includes(enemy)) enemy.slow.apply(strength,duration);
  }

  /** True means contact settled, including a block; callers must not retry the same hit. */
  hit(enemy: Enemy, damage: number, direction: Direction, source: DamageSource = 'spell'): boolean {
    if (enemy.spawning > 0 || enemy.health.dead || !this.enemies.includes(enemy) || damage <= 0) return false;
    if (enemy.variant === 'guardian' && enemy.frozen === 0 && enemy.blockCooldown === 0 && this.random() < VARIANTS.blockChance) {
      enemy.blockCooldown = VARIANTS.blockCooldown;
      enemy.body.setTintFill(0xbcecff); enemy.flash = 180;
      this.effects.block(enemy.view.x, enemy.view.y, enemy.spec.radius);
      // Contact is settled even without damage: consume pierce/splash once, allow ice control.
      return true;
    }
    if (!enemy.health.hurt(damage)) return false;
    this.effects.hit(enemy.view.x, enemy.view.y, direction);
    enemy.bar.scaleX = enemy.health.current / enemy.health.maximum;
    enemy.body.setTintFill(0xffe1b6);
    enemy.flash = 120;
    enemy.knockback.x = direction.x * enemy.spec.knockback;
    enemy.knockback.y = direction.y * enemy.spec.knockback;
    // A hit interrupts a pending contact attack, allowing a close-range escape.
    enemy.windup = enemy.attackTime = enemy.dashTime = enemy.burstRemaining = enemy.burstWait = 0;
    this.animate(enemy);
    enemy.cooldown = Math.max(enemy.cooldown, 250);
    enemy.warning.setVisible(false);
    enemy.aimLine.setVisible(false);
    if (enemy.health.dead) {
      this.kills++;
      this.onKill(source);
      const color = enemy.variant === 'splitter' ? 0x76dac6 : { chaser:0xd39b96, ranged:0xc4a0ec, brute:0xe6ba78, swift:0xc6dc79 }[enemy.spec.kind];
      this.effects.death(enemy.view.x, enemy.view.y, color, enemy.spec.radius);
      const x = enemy.view.x, y = enemy.view.y;
      enemy.view.destroy();
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
      this.split(enemy, x, y);
      // Clearing the arena schedules the next wave even when upgrades are exhausted.
      if (this.enemies.length === 0) { this.waveClock.scheduleNext(ENEMY.clearDelay); this.shots.reset(); this.effects.clear(x, y); }
      if (this.waves.defeat(enemy.wave)) this.onWaveClear(enemy.wave);
    }
    return true;
  }
}
