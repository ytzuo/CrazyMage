import { GameAudio, attachAudio, detachAudio } from '../audio/GameAudio';
import { soundUrls, themeUrl, battleMusicUrl } from '../audio/assets';
import { isBoss } from '../enemies/roster';
import { RACE_WAVES, type GameMode } from '../modes';
import Phaser from 'phaser';
import { ARENA, FIREBALL, PLAYER, START_COUNTDOWN_MS, stepStartCountdown, type Direction, type MovementState } from '../config';
import { Player } from '../entities/Player';
import type { MovementInput } from '../input/MovementInput';
import { SpellRunner } from '../spells/SpellRunner';
import { SCHOOLS, isSchool, type School } from '../upgrades/definitions';
import { EnemySystem } from '../enemies/EnemySystem';
import { AimIndicator } from '../ui/AimIndicator';
import { SchoolSkill } from '../spells/SchoolSkill';
import { UltimateSpell } from '../ultimates/UltimateSpell';
import { mageBodyTexture, mageStaffTexture, type SchoolArtwork, type CharacterGender } from '../art/CharacterTextures';
import { BuildStore } from '../upgrades/BuildStore';

export class ArenaScene extends Phaser.Scene {
  audio!: GameAudio;
  private previewArt: Partial<Record<CharacterGender, SchoolArtwork>> = {};
  private player!: Player;
  private spell!: SpellRunner;
  private ultimate!: UltimateSpell;
  private skill!: SchoolSkill;
  private aimIndicator!: AimIndicator;
  private selectingSchool = true;
  private countdownMs = 0;
  private paused = false;
  private won = false;
  private mode: GameMode = 'race';
  private hudElapsed = 0;
  private enemies!: EnemySystem;
  private builds = new BuildStore();

  constructor(private movement: MovementInput, private onState: (state: MovementState) => void) {
    super('arena');
  }

