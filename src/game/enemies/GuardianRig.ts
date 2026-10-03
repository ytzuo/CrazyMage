import type Phaser from 'phaser';
import { enemyArtScale } from '../art/CharacterTextures';
import type { Enemy } from './EnemySystem';
import type { GuardianMove } from './GuardianRules';
export interface GuardianPose {move:GuardianMove|null;charge:number;dashing:boolean;exposed:boolean;enraged:boolean;secondSweep:boolean}
/** Seven cached images per guardian; actor container owns their lifetime. */
export class GuardianRig {
  readonly parts:Phaser.GameObjects.Image[]=[];
  private phase=0;private time=0;private amount=0;private facing=1;
  private scale=1;private flip=1;private bob=0;
  private tinted=false;private fill=false;private tint=0xffffff;
  constructor(scene:Phaser.Scene,private enemy:Enemy) {
    const make=(key:string)=>{const view=scene.add.image(0,0,key);this.parts.push(view);return view;};
    const limbs=['guardian-leg-left','guardian-leg-right','guardian-arm-left','guardian-arm-right'].map(make);
    enemy.view.addAt(limbs,enemy.view.getIndex(enemy.body));
    enemy.body.setTexture('guardian-torso');
    enemy.view.addAt(['guardian-core','guardian-plate-left','guardian-plate-right'].map(make),enemy.view.getIndex(enemy.body)+1);
  }
  advance(delta:number,dx:number,dy:number):void {
    if(delta<=0)return;this.time=(this.time+delta)%10000;
    const distance=Math.hypot(dx,dy);this.amount+=(Number(distance>.001)-this.amount)*(1-Math.exp(-delta/100));
    if(this.amount<.001)this.amount=0;
    this.phase=(this.phase+distance/85*Math.PI*2)%(Math.PI*2);if(Math.abs(dx)>.001)this.facing=dx<0?-1:1;
  }
  pose(state:GuardianPose):void {
    const {enemy}=this,base=enemyArtScale('boss',enemy.spec.radius),flip=(state.move?enemy.aim.x<0:this.facing<0)?-1:1;
    const stride=Math.sin(this.phase)*this.amount,bob=Math.abs(Math.cos(this.phase))*this.amount*1.4;
    const strike=Math.sin(Math.PI*(1-enemy.attackTime/230))*Number(enemy.attackTime>0);
    const lean=state.dashing?.17:state.exposed?.035:state.move==='sweep'?-.13*state.charge:.045*stride;
    const torso=state.enraged?'guardian-torso-enraged':'guardian-torso';
    if(enemy.body.texture.key!==torso)enemy.body.setTexture(torso);
    for(let i=2;i<4;i++){const key=`guardian-arm-${i===2?'left':'right'}${state.enraged?'-enraged':''}`;if(this.parts[i].texture.key!==key)this.parts[i].setTexture(key);}
    enemy.body.setFlipX(flip<0)
      .setPosition(0,-3-bob+(state.exposed?4:0)).setScale(base*(1+strike*.05),base*(1-state.charge*.05)).setRotation(lean*flip);
    this.scale=base;this.flip=flip;this.bob=bob;
    const lifting=state.move==='stomp'?state.charge*15:0;
    this.place(0,-21,16-Math.max(0,stride)*5-lifting,stride*.13,.5,0);this.place(1,21,16-Math.max(0,-stride)*5,-stride*.13,.5,0);
    this.place(2,-42,-25,state.move==='sweep'&&!state.secondSweep?-state.charge*.9+strike*1.3:state.dashing?-.4:-stride*.09,.5,.125);
    this.place(3,43,-23,state.move==='sweep'&&state.secondSweep?state.charge*.9-strike*1.3:state.move==='rupture'?-state.charge*.5:state.dashing?.4:stride*.09,.5,.125);
    this.parts[2].setScale(base*1.12);
    const core=this.parts[4];core.setPosition(0,1-bob).setScale(base*(state.exposed?1.1+Math.sin(this.time/110)*.06:1)).setAlpha(state.exposed?1:.72);
    const open=state.exposed?19:0;this.place(5,-9-open,2,state.exposed?-.45:0);this.place(6,9+open,2,state.exposed?.45:0);
    this.syncTint();
  }
  private place(i:number,x:number,y:number,rotation:number,ox=.5,oy=.5):void {
    this.parts[i].setPosition(x*this.scale*this.flip,y*this.scale-this.bob).setOrigin(ox,oy).setScale(this.scale).setFlipX(this.flip<0).setRotation(rotation*this.flip);
  }
  syncTint():void {
    const body=this.enemy.body;
    if(this.tinted===body.isTinted&&this.fill===body.tintFill&&this.tint===body.tintTopLeft)return;
    this.tinted=body.isTinted;this.fill=body.tintFill;this.tint=body.tintTopLeft;
    for(const part of this.parts)if(body.tintFill)part.setTintFill(body.tintTopLeft);else if(body.isTinted)part.setTint(body.tintTopLeft);else part.clearTint();
  }
  destroy():void {for(const part of this.parts)part.destroy();this.parts.length=0;}
}
