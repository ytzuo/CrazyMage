import type Phaser from 'phaser';
import type { Enemy } from './EnemySystem';
/** Six arms, three floating shards and a core; hidden arms are reused at half health. */
export class WeaverRig {
  readonly parts:Phaser.GameObjects.Image[]=[];
  private time=0;private drift=0;private tinted=false;private fill=false;private tint=0xffffff;
  constructor(scene:Phaser.Scene,private enemy:Enemy) {
    for(let i=0;i<10;i++)this.parts.push(scene.add.image(0,0,i<6?'weaver-arm':i<9?'weaver-fragment':'weaver-core'));
    enemy.view.addAt(this.parts.slice(0,9),enemy.view.getIndex(enemy.body));
    enemy.view.addAt(this.parts[9],enemy.view.getIndex(enemy.body)+1);
  }
  advance(delta:number,dx:number):void {
    this.time=(this.time+delta)%12000;this.drift+=(Math.max(-8,Math.min(8,-dx*.7))-this.drift)*(1-Math.exp(-delta/220));
  }
  pose(charge:number):void {
    const e=this.enemy,scale=e.spec.radius/40,enraged=e.health.current<e.health.maximum/2,bob=Math.sin(this.time/430)*3;
    const key=enraged?'weaver-torso-enraged':'weaver-torso';if(e.body.texture.key!==key)e.body.setTexture(key);
    e.body.setPosition(0,-15+bob).setScale(scale).setRotation(Math.sin(this.time/700)*.025);
    for(let i=0;i<6;i++) {
      const side=i%2===0?-1:1,row=Math.floor(i/2),a=this.parts[i];
      a.setVisible(row<2||enraged).setOrigin(side<0?.85:.15,.5).setScale(scale).setFlipX(side<0)
        .setPosition(side*20*scale,(-42+row*18)*scale+bob)
        .setRotation(side*((row-1)*.38-charge*.48+Math.sin(this.time/500+row)*.045));
    }
    for(let i=0;i<3;i++)this.parts[6+i].setScale(scale*.8).setPosition((i-1)*25*scale+this.drift,(37+(i%2)*11)*scale+Math.sin(this.time/480-i*.7)*5)
      .setRotation((i-1)*.3+Math.sin(this.time/610-i)*.08);
    this.parts[9].setPosition(0,-6+bob).setScale(scale*(.8+charge*.15)).setAlpha(.8+Math.sin(this.time/190)*.15);
    this.syncTint();
  }
  syncTint():void {
    const b=this.enemy.body;if(this.tinted===b.isTinted&&this.fill===b.tintFill&&this.tint===b.tintTopLeft)return;
    this.tinted=b.isTinted;this.fill=b.tintFill;this.tint=b.tintTopLeft;
    for(const p of this.parts)if(b.tintFill)p.setTintFill(b.tintTopLeft);else if(b.isTinted)p.setTint(b.tintTopLeft);else p.clearTint();
  }
  destroy():void {for(const p of this.parts)p.destroy();this.parts.length=0;}
}