  create(): void {
    this.audio = new GameAudio(soundUrls, themeUrl, battleMusicUrl);
    this.audio.setHomeMusic(true);
    attachAudio(this, this.audio);
    const disposeAudio = () => {
      detachAudio(this);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, disposeAudio);
      this.events.off(Phaser.Scenes.Events.DESTROY, disposeAudio);
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, disposeAudio);
    this.events.once(Phaser.Scenes.Events.DESTROY, disposeAudio);
    this.drawArena();
    this.selectingSchool = true;
    this.won = false;
    this.builds.reset();
    this.player = new Player(this);
    this.spell = new SpellRunner(this, this.builds.effectiveBuild);
    this.spell.reset(this.builds.snapshot.build.runId);
    this.ultimate = new UltimateSpell(this,this.spell.accumulateLightning);
    this.skill = new SchoolSkill(this,this.spell.accumulateLightning);
    this.enemies = new EnemySystem(this, (wave, bossDefeated) => {
      this.player.health.heal(PLAYER.waveHealing);
      if(this.mode==='race' && this.enemies.waves.cleared===RACE_WAVES) {
        this.audio.play('victory', { combat: false, priority: 3 });
        this.won=true; this.movement.setEnabled(false);
      } else { this.audio.play('wave_clear', { combat: false, priority: 3 }); this.builds.completeWave(wave, bossDefeated); }
    }, (source, boss) => { const ready = this.ultimate.charge.ready; if (boss) this.ultimate.charge.fill(); else this.ultimate.charge.onKill(source); if (!ready && this.ultimate.charge.ready) this.audio.play('skill_ready', { priority: 2, volume: 0.4 }); },undefined,(id,x,y,source)=>this.spell.enemyDefeated(id,x,y,this.enemies,source));
    this.enemies.reset();
    this.aimIndicator = new AimIndicator(this);
    this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height);
    this.cameras.main.startFollow(this.player.view, true, 0.12, 0.12);
    this.centerCamera();
    this.scale.on('resize', this.centerCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.centerCamera, this);
      this.spell.reset();
      this.ultimate.reset();
      this.skill.reset();
      this.enemies.reset();
      this.aimIndicator.destroy();
    });
    this.movement.setEnabled(false);
    this.publish();
  }

  private centerCamera(): void {
    if (this.player) {
      const width = this.scale.width;
      const height = this.scale.height;
      if (this.cameras.main.width !== width || this.cameras.main.height !== height) {
        this.cameras.main.setViewport(0, 0, width, height);
      }
      // A viewport larger than the world still fills the screen without revealing empty space.
      this.cameras.main.setZoom(Math.max(1, width / ARENA.width, height / ARENA.height));
      this.cameras.main.centerOn(this.player.view.x, this.player.view.y);
    }
  }

  private drawArena(): void {
    const floorKey = 'arena-floor';
    if (!this.textures.exists(floorKey)) {
      // The five-tile pattern repeats on both axes. Bake 25 tiles once rather than
      // rebuilding and triangulating all 690 floor tiles on every render.
      const size = ARENA.tile * 5;
      const tile = this.make.graphics({}, false);
      tile.fillStyle(0x17251f).fillRect(0, 0, size, size);
      for (let row = 0; row < 5; row++) {
        for (let column = 0; column < 5; column++) {
          const x = column * ARENA.tile;
          const y = row * ARENA.tile;
          const variant = (column * 13 + row * 7) % 5;
          tile.fillStyle([0x1e2d25, 0x202f27, 0x233229, 0x1c2b24, 0x213027][variant]);
          tile.fillRoundedRect(x + 2, y + 2, ARENA.tile - 4, ARENA.tile - 4, 4);
          tile.lineStyle(1, 0x617360, 0.055).strokeRoundedRect(x + 4, y + 4, ARENA.tile - 8, ARENA.tile - 8, 3);
          if (variant === 2) {
            tile.lineStyle(1, 0x0c1a14, 0.35).beginPath().moveTo(x + 49, y + 3).lineTo(x + 42, y + 19).lineTo(x + 48, y + 30).strokePath();
          }
        }
      }
      tile.generateTexture(floorKey, size, size);
      tile.destroy();
    }
    this.add.tileSprite(0, 0, ARENA.width, ARENA.height, floorKey).setOrigin(0);
    const centerX = ARENA.width / 2;
    const centerY = ARENA.height / 2;
    const sigilKey = 'arena-sigil';
    if (!this.textures.exists(sigilKey)) {
      const sigil = this.make.graphics({}, false);
      sigil.lineStyle(2, 0x7e9a71, 0.12).strokeCircle(192, 192, 160).strokeCircle(192, 192, 144);
      sigil.lineStyle(1, 0xaac08b, 0.08).strokeCircle(192, 192, 108);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const x = 192 + Math.cos(angle) * 151;
        const y = 192 + Math.sin(angle) * 151;
        sigil.lineStyle(2, 0xaac08b, 0.2).lineBetween(x - 4, y - 4, x + 4, y + 4).lineBetween(x + 4, y - 4, x - 4, y + 4);
      }
      sigil.lineStyle(1, 0x8fad82, 0.08).strokeRect(192 - 74, 192 - 74, 148, 148);
      sigil.generateTexture(sigilKey, 384, 384);
      sigil.destroy();
    }
    this.add.image(centerX, centerY, sigilKey);
    const ground = this.add.graphics();
    ground.fillStyle(0x0d1813, 0.7).fillRect(0, 0, ARENA.width, ARENA.inset).fillRect(0, ARENA.height - ARENA.inset, ARENA.width, ARENA.inset).fillRect(0, 0, ARENA.inset, ARENA.height).fillRect(ARENA.width - ARENA.inset, 0, ARENA.inset, ARENA.height);
    ground.lineStyle(3, 0x79916c, 0.45).strokeRect(ARENA.inset, ARENA.inset, ARENA.width - ARENA.inset * 2, ARENA.height - ARENA.inset * 2);
    const markers = [
      { x: centerX - 350, y: centerY - 250, color: 0x8ab5a1 },
      { x: centerX + 350, y: centerY - 250, color: 0xcab184 },
      { x: centerX - 350, y: centerY + 250, color: 0x9a9dc0 },
      { x: centerX + 350, y: centerY + 250, color: 0x8ab5a1 },
      { x: 160, y: 160, color: 0xcab184 },
      { x: ARENA.width - 160, y: ARENA.height - 160, color: 0x9a9dc0 },
    ];
    for (const { x, y, color } of markers) {
      const key = `arena-crystal-${color}`;
      if (!this.textures.exists(key)) {
        const decoration = this.make.graphics({}, false);
        decoration.fillStyle(0x000000, 0.2).fillEllipse(43, 71, 56, 24);
        decoration.fillStyle(0x354439).fillRoundedRect(20, 50, 40, 22, 4);
        decoration.fillStyle(0x53604b).fillRoundedRect(18, 45, 44, 17, 3);
        decoration.fillStyle(color, 0.07).fillCircle(40, 39, 37);
        decoration.fillStyle(color, 0.7).fillTriangle(31, 43, 40, 16, 49, 43);
        decoration.fillStyle(0xe4ead4, 0.55).fillTriangle(40, 16, 42, 43, 49, 43);
        decoration.generateTexture(key, 80, 96);
        decoration.destroy();
      }
      this.add.image(x, y, key).setOrigin(40 / 80, 56 / 96);
    }
  }

  update(_time: number, delta: number): void {
    if (!this.player || this.paused || this.selectingSchool || this.won || this.builds.pendingChoice || this.player.health.dead) return;
    // Prevent a long suspended frame from teleporting the player on resume.
    const step = Math.min(delta, 50);
    if (this.countdownMs > 0) {
      const tick = stepStartCountdown(this.countdownMs, step);
      this.countdownMs = tick.remainingMs;
      this.enemies.effects.update(step);
      if (tick.changed) {
        if (tick.afterSeconds > 0) {
          this.audio.play('ui_select', { combat: false, volume: 0.25, priority: 2, gap: 0.05 });
        } else {
          this.movement.setEnabled(!this.paused && !this.selectingSchool && !this.player.health.dead && !this.won);
          this.audio.play('skill_ready', { combat: false, volume: 0.35, priority: 2, gap: 0.05 });
        }
        this.publish();
      }
      return;
    }
    const attack = this.movement.readAttack() ?? this.touchAim();
    this.player.update(this.movement.read(), step, attack);
    const basicAim = attack ?? this.player.aimDirection;
    this.aimIndicator.update(this.player.view.x, this.player.view.y, this.builds.snapshot.build.school,
      basicAim);
    this.skill.update(step);
    if (this.won || this.builds.pendingChoice) { this.movement.setEnabled(false); this.publish(); return; }
    this.ultimate.update(step,{x:this.player.view.x,y:this.player.view.y});
    if (this.won || this.builds.pendingChoice) { this.movement.setEnabled(false); this.publish(); return; }
    if (this.movement.consumeUltimate()) {
      this.castUltimate();
      if (this.won || this.builds.pendingChoice) return;
    }
    if (this.movement.consumeSkill()) {
      this.castSkill();
      if (this.won || this.builds.pendingChoice) return;
    }
    this.spell.update(step, this.enemies, {x:this.player.view.x,y:this.player.view.y-12});
    if (this.won || this.builds.pendingChoice) { this.movement.setEnabled(false); this.publish(); return; }
    this.enemies.update(step, this.player);
    if(this.won || this.builds.pendingChoice) {this.movement.setEnabled(false);this.publish();return;}
    if (!this.won && !this.player.health.dead) {
      if (attack && this.spell.cast(this.player.view.x, this.player.view.y, attack, this.enemies)) {
        this.audio.cast(this.builds.snapshot.build.school);
        this.player.cast(attack, this.builds.snapshot.build.school);
        this.movement.consumeAttack();
        this.publish();
      }
    } else {
      this.movement.setEnabled(false);
      this.publish();
      return;
    }
    this.hudElapsed += delta;
    if (this.hudElapsed >= 80) {
      this.hudElapsed = 0;
      this.publish();
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.audio?.setPaused(paused);
    this.movement.setEnabled(!paused && !this.selectingSchool && this.countdownMs === 0 && !this.player?.health.dead && !this.won);
    this.publish();
  }

  resetPosition(): void {
    this.audio?.reset();
    this.movement.reset();
    if (!this.player) return;
    this.selectingSchool = true;
    this.countdownMs = 0;
    this.audio.setHomeMusic(true);
    this.won = false;
    this.builds.reset();
    this.applyBuild();
    this.player.reset();
    this.spell.reset(this.builds.snapshot.build.runId);
    this.enemies.reset();
    this.ultimate.reset();
    this.skill.reset();
    this.movement.setEnabled(false);
    this.centerCamera();
    this.publish();
  }

  chooseSchool(school: School, mode: GameMode = 'race', gender: CharacterGender = 'male'): boolean {
    if(!this.selectingSchool || !isSchool(school) || !this.player || this.player.health.dead) return false;
    this.mode=mode; this.won=false;
    this.builds.reset(school,mode);
    this.enemies.mode=mode;
    this.player.setGender(gender);
    this.applyBuild();
    this.spell.reset(this.builds.snapshot.build.runId);
    this.enemies.reset(this.player);
    this.ultimate.reset(school);
    this.skill.reset(school);
    this.selectingSchool = false;
    this.countdownMs = START_COUNTDOWN_MS;
    this.audio.setBattleMusic(true);
    this.audio.play('ui_select', { combat: false, priority: 2 });
    this.enemies.effects.empower(this.player.view.x, this.player.view.y, school);
    this.movement.setEnabled(false);
    this.publish();
    return true;
  }

  private skillAim(): Direction {
    const school = this.builds.snapshot.build.school;
    const input = this.movement.readAttack();
    const fallback = input ?? this.player.aimDirection;
    if (school === 'ice') return input ?? this.touchAim() ?? fallback;
    const automatic = this.movement.touchDevice && !input;
    const spec = this.builds.effectiveBuild.skill;
    const reach = spec.reach + (school === 'fire' ? spec.radius : 0);
    let best = Infinity, result = fallback;
    for (const enemy of this.enemies.enemies) {
      if (enemy.spawning > 0 || enemy.health.dead) continue;
      const dx = enemy.view.x - this.player.view.x, dy = enemy.view.y - this.player.view.y;
      const distance = Math.hypot(dx,dy);
      if (!distance || distance > reach + enemy.spec.radius) continue;
      const alignment = (dx*fallback.x + dy*fallback.y)/distance;
      if (!automatic && alignment < Math.cos(Math.PI/12)) continue;
      const score = automatic ? distance : (1-alignment)*1000 + distance*0.05;
      if (score < best) { best=score; result={x:dx/distance,y:dy/distance}; }
    }
    return result;
  }

  castSkill(): boolean {
    if (!this.player || this.paused || this.selectingSchool || this.countdownMs > 0 || this.won || this.player.health.dead || this.builds.pendingChoice) return false;
    const aim = this.skillAim();
    if (!this.skill.cast(this.player.view.x, this.player.view.y, aim, this.enemies)) return false;
    this.player.cast(aim, this.builds.snapshot.build.school);
    if (this.won || this.builds.pendingChoice) this.movement.setEnabled(false);
    this.publish();
    return true;
  }

  castUltimate(): boolean {
    if (!this.player || this.paused || this.selectingSchool || this.countdownMs > 0 || this.won || this.player.health.dead || this.builds.pendingChoice) return false;
    const aim=this.movement.readAttack() ?? this.touchAim() ?? this.player.aimDirection;
    if (!this.ultimate.cast(this.player.view.x, this.player.view.y, this.enemies, aim)) return false;
    this.player.cast(aim, this.builds.snapshot.build.school);
    if (this.won || this.builds.pendingChoice) this.movement.setEnabled(false);
    this.publish();
    return true;
  }

  schoolArtwork(gender: CharacterGender = 'male'): SchoolArtwork | null {
    if (!this.player) return null;
    return this.previewArt[gender] ??= Object.fromEntries(SCHOOLS.map(school => [school, {
      body: this.textures.getBase64(mageBodyTexture(school,gender)),
      staff: this.textures.getBase64(mageStaffTexture(school)),
    }])) as SchoolArtwork;
  }

  previewUpgrade(id: string) { return this.builds.preview(id); }

  chooseUpgrade(batchId: string, id: string): boolean {
    if (!this.paused || this.won || this.player.health.dead) return false;
    if (!this.builds.choose(batchId, id, this.enemies.waveClock.elapsedTime)) return false;
    this.audio.play('upgrade_accept', { combat: false, priority: 3 });
    this.applyBuild();
    this.enemies.effects.empower(this.player.view.x, this.player.view.y, this.builds.snapshot.build.school);
    this.publish();
    return true;
  }

  private applyBuild(): void {
    const effective = this.builds.effectiveBuild;
    this.player.setSchool(effective.school);
    this.player.speed = effective.player.speed;
    this.player.health.configure(effective.player.maximum, effective.player.shield);
    this.spell.configure(effective);
    this.skill.configure(effective.skill);
    this.ultimate.configure(effective.ultimate);
  }

  private touchAim(): Direction | null {
    if (!this.movement.touchDevice) return null;
    const effective = this.builds.effectiveBuild;
    let closest = effective.school === 'ice' ? (effective.ice.reach ?? 560) : effective.school === 'lightning' ? effective.lightning.range : FIREBALL.speed * FIREBALL.lifetime / 1000;
    let aim: Direction | null = null;
    for (const enemy of this.enemies.enemies) {
      if (enemy.spawning > 0 || enemy.health.dead) continue;
      const x = enemy.view.x - this.player.view.x;
      const y = enemy.view.y - (this.player.view.y - (effective.school === 'fire' ? 12 : 0));
      const distance = Math.hypot(x, y);
      if(effective.school === 'ice' && distance > (effective.ice.reach ?? 560) + enemy.spec.radius) continue;
      if (distance > 0 && distance < closest) { closest = distance; aim = { x: x / distance, y: y / distance }; }
    }
    return aim;
  }

  private publish(): void {
    if (!this.player) return;
    const countdown = Math.ceil(this.countdownMs / 1000);
    if (this.paused || this.selectingSchool || countdown > 0 || this.won || this.builds.pendingChoice || this.player.health.dead) this.aimIndicator?.hide();
    this.onState({ mode:this.mode, won:this.won, clearedWaves:this.enemies.waves.cleared, countdown, skillEnergy: this.skill.energy, skillRemaining: this.skill.remainingMs, ultimateEnergy: this.ultimate.charge.energy, ultimateKills:this.ultimate.charge.kills, ultimateKillsRequired:this.ultimate.charge.requiredKills, ultimateCasts: this.ultimate.casts, ultimateEffects: this.ultimate.effectCount, selectingSchool: this.selectingSchool, x: this.player.view.x, y: this.player.view.y, moving: this.player.moving && !this.paused && countdown === 0, paused: this.paused, distance: this.player.distance, attacking: !this.paused && countdown === 0 && this.movement.readAttack() !== null, casts: this.spell.casts, health: this.player.health.current, maxHealth: this.player.health.maximum, shield: this.player.health.shield, waveRemaining: this.enemies.waves.remaining(this.enemies.waveClock.wave), progression: this.builds.snapshot, dead: this.player.health.dead, enemies: this.enemies.enemies.length, kills: this.enemies.kills, objects: this.children.list.length, projectiles: this.spell.projectileCount, impacts: this.spell.impactCount+this.enemies.fireFieldCount, enemyPositions: this.enemies.enemies.map(enemy => ({ id: enemy.id, x: enemy.view.x, y: enemy.view.y, boss: isBoss(enemy.spec.kind) })), wave: this.enemies.waveClock.wave, nextWaveIn: this.enemies.waveClock.remaining, elapsedTime: this.enemies.waveClock.elapsedTime });
  }
}
