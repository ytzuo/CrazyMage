import type { BurnSpec } from '../combat/BurnSpec';
import { RACE_WAVES, type GameMode } from '../modes';
import Phaser from 'phaser';
import { ARENA, ENEMY, PLAYER, type Direction } from '../config';
import { Health } from '../combat/Health';
import type { Player } from '../entities/Player';
import { prepareEnemyAttackTextures } from '../art/EnemyAttackTextures';
import { AreaAttacks } from './AreaAttacks';
import { BossCombat } from './BossCombat';
import { WaveClock } from './WaveClock';
import { WaveTracker } from './WaveTracker';
import { enemyCapacity, waveDifficulty } from './difficulty';
import { enemyKind, enemySpec, type EnemyKind, type EnemySpec } from './roster';
import { VARIANTS, rollVariant, fragmentSpec, type EnemyVariant } from './variants';
import { prepareIcePrisonTexture, prepareFireTextures } from '../art/SpellTextures';
import { segmentCircleHit } from '../combat/collision';
import { SlowStatus } from '../combat/SlowStatus';
import { EnemyShots } from './EnemyShots';
import type { DamageSource } from '../ultimates/UltimateCharge';
import { CombatEffects } from '../effects/CombatEffects';
import { prepareEnemyTextures, enemyTexture, enemyArtScale } from '../art/CharacterTextures';

interface Burning { spec:BurnSpec; remaining:number; wait:number; spread:boolean; view:Phaser.GameObjects.Image }
export interface Enemy {
  burn: Burning | null;
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
  aimLine: Phaser.GameObjects.Image;
  view: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Rectangle;
  warning: Phaser.GameObjects.Image;
  health: Health;
  slow: SlowStatus;
  spawning: number;
  windup: number;
  cooldown: number;
  attackTime: number;
  frozen: number;
  icePrison: Phaser.GameObjects.Image | null;
  flash: number;
  knockback: Direction;
}

/** Bounded mixed enemies; scene owns cleanup. All timers use active game time. */
export class EnemySystem {
  readonly enemies: Enemy[] = [];
  kills = 0;
  readonly waveClock = new WaveClock(ENEMY.waveInterval, wave => wave % 5 === 0 ? ENEMY.bossWaveInterval : ENEMY.waveInterval);
  readonly waves = new WaveTracker();
  readonly shots: EnemyShots;
  readonly effects: CombatEffects;
  private bosses: BossCombat;
  private areaAttacks: AreaAttacks;
  private bossWaves = new Set<number>();
  mode: GameMode = 'race';
  get capacity(): number { return enemyCapacity(this.waveClock.wave); }
  private pendingSpawns: {wave:number; index:number; remaining:number} | null = null;
  private spawnIndex = 0;
  private nextId = 0;
  private clearedDuringUpdate = false;

  constructor(private scene: Phaser.Scene, private onWaveClear: (wave: number, bossDefeated: boolean) => void = () => {}, private onKill: (source: DamageSource, boss: boolean) => void = () => {}, private random: () => number = Math.random) { prepareEnemyTextures(scene); prepareFireTextures(scene); prepareIcePrisonTexture(scene); prepareEnemyAttackTextures(scene); this.bosses = new BossCombat(scene); this.areaAttacks = new AreaAttacks(scene); this.shots = new EnemyShots(scene); this.effects = new CombatEffects(scene); }

  private spawn(player: Player, wave: number, kind: EnemyKind): boolean {
    if (this.enemies.length >= this.capacity - Number(kind !== 'boss')) return false;
    const spec = enemySpec(kind, wave, this.mode);
    const variant = kind === 'boss' || kind === 'artillery' ? 'normal' : rollVariant(kind, this.random, wave);
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
    const warning = this.scene.add.image(0, 0, 'enemy-range-melee').setDisplaySize((spec.radius + 8) * 2, (spec.radius + 8) * 2);
    const body = this.scene.add.image(0, -3, enemyTexture(spec.kind, variant)).setScale(enemyArtScale(spec.kind, spec.radius));
    const aimLine = this.scene.add.image(0, 0, 'enemy-aim-detail').setTint(0xd9a8ff).setOrigin(0, 0.5).setVisible(false);
    const background = this.scene.add.rectangle(0, -spec.radius - 18, spec.radius * 2, 5, 0x211d26).setStrokeStyle(1, 0x473843);
    const bar = this.scene.add.rectangle(-spec.radius, -spec.radius - 18, spec.radius * 2, 3, 0xe29a9c).setOrigin(0, 0.5);
    view.add([shadow, warning, aimLine, body, background, bar]).setAlpha(0.45);
    if (spec.kind === 'boss') {
      bar.setFillStyle(0xffb36f);
      view.add(this.scene.add.image(0, -spec.radius - 42, 'boss-skull-mark').setDisplaySize(28, 28));
    }
    this.enemies.push({ burn:null, spec, variant, dashTime: 0, dashHit: false, burstRemaining: 0, burstWait: 0, blockCooldown: 0, aim: { x: 0, y: 0 }, aimLine, id: this.nextId++, wave, view, body, bar, warning, health: new Health(spec.health), slow: new SlowStatus(), spawning: warningTime, windup: 0, cooldown: 0, attackTime: 0, frozen: 0, icePrison: null, flash: 0, knockback: { x: 0, y: 0 } });
  }

