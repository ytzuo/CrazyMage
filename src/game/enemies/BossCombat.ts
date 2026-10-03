import Phaser from 'phaser';
import { WeaverCombat } from './WeaverCombat';
import { prepareEnemyAttackTextures } from '../art/EnemyAttackTextures';
import { prepareGuardianTextures } from '../art/GuardianTextures';
import { ARENA, PLAYER } from '../config';
import { segmentCircleHit } from '../combat/collision';
import type { Player } from '../entities/Player';
import type { Enemy } from './EnemySystem';
import { GuardianRig, type GuardianPose } from './GuardianRig';
import { GUARDIAN, guardianContains, guardianEndpoint, guardianMove, type GuardianMove, type GuardianShape } from './GuardianRules';
interface Zone extends GuardianShape {view:Phaser.GameObjects.Image;wait:number;total:number;resolved:boolean;stage:number}
interface Fight {
  enemy:Enemy;rig:GuardianRig;zones:Zone[];move:GuardianMove|null;last:GuardianMove|null;
  stage:number;enraged:boolean;phase:'idle'|'attack'|'dash'|'recover';exposure:number;
  angle:number;originX:number;originY:number;endX:number;endY:number;dashTime:number;dashHit:boolean;
  reservation:number;pose:GuardianPose;
}
/** Six attacks can reserve four zones each. Rest starts after the final impact. */
export class BossCombat {
  readonly weavers:WeaverCombat;
  private fights=new Map<number,Fight>();
  private reserved=0;
  static readonly maximumZones=24;
  constructor(private scene:Phaser.Scene) {prepareEnemyAttackTextures(scene);prepareGuardianTextures(scene);this.weavers=new WeaverCombat(scene);}
  get zoneCount():number {let count=0;for(const fight of this.fights.values())count+=fight.zones.length;return count;}
  get rigCount():number {return this.fights.size+this.weavers.rigCount;}
  get reservedCount():number {return this.reserved;}
  attach(enemy:Enemy):void {
    if(enemy.spec.kind==='weaver'){this.weavers.attach(enemy);return;}
    if(this.fights.has(enemy.id))return;
    const fight:Fight={enemy,rig:new GuardianRig(this.scene,enemy),zones:[],move:null,last:null,stage:0,enraged:false,phase:'idle',exposure:0,
      angle:0,originX:0,originY:0,endX:0,endY:0,dashTime:0,dashHit:false,reservation:0,
      pose:{move:null,charge:0,dashing:false,exposed:false,enraged:false,secondSweep:false}};
    this.fights.set(enemy.id,fight);enemy.cooldown=GUARDIAN.initialRest;this.pose(enemy);
  }
  inspect(id:number) {
    const f=this.fights.get(id);return f?{move:f.move,last:f.last,phase:f.phase,stage:f.stage,exposure:f.exposure,enraged:f.enraged,
      zones:f.zones.map(z=>({shape:z.shape,x:z.x,y:z.y,radius:z.radius,angle:z.angle,length:z.length,wait:z.wait,resolved:z.resolved})),
      rigImages:f.rig.parts.length,cooldown:f.enemy.cooldown}:null;
  }
  damageMultiplier(id:number):number {return (this.fights.get(id)?.exposure??0)>0?GUARDIAN.exposedDamage:1;}
  update(enemy:Enemy,delta:number,player:Player):void {
    if(enemy.spec.kind==='weaver'){this.weavers.update(enemy,delta,player);return;}
    const f=this.fights.get(enemy.id);if(!f||delta<=0)return;
    const oldX=enemy.view.x,oldY=enemy.view.y;
    if(f.phase==='recover') {
      this.recycleFeedback(f,delta);if(!f.zones.length)this.release(f);
      f.exposure=Math.max(0,f.exposure-delta);enemy.cooldown=Math.max(0,enemy.cooldown-delta);
      if(f.exposure===0)f.phase='idle';
      f.rig.advance(delta,0,0);return;
    }
    if(f.phase==='dash') {
      const step=Math.min(delta,f.dashTime),ratio=step/GUARDIAN.chargeDuration*(1-enemy.slow.strength);
      const x=enemy.view.x,y=enemy.view.y;
      const nx=x+(f.endX-f.originX)*ratio,ny=y+(f.endY-f.originY)*ratio;
      if(!f.dashHit&&segmentCircleHit(x,y,nx,ny,player.view.x,player.view.y,enemy.spec.radius+PLAYER.radius)!==null) {
        f.dashHit=true;player.hurt(enemy.spec.damage,x,y);
      }
      enemy.view.setPosition(nx,ny);f.dashTime=Math.max(0,f.dashTime-step);
      f.rig.advance(delta,0,0);
      if(f.dashTime===0) {
        this.clearZones(f);
        if(f.enraged) {f.phase='attack';f.stage=1;this.circle(f,enemy.view.x,enemy.view.y,GUARDIAN.stompRadius,GUARDIAN.chargeStompWindup,1);enemy.windup=GUARDIAN.chargeStompWindup;}
        else this.recover(f);
      }
      return;
    }
    if(f.phase==='attack') {
      enemy.windup=Math.max(0,enemy.windup-delta);
      let resolved=false;
      for(let i=f.zones.length-1;i>=0;i--) {
        const zone=f.zones[i];zone.wait-=delta;
        if(zone.resolved) {
          zone.view.setAlpha(Math.max(0,1+zone.wait/GUARDIAN.feedback));
          if(zone.wait<=-GUARDIAN.feedback){zone.view.destroy();f.zones.splice(i,1);}continue;
        }
        zone.view.setAlpha(.45+.4*(1-zone.wait/zone.total));
        if(zone.wait>0)continue;
        if(f.move==='charge'&&f.stage===0) {
          zone.wait=0;f.phase='dash';f.dashTime=GUARDIAN.chargeDuration;zone.view.setAlpha(.25);break;
        }
        if(guardianContains(zone,player.view.x,player.view.y))player.hurt(enemy.spec.damage,zone.x,zone.y);
        zone.view.setTexture(zone.shape==='sector'?'guardian-sweep-impact':zone.shape==='lane'?'guardian-lane-impact':'enemy-impact-detail').setAlpha(1);
        zone.wait=0;zone.resolved=true;enemy.attackTime=230;resolved=true;
      }
      f.rig.advance(delta,0,0);
      // Newly added follow-ups retain their complete visible warning even after a long frame.
      if(resolved&&f.stage===0&&f.move==='stomp') {
        f.stage=1;for(const offset of [-Math.PI/3,0,Math.PI/3])this.lane(f,f.originX,f.originY,f.angle+offset,GUARDIAN.crackLength,GUARDIAN.crackRadius,GUARDIAN.crackWindup,1);
        enemy.windup=GUARDIAN.crackWindup;
      } else if(resolved&&f.stage===0&&f.move==='sweep'&&f.enraged) {
        f.stage=1;this.sector(f,f.angle+Math.PI/3,GUARDIAN.secondSweepWindup,1);enemy.windup=GUARDIAN.secondSweepWindup;
      }
      if(f.phase==='attack'&&!f.zones.some(z=>!z.resolved))this.recover(f);
      return;
    }
    enemy.cooldown=Math.max(0,enemy.cooldown-delta);
    this.recycleFeedback(f,delta);
    const dx=player.view.x-enemy.view.x,dy=player.view.y-enemy.view.y,distance=Math.hypot(dx,dy);
    if(enemy.cooldown===0&&distance<760&&this.reserved+GUARDIAN.maxZonesPerBoss<=BossCombat.maximumZones) {
      this.begin(f,guardianMove(distance,f.last),player);f.rig.advance(delta,0,0);return;
    }
    if(distance>130) {
      const step=Math.min(distance-130,enemy.spec.speed*(1-enemy.slow.strength)*delta/1000);
      const margin=ARENA.inset+enemy.spec.radius;
      enemy.view.setPosition(Phaser.Math.Clamp(oldX+dx/distance*step,margin,ARENA.width-margin),Phaser.Math.Clamp(oldY+dy/distance*step,margin,ARENA.height-margin));
    }
    f.rig.advance(delta,enemy.view.x-oldX,enemy.view.y-oldY);
  }
  private begin(f:Fight,move:GuardianMove,player:Player):void {
    this.clearZones(f);f.move=f.last=move;f.stage=0;f.phase='attack';f.enraged=f.enemy.health.current<f.enemy.health.maximum/2;
    f.exposure=0;f.dashHit=false;f.originX=f.enemy.view.x;f.originY=f.enemy.view.y;
    f.angle=Math.atan2(player.view.y-f.originY,player.view.x-f.originX);f.enemy.aim.x=Math.cos(f.angle);f.enemy.aim.y=Math.sin(f.angle);
    f.reservation=GUARDIAN.maxZonesPerBoss;this.reserved+=f.reservation;
    if(move==='sweep'){this.sector(f,f.angle,GUARDIAN.sweepWindup,0);f.enemy.windup=GUARDIAN.sweepWindup;}
    else if(move==='stomp'){this.circle(f,f.originX,f.originY,GUARDIAN.stompRadius,GUARDIAN.stompWindup,0);f.enemy.windup=GUARDIAN.stompWindup;}
    else if(move==='charge') {
      const margin=ARENA.inset+f.enemy.spec.radius;
      const end=guardianEndpoint(f.originX,f.originY,f.angle,GUARDIAN.chargeDistance,margin);
      f.endX=end.x;f.endY=end.y;
      this.addZone(f,{shape:'lane',x:f.originX,y:f.originY,radius:f.enemy.spec.radius,angle:f.angle,length:end.length},GUARDIAN.chargeWindup,0);f.enemy.windup=GUARDIAN.chargeWindup;
    } else {
      const count=f.enraged?4:3,distance=Math.hypot(player.view.x-f.originX,player.view.y-f.originY);
      for(let i=0;i<count;i++) {
        const reach=Math.max(180,distance-(count-1)*85)+i*170;
        this.circle(f,Phaser.Math.Clamp(f.originX+Math.cos(f.angle)*reach,ARENA.inset+80,ARENA.width-ARENA.inset-80),
          Phaser.Math.Clamp(f.originY+Math.sin(f.angle)*reach,ARENA.inset+80,ARENA.height-ARENA.inset-80),GUARDIAN.ruptureRadius,GUARDIAN.ruptureWindup+i*GUARDIAN.ruptureInterval,i);
      }
      f.enemy.windup=GUARDIAN.ruptureWindup;
    }
  }
  private addZone(f:Fight,shape:GuardianShape,wait:number,stage:number):void {
    if(f.zones.length>=GUARDIAN.maxZonesPerBoss)throw Error('Guardian zone reservation exceeded');
    const key=shape.shape==='sector'?'guardian-sweep-warning':shape.shape==='lane'?'guardian-lane-warning':'enemy-range-boss';
    const view=this.scene.add.image(shape.x,shape.y,key).setDepth(7).setAlpha(.45);
    if(shape.shape==='lane')view.setPosition(shape.x+Math.cos(shape.angle)*shape.length/2,shape.y+Math.sin(shape.angle)*shape.length/2).setRotation(shape.angle).setDisplaySize(shape.length+shape.radius*2,shape.radius*2);
    else view.setDisplaySize(shape.radius*2,shape.radius*2).setRotation(shape.shape==='sector'?shape.angle:0);
    f.zones.push({...shape,view,wait,total:wait,resolved:false,stage});
  }
  private circle(f:Fight,x:number,y:number,radius:number,wait:number,stage:number):void {this.addZone(f,{shape:'circle',x,y,radius,angle:0,length:0},wait,stage);}
  private sector(f:Fight,angle:number,wait:number,stage:number):void {this.addZone(f,{shape:'sector',x:f.originX,y:f.originY,radius:GUARDIAN.sweepRadius,angle,length:0},wait,stage);}
  private lane(f:Fight,x:number,y:number,angle:number,length:number,radius:number,wait:number,stage:number):void {
    const end=guardianEndpoint(x,y,angle,length,ARENA.inset+radius);
    this.addZone(f,{shape:'lane',x,y,angle,length:end.length,radius},wait,stage);
  }
  private recover(f:Fight):void {
    f.phase='recover';f.move=null;f.enemy.windup=0;f.exposure=f.enraged?GUARDIAN.enragedExposure:GUARDIAN.exposure;
    f.enemy.cooldown=GUARDIAN.rest;if(!f.zones.length)this.release(f);
  }
  private recycleFeedback(f:Fight,delta:number):void {
    for(let i=f.zones.length-1;i>=0;i--){const z=f.zones[i];if(!z.resolved)continue;z.wait-=delta;z.view.setAlpha(Math.max(0,1+z.wait/GUARDIAN.feedback));if(z.wait<=-GUARDIAN.feedback){z.view.destroy();f.zones.splice(i,1);}}
  }
  pose(enemy:Enemy):void {
    if(enemy.spec.kind==='weaver'){this.weavers.pose(enemy);return;}
    const f=this.fights.get(enemy.id);if(!f)return;
    const active=f.zones.find(z=>!z.resolved);const p=f.pose;
    p.move=f.move==='charge'&&f.stage===1?'stomp':f.move;p.charge=active&&f.phase==='attack'?Math.max(0,Math.min(1,1-active.wait/active.total)):0;
    p.secondSweep=f.move==='sweep'&&f.stage===1;
    p.dashing=f.phase==='dash';p.exposed=f.exposure>0;p.enraged=enemy.health.current<enemy.health.maximum/2;
    f.rig.pose(p);
  }
  syncTint(enemy:Enemy):void {this.fights.get(enemy.id)?.rig.syncTint();this.weavers.syncTint(enemy);}
  cancel(id:number):void {
    this.weavers.cancel(id);
    const f=this.fights.get(id);if(!f)return;this.clearZones(f);this.release(f);
    f.move=null;f.dashTime=0;f.phase=f.exposure>0?'recover':'idle';f.enemy.windup=0;f.enemy.cooldown=Math.max(f.enemy.cooldown,GUARDIAN.rest);
  }
  private clearZones(f:Fight):void {for(const zone of f.zones)zone.view.destroy();f.zones.length=0;}
  private release(f:Fight):void {this.reserved-=f.reservation;f.reservation=0;}
  remove(id:number):void {this.weavers.remove(id);const f=this.fights.get(id);if(!f)return;this.cancel(id);f.rig.destroy();this.fights.delete(id);}
  reset():void {this.weavers.reset();for(const id of this.fights.keys())this.remove(id);}
}
