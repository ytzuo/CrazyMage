import type Phaser from 'phaser';
import { ARENA, PLAYER } from '../config';
import { segmentCircleHit } from '../combat/collision';
import type { Player } from '../entities/Player';
import type { Enemy } from './EnemySystem';
import { WeaverRig } from './WeaverRig';
import { WEAVER, weaverDestination, weaverMove, weaverRay, type WeaverMove } from './WeaverRules';
interface Line {
  x:number;y:number;endX:number;endY:number;wait:number;life:number;hitWait:number;active:boolean;
  view:Phaser.GameObjects.Image;ends:Phaser.GameObjects.Image[];
}
interface Orb {
  x:number;y:number;endX:number;endY:number;time:number;stage:'out'|'pause'|'return';hit:boolean;
  view:Phaser.GameObjects.Image;path:Phaser.GameObjects.Image;
}
interface Fight {
  enemy:Enemy;rig:WeaverRig;phase:'idle'|'teleport'|'landing'|'lines'|'orb-warning'|'orbs';
  last:WeaverMove|null;timer:number;total:number;enraged:boolean;reserved:boolean;
  destination:{x:number;y:number};marker:Phaser.GameObjects.Image|null;ghost:Phaser.GameObjects.Image|null;
  lines:Line[];orbs:Orb[];angle:number;
}
/** At most six simultaneous casts: 12 lines, 18 orbs, six markers and six ghosts.
 * Each line lives 1s warning + 1.4s active; each orb lives 1s warning + 4.55s travel.
 * A cast reserves its entire budget before creating objects. Owner cancellation owns cleanup.
 */