  private attackRange(enemy: Enemy): number { return enemy.variant === 'dasher' ? VARIANTS.dashRange : enemy.spec.range; }
  private attackWindup(enemy: Enemy): number { return enemy.variant === 'dasher' ? VARIANTS.dashWindup : enemy.spec.windup; }

  private split(enemy: Enemy, x: number, y: number): void {
    // Spawn a complete pair or skip at capacity; never exceed the arena cap.
    if (enemy.variant !== 'splitter' || this.enemies.length + 2 > this.capacity) return;
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
    this.bosses.reset(); this.areaAttacks.reset(); this.bossWaves.clear();
    this.effects.reset();
    this.kills = this.spawnIndex = this.nextId = 0;
    this.pendingSpawns = null;
    this.waveClock.reset();
    this.waves.reset();
    if (player) this.spawnWave(player);
  }

  private spawnWave(player: Player, wave = this.waveClock.wave): void {
    const boss = wave % 5 === 0 && this.spawn(player, wave, 'boss');
    if(boss) this.bossWaves.add(wave);
    const count = waveDifficulty(wave,this.mode).count;
    // Register the whole wave before replenishing; its final reserved spawn must also die.
    this.waves.register(wave, count + Number(boss));
    this.pendingSpawns = {wave,index:0,remaining:count};
    this.replenish(player);
  }

  private replenish(player: Player): void {
    const pending=this.pendingSpawns;
    if(!pending) return;
    let budget = 8;
    while(pending.remaining > 0 && this.enemies.length < this.capacity-1 && budget-- > 0) {
      if(!this.spawn(player,pending.wave,enemyKind(pending.wave,pending.index))) break;
      pending.index++; pending.remaining--;
    }
    if(pending.remaining===0) this.pendingSpawns=null;
  }

