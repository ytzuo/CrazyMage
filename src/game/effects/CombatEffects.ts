import Phaser from 'phaser';
import type { Direction } from '../config';
import type { School } from '../upgrades/definitions';
interface Mote { view:Phaser.GameObjects.Image; age:number; life:number; vx:number; vy:number; size:number; grow:number; spin:number }
export const SCHOOL_COLOR:Record<School,number>={fire:0xffb36a,ice:0xa4eaff,lightning:0xeee3a0};
/** Cosmetic only: at most 96 images, lifetime ≤650 ms, active game time. */
export class CombatEffects {
  static readonly limit=96;
  private motes:Mote[]=[];
  get count():number{return this.motes.length;}
  constructor(private scene:Phaser.Scene){
    if(scene.textures.exists('feedback-spark'))return;
    const g=scene.make.graphics({},false);
    g.fillStyle(0xffffff).fillTriangle(16,1,21,16,16,31).fillTriangle(16,1,11,16,16,31);
    g.generateTexture('feedback-spark',32,32);g.clear();
    g.lineStyle(2,0xffffff,0.8).strokeCircle(32,32,28);
    g.generateTexture('feedback-ring',64,64);g.clear();
    g.fillStyle(0xffffff).beginPath().moveTo(16,1).lineTo(22,12).lineTo(25,22).lineTo(20,29).lineTo(10,29).lineTo(6,21).lineTo(12,14).lineTo(10,8).closePath().fillPath();
    g.generateTexture('feedback-ember',32,32);g.clear();
    g.lineStyle(2,0xffffff).beginPath().moveTo(22,1).lineTo(9,16).lineTo(19,13).lineTo(8,31).strokePath();
    g.generateTexture('feedback-zap',32,32);g.destroy();
  }
  private add(x:number,y:number,color:number,size:number,life:number,vx=0,vy=0,grow=0,ring=false,texture?:string):void{
    if(this.motes.length>=CombatEffects.limit)this.motes.shift()!.view.destroy();
    const view=this.scene.add.image(x,y,texture ?? (ring?'feedback-ring':'feedback-spark')).setTint(color).setDepth(13).setDisplaySize(size,size);
    if(!ring)view.setRotation(Math.atan2(vy,vx)+Math.PI/2);
    this.motes.push({view,age:0,life,vx,vy,size,grow,spin:ring?0:2});
  }
  private burst(x:number,y:number,color:number,count:number,size:number,speed:number):void{
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count+Math.PI/8;
      this.add(x,y,color,size,380+(i%3)*80,Math.cos(angle)*speed,Math.sin(angle)*speed,0.2);
    }
  }
  hit(x:number,y:number,direction:Direction):void{
    for(let i=0;i<3;i++){
      const angle=Math.atan2(direction.y,direction.x)+(i-1)*0.65;
      this.add(x,y,0xffe2ba,9,240,Math.cos(angle)*110,Math.sin(angle)*110,-0.6);
    }
  }
  spellHit(x:number,y:number,school:School,direction:Direction):void{
    const fire=school==='fire', color=fire?0xffb557:school==='lightning'?0xb8caff:SCHOOL_COLOR.ice;
    this.add(x,y,color,fire?28:36,260,0,0,0.8,true);
    for(let i=0;i<4;i++){
      const angle=Math.atan2(direction.y,direction.x)+Math.PI/4+i*Math.PI/2;
      this.add(x,y,i%2?color:0xfff1c6,fire?10:15,280+(i%2)*80,Math.cos(angle)*105,Math.sin(angle)*105,-0.65,false,fire?'feedback-ember':'feedback-zap');
    }
  }
  shatter(x:number,y:number,radius:number):void {
    this.burst(x,y,0xd2f7ff,12,12,140);
    this.add(x,y,0x9de6ff,radius*2.8,350,0,0,0.6,true);
  }
  block(x:number,y:number,radius:number):void{
    this.add(x,y,0xbcecff,radius*2.3,280,0,0,0.3,true);
    this.burst(x,y,0x9bd9ef,4,9,70);
  }
  death(x:number,y:number,color:number,radius:number):void{
    this.burst(x,y,color,8,12,85);this.add(x,y,color,radius*1.4,450,0,0,1.4,true);
  }
  attack(x:number,y:number,direction:Direction,ranged:boolean):void{
    const color=ranged?0xd9a8ff:0xff966b;
    this.add(x+direction.x*22,y+direction.y*22,color,26,220,0,0,1,true);
    for(let i=-1;i<=1;i++)this.add(x,y,color,10,260,direction.x*100-direction.y*i*45,direction.y*100+direction.x*i*45,-0.6);
  }
  cast(x:number,y:number,school:School,aim:Direction):void{
    const color=SCHOOL_COLOR[school];
    this.add(x,y-8,color,34,220,0,0,0.65,true);
    for(let i=-1;i<=1;i++)this.add(x+aim.x*24,y-8+aim.y*24,color,school==='lightning'?13:9,200,aim.x*100-aim.y*i*50,aim.y*100+aim.x*i*50,-0.6,false,school==='fire'?'feedback-ember':school==='lightning'?'feedback-zap':undefined);
  }
  empower(x:number,y:number,school:School):void{
    this.burst(x,y-8,SCHOOL_COLOR[school],12,12,100);
    this.add(x,y,SCHOOL_COLOR[school],60,650,0,0,1.3,true);
  }
  clear(x:number,y:number):void{this.burst(x,y,0xc0e6aa,12,10,130);this.add(x,y,0xc0e6aa,72,600,0,0,2,true);}
  update(delta:number):void{
    for(let i=this.motes.length-1;i>=0;i--){
      const mote=this.motes[i];mote.age+=delta;
      if(mote.age>=mote.life){mote.view.destroy();this.motes.splice(i,1);continue;}
      const t=mote.age/mote.life,size=mote.size*(1+mote.grow*t);
      mote.view.x+=mote.vx*delta/1000;mote.view.y+=mote.vy*delta/1000;
      mote.view.rotation+=mote.spin*delta/1000;
      mote.view.setDisplaySize(size,size).setAlpha((1-t)**2);
    }
  }
  reset():void{for(const mote of this.motes)mote.view.destroy();this.motes.length=0;}
}
