import type Phaser from 'phaser';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { IceSpec } from '../upgrades/build';
interface Field {x:number;y:number;remaining:number;spec:IceSpec;views:Phaser.GameObjects.Image[]}
/** Shared tick; overlapping grounded lances only apply the strongest field damage. */
export class IceLanceFields {
  private fields:Field[]=[];
  private wait=300;
  get count():number{return this.fields.length;}
  constructor(private scene:Phaser.Scene){}
  add(x:number,y:number,spec:IceSpec):void {
    if(!spec.ground)return;
    if(this.fields.length>=12)for(const view of this.fields.shift()!.views)view.destroy();
    const views=[this.scene.add.image(x,y,'ice-domain-detail').setDepth(5).setDisplaySize(spec.ground.radius*2,spec.ground.radius*2),
      this.scene.add.image(x,y,'ice-ground-spike').setOrigin(0.5,0.9).setDepth(7).setDisplaySize(36,72)];
    this.fields.push({x,y,spec,remaining:spec.ground.duration,views});
  }
  update(delta:number,enemies:EnemySystem):boolean {
    for(let i=this.fields.length-1;i>=0;i--){
      const field=this.fields[i];field.remaining-=delta;
      if(field.remaining<=0){for(const view of field.views)view.destroy();this.fields.splice(i,1);continue;}
      for(const view of field.views)view.setAlpha(Math.min(1,field.remaining/300));
    }
    if(!this.fields.length){this.wait=300;return false;}
    this.wait-=delta;if(this.wait>0)return false;this.wait+=300;
    const cleared=enemies.waves.cleared;
    for(const enemy of [...enemies.enemies]){
      if(enemy.spawning>0||enemy.health.dead)continue;
      let strongest:Field|undefined;
      for(const field of this.fields)if((enemy.view.x-field.x)**2+(enemy.view.y-field.y)**2<=(field.spec.ground!.radius+enemy.spec.radius)**2 &&
        (!strongest||field.spec.ground!.damage>strongest.spec.ground!.damage))strongest=field;
      if(strongest&&enemies.hit(enemy,strongest.spec.ground!.damage,{x:0,y:0},'spell',null,true))enemies.slow(enemy,strongest.spec.slow,500);
      if(enemies.waves.cleared!==cleared){this.reset();return true;}
    }
    return false;
  }
  reset():void{for(const field of this.fields)for(const view of field.views)view.destroy();this.fields.length=0;this.wait=300;}
}
