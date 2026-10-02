import type Phaser from 'phaser';
import { prepareIceTextures } from '../art/SpellTextures';
import type { IceShardSpec } from '../combat/IceEffectsSpec';
import type { EnemySystem } from '../enemies/EnemySystem';
interface Shard { view: Phaser.GameObjects.Image; x: number; y: number; dx: number; dy: number; age: number; arrived:boolean }
/** Damage settles once on death; flight is cosmetic and cannot recursively burst. */
export class IceShards {
  private visuals: Shard[] = [];
  constructor(private scene: Phaser.Scene) { prepareIceTextures(scene); }
  burst(x: number, y: number, spec: IceShardSpec, enemies: EnemySystem): void {
    const targets = enemies.enemies.filter(e => !e.health.dead && e.spawning === 0 &&
      (e.view.x-x)**2+(e.view.y-y)**2 <= spec.radius**2)
      .sort((a,b) => (a.view.x-x)**2+(a.view.y-y)**2-((b.view.x-x)**2+(b.view.y-y)**2))
      .slice(0,spec.targets);
    for (const enemy of targets) {
      const dx=enemy.view.x-x, dy=enemy.view.y-y, length=Math.hypot(dx,dy)||1;
      if(this.visuals.length>=24)this.visuals.shift()!.view.destroy();
      const view=this.scene.add.image(x,y,'ice-shard-flight').setDepth(16).setOrigin(0.7,0.5).setDisplaySize(68,34).setRotation(Math.atan2(dy,dx));
      this.visuals.push({view,x,y,dx,dy,age:0,arrived:false});
      if(enemies.hit(enemy,spec.damage,{x:dx/length,y:dy/length},'spell',null,false,null,true))
        enemies.slow(enemy,spec.slow,spec.duration);
    }
  }
  update(delta:number):void {
    for(let i=this.visuals.length-1;i>=0;i--) {
      const shard=this.visuals[i];shard.age+=delta;
      if(shard.age>=460){shard.view.destroy();this.visuals.splice(i,1);continue;}
      if(shard.age<300){
        const t=shard.age/300;
        shard.view.setPosition(shard.x+shard.dx*t,shard.y+shard.dy*t).setAlpha(0.9+0.1*Math.sin(shard.age/40));
      }else{
        if(!shard.arrived){
          shard.arrived=true;
          shard.view.setTexture('ice-shard-impact').setOrigin(0.5).setRotation(0).setPosition(shard.x+shard.dx,shard.y+shard.dy);
        }
        const t=(shard.age-300)/160,size=48+24*t;
        shard.view.setDisplaySize(size,size).setAlpha(1-t);
      }
    }
  }
  reset():void{for(const shard of this.visuals)shard.view.destroy();this.visuals.length=0;}
}
