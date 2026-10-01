import Phaser from 'phaser';
import { ARENA, PLAYER, type Direction } from '../config';
import { Health } from '../combat/Health';
import { SCHOOL_COLOR } from '../effects/CombatEffects';
import type { School } from '../upgrades/definitions';
import { prepareMageTextures } from '../art/CharacterTextures';

export class Player {
  readonly view: Phaser.GameObjects.Container;
  private figure: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Ellipse;
  private aura: Phaser.GameObjects.Arc;
  private wand: Phaser.GameObjects.Container;
  private wandGlow: Phaser.GameObjects.Arc;
  private castTime = 0;
  private castAim = { x: 1, y: 0 };
  get casting(): boolean { return this.castTime > 0; }
  private facing = 1;
  private walkTime = 0;
  distance = 0;
  moving = false;
  readonly health = new Health(PLAYER.health);
  private knockback = { x: 0, y: 0 };
  private flashTime = 0;
  speed: number = PLAYER.speed;

  constructor(scene: Phaser.Scene) {
    this.view = scene.add.container(ARENA.width / 2, ARENA.height / 2).setDepth(10);
    this.aura = scene.add.circle(0, 0, 28, 0x94e3ab, 0.025).setStrokeStyle(1, 0x9be3b4, 0.25);
    this.shadow = scene.add.ellipse(0, 9, 40, 16, 0x000000, 0.35);
    this.figure = scene.add.container(0, -7);
    prepareMageTextures(scene);
    const mage = scene.add.image(0, 0, 'mage-body-detail').setOrigin(0.5, 2 / 3).setScale(0.5);
    this.wand = scene.add.container(12, 3);
    const staff = scene.add.image(0, 0, 'mage-staff-detail').setScale(0.5);
    this.wandGlow = scene.add.circle(6, -23, 9, 0xffd99b, 0.2);
    this.wand.add([this.wandGlow, staff]);
    this.figure.add([mage, this.wand]);
    this.view.add([this.aura, this.shadow, this.figure]);
  }

  update(direction: Direction, delta: number, aim: Direction | null = null): void {
    this.health.update(delta);
    this.castTime = Math.max(0, this.castTime - delta);
    this.flashTime = Math.max(0, this.flashTime - delta);
    const previousX = this.view.x;
    const previousY = this.view.y;
    const step = this.speed * delta / 1000;
    const minimum = ARENA.inset + PLAYER.radius;
    this.view.x = Phaser.Math.Clamp(previousX + direction.x * step + this.knockback.x * delta / 1000, minimum, ARENA.width - minimum);
    this.view.y = Phaser.Math.Clamp(previousY + direction.y * step + this.knockback.y * delta / 1000, minimum, ARENA.height - minimum);
    const decay = Math.exp(-delta / 100);
    this.knockback.x *= decay;
    this.knockback.y *= decay;
    const traveled = Math.hypot(this.view.x - previousX, this.view.y - previousY);
    this.distance += traveled;
    this.moving = traveled > 0.01;
    const facingX = this.casting ? this.castAim.x : aim?.x || direction.x;
    if (facingX !== 0) this.facing = Math.sign(facingX);
    if (this.moving) this.walkTime += delta;
    this.pose();
  }

  /** Successful casts animate the existing body and hinged staff, never delay damage. */
  cast(aim: Direction, school: School): void {
    this.castTime = 280;
    this.castAim.x = aim.x; this.castAim.y = aim.y;
    if (Math.abs(aim.x) > 0.01) this.facing = Math.sign(aim.x);
    this.wandGlow.setFillStyle(SCHOOL_COLOR[school]);
    this.pose();
  }

  private pose(): void {
    const bob = this.moving ? Math.sin(this.walkTime * 0.018) * 2 : 0;
    const progress = 1 - this.castTime / 280;
    const stroke = this.casting ? Math.sin(progress * Math.PI) : 0;
    const raise = this.casting ? Math.sin(Math.min(1, progress * 3) * Math.PI / 2) * (1 - progress) : 0;
    this.figure.setPosition(this.castAim.x * stroke * 4, -7 + bob + this.castAim.y * stroke * 3).setScale(this.facing * (1 + stroke * 0.04), 1 - stroke * 0.04);
    this.figure.rotation = (this.moving ? Math.sin(this.walkTime * 0.009) * 0.045 : 0) + this.facing * this.castAim.x * stroke * 0.1;
    this.wand.setPosition(12 + stroke * 6, 3 - raise * 10).setRotation(this.casting ? -0.55 * raise + 0.7 * stroke : 0);
    this.wandGlow.setScale(1 + stroke * 0.8).setAlpha(this.casting ? 0.35 + stroke * 0.6 : 0.2);
    this.shadow.scaleX = 1 + Math.abs(bob) * 0.035;
    this.aura.setAlpha(this.moving ? 0.7 : 1);
    this.figure.setAlpha(this.health.protected && Math.floor(this.flashTime / 75) % 2 === 0 ? 0.4 : 1);
    this.aura.setStrokeStyle(this.health.protected ? 2 : 1, this.health.protected ? 0xffa18b : this.health.shield > 0 ? 0x82caf5 : 0x9be3b4, this.health.protected ? 0.85 : 0.25);
  }

  hurt(damage: number, sourceX: number, sourceY: number): boolean {
    if (!this.health.hurt(damage, PLAYER.invulnerability)) return false;
    const dx = this.view.x - sourceX;
    const dy = this.view.y - sourceY;
    const length = Math.hypot(dx, dy) || 1;
    this.knockback.x = (dx === 0 && dy === 0 ? 1 : dx / length) * 330;
    this.knockback.y = dy / length * 330;
    this.flashTime = PLAYER.invulnerability;
    return true;
  }

  reset(): void {
    this.view.setPosition(ARENA.width / 2, ARENA.height / 2);
    this.distance = 0;
    this.walkTime = 0;
    this.facing = 1;
    this.health.reset();
    this.knockback.x = this.knockback.y = 0;
    this.flashTime = this.castTime = 0;
    this.wandGlow.setFillStyle(0xffd99b);
    this.update({ x: 0, y: 0 }, 0);
  }
}
