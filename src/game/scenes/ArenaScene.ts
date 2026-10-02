import Phaser from 'phaser';
import { ARENA, FIREBALL, type Direction, type MovementState } from '../config';
import { Player } from '../entities/Player';
import type { MovementInput } from '../input/MovementInput';
import { SpellRunner } from '../spells/SpellRunner';
import { SCHOOLS, isSchool, type School } from '../upgrades/definitions';
import { EnemySystem } from '../enemies/EnemySystem';
import { UltimateSpell } from '../ultimates/UltimateSpell';
import { mageBodyTexture, mageStaffTexture, type SchoolArtwork } from '../art/CharacterTextures';
import { BuildStore } from '../upgrades/BuildStore';

export class ArenaScene extends Phaser.Scene {
  private previewArt?: SchoolArtwork;
  private player!: Player;
  private spell!: SpellRunner;
  private ultimate!: UltimateSpell;
  private selectingSchool = true;
  private paused = false;
  private hudElapsed = 0;
  private enemies!: EnemySystem;
  private builds = new BuildStore();

  constructor(private movement: MovementInput, private onState: (state: MovementState) => void) {
    super('arena');
  }

  create(): void {
    this.drawArena();
    this.selectingSchool = true;
    this.builds.reset();
    this.player = new Player(this);
    this.spell = new SpellRunner(this, this.builds.effectiveBuild);
    this.spell.reset(this.builds.snapshot.build.runId);
    this.ultimate = new UltimateSpell(this);
    this.enemies = new EnemySystem(this, wave => this.builds.completeWave(wave), (source, boss) => boss ? this.ultimate.charge.fill() : this.ultimate.charge.onKill(source));
    this.enemies.reset();
    this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height);
    this.cameras.main.startFollow(this.player.view, true, 0.12, 0.12);
    this.centerCamera();
    this.scale.on('resize', this.centerCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.centerCamera, this);
      this.spell.reset();
      this.ultimate.reset();
      this.enemies.reset();
    });
    this.movement.setEnabled(false);
    this.publish();
  }

  private centerCamera(): void {
    if (this.player) {
      // A viewport larger than the world still fills the screen without revealing empty space.
      this.cameras.main.setZoom(Math.max(1, this.scale.width / ARENA.width, this.scale.height / ARENA.height));
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
    if (!this.player || this.paused || this.selectingSchool || this.builds.pendingChoice || this.player.health.dead) return;
    // Prevent a long suspended frame from teleporting the player on resume.
    const step = Math.min(delta, 50);
    const attack = this.movement.readAttack() ?? this.touchAim();
    this.player.update(this.movement.read(), step, attack);
    this.ultimate.update(step);
    if (this.builds.pendingChoice) { this.movement.setEnabled(false); this.publish(); return; }
    if (this.movement.consumeUltimate()) {
      this.castUltimate();
      if (this.builds.pendingChoice) return;
    }
    this.spell.update(step, this.enemies);
    if (this.builds.pendingChoice) { this.movement.setEnabled(false); this.publish(); return; }
    this.enemies.update(step, this.player);
    if (!this.player.health.dead) {
      if (attack && this.spell.cast(this.player.view.x, this.player.view.y, attack, this.enemies)) {
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
    this.movement.setEnabled(!paused && !this.selectingSchool && !this.player?.health.dead);
    this.publish();
  }

  resetPosition(): void {
    this.movement.reset();
    if (!this.player) return;
    this.selectingSchool = true;
    this.builds.reset();
    this.applyBuild();
    this.player.reset();
    this.spell.reset(this.builds.snapshot.build.runId);
    this.enemies.reset();
    this.ultimate.reset();
    this.movement.setEnabled(false);
    this.centerCamera();
    this.publish();
  }

  chooseSchool(school: School): boolean {
    if(!this.selectingSchool || !isSchool(school) || !this.player || this.player.health.dead) return false;
    this.builds.reset(school);
    this.applyBuild();
    this.spell.reset(this.builds.snapshot.build.runId);
    this.enemies.reset(this.player);
    this.ultimate.reset(school);
    this.selectingSchool = false;
    this.enemies.effects.empower(this.player.view.x, this.player.view.y, school);
    this.movement.setEnabled(!this.paused);
    this.publish();
    return true;
  }

  castUltimate(): boolean {
    if (!this.player || this.paused || this.selectingSchool || this.player.health.dead || this.builds.pendingChoice) return false;
    const aim=this.movement.readAttack() ?? this.touchAim() ?? this.player.aimDirection;
    if (!this.ultimate.cast(this.player.view.x, this.player.view.y, this.enemies, aim)) return false;
    this.player.cast(aim, this.builds.snapshot.build.school);
    if (this.builds.pendingChoice) this.movement.setEnabled(false);
    this.publish();
    return true;
  }

  schoolArtwork(): SchoolArtwork | null {
    if (!this.player) return null;
    return this.previewArt ??= Object.fromEntries(SCHOOLS.map(school => [school, {
      body: this.textures.getBase64(mageBodyTexture(school)),
      staff: this.textures.getBase64(mageStaffTexture(school)),
    }])) as SchoolArtwork;
  }

  previewUpgrade(id: string) { return this.builds.preview(id); }

  chooseUpgrade(batchId: string, id: string): boolean {
    if (!this.paused || this.player.health.dead) return false;
    if (!this.builds.choose(batchId, id, this.enemies.waveClock.elapsedTime)) return false;
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
    this.ultimate.configure(effective.school, this.builds.snapshot.build.spellLevel);
  }

  private touchAim(): Direction | null {
    if (!this.movement.touchDevice) return null;
    const effective = this.builds.effectiveBuild;
    let closest = effective.school === 'ice' ? effective.ice.radius + 36 : effective.school === 'lightning' ? effective.lightning.range : FIREBALL.speed * FIREBALL.lifetime / 1000;
    let aim: Direction | null = null;
    for (const enemy of this.enemies.enemies) {
      if (enemy.spawning > 0 || enemy.health.dead) continue;
      const x = enemy.view.x - this.player.view.x;
      const y = enemy.view.y - (this.player.view.y - (effective.school === 'fire' ? 12 : 0));
      const distance = Math.hypot(x, y);
      if(effective.school === 'ice' && distance > effective.ice.radius + enemy.spec.radius) continue;
      if (distance > 0 && distance < closest) { closest = distance; aim = { x: x / distance, y: y / distance }; }
    }
    return aim;
  }

  private publish(): void {
    if (!this.player) return;
    this.onState({ ultimateEnergy: this.ultimate.charge.energy, ultimateCasts: this.ultimate.casts, ultimateEffects: this.ultimate.effectCount, selectingSchool: this.selectingSchool, x: this.player.view.x, y: this.player.view.y, moving: this.player.moving && !this.paused, paused: this.paused, distance: this.player.distance, attacking: !this.paused && this.movement.readAttack() !== null, casts: this.spell.casts, health: this.player.health.current, maxHealth: this.player.health.maximum, shield: this.player.health.shield, waveRemaining: this.enemies.waves.remaining(this.enemies.waveClock.wave), progression: this.builds.snapshot, dead: this.player.health.dead, enemies: this.enemies.enemies.length, kills: this.enemies.kills, objects: this.children.list.length, projectiles: this.spell.projectileCount, impacts: this.spell.impactCount, enemyPositions: this.enemies.enemies.map(enemy => ({ id: enemy.id, x: enemy.view.x, y: enemy.view.y })), wave: this.enemies.waveClock.wave, nextWaveIn: this.enemies.waveClock.remaining, elapsedTime: this.enemies.waveClock.elapsedTime });
  }
}
