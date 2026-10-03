import { isBoss } from './roster';
import type Phaser from 'phaser';
import { PLAYER } from '../config';
import type { Player } from '../entities/Player';
import type { DamageSource } from '../ultimates/UltimateCharge';
import type { Enemy, EnemySystem } from './EnemySystem';
import { SPECIAL_ENEMIES as CONFIG } from './specialConfig';

interface Shield { owner:number; enemy:Enemy; remaining:number; amount:number; view:Phaser.GameObjects.Image }
interface Ward { owner:number; remaining:number; view:Phaser.GameObjects.Image }
interface Blast { view:Phaser.GameObjects.Image; remaining:number; damage:number; ring:boolean; resolved:boolean }
interface FriendlyBlast { x:number; y:number; damage:number; source:DamageSource }
const distanceSquared=(a:Enemy,b:Enemy):number=>(a.view.x-b.view.x)**2+(a.view.y-b.view.y)**2;

/** Three bombers, two priests, six shields/blasts and two wards; scene-owned cleanup. */
export class SpecialEnemyCombat {
  private shields=new Map<number,Shield>();
  private wards=new Map<number,Ward>();
  private blasts:Blast[]=[];
  private friendly:FriendlyBlast[]=[];
  get counts():{shields:number;wards:number;blasts:number} {return {shields:this.shields.size,wards:this.wards.size,blasts:this.blasts.length};}
  constructor(private scene:Phaser.Scene) {}

  update(delta:number,player:Player,system:EnemySystem):void {
    for(const [id,shield] of this.shields) {
      shield.remaining-=delta;
      if(shield.remaining<=0||shield.enemy.health.dead)this.removeShield(id);
      else shield.view.setAlpha(0.45+0.25*Math.min(1,shield.remaining/500));
    }
    for(const [id,ward] of this.wards) {
      ward.remaining-=delta;
      if(ward.remaining<=0)this.cancelWard(id);
      else ward.view.setAlpha(0.3+0.15*Math.min(1,ward.remaining/500));
    }
    for(let i=this.blasts.length-1;i>=0;i--) {
      const blast=this.blasts[i];blast.remaining-=delta;
      if(!blast.resolved&&blast.remaining<=0) {
        blast.resolved=true;blast.remaining=CONFIG.bomber.feedback;
        const distance=Math.hypot(player.view.x-blast.view.x,player.view.y-blast.view.y);
        if(!player.health.dead&&distance+PLAYER.radius>=CONFIG.bomber.ringInner&&distance-PLAYER.radius<=CONFIG.bomber.ringOuter)
          player.hurt(blast.damage,blast.view.x,blast.view.y);
        blast.view.setTexture('enemy-bomb-ring-impact').setAlpha(1);
      }else if(blast.resolved) {
        blast.view.setAlpha(Math.max(0,blast.remaining/CONFIG.bomber.feedback));
        if(blast.remaining<=0){blast.view.destroy();this.blasts.splice(i,1);}
      }else blast.view.setAlpha(0.6+0.3*Math.sin(blast.remaining/100)**2);
    }
    this.flushFriendly(system);
  }

  /** Special enemies use their own attack semantics, but share movement and cooldowns. */
  updateEnemy(enemy:Enemy,delta:number,player:Player,system:EnemySystem):boolean {
    if(enemy.spec.kind!=='bomber'&&enemy.spec.kind!=='priest')return false;
    const dx=player.view.x-enemy.view.x,dy=player.view.y-enemy.view.y,distance=Math.hypot(dx,dy);
    enemy.aim.x=distance?dx/distance:1;enemy.aim.y=distance?dy/distance:0;
    if(enemy.windup>0) {
      enemy.windup=Math.max(0,enemy.windup-delta);
      enemy.warning.setVisible(true).setAlpha(0.45+0.5*(1-enemy.windup/enemy.spec.windup));
      if(enemy.windup===0) {
        enemy.warning.setVisible(false);enemy.cooldown=enemy.spec.cooldown;enemy.attackTime=230;
        if(enemy.spec.kind==='bomber') {
          // Reserve the delayed telegraph before consuming the actor. No unannounced ring.
          this.addBlast(enemy.view.x,enemy.view.y,enemy.spec.damage,false);
          if(enemy.variant==='chain')this.addBlast(enemy.view.x,enemy.view.y,enemy.spec.damage,true);
          if(distance<=CONFIG.bomber.radius+PLAYER.radius)player.hurt(enemy.spec.damage,enemy.view.x,enemy.view.y);
          system.selfDestruct(enemy);
        }else this.castProtection(enemy,system);
      }
      return true;
    }
    if(enemy.spec.kind==='priest'&&this.wards.has(enemy.id))return true;
    const ready=enemy.spec.kind==='bomber'?distance<=CONFIG.bomber.trigger:this.hasAlly(enemy,system);
    if(ready&&distance<=enemy.spec.range&&enemy.cooldown===0) {
      // A chain attack reserves two slots through its live actor until it detonates.
      if(enemy.spec.kind==='bomber'&&this.blasts.length+system.enemies.reduce((slots,other)=>slots+(other.spec.kind==='bomber'&&other.windup>0?(other.variant==='chain'?2:1):0),0)>CONFIG.maximumBlasts-(enemy.variant==='chain'?2:1))return true;
      enemy.windup=enemy.spec.windup;
      const radius=enemy.spec.kind==='bomber'?CONFIG.bomber.radius:CONFIG.priest.wardRadius;
      enemy.warning.setTexture(enemy.spec.kind==='bomber'?'enemy-range-melee':'enemy-priest-ward')
        .setDisplaySize(radius*2,radius*2).setAlpha(0.5).setVisible(true);
      return true;
    }
    const movement=enemy.spec.kind==='bomber'?Number(distance>enemy.spec.radius+18):distance<180?-1:distance>320?1:0;
    const step=enemy.spec.speed*(1-enemy.slow.strength)*delta/1000*movement;
    if(distance){enemy.view.x+=dx/distance*step;enemy.view.y+=dy/distance*step;}
    return true;
  }

