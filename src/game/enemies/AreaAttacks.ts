import Phaser from 'phaser';
import { ARENA, PLAYER } from '../config';
import type { Player } from '../entities/Player';
import { prepareEnemyAttackTextures } from '../art/EnemyAttackTextures';
interface Zone { view:Phaser.GameObjects.Image; wait:number; resolved:boolean; damage:number }
/** Artillery locks one ground zone per enemy, with a shared cap of twelve. */
export class AreaAttacks {
  private zones=new Map<number,Zone>();
  constructor(private scene:Phaser.Scene){prepareEnemyAttackTextures(scene);}
  begin(id:number,x:number,y:number,damage:number,delay:number):boolean {
    if(this.zones.has(id)||this.zones.size>=12)return false;
    const view=this.scene.add.image(Phaser.Math.Clamp(x,ARENA.inset+70,ARENA.width-ARENA.inset-70),
      Phaser.Math.Clamp(y,ARENA.inset+70,ARENA.height-ARENA.inset-70),'enemy-range-ranged').setDisplaySize(140,140).setDepth(7);
    this.zones.set(id,{view,wait:delay,resolved:false,damage});return true;
  }
  update(delta:number,player:Player):void {
    for(const [id,zone] of this.zones){
      zone.wait-=delta;
      if(zone.resolved){
        zone.view.setAlpha(Math.max(0,1+zone.wait/300));
        if(zone.wait<=-300)this.cancel(id);
      }else if(zone.wait<=0){
        if(!player.health.dead && Math.hypot(player.view.x-zone.view.x,player.view.y-zone.view.y)<=70+PLAYER.radius)
          player.hurt(zone.damage,zone.view.x,zone.view.y);
        zone.view.setTexture('enemy-impact-detail').setTint(0xc6a1ff).setAlpha(1);
        zone.wait=0;zone.resolved=true;
      }else zone.view.setAlpha(0.6+0.35*Math.sin(zone.wait*0.015)**2);
    }
  }
  cancel(id:number):void {this.zones.get(id)?.view.destroy();this.zones.delete(id);}
  reset():void {for(const id of this.zones.keys())this.cancel(id);}
}
