import type Phaser from 'phaser';
import type { EnemySystem } from '../enemies/EnemySystem';
import type { FireFieldSpec } from '../combat/BurnSpec';
interface Field {x:number;y:number;remaining:number;spec:FireFieldSpec;view:Phaser.GameObjects.Image}
/** Shared tick: overlapping fields apply only the strongest damage to each enemy. */
export class FireFields {
  private fields:Field[]=[];
  private wait=300;
  get count():number{return this.fields.length;}
  constructor(private scene:Phaser.Scene){}
  add(x:number,y:number,spec:FireFieldSpec):void {
    if(this.fields.length>=18) this.fields.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,'fire-nova-detail').setDepth(5).setDisplaySize(spec.radius*2,spec.radius*2).setAlpha(0.5);
    this.fields.push({x,y,spec,remaining:spec.duration,view});
  }
  /** Stops combat updates immediately when a field completes a wave. */
  update(delta:number,enemies:EnemySystem):boolean {
    if(!this.fields.length){this.wait=300;return false;}
    for(let i=this.fields.length-1;i>=0;i--) {
      const field=this.fields[i];field.remaining-=delta;
      if(field.remaining<=0){field.view.destroy();this.fields.splice(i,1);continue;}
      field.view.setAlpha(Math.min(1,field.remaining/400)*(0.45+0.08*Math.sin(field.remaining/130)));
    }
    this.wait-=delta;
    if(this.wait>0)return false;
    this.wait+=300;
    const cleared=enemies.waves.cleared;
    const activeFields=[...this.fields];
    for(const enemy of [...enemies.enemies]) {
      if(enemy.spawning>0||enemy.health.dead)continue;
      let damage=0;
      for(const field of activeFields) if((enemy.view.x-field.x)**2+(enemy.view.y-field.y)**2<=(field.spec.radius+enemy.spec.radius)**2) damage=Math.max(damage,field.spec.damage);
      if(damage>0)enemies.hit(enemy,damage,{x:0,y:0},'spell',null,true);
      if(enemies.waves.cleared!==cleared)return true;
    }
    return false;
  }
  reset():void{for(const field of this.fields)field.view.destroy();this.fields=[];this.wait=300;}
}
