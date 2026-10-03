import type Phaser from 'phaser';
type Context=CanvasRenderingContext2D;
function plate(c:Context,points:number[],color:string):void {
  c.fillStyle=color;c.strokeStyle='#201f2d';c.lineWidth=2;c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.closePath();c.fill();c.stroke();
}
function rune(c:Context,x:number,y:number,color='#ffc27d'):void {
  c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x-5,y-6);c.lineTo(x+5,y-2);c.lineTo(x-3,y+3);c.lineTo(x+3,y+7);c.stroke();
}
/** Layered armour is drawn only once. Full artwork and live rig share the same parts. */
export function prepareGuardianTextures(scene:Phaser.Scene):void {
  const make=(key:string,w:number,h:number,draw:(c:Context)=>void):void=>{
    if(scene.textures.exists(key))return;const t=scene.textures.createCanvas(key,w,h)!;draw(t.context);t.refresh();
  };
  for(const enraged of [false,true])make(enraged?'guardian-torso-enraged':'guardian-torso',128,128,c=>{
    plate(c,[27,41,43,29,87,29,103,43,93,80,80,96,48,96,34,79],enraged?'#49343b':'#3e394b');
    plate(c,[29,41,43,33,50,54,34,69],'#817080');plate(c,[79,34,96,43,88,69,75,54],'#5e5167');
    plate(c,[45,75,84,75,88,94,72,106,53,103,39,92],'#5a505e');
    c.fillStyle='#211f2b';c.beginPath();c.ellipse(64,67,23,27,0,0,Math.PI*2);c.fill();
    plate(c,[44,19,58,12,77,16,86,29,77,45,64,50,49,43,39,28],'#8b7480');
    plate(c,[48,24,62,20,79,27,73,38,62,42,49,35],'#292533');
    c.strokeStyle=enraged?'#ff8463':'#ffdaa1';c.lineWidth=3;c.beginPath();c.moveTo(48,29);c.lineTo(58,32);c.moveTo(68,32);c.lineTo(78,28);c.stroke();
    plate(c,[40,22,35,7,53,17,63,2,74,17,94,8,86,26,65,20],'#ac8760');
    rune(c,64,17);for(const x of [39,89])rune(c,x,48,enraged?'#ff815e':'#d99d77');
    if(enraged){c.strokeStyle='#ff9766';c.lineWidth=3;c.beginPath();c.moveTo(47,37);c.lineTo(52,55);c.lineTo(43,73);c.moveTo(82,39);c.lineTo(77,52);c.lineTo(85,75);c.moveTo(56,87);c.lineTo(66,94);c.lineTo(72,83);c.stroke();}
  });
  for(const side of ['left','right']) {
    for(const enraged of [false,true])make(`guardian-arm-${side}${enraged?'-enraged':''}`,64,64,c=>{
      plate(c,enraged?[18,13,28,8,33,17,44,12,49,26,40,32,16,29,10,21]:[14,5,38,3,53,17,47,33,17,33,7,20],side==='left'?'#746176':'#a18b6d');
      plate(c,[19,26,43,26,47,48,37,59,12,53,9,37],side==='left'?'#665463':'#5c4d60');
      plate(c,[13,34,34,32,38,51,15,49],'#95808a');
      c.strokeStyle='#c9aa8b';c.lineWidth=2;for(const x of [17,25,33]){c.beginPath();c.moveTo(x,41);c.lineTo(x,51);c.stroke();}
      rune(c,31,17,enraged?'#ff8161':'#ffc27d');c.fillStyle='#e4bc88';for(const [x,y] of [[15,15],[44,15]]){c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
    });
    make(`guardian-leg-${side}`,48,48,c=>{
      plate(c,[12,1,34,1,36,17,29,24,12,21,8,12],'#75606b');
      plate(c,[13,18,31,18,33,36,39,41,35,47,6,46,6,39,12,33],'#534855');
      plate(c,[14,23,27,22,27,35,12,38],'#97818a');
      c.strokeStyle='#d1af88';c.lineWidth=2;c.beginPath();c.moveTo(10,42);c.lineTo(31,42);c.stroke();rune(c,22,12,'#e0a77c');
    });
    make(`guardian-plate-${side}`,48,64,c=>{
      const mirror=side==='left'?1:-1;c.translate(24,32);c.scale(mirror,1);
      plate(c,[-18,-24,3,-26,12,-8,10,20,-2,29,-16,17],'#8e7480');
      plate(c,[-14,-21,-3,-20,4,-7,-1,16,-12,13],'#bf9b8b');
      c.strokeStyle='#f0c38e';c.lineWidth=2;c.beginPath();c.moveTo(-12,-15);c.lineTo(-5,-5);c.lineTo(-9,7);c.stroke();
    });
  }
  make('guardian-core',64,64,c=>{
    const glow=c.createRadialGradient(32,32,2,32,32,31);glow.addColorStop(0,'#fff1b8');glow.addColorStop(.45,'#ffaf6588');glow.addColorStop(1,'#ff784000');c.fillStyle=glow;c.fillRect(0,0,64,64);
    plate(c,[32,10,43,24,45,38,32,55,19,38,21,24],'#ff9b55');
    plate(c,[31,15,35,28,33,47,27,35,27,24],'#ffe5a4');
    c.strokeStyle='#fff5d1';c.lineWidth=2;c.beginPath();c.moveTo(23,25);c.lineTo(28,20);c.stroke();
  });
  for(const enraged of [false,true])make(enraged?'enemy-boss-enraged-detail':'enemy-boss-detail',128,128,c=>{
    const draw=(key:string,x:number,y:number,ox=.5,oy=.5)=>{const s=scene.textures.get(key).getSourceImage() as HTMLCanvasElement;c.drawImage(s,x-s.width*ox,y-s.height*oy);};
    for(const [side,x] of [['left',43],['right',85]] as const){draw(`guardian-leg-${side}`,x,80,.5,0);draw(`guardian-arm-${side}${enraged?'-enraged':''}`,side==='left'?22:108,40,.5,.125);}
    draw(enraged?'guardian-torso-enraged':'guardian-torso',64,64);draw('guardian-core',64,68);draw('guardian-plate-left',55,69);draw('guardian-plate-right',73,69);
  });
  for(const impact of [false,true]) {
    make(impact?'guardian-sweep-impact':'guardian-sweep-warning',256,256,c=>{
      c.fillStyle=impact?'#ffb96766':'#ffae6c20';c.strokeStyle=impact?'#ffedb8':'#ffbd85';c.lineWidth=2;
      c.beginPath();c.moveTo(128,128);c.arc(128,128,125,-Math.PI/3,Math.PI/3);c.closePath();c.fill();c.stroke();
      c.setLineDash([7,9]);c.beginPath();c.arc(128,128,105,-Math.PI/3,Math.PI/3);c.stroke();
    });
    make(impact?'guardian-lane-impact':'guardian-lane-warning',256,64,c=>{
      c.fillStyle=impact?'#ffc07777':'#ffbd7a22';c.strokeStyle=impact?'#fff0b5':'#ffb97e';c.lineWidth=2;
      c.beginPath();c.roundRect(1,1,254,62,30);c.fill();c.stroke();
      c.setLineDash(impact?[]:[8,7]);c.lineWidth=impact?4:2;c.beginPath();c.moveTo(28,32);c.lineTo(226,32);c.stroke();
      if(impact){for(let x=42;x<222;x+=29){c.beginPath();c.moveTo(x,32);c.lineTo(x+8,14);c.moveTo(x,32);c.lineTo(x-7,49);c.stroke();}}
    });
  }
}
