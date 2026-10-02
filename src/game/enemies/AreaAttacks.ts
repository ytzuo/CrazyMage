import Phaser from 'phaser';
import { ARENA, PLAYER } from '../config';
import type { Player } from '../entities/Player';
import { prepareEnemyAttackTextures } from '../art/EnemyAttackTextures';
import { VARIANTS } from './variants';
interface Zone { view:Phaser.GameObjects.Image; wait:number; resolved:boolean; locked:boolean }
interface Cast { zones:Zone[]; next:number; lockWait:number; damage:number }
/** Twelve reserved images total. Triple casts reserve all three before starting. */
export class AreaAttacks {
  private casts=new Map<number,Cast>();
  private reserved=0;
  get count():number {return this.reserved;}
  constructor(private scene:Phaser.Scene){prepareEnemyAttackTextures(scene);}
  begin(id:number,x:number,y:number,damage:number,delay:number,triple=false):boolean {
    const count=triple?3:1;
    if(this.casts.has(id)||this.reserved+count>12)return false;
    const zones:Zone[]=[];
    for(let i=0;i<count;i++) {
      const view=this.scene.add.image(0,0,'enemy-range-ranged').setDisplaySize(140,140).setDepth(7).setVisible(false);
      if(triple)view.setTint([0xffbce6,0xe1b7ff,0x9feaff][i]);
      zones.push({view,wait:delay,resolved:false,locked:false});
    }
    this.lock(zones[0],x,y);this.reserved+=count;
    this.casts.set(id,{zones,next:1,lockWait:VARIANTS.sigilInterval,damage});return true;
  }
  private lock(zone:Zone,x:number,y:number):void {
    zone.view.setPosition(Phaser.Math.Clamp(x,ARENA.inset+70,ARENA.width-ARENA.inset-70),
      Phaser.Math.Clamp(y,ARENA.inset+70,ARENA.height-ARENA.inset-70)).setVisible(true);
    zone.locked=true;
  }
  update(delta:number,player:Player):void {
    if(delta<=0)return;
    for(const [id,cast] of this.casts) {
      let alive=false;
      for(const zone of cast.zones) {
        if(!zone.locked){alive=true;continue;}
        zone.wait-=delta;
        if(zone.resolved) {
          zone.view.setAlpha(Math.max(0,1+zone.wait/300));
          if(zone.wait<=-300)zone.view.setVisible(false);else alive=true;
        } else if(zone.wait<=0) {
          if(!player.health.dead&&Math.hypot(player.view.x-zone.view.x,player.view.y-zone.view.y)<=70+PLAYER.radius)
            player.hurt(cast.damage,zone.view.x,zone.view.y);
          zone.view.setTexture('enemy-impact-detail').setAlpha(1);
          if(cast.zones.length===1)zone.view.setTint(0xc6a1ff);
          zone.wait=0;zone.resolved=true;alive=true;
        } else {zone.view.setAlpha(0.6+0.35*Math.sin(zone.wait*0.015)**2);alive=true;}
      }
      if(cast.next<cast.zones.length) {
        cast.lockWait-=delta;
        if(cast.lockWait<=0) {
          // One new lock per update, with its full warning even after a long frame.
          this.lock(cast.zones[cast.next++],player.view.x,player.view.y);
          cast.lockWait=VARIANTS.sigilInterval;
        }
      }
      if(!alive)this.cancel(id);
    }
  }
  cancel(id:number):void {
    const cast=this.casts.get(id);if(!cast)return;
    for(const zone of cast.zones)zone.view.destroy();
    this.reserved-=cast.zones.length;this.casts.delete(id);
  }
  reset():void {for(const id of this.casts.keys())this.cancel(id);}
}
