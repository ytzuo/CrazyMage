import { audioFor } from '../audio/GameAudio';
import Phaser from 'phaser';
import { ARENA, PLAYER, type Direction } from '../config';
import { Health } from '../combat/Health';
import { SCHOOL_COLOR } from '../effects/CombatEffects';
import type { School } from '../upgrades/definitions';
import { prepareMageTextures, mageBodyTexture, mageStaffTexture, type CharacterGender } from '../art/CharacterTextures';
import { MAGE_LEGS } from '../art/MageLegTextures';

export class Player {
  readonly view: Phaser.GameObjects.Container;
  private mage: Phaser.GameObjects.Image;
  private staff: Phaser.GameObjects.Image;
  private leftLeg: Phaser.GameObjects.Image;
  private rightLeg: Phaser.GameObjects.Image;
  private school: School = 'fire';
  private gender: CharacterGender = 'male';
  private figure: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Ellipse;
  private aura: Phaser.GameObjects.Arc;
  private wand: Phaser.GameObjects.Container;
  private wandGlow: Phaser.GameObjects.Arc;
  private castTime = 0;
  private castAim = { x: 1, y: 0 };
  get casting(): boolean { return this.castTime > 0; }
  private facing = 1;
  private look = {x:1,y:0};
  get aimDirection():Direction{return {...this.look};}
  private walkTime = 0;
  distance = 0;
  moving = false;
  readonly health = new Health(PLAYER.health);
  private knockback = { x: 0, y: 0 };
  private flashTime = 0;
  speed: number = PLAYER.speed;

  constructor(private scene: Phaser.Scene) {
    this.view = scene.add.container(ARENA.width / 2, ARENA.height / 2).setDepth(10);
    this.aura = scene.add.circle(0, 0, 28, 0x94e3ab, 0.025).setStrokeStyle(1, 0x9be3b4, 0.25);
    this.shadow = scene.add.ellipse(0, 9, 40, 16, 0x000000, 0.35);
    this.figure = scene.add.container(0, -7);
    prepareMageTextures(scene);
    const bodyKey=mageBodyTexture(this.school,this.gender);
    this.mage = scene.add.image(0, 0, `${bodyKey}-torso`).setOrigin(0.5, 2 / 3).setScale(0.5);
    this.leftLeg=scene.add.image(-6,19.5,`${bodyKey}-left`).setOrigin(0.5,MAGE_LEGS.overlap/MAGE_LEGS.height).setScale(0.5);
    this.rightLeg=scene.add.image(6.5,19.5,`${bodyKey}-right`).setOrigin(0.5,MAGE_LEGS.overlap/MAGE_LEGS.height).setScale(0.5);
    this.wand = scene.add.container(12, 3).setName('mage-wand');
    this.staff = scene.add.image(0, 0, mageStaffTexture(this.school)).setScale(0.5);
    this.wandGlow = scene.add.circle(6, -23, 9, 0xffd99b, 0.2);
    this.wand.add([this.wandGlow, this.staff]);
    this.figure.add([this.leftLeg, this.rightLeg, this.mage, this.wand]);
    this.view.add([this.aura, this.shadow, this.figure]);
  }

  setGender(gender: CharacterGender): void {
    this.gender = gender;
    this.refreshLimbs();
  }

  setSchool(school: School): void {
    if (this.school !== school) {
      this.school = school;
      this.refreshLimbs();
      this.staff.setTexture(mageStaffTexture(school));
    }
    this.wandGlow.setFillStyle(SCHOOL_COLOR[school]);
    this.pose();
  }

  update(direction: Direction, delta: number, aim: Direction | null = null): void {
    // Movement never changes the stored casting direction.
    if(aim){
      const length=Math.hypot(aim.x,aim.y);
      if(length>0){this.look.x=aim.x/length;this.look.y=aim.y/length;}
    }
    if(delta===0){this.pose();return;}
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
    if (this.moving && (direction.x!==0 || direction.y!==0)) this.walkTime += Math.min(traveled,Math.hypot(direction.x*step,direction.y*step));
    // Knockback moves the actor but does not make it walk.
    this.moving = this.moving && (direction.x!==0 || direction.y!==0);
    this.pose();
  }