  private eligible(owner:Enemy,target:Enemy):boolean {
    return target!==owner&&target.spec.kind!=='priest'&&!isBoss(target.spec.kind)&&target.spawning===0&&!target.health.dead&&
      distanceSquared(owner,target)<=CONFIG.priest.wardRadius**2;
  }
  private hasAlly(owner:Enemy,system:EnemySystem):boolean {
    return system.enemies.some(target=>this.eligible(owner,target)&&(owner.variant==='ward'||!this.shields.has(target.id)));
  }
  private castProtection(owner:Enemy,system:EnemySystem):void {
    if(owner.variant==='ward') {
      if(this.wards.size>=CONFIG.priest.maximum)return;
      const view=this.scene.add.image(owner.view.x,owner.view.y,'enemy-priest-ward').setDisplaySize(CONFIG.priest.wardRadius*2,CONFIG.priest.wardRadius*2).setDepth(6).setAlpha(0.45);
      this.wards.set(owner.id,{owner:owner.id,view,remaining:CONFIG.priest.wardDuration});return;
    }
    let count=0;
    // Scan once per cast; never sort the whole roster on the frame path.
    for(const enemy of system.enemies) {
      if(this.shields.size>=CONFIG.priest.maximum*CONFIG.priest.targets)break;
      if(!this.eligible(owner,enemy)||this.shields.has(enemy.id))continue;
      const view=this.scene.add.image(0,-3,'enemy-priest-shield').setDisplaySize(enemy.spec.radius*2.8,enemy.spec.radius*2.8);
      enemy.view.add(view);
      this.shields.set(enemy.id,{owner:owner.id,enemy,view,remaining:CONFIG.priest.shieldDuration,amount:enemy.health.maximum*CONFIG.priest.shieldFraction});
      if(++count===CONFIG.priest.targets)break;
    }
  }

  /** Single-hit shields and non-stacking wards apply to every damage source. */
  protect(enemy:Enemy,damage:number):number {
    if(enemy.frozen>0)return damage;
    for(const ward of this.wards.values()) {
      if(isBoss(enemy.spec.kind)||enemy.spec.kind==='priest')break;
      if((enemy.view.x-ward.view.x)**2+(enemy.view.y-ward.view.y)**2<=CONFIG.priest.wardRadius**2) {
        damage*=1-CONFIG.priest.reduction;break;
      }
    }
    const shield=this.shields.get(enemy.id);
    if(shield){damage=Math.max(0,damage-shield.amount);this.removeShield(enemy.id);}
    return damage;
  }

  onDeath(enemy:Enemy,source:DamageSource|null):void {
    this.removeShield(enemy.id);this.cancelOwner(enemy.id);
    if(source&&enemy.spec.kind==='bomber'&&enemy.windup>0&&this.friendly.length<CONFIG.bomber.maximum) {
      this.friendly.push({x:enemy.view.x,y:enemy.view.y,damage:enemy.spec.damage*CONFIG.bomber.friendlyMultiplier,source});
      this.addBlast(enemy.view.x,enemy.view.y,0,false);
    }
  }
  flushFriendly(system:EnemySystem):void {
    // Deaths enqueue blasts. This bounded queue prevents recursive chain explosions.
    let budget=CONFIG.bomber.maximum;
    while(this.friendly.length&&budget-->0&&!system.combatStopped) {
      const blast=this.friendly.shift()!;
      for(const enemy of [...system.enemies]) {
        if((enemy.view.x-blast.x)**2+(enemy.view.y-blast.y)**2>(CONFIG.bomber.radius+enemy.spec.radius)**2)continue;
        system.hit(enemy,blast.damage,{x:0,y:0},blast.source,null,true);
        if(system.combatStopped)break;
      }
    }
  }
  private addBlast(x:number,y:number,damage:number,ring:boolean):void {
    if(this.blasts.length>=CONFIG.maximumBlasts) {
      if(ring)return;
      const index=this.blasts.findIndex(blast=>blast.resolved);
      if(index<0)return;
      this.blasts[index].view.destroy();this.blasts.splice(index,1);
    }
    const radius=ring?CONFIG.bomber.ringOuter:CONFIG.bomber.radius;
    const view=this.scene.add.image(x,y,ring?'enemy-bomb-ring':'enemy-impact-detail').setDisplaySize(radius*2,radius*2).setDepth(7).setAlpha(1);
    this.blasts.push({view,damage,ring,resolved:!ring,remaining:ring?CONFIG.bomber.ringDelay:CONFIG.bomber.feedback});
  }
  frozen(enemy:Enemy):void {
    this.cancelWard(enemy.id);
    if(enemy.spec.kind==='priest')this.cancelOwner(enemy.id);
  }
  private removeShield(id:number):void {this.shields.get(id)?.view.destroy();this.shields.delete(id);}
  private cancelWard(id:number):void {this.wards.get(id)?.view.destroy();this.wards.delete(id);}
  private cancelOwner(id:number):void {
    this.cancelWard(id);
    for(const [target,shield] of this.shields)if(shield.owner===id)this.removeShield(target);
  }
  reset():void {
    for(const id of this.shields.keys())this.removeShield(id);
    for(const id of this.wards.keys())this.cancelWard(id);
    for(const blast of this.blasts)blast.view.destroy();
    this.blasts.length=0;this.friendly.length=0;
  }
}
