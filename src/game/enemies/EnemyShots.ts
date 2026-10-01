import Phaser from 'phaser';
import { ARENA, PLAYER, type Direction } from '../config';
import { segmentCircleHit } from '../combat/collision';
import type { Player } from '../entities/Player';
import { ENEMY_SHOTS } from './roster';
interface Shot { view: Phaser.GameObjects.Image; direction: Direction; damage: number; age: number }
/** Fixed aim; bounded projectiles are released on hit, expiry, boundary or reset. */
export class EnemyShots {
  private shots: Shot[] = [];
  get count(): number { return this.shots.length; }
  constructor(private scene: Phaser.Scene) {
    if(scene.textures.exists('enemy-shot')) return;
    const g=scene.make.graphics({},false);
    g.fillStyle(0xba98f3,0.2).fillCircle(12,12,11);
    g.fillStyle(0xc0a2ff).fillCircle(12,12,7);
    g.fillStyle(0xf0ddff).fillCircle(12,12,3);
    g.generateTexture('enemy-shot',24,24);g.destroy();
  }
  fire(x:number,y:number,direction:Direction,damage:number): boolean {
    if(this.shots.length>=ENEMY_SHOTS.maximum) return false;
    const view=this.scene.add.image(x,y,'enemy-shot').setDepth(11);
    this.shots.push({view,direction:{...direction},damage,age:0});return true;
  }
  update(delta:number,player:Player): void {
    for(let i=this.shots.length-1;i>=0;i--) {
      const shot=this.shots[i], x=shot.view.x,y=shot.view.y;
      const step=ENEMY_SHOTS.speed*Math.min(delta,ENEMY_SHOTS.lifetime-shot.age)/1000;
      const nextX=x+shot.direction.x*step,nextY=y+shot.direction.y*step;
      shot.age+=delta;shot.view.setPosition(nextX,nextY);
      const hit=segmentCircleHit(x,y,nextX,nextY,player.view.x,player.view.y,PLAYER.radius+ENEMY_SHOTS.radius)!==null;
      if(hit) player.hurt(shot.damage,x,y);
      if(hit||shot.age>=ENEMY_SHOTS.lifetime||nextX<ARENA.inset||nextX>ARENA.width-ARENA.inset||nextY<ARENA.inset||nextY>ARENA.height-ARENA.inset) {
        shot.view.destroy();this.shots.splice(i,1);
      }
    }
  }
  reset(): void { for(const shot of this.shots) shot.view.destroy();this.shots.length=0; }
}
