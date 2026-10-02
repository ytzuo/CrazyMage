import type Phaser from 'phaser';
import { enemyLegLayout, LEG_OVERLAP } from '../art/EnemyLegTextures';
import type { EnemyKind } from './roster';

/** Distance-driven gait. Each legged actor owns exactly two images, freed by its view. */
export class EnemyLocomotion {
  readonly legs:Phaser.GameObjects.Image[]=[];
  phase:number;
  amount=0;
  facing=1;
  private dx=1;
  private dy=0;
  private readonly layout;
  constructor(scene:Phaser.Scene, view:Phaser.GameObjects.Container, body:Phaser.GameObjects.Image,
    private shadow:Phaser.GameObjects.Ellipse, private kind:EnemyKind, seed:number) {
    this.phase=seed*2.39996%(Math.PI*2);
    this.layout=enemyLegLayout(kind);
    if(this.layout) {
      const key=body.texture.key;
      for(const side of ['left','right'])this.legs.push(scene.add.image(0,0,`${key}-${side}`).setOrigin(0,0));
      view.addAt(this.legs,view.getIndex(body));body.setTexture(`${key}-torso`);
    }
    this.apply(body,false);
  }
  advance(delta:number,dx:number,dy:number):void {
    if(delta<=0)return;
    const distance=Math.hypot(dx,dy), moving=distance>0.001;
    const blend=1-Math.exp(-delta/(moving?65:90));
    this.amount+=(Number(moving)-this.amount)*blend;
    if(this.amount<0.001)this.amount=0;
    if(!moving)return;
    this.dx=dx/distance;this.dy=dy/distance;
    if(Math.abs(this.dx)>0.15)this.facing=this.dx<0?-1:1;
    const stride=this.kind==='swift'?64:this.kind==='brute'?60:this.kind==='bomber'?48:64;
    this.phase=(this.phase+distance/stride*Math.PI*2)%(Math.PI*2);
  }
  stop():void {this.amount=0;}
  apply(body:Phaser.GameObjects.Image, attacking:boolean):void {
    const amount=attacking?0:this.amount;
    let bob=0;
    if(amount) {
      const step=Math.sin(this.phase), bounce=Math.abs(Math.cos(this.phase));
      const heavy=this.kind==='brute'||this.kind==='bomber';
      bob=bounce*amount*(heavy?1.5:2.3);
      body.y-=bob;
      body.rotation+=step*amount*(heavy?0.045:0.075);
      body.scaleY*=1-bounce*amount*0.025;
    }
    if(this.layout) {
      const {layout}=this, flip=body.flipX?-1:1;
      const cos=Math.cos(body.rotation),sin=Math.sin(body.rotation);
      for(let i=0;i<2;i++) {
        const leg=this.legs[i], step=Math.sin(this.phase+i*Math.PI);
        const lift=Math.max(0,Math.cos(this.phase+i*Math.PI))*amount;
        const pivot=i===0?layout.pivotLeft:layout.pivotRight;
        const x=(pivot-64)*flip*body.scaleX+step*amount*this.dx*5;
        const y=(layout.y-64)*body.scaleY+step*amount*this.dy*2-lift*3;
        const origin=(pivot-(i===0?layout.left:layout.right))/layout.width;
        leg.setOrigin(body.flipX?1-origin:origin,LEG_OVERLAP/leg.height);
        leg.setPosition(body.x+x*cos-y*sin,body.y+x*sin+y*cos+bob);
        leg.setScale(body.scaleX,body.scaleY).setFlipX(body.flipX);
        leg.setRotation(body.rotation+step*amount*(this.kind==='swift'?0.3:0.16)*flip);
      }
    }
    this.shadow.setScale(1-amount*Math.abs(Math.cos(this.phase))*0.06,1);
    this.syncTint(body);
  }
  syncTint(body:Phaser.GameObjects.Image):void {
    for(const leg of this.legs) {
      if(body.tintFill)leg.setTintFill(body.tintTopLeft,body.tintTopRight,body.tintBottomLeft,body.tintBottomRight);
      else if(body.isTinted)leg.setTint(body.tintTopLeft,body.tintTopRight,body.tintBottomLeft,body.tintBottomRight);
      else leg.clearTint();
    }
  }
}