  update(delta: number, player: Player): void {
    this.effects.update(delta);
    this.clearedDuringUpdate=false;
    this.updateBurns(delta);
    if(this.clearedDuringUpdate) return;
    this.replenish(player);
    const canAdvance = !this.pendingSpawns && this.enemies.length < enemyCapacity(this.waveClock.wave+1)-1 && (this.mode==='endless' || this.waveClock.wave<RACE_WAVES);
    // One advance per update prevents a large delta from replacing a pending batch.
    const waves = this.waveClock.update(delta, canAdvance);
    for (let i = 0; i < waves; i++) this.spawnWave(player, this.waveClock.wave - waves + i + 1);
    this.areaAttacks.update(delta, player);
    if (player.health.dead) return;
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
        if (enemy.frozen === 0) { enemy.icePrison?.destroy(); enemy.icePrison = null; }
        if (enemy.frozen > 0) { enemy.icePrison?.setAlpha(Math.min(1,enemy.frozen/250)); enemy.knockback.x = enemy.knockback.y = 0; enemy.body.setTint(0x80dfff); continue; }
      }
      enemy.flash = Math.max(0, enemy.flash - delta);
      if (enemy.flash === 0) { if(enemy.slow.strength>0) enemy.body.setTint(0x91dafa); else enemy.body.clearTint(); }
      enemy.cooldown = Math.max(0, enemy.cooldown - delta);
      enemy.blockCooldown = Math.max(0, enemy.blockCooldown - delta);
      enemy.attackTime = Math.max(0, enemy.attackTime - delta);
      const dx = player.view.x - enemy.view.x;
      const dy = player.view.y - enemy.view.y;
      const distance = Math.hypot(dx, dy);
      if (spec.kind === 'boss') {
        this.bosses.update(enemy, delta, player);
        const margin = ARENA.inset + spec.radius;
        enemy.view.x = Phaser.Math.Clamp(enemy.view.x, margin, ARENA.width - margin);
        enemy.view.y = Phaser.Math.Clamp(enemy.view.y, margin, ARENA.height - margin);
        this.animate(enemy);
        if (player.health.dead) break;
        continue;
      }
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
          this.effects.attack(enemy.view.x, enemy.view.y, enemy.aim, spec.kind === 'ranged' || spec.kind === 'artillery');
          if (spec.kind === 'artillery') {
            // Its locked ground zone resolves in AreaAttacks, never fire a projectile.
          } else if (spec.kind === 'ranged') {
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
        if (spec.kind === 'artillery' && !this.areaAttacks.begin(enemy.id, player.view.x, player.view.y, spec.damage, spec.windup)) continue;
        enemy.windup = this.attackWindup(enemy);
        const ranged = spec.kind === 'ranged' || spec.kind === 'artillery';
        enemy.aim.x = distance > 0 ? dx / distance : 1;
        enemy.aim.y = distance > 0 ? dy / distance : 0;
        const warningRadius = ranged ? spec.radius + 10 : spec.range;
        enemy.warning.setTexture(ranged ? 'enemy-range-ranged' : 'enemy-range-melee').setDisplaySize(warningRadius * 2, warningRadius * 2).setAlpha(0.55).setVisible(true);
        if (spec.kind === 'ranged' || enemy.variant === 'dasher') enemy.aimLine.setDisplaySize(this.attackRange(enemy), enemy.variant === 'dasher' ? 24 : 12)
          .setTint(enemy.variant === 'dasher' ? 0xffad75 : enemy.variant === 'volley' ? 0xff94d5 : 0xd9a8ff)
          .setRotation(Math.atan2(dy,dx)).setAlpha(1).setVisible(true);
      } else if (distance > 0) {
        const movement = spec.kind === 'ranged' || spec.kind === 'artillery' ? (distance < 180 ? -1 : distance > 320 ? 1 : 0) : Number(distance > spec.radius + 18);
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
    const ranged = spec.kind === 'ranged' || spec.kind === 'artillery', brute = spec.kind === 'brute';
    const thrust = (ranged ? -6 : brute ? 18 : 12) * strike - charge * 6;
    body.setPosition(aim.x * thrust, -3 + aim.y * thrust - charge * (brute ? 12 : 4));
    body.setScale(base * (1 - charge * 0.12 + strike * 0.12), base * (1 + charge * 0.12 - strike * 0.1));
    body.setRotation((aim.x < 0 ? -1 : 1) * (-charge * 0.16 + strike * (ranged ? -0.16 : 0.22)));
    body.setFlipX(aim.x < 0);
  }

  freeze(enemy: Enemy, duration: number): void {
    if (enemy.spawning > 0 || enemy.health.dead || !this.enemies.includes(enemy)) return;
    this.bosses.cancel(enemy.id); this.areaAttacks.cancel(enemy.id);
    enemy.frozen = Math.max(enemy.frozen, Math.min(6000, duration));
    if(!enemy.icePrison){
      enemy.icePrison=this.scene.add.image(0,-4,'ice-prison-detail').setDisplaySize(enemy.spec.radius*2.8,enemy.spec.radius*3.2);
      enemy.view.add(enemy.icePrison);enemy.view.bringToTop(enemy.bar);
    }
    enemy.windup = enemy.attackTime = enemy.dashTime = enemy.burstRemaining = enemy.burstWait = 0;
    enemy.knockback.x = enemy.knockback.y = 0;
    enemy.warning.setVisible(false); enemy.aimLine.setVisible(false);
    this.animate(enemy); enemy.body.setTint(0x80dfff);
  }

  slow(enemy: Enemy, strength:number, duration:number): void {
    if(enemy.spawning===0&&!enemy.health.dead&&this.enemies.includes(enemy)) enemy.slow.apply(strength,duration);
  }

  private ignite(enemy: Enemy, spec: BurnSpec, spread: boolean): void {
    if(enemy.spawning>0 || enemy.health.dead) return;
    if(enemy.burn) {
      if(spec.damage > enemy.burn.spec.damage) enemy.burn.spec=spec;
      enemy.burn.remaining=Math.max(enemy.burn.remaining,spec.duration);
      enemy.burn.spread ||= spread;
      return;
    }
    const view=this.scene.add.image(0,-5,'fireball-detail').setRotation(-Math.PI/2)
      .setDisplaySize(enemy.spec.radius*2.2,enemy.spec.radius*1.25).setAlpha(0.65);
    enemy.view.add(view);
    enemy.burn={spec,remaining:spec.duration,wait:500,spread,view};
  }

