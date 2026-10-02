import type Phaser from 'phaser';
const ink=0x282d35;
function polygon(g:Phaser.GameObjects.Graphics,points:number[],color:number):void {
  g.fillStyle(color).lineStyle(2,ink).beginPath().moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
  g.closePath().fillPath().strokePath();
}
function core(g:Phaser.GameObjects.Graphics,x:number,y:number,r:number,color:number):void {
  g.fillStyle(color,0.15).fillCircle(x,y,r+7);
  g.fillStyle(ink).fillCircle(x,y,r+3);
  g.fillStyle(color).fillCircle(x,y,r);
  g.fillStyle(0xffedb5).fillCircle(x-1,y-1,r*0.55);
  g.fillStyle(0xffffff).fillEllipse(x-3,y-4,3,5);
  g.lineStyle(2,0xedd2a1).strokeCircle(x,y,r+2);
}
/** Four distinct cached silhouettes, each 128×128; no external image downloads. */
export function prepareSpecialEnemyTextures(scene:Phaser.Scene):void {
  for(const [kind,variant] of [['bomber','normal'],['bomber','chain'],['priest','normal'],['priest','ward']] as const) {
    const key=`enemy-${kind}-detail${variant==='normal'?'':`-${variant}`}`;
    if(scene.textures.exists(key))continue;
    const g=scene.make.graphics({},false);
    if(kind==='bomber') {
      if(variant==='chain')for(const side of [-1,1])for(let i=0;i<3;i++){
        const x=64+side*(31+i*6),y=30+i*12;
        polygon(g,[x,y,x+side*17,y-13,x+side*14,y+9,x,y+15],0x69544a);
        g.lineStyle(2,0xffb56f).lineBetween(x,y+2,x+side*12,y-6);
      }
      for(const x of [35,74]) {
        g.fillStyle(ink).fillRoundedRect(x,96,21,23,4);
        g.fillStyle(0x9c765b).fillRoundedRect(x+2,98,17,16,3);
        g.lineStyle(3,0xd7aa78).lineBetween(x+4,109,x+16,109);
      }
      polygon(g,[32,42,47,33,81,33,96,42,93,93,78,104,49,104,33,91],0xa67554);
      polygon(g,[38,46,52,39,52,93,39,86],0xd7a478);
      polygon(g,[81,40,91,48,87,90,74,97],0x714c3d);
      for(const x of [18,92]) {
        g.fillStyle(ink).fillRoundedRect(x,52,20,43,7);
        g.fillStyle(0xbd8c61).fillRoundedRect(x+2,54,16,37,5);
        g.lineStyle(3,0x574d47).lineBetween(x+2,68,x+17,68);
        g.fillStyle(0xe9c591).fillCircle(x+10,59,3);
      }
      polygon(g,[43,23,50,12,78,12,85,24,81,40,47,40],0x795943);
      g.fillStyle(ink).fillRoundedRect(50,22,28,9,3);
      g.fillStyle(0xffd28a).fillRect(54,24,7,4).fillRect(68,24,7,4);
      g.lineStyle(3,0xff9d57).lineBetween(44,50,39,64).lineBetween(39,64,46,74).lineBetween(80,87,85,96);
      g.lineStyle(2,0x5a4037).lineBetween(74,46,79,52).lineBetween(48,90,58,98);
      if(variant==='chain'){core(g,64,55,10,0xff9151);core(g,64,82,10,0xff9151);}
      else core(g,64,69,17,0xff9151);
    }else {
      if(variant==='ward')polygon(g,[10,51,64,8,118,51,98,59,64,29,29,59],0xd5b771);
      polygon(g,[47,42,80,42,88,79,97,107,78,101,66,117,54,102,31,108,41,78],0x285c60);
      polygon(g,[45,48,61,61,55,99,40,104],0x58a493);
      polygon(g,[74,52,82,50,86,96,69,106,65,76],0x193e4b);
      g.lineStyle(2,0xdbcc8c).lineBetween(46,64,41,98).lineBetween(76,67,84,98);
      polygon(g,[39,37,46,19,64,11,83,22,89,39,78,59,50,59],0x367778);
      polygon(g,[49,34,64,23,79,35,73,51,55,51],0xe7d7a2);
      g.fillStyle(0x1d4c50).fillEllipse(56,38,5,8).fillEllipse(71,38,5,8);
      g.fillStyle(0x8ffff0).fillCircle(56,37,2).fillCircle(71,37,2);
      polygon(g,[30,57,43,53,45,74,35,79,25,68],0x508e83);
      polygon(g,[87,54,99,58,106,69,96,79,84,72],0x508e83);
      g.lineStyle(2,0xdacb92).lineBetween(45,56,64,67).lineBetween(64,67,84,56);
      polygon(g,[64,61,70,68,64,75,58,68],0x8be4c8);
      if(variant==='ward') {
        for(const [x,y] of [[22,40],[106,40],[64,8]])core(g,x,y,7,0x85dfc3);
        g.lineStyle(2,0x99e9cc).lineBetween(36,87,64,104).lineBetween(64,104,91,87);
      }else {
        g.lineStyle(2,0xc5d39b,0.65).strokeEllipse(92,40,30,22);
        core(g,106,38,8,0x85dfc3);
      }
    }
    g.generateTexture(key,128,128);g.destroy();
  }
}