  private refreshLimbs():void {
    const key=mageBodyTexture(this.school,this.gender);
    this.mage.setTexture(`${key}-torso`);
    this.leftLeg.setTexture(`${key}-left`);this.rightLeg.setTexture(`${key}-right`);
  }

  /** Successful casts animate the existing body and hinged staff, never delay damage. */
  cast(aim: Direction, school: School): void {
    this.look.x=aim.x;this.look.y=aim.y;
    this.castTime = 280;
    this.castAim.x = aim.x; this.castAim.y = aim.y;
    if (Math.abs(aim.x) > 0.01) this.facing = Math.sign(aim.x);
    this.wandGlow.setFillStyle(SCHOOL_COLOR[school]);
    this.pose();
  }

  private pose(): void {
    const swing = this.moving ? Math.sin(this.walkTime * Math.PI*2/72) : 0;
    const bob = this.moving ? -Math.abs(swing)*0.8 : 0;
    const progress = 1 - this.castTime / 280;
    const stroke = this.casting ? Math.sin(progress * Math.PI) : 0;
    const raise = this.casting ? Math.sin(Math.min(1, progress * 3) * Math.PI / 2) * (1 - progress) : 0;
    this.figure.setPosition(this.castAim.x * stroke * 4, -7 + bob + this.castAim.y * stroke * 3).setScale(this.facing * (1 + stroke * 0.04), 1 - stroke * 0.04);
    this.figure.rotation = swing*0.025 + this.facing * this.castAim.x * stroke * 0.1;
    this.leftLeg.setPosition(-6-swing*1.7,19.5-bob-Math.max(0,swing)*1.3).setRotation(swing*0.13);
    this.rightLeg.setPosition(6.5+swing*1.7,19.5-bob-Math.max(0,-swing)*1.3).setRotation(-swing*0.13);
    this.wand.setPosition(12 + stroke * 6, 3 - raise * 10).setRotation(this.casting ? -0.55 * raise + 0.7 * stroke : 0);
    this.wandGlow.setScale(1 + stroke * 0.8).setAlpha(this.casting ? 0.35 + stroke * 0.6 : 0.2);
    this.shadow.scaleX = 1 + Math.abs(bob) * 0.035;
    this.aura.setAlpha(this.moving ? 0.7 : 1);
    this.figure.setAlpha(this.health.protected && Math.floor(this.flashTime / 75) % 2 === 0 ? 0.4 : 1);
    this.aura.setStrokeStyle(this.health.protected ? 2 : 1, this.health.protected ? 0xffa18b : this.health.shield > 0 ? 0x82caf5 : SCHOOL_COLOR[this.school], this.health.protected ? 0.85 : 0.25);
  }

  hurt(damage: number, sourceX: number, sourceY: number): boolean {
    const health = this.health.current, shield = this.health.shield;
    if (!this.health.hurt(damage, PLAYER.invulnerability)) return false;
    const audio = audioFor(this.scene);
    if (shield > 0 && this.health.shield === 0) audio?.play('shield_break', { priority: 3 });
    if (this.health.dead) audio?.play('defeat', { combat: false, priority: 3 });
    else if (this.health.current < health) audio?.variant('hurt', this.gender === 'male' ? ['player_hurt_01','player_hurt_03'] : ['player_hurt_02','player_hurt_04'], { priority: 3, volume: 0.85 });
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
    this.moving = false;
    this.facing = 1;
    this.look.x=1;this.look.y=0;
    this.health.reset();
    this.knockback.x = this.knockback.y = 0;
    this.flashTime = this.castTime = 0;
    this.wandGlow.setFillStyle(SCHOOL_COLOR[this.school]);
    this.update({ x: 0, y: 0 }, 0);
  }
}
