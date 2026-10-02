import Phaser from 'phaser';
import type { Direction } from '../config';
import type { School } from '../upgrades/definitions';
import type { EnemySystem } from '../enemies/EnemySystem';
import { SCHOOL_COLOR } from '../effects/CombatEffects';
import { segmentCircleHit } from '../combat/collision';
import { skillEndpoint } from '../spells/SchoolSkill';

/** Four persistent cached images; preview never casts or changes enemy state. */
export class AimIndicator {
  private arrow:Phaser.GameObjects.Image;
  private line:Phaser.GameObjects.Image;
  private area:Phaser.GameObjects.Image;
  private point:Phaser.GameObjects.Image;
  constructor(scene:Phaser.Scene){
    if(!scene.textures.exists('player-aim-arrow')){
      const g=scene.make.graphics({},false);
      g.lineStyle(4,0x101c18,0.8).beginPath().moveTo(9,5).lineTo(28,16).lineTo(9,27).strokePath();
      g.lineStyle(2,0xffffff).beginPath().moveTo(9,5).lineTo(28,16).lineTo(9,27).strokePath();
      g.generateTexture('player-aim-arrow',40,32);g.clear();
      g.lineStyle(2,0xffffff,0.9).strokeCircle(64,64,62);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;g.lineStyle(1,0xffffff,0.4).lineBetween(64+Math.cos(a)*51,64+Math.sin(a)*51,64+Math.cos(a)*57,64+Math.sin(a)*57);}
      g.generateTexture('player-aim-area',128,128);g.clear();
      g.lineStyle(2,0xffffff).lineBetween(16,6,16,26).lineBetween(6,16,26,16);
      g.generateTexture('player-aim-point',32,32);g.destroy();
    }
    this.arrow=scene.add.image(0,0,'player-aim-arrow').setDepth(11).setDisplaySize(30,24);
    this.line=scene.add.image(0,0,'enemy-aim-detail').setOrigin(0,0.5).setDepth(6).setAlpha(0.4);
    this.area=scene.add.image(0,0,'player-aim-area').setDepth(6).setAlpha(0.45);
    this.point=scene.add.image(0,0,'player-aim-point').setDepth(6).setAlpha(0.7).setDisplaySize(18,18);
    this.hide();
  }
  update(x:number,y:number,school:School,basicAim:Direction,skillAim:Direction,ready:boolean,enemies:EnemySystem):void {
    const color=SCHOOL_COLOR[school];
    this.arrow.setVisible(school!=='ice').setTint(color).setPosition(x+basicAim.x*47,y+basicAim.y*47).setRotation(Math.atan2(basicAim.y,basicAim.x));
    this.line.setVisible(ready&&school!=='ice');this.area.setVisible(ready&&school!=='lightning');this.point.setVisible(ready&&school==='fire');
    if(!ready)return;
    if(school==='ice'){this.area.setTint(color).setPosition(x,y).setDisplaySize(480,480);return;}
    let end=skillEndpoint(x,y,skillAim,school==='fire'?190:560);
    if(school==='fire'){
      let first=1;
      for(const enemy of enemies.enemies){
        if(enemy.spawning>0||enemy.health.dead)continue;
        const t=segmentCircleHit(x,y,end.x,end.y,enemy.view.x,enemy.view.y,enemy.spec.radius+12);
        if(t!==null)first=Math.min(first,t);
      }
      end={x:x+(end.x-x)*first,y:y+(end.y-y)*first};
      this.area.setTint(color).setPosition(end.x,end.y).setDisplaySize(220,220);
      this.point.setTint(color).setPosition(end.x,end.y);
    }
    this.line.setTint(color).setPosition(x,y).setRotation(Math.atan2(skillAim.y,skillAim.x)).setDisplaySize(Math.hypot(end.x-x,end.y-y),school==='fire'?8:48);
  }
  hide():void{this.arrow.setVisible(false);this.line.setVisible(false);this.area.setVisible(false);this.point.setVisible(false);}
  destroy():void{this.arrow.destroy();this.line.destroy();this.area.destroy();this.point.destroy();}
}
