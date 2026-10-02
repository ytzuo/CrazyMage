import type Phaser from 'phaser';
import type { EnemyKind } from '../enemies/roster';
import type { EnemyVariant } from '../enemies/variants';
type Graphics=Phaser.GameObjects.Graphics;
const ink=0x252b35;
function plate(g:Graphics,points:number[],color:number,edge=ink):void {
  g.fillStyle(color).lineStyle(2,edge).beginPath().moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
  g.closePath().fillPath().strokePath();
}
function jewel(g:Graphics,x:number,y:number,size:number,color:number):void {
  plate(g,[x,y-size,x+size*0.65,y,x,y+size,x-size*0.65,y],color);
  g.fillStyle(0xe9fff5,0.85).fillTriangle(x,y-size+2,x,y+size-3,x-size*0.4,y);
  g.lineStyle(1,0xffffff,0.6).lineBetween(x,y-size+3,x+size*0.45,y);
}
function rivet(g:Graphics,x:number,y:number):void {
  g.fillStyle(ink).fillCircle(x,y,3);g.fillStyle(0xd0bd91).fillCircle(x,y-0.5,1.8);
}
/** Surface detail is baked once into existing 128×128 textures, never into actors. */
export function paintEnemyDetails(g:Graphics,kind:EnemyKind):void {
  if(kind==='chaser') {
    // Bone ridges, creased flesh, knuckles and asymmetric scars retain the round body.
    for(const [x,y,side] of [[27,29,-1],[96,29,1]]) {
      plate(g,[x,y,x+side*8,y-17,x-side*5,y-5],0xdac8ac);
      g.lineStyle(1,0x8c6a72).lineBetween(x,y-6,x+side*4,y-12);
    }
    g.lineStyle(2,0xf1bcbc,0.75).strokeEllipse(59,47,48,18);
    g.fillStyle(0x91586c).fillEllipse(39,69,17,23).fillEllipse(88,70,18,25);
    g.lineStyle(2,0xe3a4ac).lineBetween(33,62,29,72).lineBetween(94,60,98,70);
    g.lineStyle(3,0x724255).lineBetween(36,48,53,52).lineBetween(76,51,92,46);
    g.lineStyle(1,0xffdcd1).lineBetween(38,46,53,49).lineBetween(76,48,89,43);
    g.fillStyle(0x6d4155).fillEllipse(64,77,12,9);
    g.fillStyle(0xc88f99).fillEllipse(61,74,8,4);
    g.lineStyle(2,0x683e50).lineBetween(50,94,65,97).lineBetween(65,97,80,93);
    for(const [x,y] of [[30,93],[95,94]])for(let i=0;i<3;i++)plate(g,[x+i*4,y,x+i*4+1,y+9,x+i*4+4,y+1],0xe5d6b8);
    g.lineStyle(2,0x713f58).lineBetween(83,80,88,91);
    g.lineStyle(1,0xf3c2bc).lineBetween(79,83,88,81).lineBetween(82,87,91,85);
    for(const [x,y,r] of [[43,37,3],[85,40,2],[34,79,2.5],[87,98,2],[57,102,2]]){
      g.fillStyle(0x74485e,0.65).fillCircle(x,y,r);g.fillStyle(0xe5b2ae,0.6).fillCircle(x-0.7,y-1,r*0.45);
    }
  }else if(kind==='swift') {
    // Lean segmented hide and hooked feet make the speed threat legible at combat size.
    plate(g,[38,81,28,88,24,101,13,112,33,110,44,91],0x668846);
    plate(g,[84,84,98,90,102,104,117,115,96,111,77,95],0x4c6941);
    for(const [x,y,side] of [[22,104,-1],[105,107,1]])for(let i=0;i<3;i++)
      plate(g,[x+i*side*4,y,x+side*(8+i*4),y+8,x+side*(1+i*4),y+4],0xd4e3b1);
    plate(g,[50,49,63,31,76,47,73,57,53,57],0x9cbc62);
    g.lineStyle(2,0x3f593c).lineBetween(47,51,38,60).lineBetween(78,51,89,58);
    g.lineStyle(2,0xd5e997).lineBetween(52,39,59,31).lineBetween(42,73,38,84);
    for(const [x,y] of [[64,40],[57,84],[70,91]])plate(g,[x-4,y,x,y-8,x+5,y+1],0xbace87);
    g.fillStyle(ink).fillEllipse(63,81,22,9);
    for(const x of [56,63,70])plate(g,[x-2,78,x,86,x+2,78],0xeff0bd);
    g.lineStyle(2,0x38513d).lineBetween(44,90,61,95).lineBetween(77,87,90,91);
    for(const [x,y] of [[45,80],[82,78],[57,44],[77,94]])g.fillStyle(0x2e4736,0.45).fillEllipse(x,y,4,2);
  }else if(kind==='ranged') {
    // Hood seams and articulated staff fittings replace broad flat colour patches.
    g.lineStyle(2,0xcbb1e4).lineBetween(40,29,33,48).lineBetween(33,48,43,61);
    g.lineStyle(2,0x413452).lineBetween(74,25,82,45).lineBetween(82,45,72,60);
    g.fillStyle(0xdabbef,0.22).fillTriangle(44,29,62,19,59,31);
    g.lineStyle(2,0x352d4c).lineBetween(43,72,39,101).lineBetween(62,78,58,104).lineBetween(76,69,84,99);
    g.lineStyle(1,0xbe93d4).lineBetween(42,76,36,97).lineBetween(73,78,80,96);
    plate(g,[40,60,59,69,49,80,33,72],0x6b5689);
    plate(g,[65,68,78,59,89,71,72,80],0x6b5689);
    for(const x of [42,77])rivet(g,x,69);
    g.lineStyle(2,0xdfc395).lineBetween(47,90,58,82).lineBetween(58,82,70,91).lineBetween(70,91,60,99).lineBetween(60,99,47,90);
    jewel(g,59,89,5,0xc2a0e9);
    g.lineStyle(2,0xbaa0d0).lineBetween(103,49,112,49).lineBetween(103,58,112,58).lineBetween(103,89,111,89);
    jewel(g,107,24,13,0xcca5f7);
    plate(g,[96,27,99,18,102,30,108,37,116,29,116,19,121,29,113,43,101,42],0x826895);
    g.lineStyle(1,0xf0d5ff).lineBetween(106,68,106,82);
    g.fillStyle(0xe4d0b5).fillCircle(107,96,2);
  }else if(kind==='brute') {
    // Bevelled stone plates, mechanical seams and a larger rune core.
    plate(g,[10,46,25,34,35,42,32,60,12,68],0x8b7150);
    plate(g,[92,40,106,34,120,47,117,68,98,60],0x91734d);
    g.lineStyle(3,0xd4b783).lineBetween(13,45,25,38).lineBetween(97,39,107,38).lineBetween(107,38,116,48);
    for(const [x,y] of [[21,48],[107,48],[22,83],[106,83]])rivet(g,x,y);
    plate(g,[33,66,45,59,50,76,43,84,31,76],0x7b6550);
    plate(g,[81,59,96,65,95,78,83,85,76,75],0x7b6550);
    plate(g,[43,64,84,64,80,78,69,82,49,76],0x665542);
    for(const x of [50,58,66,74])g.lineStyle(2,0xbc9a67).lineBetween(x,68,x,73);
    plate(g,[44,84,62,79,83,85,81,101,67,110,49,103],0x6d6251);
    plate(g,[46,84,63,82,64,87,49,95],0xc0a579);
    jewel(g,65,95,12,0x82cbd1);
    g.lineStyle(2,0x544537).lineBetween(38,23,45,29).lineBetween(45,29,41,37).lineBetween(95,83,103,93).lineBetween(103,93,99,100);
    g.lineStyle(1,0xe8c48a).lineBetween(40,22,47,28).lineBetween(97,83,105,92);
    for(const [x,y] of [[18,90],[29,90],[98,91],[108,91]])g.lineStyle(2,0x554a3d).lineBetween(x,y,x+2,y+11);
    g.lineStyle(2,0xc0a57b).lineBetween(39,110,54,110).lineBetween(77,110,91,110);
  }else if(kind==='artillery') {
    // Independent faceted orb, orbital bands and suspended hand crystals.
    g.fillStyle(0x9982ed,0.15).fillCircle(64,23,24);
    g.lineStyle(2,0xcbb7fc).strokeEllipse(64,23,47,17);
    jewel(g,64,23,17,0xa48cde);
    g.lineStyle(1,0xffddbd).lineBetween(64,7,73,23).lineBetween(73,23,64,39);
    for(const [x,y] of [[28,66],[101,66]]) {
      g.fillStyle(0xc2a9ed,0.13).fillCircle(x,y,15);jewel(g,x,y,10,0xa38bcc);
      g.lineStyle(2,0xe0c9fb).strokeEllipse(x,y,25,13);
    }
    plate(g,[40,56,53,59,48,78,33,75],0x575a82);
    plate(g,[75,59,86,54,95,75,79,80],0x464d74);
    g.lineStyle(2,0xd4caed).lineBetween(47,84,59,100).lineBetween(59,100,74,87);
    g.lineStyle(2,0x555b81).lineBetween(42,79,38,101).lineBetween(80,82,86,101);
    g.lineStyle(1,0xd2c0eb).lineBetween(52,63,62,72).lineBetween(62,72,76,62);
    jewel(g,63,78,7,0xb5a0e3);
    for(const [x,y] of [[44,63],[85,63],[63,98]])g.fillStyle(0xedcda2).fillCircle(x,y,2);
  }else if(kind==='boss') {
    // Floating obsidian guardian: crown, mask, rib armour, molten heart and split arms.
    for(const side of [-1,1]) {
      const x=64+side*39;
      plate(g,[x-side*10,38,x+side*6,30,x+side*16,45,x+side*13,71,x-side*7,76,x-side*13,60],0x3c354e);
      plate(g,[x-side*4,39,x+side*7,36,x+side*12,46,x+side*8,60,x-side*5,62],0x68536a);
      plate(g,[x-side*8,78,x+side*13,75,x+side*14,94,x+side*6,107,x-side*9,96],0x3d344b);
      g.lineStyle(2,0xd67c60).lineBetween(x-side*5,44,x+side*6,48).lineBetween(x+side*6,48,x+side*2,61);
      g.lineStyle(2,0xffc88d).lineBetween(x-side*5,81,x+side*5,81);
      for(let i=0;i<3;i++)plate(g,[x+side*(i*6-6),95,x+side*(i*6-5),110,x+side*(i*6),99],0x927363);
      jewel(g,x,55,6,0xf48b60);
    }
    plate(g,[31,38,46,29,81,29,98,40,92,80,76,98,51,98,34,78],0x252334);
    plate(g,[34,42,48,34,54,54,39,68],0x67516a);
    plate(g,[78,34,94,43,89,68,75,55],0x514159);
    plate(g,[43,51,63,44,85,52,80,83,64,98,46,81],0x3b3044);
    for(const side of [-1,1])for(let i=0;i<3;i++) {
      const y=57+i*10;
      plate(g,[64+side*12,y,64+side*23,y-6,64+side*22,y+2,64+side*12,y+7],i===0?0x826273:0x5c465d);
    }
    g.fillStyle(0xff8758,0.18).fillEllipse(64,70,39,54);
    jewel(g,64,69,23,0xf0784c);
    g.fillStyle(0xffd17c).fillEllipse(62,67,8,22);
    g.lineStyle(2,0xe99666).lineBetween(38,43,42,53).lineBetween(42,53,36,65).lineBetween(84,86,89,76);
    plate(g,[46,17,57,12,76,15,86,29,80,44,68,51,52,43,43,28],0x786071);
    plate(g,[49,24,59,20,78,24,74,38,65,44,53,37],0x332b40);
    g.lineStyle(3,0xffd899).lineBetween(51,29,60,33).lineBetween(69,33,78,28);
    plate(g,[64,33,68,40,61,40],0xcaa48b);
    plate(g,[42,22,36,4,54,16,64,0,75,15,96,5,86,25,65,18],0x957659);
    g.lineStyle(2,0xffd19a).lineBetween(42,10,51,20).lineBetween(64,5,64,14).lineBetween(88,12,79,22);
    jewel(g,64,16,6,0xffac69);
    plate(g,[48,93,63,103,80,93,76,110,64,121,52,110],0x4f3c54);
    g.lineStyle(2,0xbe806a).lineBetween(53,102,64,111).lineBetween(64,111,73,102);
    g.fillStyle(0xffc084).fillCircle(64,123,3);
  }
}

