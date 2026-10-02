import type Phaser from 'phaser';
type Palette={light:number;dark:number;trim:number};
const ink=0x252b35;
export const MAGE_LEGS={y:167,overlap:8,width:26,height:33,left:39,right:64} as const;
/** Long robes hide the knees, leaving two distinct boots below the hem. */
export function paintMageLeg(g:Phaser.GameObjects.Graphics,p:Palette,x:number,dx=0,dy=0):void {
  x+=dx;
  g.fillStyle(p.dark).lineStyle(2,ink).fillRoundedRect(x,162+dy,19,20,3).strokeRoundedRect(x,162+dy,19,20,3);
  g.fillStyle(p.light).fillRect(x+3,167+dy,5,10);
  g.fillStyle(ink).fillRoundedRect(x-2,175+dy,23,16,4);
  g.fillStyle(0x6b5550).fillRoundedRect(x,177+dy,18,11,3);
  g.lineStyle(2,p.trim).lineBetween(x+2,179+dy,x+15,179+dy);
  g.lineStyle(2,0x927463).lineBetween(x,188+dy,x+17,188+dy);
}
/** Shared initialization textures; the game's texture manager owns their lifetime. */
export function prepareMageLegTextures(scene:Phaser.Scene,bodyKey:string,p:Palette):void {
  for(const [side,x,sourceX] of [['left',MAGE_LEGS.left,42],['right',MAGE_LEGS.right,67]] as const) {
    const key=`${bodyKey}-${side}`;
    if(scene.textures.exists(key))continue;
    const g=scene.make.graphics({},false);
    paintMageLeg(g,p,sourceX,-x,MAGE_LEGS.overlap-MAGE_LEGS.y);
    g.generateTexture(key,MAGE_LEGS.width,MAGE_LEGS.height);g.destroy();
  }
}
