import Phaser from 'phaser';
import type { Direction } from '../config';
import type { School } from '../upgrades/definitions';
import { SCHOOL_COLOR } from '../effects/CombatEffects';

/** One cached arrow at the player's feet; no range or landing-point preview. */
export class AimIndicator {
  private arrow:Phaser.GameObjects.Image;
  constructor(scene:Phaser.Scene){
    if(!scene.textures.exists('player-aim-arrow')){
      const g=scene.make.graphics({},false);
      g.lineStyle(4,0x101c18,0.8).beginPath().moveTo(9,5).lineTo(28,16).lineTo(9,27).strokePath();
      g.lineStyle(2,0xffffff).beginPath().moveTo(9,5).lineTo(28,16).lineTo(9,27).strokePath();
      g.generateTexture('player-aim-arrow',40,32);g.destroy();
    }
    this.arrow=scene.add.image(0,0,'player-aim-arrow').setDepth(8).setDisplaySize(24,20).setVisible(false);
  }
  update(x:number,y:number,school:School,aim:Direction):void {
    this.arrow.setVisible(true).setTint(SCHOOL_COLOR[school]).setPosition(x+aim.x*27,y+8+aim.y*27).setRotation(Math.atan2(aim.y,aim.x));
  }
  hide():void{this.arrow.setVisible(false);}
  destroy():void{this.arrow.destroy();}
}