/** The existing variant overlays gain material detail without extra textures or objects. */
export function paintVariantDetails(ctx:CanvasRenderingContext2D,variant:EnemyVariant):void {
  ctx.lineJoin='round';ctx.lineCap='round';
  if(variant==='splitter') {
    for(const x of [39,88]) {
      const glow=ctx.createRadialGradient(x-3,19,1,x,23,10);glow.addColorStop(0,'#ddffd8');glow.addColorStop(1,'#439c89');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,23,9,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#37776c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-3,18);ctx.lineTo(x+1,23);ctx.lineTo(x-2,28);ctx.stroke();
    }
    ctx.strokeStyle='#254c48';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(62,37);ctx.lineTo(59,54);ctx.lineTo(68,73);ctx.lineTo(63,100);ctx.stroke();
    ctx.strokeStyle='#a5f5cf';ctx.lineWidth=2;ctx.stroke();
    for(const [x,y] of [[58,53],[67,74],[63,92]]){ctx.strokeStyle='#e2ffd8';ctx.beginPath();ctx.moveTo(x-5,y-3);ctx.lineTo(x+5,y+3);ctx.stroke();}
  }else if(variant==='dasher') {
    ctx.fillStyle='#ffe0ad';ctx.beginPath();ctx.moveTo(56,24);ctx.lineTo(64,5);ctx.lineTo(72,24);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#875539';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(49,29);ctx.lineTo(64,33);ctx.lineTo(80,29);ctx.stroke();
    ctx.strokeStyle='#304b3d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(30,91);ctx.lineTo(38,78);ctx.moveTo(90,78);ctx.lineTo(99,93);ctx.stroke();
  }else if(variant==='volley') {
    for(const [x,y] of [[91,22],[106,6],[119,22]]) {
      ctx.fillStyle='#ffd8f3';ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x,y+7);ctx.lineTo(x-3,y+1);ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle='#e8b3db';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(98,35);ctx.lineTo(105,45);ctx.lineTo(115,35);ctx.stroke();
    for(const x of [39,47,55]){ctx.fillStyle='#ffd2eb';ctx.beginPath();ctx.arc(x,91,2,0,Math.PI*2);ctx.fill();}
  }else if(variant==='guardian') {
    const shine=ctx.createLinearGradient(10,57,48,106);shine.addColorStop(0,'#c8e8e9');shine.addColorStop(0.4,'#789dab');shine.addColorStop(1,'#3c607c');
    ctx.fillStyle=shine;ctx.beginPath();ctx.moveTo(13,65);ctx.lineTo(41,58);ctx.lineTo(47,83);ctx.lineTo(32,106);ctx.lineTo(14,92);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#d8e9df';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#e2d3a7';for(const [x,y] of [[16,67],[40,63],[43,84],[31,102],[17,91]]){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#c4e6ed';ctx.strokeStyle='#294e66';ctx.beginPath();ctx.moveTo(29,69);ctx.lineTo(38,80);ctx.lineTo(30,96);ctx.lineTo(23,83);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#f5ffe9';ctx.beginPath();ctx.moveTo(29,74);ctx.lineTo(33,81);ctx.lineTo(30,90);ctx.stroke();
  }
}
