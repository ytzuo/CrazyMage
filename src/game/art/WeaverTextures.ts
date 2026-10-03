import type Phaser from 'phaser';
type Context=CanvasRenderingContext2D;
function shard(c:Context,points:number[],color:string):void {
  c.fillStyle=color;c.strokeStyle='#282238';c.lineWidth=2;c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.closePath();c.fill();c.stroke();
}
/** Shared textures are prepared once; combat transforms images only. */
export function prepareWeaverTextures(scene:Phaser.Scene):void {
  const make=(key:string,w:number,h:number,paint:(c:Context)=>void)=>{
    if(scene.textures.exists(key))return;const t=scene.textures.createCanvas(key,w,h)!;paint(t.context);t.refresh();
  };
  for(const enraged of [false,true])make(enraged?'weaver-torso-enraged':'weaver-torso',128,128,c=>{
    shard(c,[39,53,54,48,73,48,91,54,85,76,79,90,72,102,53,97,43,83],'#51436d');
    c.fillStyle='#181927';c.beginPath();c.ellipse(64,73,15,21,0,0,Math.PI*2);c.fill();
    c.strokeStyle='#c3a2f7';c.lineWidth=2;c.beginPath();c.ellipse(64,73,17,24,0,0,Math.PI*2);c.stroke();
    shard(c,[42,25,57,14,72,16,87,28,80,45,66,51,48,43],'#dfd0db');
    shard(c,[51,26,61,20,66,24,60,44,50,39],'#f5e9e1');
    c.strokeStyle='#40334c';c.lineWidth=3;c.beginPath();c.moveTo(48,32);c.lineTo(57,35);c.moveTo(69,35);c.lineTo(79,31);c.stroke();
    c.strokeStyle='#c397ff';c.lineWidth=2;c.beginPath();c.moveTo(60,39);c.lineTo(68,40);c.stroke();
    shard(c,[39,28,35,6,48,18,56,4,59,16],'#8a74b0');shard(c,[74,16,80,3,83,17,95,8,89,31],'#ad93c4');
    if(enraged){c.strokeStyle='#703859';c.lineWidth=3;c.beginPath();c.moveTo(66,17);c.lineTo(61,27);c.lineTo(69,33);c.lineTo(62,48);c.stroke();
      shard(c,[74,44,86,40,92,51,79,56],'#b0a0d1');}
    c.strokeStyle='#dac5ff';c.lineWidth=2;for(const x of [44,84]){c.beginPath();c.moveTo(x,56);c.lineTo(x+4,66);c.lineTo(x-1,75);c.stroke();}
  });
  make('weaver-arm',96,48,c=>{
    shard(c,[8,17,28,12,46,17,60,10,69,17,49,27,27,24,11,28],'#9982b9');
    shard(c,[58,12,69,14,76,23,89,18,93,22,79,28,68,30,59,22],'#d0bdde');
    c.strokeStyle='#dbb7ff';c.lineWidth=1.5;c.beginPath();c.moveTo(29,17);c.lineTo(45,22);c.lineTo(61,16);c.moveTo(75,25);c.lineTo(93,31);c.moveTo(74,28);c.lineTo(87,38);c.stroke();
  });
  make('weaver-fragment',40,48,c=>{
    shard(c,[21,2,34,14,29,28,16,45,9,27,12,11],'#68527e');
    shard(c,[21,7,25,20,17,36,16,18],'#c49cef');
  });
  make('weaver-core',48,48,c=>{
    const glow=c.createRadialGradient(24,24,1,24,24,23);glow.addColorStop(0,'#fff3ff');glow.addColorStop(.35,'#cf9fff99');glow.addColorStop(1,'#b369ff00');
    c.fillStyle=glow;c.fillRect(0,0,48,48);shard(c,[24,9,33,22,24,40,15,23],'#b899ed');shard(c,[24,12,26,24,23,33,20,23],'#fff0ff');
  });
  for(const enraged of [false,true])make(enraged?'enemy-weaver-enraged-detail':'enemy-weaver-detail',192,192,c=>{
    const draw=(key:string,x:number,y:number,angle=0)=>{
      const s=scene.textures.get(key).getSourceImage() as HTMLCanvasElement;c.save();c.translate(x,y);c.rotate(angle);c.drawImage(s,-s.width/2,-s.height/2);c.restore();
    };
    for(let i=0;i<(enraged?3:2);i++)for(const side of [-1,1]){
      c.save();c.translate(96+side*19,64+i*17);c.scale(side,1);const s=scene.textures.get('weaver-arm').getSourceImage() as HTMLCanvasElement;c.rotate((i-1)*.38);c.drawImage(s,-14,-24);c.restore();
    }
    for(let i=0;i<3;i++)draw('weaver-fragment',70+i*26,145+(i%2)*12,(i-1)*.3);
    draw(enraged?'weaver-torso-enraged':'weaver-torso',96,92);draw('weaver-core',96,101);
  });
  make('weaver-sigil',64,64,c=>{
    c.strokeStyle='#d3adff';c.lineWidth=2;c.beginPath();c.arc(32,32,24,0,Math.PI*2);c.stroke();
    c.translate(32,32);for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(0,-29);c.lineTo(5,-19);c.lineTo(0,-11);c.lineTo(-5,-19);c.closePath();c.stroke();}
  });
  for(const active of [false,true])make(active?'weaver-line-active':'weaver-line-warning',256,48,c=>{
    c.strokeStyle=active?'#e5c5ff':'#c6a5e8';c.lineWidth=active?6:2;c.setLineDash(active?[]:[8,8]);
    c.beginPath();c.moveTo(0,24);c.lineTo(256,24);c.stroke();
    if(active){c.fillStyle='#b776ff55';c.fillRect(0,0,256,48);c.lineWidth=1;
      c.beginPath();c.moveTo(0,1);c.lineTo(256,1);c.moveTo(0,47);c.lineTo(256,47);c.stroke();
      for(let x=0;x<256;x+=24){c.beginPath();c.moveTo(x,12);c.lineTo(x+14,35);c.stroke();}}
  });
  make('weaver-orb',48,48,c=>{
    const glow=c.createRadialGradient(24,24,3,24,24,23);glow.addColorStop(0,'#ffeafa');glow.addColorStop(.4,'#bc91e6');glow.addColorStop(1,'#ae74f900');
    c.fillStyle=glow;c.fillRect(0,0,48,48);c.strokeStyle='#f4ddff';c.lineWidth=2;c.beginPath();c.arc(24,24,11,0,Math.PI*2);c.stroke();
  });
}