export class WeaverCombat {
  private fights=new Map<number,Fight>();private reserved=0;
  constructor(private scene:Phaser.Scene) {}
  get rigCount():number {return this.fights.size;}
  get activeCount():number {return this.reserved;}
  get lineCount():number {let n=0;for(const f of this.fights.values())n+=f.lines.length;return n;}
  get orbCount():number {let n=0;for(const f of this.fights.values())n+=f.orbs.length;return n;}
  get markerCount():number {let n=0;for(const f of this.fights.values())n+=Number(!!f.marker);return n;}
  get ghostCount():number {let n=0;for(const f of this.fights.values())n+=Number(!!f.ghost);return n;}
  attach(enemy:Enemy):void {
    if(this.fights.has(enemy.id))return;
    this.fights.set(enemy.id,{enemy,rig:new WeaverRig(this.scene,enemy),phase:'idle',last:null,timer:0,total:1,enraged:false,reserved:false,
      destination:{x:0,y:0},marker:null,ghost:null,lines:[],orbs:[],angle:0});
    enemy.cooldown=WEAVER.initialRest;this.pose(enemy);
  }
  inspect(id:number) {
    const f=this.fights.get(id);return f?{phase:f.phase,last:f.last,timer:f.timer,enraged:f.enraged,cooldown:f.enemy.cooldown,
      destination:{...f.destination},ghost:!!f.ghost,marker:!!f.marker,rigImages:f.rig.parts.length,
      visibleArms:f.rig.parts.slice(0,6).filter(p=>p.visible).length,
      lines:f.lines.map(l=>({x:l.x,y:l.y,endX:l.endX,endY:l.endY,wait:l.wait,life:l.life,active:l.active})),
      orbs:f.orbs.map(o=>({x:o.x,y:o.y,endX:o.endX,endY:o.endY,time:o.time,stage:o.stage,viewX:o.view.x,viewY:o.view.y}))}:null;
  }
  update(enemy:Enemy,delta:number,player:Player):void {
    const f=this.fights.get(enemy.id);if(!f||delta<=0)return;
    const oldX=enemy.view.x;
    this.updateLines(f,delta,player);
    if(f.phase==='teleport') {
      f.timer=Math.max(0,f.timer-delta);enemy.windup=f.timer;f.marker?.setAlpha(.3+.4*(1-f.timer/f.total));
      if(f.timer===0) {
        f.marker?.destroy();f.marker=null;
        if(f.enraged) {
          f.ghost=this.scene.add.image(enemy.view.x,enemy.view.y-15,'enemy-weaver-enraged-detail').setScale(enemy.spec.radius/40).setAlpha(.35).setTint(0xc4a2ff).setDepth(8);
          const angle=Math.atan2(player.view.y-enemy.view.y,player.view.x-enemy.view.x);
          this.line(f,player.view.x,player.view.y,angle+Math.PI/2);
        }
        enemy.view.setPosition(f.destination.x,f.destination.y);enemy.knockback.x=enemy.knockback.y=0;
        f.phase='landing';f.timer=f.enraged?WEAVER.enragedLanding:WEAVER.landing;
      }
    } else if(f.phase==='landing') {
      f.timer=Math.max(0,f.timer-delta);
      if(f.timer===0&&!f.lines.length)this.recover(f);
    } else if(f.phase==='lines') {
      if(!f.lines.length)this.recover(f);
    } else if(f.phase==='orb-warning') {
      f.timer=Math.max(0,f.timer-delta);enemy.windup=f.timer;
      for(const orb of f.orbs)orb.path.setAlpha(.25+.35*(1-f.timer/f.total));
      // Travel begins on the next update, so a long frame cannot consume the warning and outbound leg.
      if(f.timer===0){f.phase='orbs';for(const o of f.orbs)o.view.setVisible(true);}
    } else if(f.phase==='orbs') {
      this.updateOrbs(f,delta,player);if(!f.orbs.length)this.recover(f);
    } else {
      enemy.cooldown=Math.max(0,enemy.cooldown-delta);
      const dx=player.view.x-enemy.view.x,dy=player.view.y-enemy.view.y,distance=Math.hypot(dx,dy);
      if(enemy.cooldown===0&&distance<enemy.spec.range&&this.reserved<WEAVER.maximumFights)this.begin(f,player);
      else if(distance>390||distance<250) {
        const direction=distance<250?-1:1,step=Math.min(Math.abs(distance-320),enemy.spec.speed*(1-enemy.slow.strength)*delta/1000);
        const margin=ARENA.inset+enemy.spec.radius;
        if(distance>.001)enemy.view.setPosition(Math.max(margin,Math.min(ARENA.width-margin,enemy.view.x+dx/distance*step*direction)),
          Math.max(margin,Math.min(ARENA.height-margin,enemy.view.y+dy/distance*step*direction)));
      }
    }
    f.rig.advance(delta,enemy.view.x-oldX);
  }
  private begin(f:Fight,player:Player):void {
    const e=f.enemy;f.reserved=true;this.reserved++;f.last=weaverMove(f.last);f.enraged=e.health.current<e.health.maximum/2;
    f.angle=Math.atan2(player.view.y-e.view.y,player.view.x-e.view.x);e.aim.x=Math.cos(f.angle);e.aim.y=Math.sin(f.angle);
    if(f.last==='teleport') {
      f.phase='teleport';f.timer=f.total=WEAVER.teleportWarning;e.windup=f.timer;
      f.destination=weaverDestination(e.view.x,e.view.y,player.view.x,player.view.y,e.spec.radius);
      f.marker=this.scene.add.image(f.destination.x,f.destination.y-15,f.enraged?'enemy-weaver-enraged-detail':'enemy-weaver-detail')
        .setScale(e.spec.radius/40).setAlpha(.3).setTint(0xc3a0ff).setDepth(7);
    } else if(f.last==='lines') {
      f.phase='lines';f.timer=f.total=WEAVER.lineWarning;e.windup=f.timer;
      // Two parallel strips leave a broad open lane between them; lock once at cast start.
      for(const offset of [-90,90])this.line(f,player.view.x+Math.cos(f.angle)*offset,player.view.y+Math.sin(f.angle)*offset,f.angle+Math.PI/2);
    } else {
      f.phase='orb-warning';f.timer=f.total=WEAVER.orbWarning;e.windup=f.timer;
      for(const offset of [-.4,0,.4]) {
        const end=weaverRay(e.view.x,e.view.y,f.angle+offset,WEAVER.orbDistance,ARENA.inset+WEAVER.orbRadius);
        const path=this.scene.add.image((e.view.x+end.x)/2,(e.view.y+end.y)/2,'weaver-line-warning').setRotation(f.angle+offset).setDisplaySize(end.length,18).setDepth(7).setAlpha(.25);
        const view=this.scene.add.image(e.view.x,e.view.y,'weaver-orb').setDisplaySize(WEAVER.orbRadius*2,WEAVER.orbRadius*2).setDepth(10).setVisible(false);
        f.orbs.push({x:e.view.x,y:e.view.y,endX:end.x,endY:end.y,time:0,stage:'out',hit:false,view,path});
      }
    }
  }
  private line(f:Fight,x:number,y:number,angle:number):void {
    if(f.lines.length>=WEAVER.linesPerBoss)throw Error('Weaver line reservation exceeded');
    const margin=ARENA.inset+WEAVER.lineRadius;
    x=Math.max(margin,Math.min(ARENA.width-margin,x));y=Math.max(margin,Math.min(ARENA.height-margin,y));
    const start=weaverRay(x,y,angle+Math.PI,WEAVER.lineLength/2,margin),end=weaverRay(x,y,angle,WEAVER.lineLength/2,margin);
    const length=Math.hypot(end.x-start.x,end.y-start.y);
    const view=this.scene.add.image((start.x+end.x)/2,(start.y+end.y)/2,'weaver-line-warning').setRotation(angle).setDisplaySize(length,WEAVER.lineRadius*2).setDepth(7).setAlpha(.6);
    const ends=[start,end].map(p=>this.scene.add.image(p.x,p.y,'weaver-sigil').setDisplaySize(46,46).setDepth(7).setAlpha(.7));
    f.lines.push({x:start.x,y:start.y,endX:end.x,endY:end.y,wait:WEAVER.lineWarning,life:WEAVER.lineLife,hitWait:0,active:false,view,ends});
  }
  private updateLines(f:Fight,delta:number,player:Player):void {
    for(let i=f.lines.length-1;i>=0;i--) {
      const l=f.lines[i];
      if(!l.active) {
        l.wait=Math.max(0,l.wait-delta);l.view.setAlpha(.45+.45*(1-l.wait/WEAVER.lineWarning));
        if(l.wait===0){l.active=true;l.view.setTexture('weaver-line-active').setAlpha(1);}
        else continue;
        // Active lifespan is not consumed by the frame that resolves its warning.
      } else l.life=Math.max(0,l.life-delta);
      if(l.life===0){l.view.destroy();for(const end of l.ends)end.destroy();f.lines.splice(i,1);continue;}
      l.hitWait=Math.max(0,l.hitWait-delta);
      if(l.hitWait===0&&segmentCircleHit(l.x,l.y,l.endX,l.endY,player.view.x,player.view.y,WEAVER.lineRadius+PLAYER.radius)!==null) {
        player.hurt(f.enemy.spec.damage,l.x,l.y);l.hitWait=400;
      }
    }
    if(!f.lines.length&&f.ghost){f.ghost.destroy();f.ghost=null;}
    if(f.phase==='lines')f.enemy.windup=Math.max(0,f.enemy.windup-delta);
  }
  private updateOrbs(f:Fight,delta:number,player:Player):void {
    for(let i=f.orbs.length-1;i>=0;i--) {
      const o=f.orbs[i];
      if(o.stage==='pause') {
        o.time=Math.min(WEAVER.orbPause,o.time+delta);o.view.setAlpha(.7+.3*Math.sin(o.time/90)**2);
        if(o.time===WEAVER.orbPause){o.stage='return';o.time=0;o.hit=false;o.path.setTint(0xffcee9);o.view.setAlpha(1);}continue;
      }
      const oldX=o.view.x,oldY=o.view.y;o.time=Math.min(WEAVER.orbTravel,o.time+delta);
      const progress=o.time/WEAVER.orbTravel,ratio=o.stage==='out'?progress:1-progress;
      const x=o.x+(o.endX-o.x)*ratio,y=o.y+(o.endY-o.y)*ratio;
      o.view.setPosition(x,y);
      if(!o.hit&&segmentCircleHit(oldX,oldY,x,y,player.view.x,player.view.y,WEAVER.orbRadius+PLAYER.radius)!==null) {
        o.hit=true;player.hurt(f.enemy.spec.damage,x,y);
      }
      if(o.time===WEAVER.orbTravel) {
        if(o.stage==='out'){o.stage='pause';o.time=0;}
        else {o.view.destroy();o.path.destroy();f.orbs.splice(i,1);}
      }
    }
  }
  private recover(f:Fight):void {
    this.clear(f);f.phase='idle';f.enemy.windup=0;f.enemy.cooldown=WEAVER.rest;
  }
  pose(enemy:Enemy):void {
    const f=this.fights.get(enemy.id);if(!f)return;
    let charge=0;if(f.phase==='teleport'||f.phase==='orb-warning')charge=1-f.timer/f.total;
    else if(f.phase==='lines')charge=1-enemy.windup/WEAVER.lineWarning;
    f.rig.pose(Math.max(0,Math.min(1,charge)));
  }
  syncTint(enemy:Enemy):void {this.fights.get(enemy.id)?.rig.syncTint();}
  private clear(f:Fight):void {
    f.marker?.destroy();f.ghost?.destroy();f.marker=f.ghost=null;
    for(const l of f.lines){l.view.destroy();for(const end of l.ends)end.destroy();}f.lines.length=0;
    for(const o of f.orbs){o.view.destroy();o.path.destroy();}f.orbs.length=0;
    if(f.reserved){this.reserved--;f.reserved=false;}
  }
  cancel(id:number):void {
    const f=this.fights.get(id);if(!f)return;this.clear(f);f.phase='idle';f.enemy.windup=0;f.enemy.cooldown=Math.max(f.enemy.cooldown,WEAVER.rest);
  }
  remove(id:number):void {const f=this.fights.get(id);if(!f)return;this.cancel(id);f.rig.destroy();this.fights.delete(id);}
  reset():void {for(const id of this.fights.keys())this.remove(id);}
}