  private spreadBurn(enemy: Enemy): void {
    const burn=enemy.burn;
    if(!burn?.spread) return;
    const targets=this.enemies.filter(other=>other!==enemy && other.spawning===0 && !other.health.dead &&
      (other.view.x-enemy.view.x)**2+(other.view.y-enemy.view.y)**2<=burn.spec.radius**2)
      .sort((a,b)=>(a.view.x-enemy.view.x)**2+(a.view.y-enemy.view.y)**2-((b.view.x-enemy.view.x)**2+(b.view.y-enemy.view.y)**2))
      .slice(0,burn.spec.targets);
    const spec=Object.freeze({...burn.spec,damage:burn.spec.damage*0.6});
    for(const other of targets) this.ignite(other,spec,false);
  }

  private updateBurns(delta: number): void {
    for(const enemy of [...this.enemies]) {
      const burn=enemy.burn;
      if(!burn || enemy.health.dead) continue;
      burn.remaining-=delta;burn.wait-=delta;
      burn.view.setAlpha(0.45+0.2*Math.sin(burn.remaining/110));
      if(burn.wait<=0) {
        burn.wait+=500;
        this.hit(enemy,burn.spec.damage,{x:0,y:0},'spell',null,true);
        if(this.clearedDuringUpdate) return;
      }
      if(!enemy.health.dead && burn.remaining<=0) {burn.view.destroy();enemy.burn=null;}
    }
  }

  /** True means contact settled, including a block; callers must not retry the same hit. */
  hit(enemy: Enemy, damage: number, direction: Direction, source: DamageSource = 'spell', burn?: BurnSpec | null, periodic = false): boolean {
    if (enemy.spawning > 0 || enemy.health.dead || !this.enemies.includes(enemy) || damage <= 0) return false;
    if (!periodic && enemy.variant === 'guardian' && enemy.frozen === 0 && enemy.blockCooldown === 0 && this.random() < VARIANTS.blockChance) {
      enemy.blockCooldown = VARIANTS.blockCooldown;
      enemy.body.setTintFill(0xbcecff); enemy.flash = 180;
      this.effects.block(enemy.view.x, enemy.view.y, enemy.spec.radius);
      // Contact is settled even without damage: consume pierce/splash once, allow ice control.
      return true;
    }
    if(burn) this.ignite(enemy,burn,true);
    const shatter=enemy.frozen>0;
    if(shatter)this.effects.shatter(enemy.view.x,enemy.view.y,enemy.spec.radius);
    if (!enemy.health.hurt(shatter?enemy.health.current+enemy.health.shield:damage)) return false;
    if(!periodic) this.effects.hit(enemy.view.x, enemy.view.y, direction);
    enemy.bar.scaleX = enemy.health.current / enemy.health.maximum;
    if(!periodic) {
    enemy.body.setTintFill(0xffe1b6);
    enemy.flash = 120;
    enemy.knockback.x = direction.x * enemy.spec.knockback;
    enemy.knockback.y = direction.y * enemy.spec.knockback;
    this.areaAttacks.cancel(enemy.id);
    // A hit interrupts a pending contact attack, allowing a close-range escape.
    if (enemy.spec.kind !== 'boss') enemy.windup = enemy.attackTime = enemy.dashTime = enemy.burstRemaining = enemy.burstWait = 0;
    this.animate(enemy);
    if (enemy.spec.kind !== 'boss') enemy.cooldown = Math.max(enemy.cooldown, 250);
    enemy.warning.setVisible(false);
    enemy.aimLine.setVisible(false);
    }
    if (enemy.health.dead) {
      this.spreadBurn(enemy);
      this.kills++;
      this.onKill(source, enemy.spec.kind === 'boss');
      this.bosses.cancel(enemy.id); this.areaAttacks.cancel(enemy.id);
      const color = enemy.variant === 'splitter' ? 0x76dac6 : { artillery:0xac91de, boss:0xff9568, chaser:0xd39b96, ranged:0xc4a0ec, brute:0xe6ba78, swift:0xc6dc79 }[enemy.spec.kind];
      this.effects.death(enemy.view.x, enemy.view.y, color, enemy.spec.radius);
      const x = enemy.view.x, y = enemy.view.y;
      enemy.view.destroy();
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
      this.split(enemy, x, y);
      // Clearing the arena schedules the next wave even when upgrades are exhausted.
      if (this.enemies.length === 0) { this.waveClock.scheduleNext(ENEMY.clearDelay); this.shots.reset(); this.areaAttacks.reset(); this.effects.clear(x, y); }
      if (this.waves.defeat(enemy.wave)) {
        const bossDefeated = this.bossWaves.delete(enemy.wave);
        this.clearedDuringUpdate=true;
        this.onWaveClear(enemy.wave, bossDefeated);
      }
    }
    return true;
  }
}
