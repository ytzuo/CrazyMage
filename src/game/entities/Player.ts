import Phaser from 'phaser';
import { ARENA, PLAYER, type Direction } from '../config';
import { Health } from '../combat/Health';

export class Player {
  readonly view: Phaser.GameObjects.Container;
  private figure: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Ellipse;
  private aura: Phaser.GameObjects.Arc;
  private facing = 1;
  private walkTime = 0;
  distance = 0;
  moving = false;
  readonly health = new Health(PLAYER.health);
  private knockback = { x: 0, y: 0 };
  private flashTime = 0;

  constructor(scene: Phaser.Scene) {
    this.view = scene.add.container(ARENA.width / 2, ARENA.height / 2).setDepth(10);
    this.aura = scene.add.circle(0, 0, 28, 0x94e3ab, 0.025).setStrokeStyle(1, 0x9be3b4, 0.25);
    this.shadow = scene.add.ellipse(0, 9, 40, 16, 0x000000, 0.35);
    this.figure = scene.add.container(0, -7);
    const mage = scene.add.graphics();
    // Small, readable apprentice silhouette: boots, robe, face, oversized hat and staff.
    mage.fillStyle(0x161f25).fillRoundedRect(-10, 15, 8, 9, 2).fillRoundedRect(3, 15, 8, 9, 2);
    mage.fillStyle(0x637b99).fillTriangle(-14, 19, 0, -12, 14, 19);
    mage.fillStyle(0x98acc6).fillTriangle(-3, -7, -8, 17, 0, 15);
    mage.fillStyle(0xd6b58e).fillRoundedRect(-8, -17, 16, 14, 4);
    mage.fillStyle(0x17232a).fillRect(-5, -12, 3, 3).fillRect(3, -12, 3, 3);
    mage.fillStyle(0x778ba8).fillTriangle(-15, -17, -3, -44, 11, -17);
    mage.fillStyle(0xa2b7d0).fillTriangle(-15, -17, -3, -44, -7, -17);
    mage.fillStyle(0x52677e).fillRoundedRect(-20, -21, 37, 7, 3);
    mage.fillStyle(0xc7bc88).fillRect(-13, -25, 23, 3);
    mage.lineStyle(4, 0x6a5041).lineBetween(18, -16, 18, 20);
    mage.fillStyle(0xd6b58e).fillCircle(17, 5, 4);
    mage.fillStyle(0xe9c87f).fillCircle(18, -20, 5);
    const glow = scene.add.circle(18, -20, 9, 0xffd99b, 0.13);
    this.figure.add([glow, mage]);
    this.view.add([this.aura, this.shadow, this.figure]);
  }

  update(direction: Direction, delta: number, aim: Direction | null = null): void {
    this.health.update(delta);
    this.flashTime = Math.max(0, this.flashTime - delta);
    const previousX = this.view.x;
    const previousY = this.view.y;
    const step = PLAYER.speed * delta / 1000;
    const minimum = ARENA.inset + PLAYER.radius;
    this.view.x = Phaser.Math.Clamp(previousX + direction.x * step + this.knockback.x * delta / 1000, minimum, ARENA.width - minimum);
    this.view.y = Phaser.Math.Clamp(previousY + direction.y * step + this.knockback.y * delta / 1000, minimum, ARENA.height - minimum);
    const decay = Math.exp(-delta / 100);
    this.knockback.x *= decay;
    this.knockback.y *= decay;
    const traveled = Math.hypot(this.view.x - previousX, this.view.y - previousY);
    this.distance += traveled;
    this.moving = traveled > 0.01;
    const facingX = aim?.x || direction.x;
    if (facingX !== 0) this.facing = Math.sign(facingX);
    if (this.moving) this.walkTime += delta;
    const bob = this.moving ? Math.sin(this.walkTime * 0.018) * 2 : 0;
    this.figure.setPosition(0, -7 + bob).setScale(this.facing, 1);
    this.figure.rotation = this.moving ? Math.sin(this.walkTime * 0.009) * 0.045 : 0;
    this.shadow.scaleX = 1 + Math.abs(bob) * 0.035;
    this.aura.setAlpha(this.moving ? 0.7 : 1);
    this.figure.setAlpha(this.health.protected && Math.floor(this.flashTime / 75) % 2 === 0 ? 0.4 : 1);
    this.aura.setStrokeStyle(this.health.protected ? 2 : 1, this.health.protected ? 0xffa18b : 0x9be3b4, this.health.protected ? 0.85 : 0.25);
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
    this.flashTime = 0;
    this.update({ x: 0, y: 0 }, 0);
  }
}
