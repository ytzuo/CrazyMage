import type Phaser from 'phaser';

/** Rasterize once; flight, hit and ultimate effects only transform cached images. */
function cached(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g); g.generateTexture(key, w, h); g.destroy();
}
function polygon(g: Phaser.GameObjects.Graphics, points: number[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha).beginPath().moveTo(points[0], points[1]);
  for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
  g.closePath().fillPath();
}
/** Soft material layers are prepared once on a small canvas, never during update. */
function material(scene: Phaser.Scene, key: string, paint: (ctx: CanvasRenderingContext2D) => void): void {
  if(scene.textures.exists(key))return;
  const texture=scene.textures.createCanvas(key,256,256)!;
  paint(texture.context);texture.refresh();
}
function cloud(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,stops:[number,string][]):void {
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
  for(const [at,color] of stops)gradient.addColorStop(at,color);
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
}
function fireBurst(ctx:CanvasRenderingContext2D,nova:boolean):void {
  cloud(ctx,128,128,123,115,[[0,'#ffcf7750'],[.5,'#f26b3038'],[1,'#72251600']]);
  // Unequal overlapping flame lobes give volume without a perfect circular outline.
  for(let i=0;i<20;i++){
    const a=i*2.39996,r=30+(i%5)*13,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;
    cloud(ctx,x,y,28+(i%4)*8,24+(i%3)*10,[[0,'#ffe5aeb0'],[.22,'#ffc35eb0'],[.55,'#ff7e3880'],[.83,'#b6382430'],[1,'#69241a00']]);
  }
  for(let i=0;i<(nova?26:17);i++){
    ctx.save();ctx.translate(128,128);ctx.rotate(i*2.39996);
    const base=39+(i%3)*8,tip=91+(i%4)*8,width=7+(i%3)*3,bend=Math.sin(i*1.9)*16;
    const g=ctx.createLinearGradient(base,0,tip,0);g.addColorStop(0,'#fff4c7b0');g.addColorStop(.4,'#ffbe66cc');g.addColorStop(.75,'#f96a35a0');g.addColorStop(1,'#b8312200');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(base,-width);ctx.bezierCurveTo(base+28,-width*2,tip-21,bend-7,tip,bend);
    ctx.bezierCurveTo(tip-29,bend+4,base+25,width*2,base,width);ctx.closePath();ctx.fill();ctx.restore();
  }
  cloud(ctx,125,123,47,43,[[0,'#fffce8e0'],[.35,'#ffe0a6bc'],[.7,'#ffac5150'],[1,'#ff7a2e00']]);
  for(let i=0;i<32;i++){
    const a=i*2.39996,r=86+(i%6)*5;ctx.fillStyle=i%2?'#ffd68fbb':'#ff9a5b88';
    ctx.beginPath();ctx.ellipse(128+Math.cos(a)*r,128+Math.sin(a)*r,1+(i%3)*.5,2+(i%2),a,0,Math.PI*2);ctx.fill();
  }
}
export function prepareIceTextures(scene:Phaser.Scene):void {
  material(scene,'ice-frost-detail',ctx=>{
    cloud(ctx,128,128,121,118,[[0,'#b4eaff0a'],[.45,'#83cce71c'],[.8,'#daffff28'],[1,'#c4f6ff00']]);
    for(let i=0;i<24;i++){
      const a=i*2.39996,r=73+(i%4)*11;
      cloud(ctx,128+Math.cos(a)*r,128+Math.sin(a)*r,24+(i%3)*8,14+(i%4)*4,[[0,'#e7ffff30'],[.45,'#b7eafa20'],[1,'#a4dcf000']]);
    }
    for(let i=0;i<22;i++){
      ctx.save();ctx.translate(128,128);ctx.rotate(i*2.39996);
      const end=91+(i%4)*7,start=18+(i%3)*9,bend=Math.sin(i*2.1)*8;
      ctx.strokeStyle='#c5f6ff85';ctx.lineWidth=i%3===0?1.8:1;ctx.beginPath();ctx.moveTo(start,0);ctx.lineTo(47,bend);ctx.lineTo(72,-bend*.5);ctx.lineTo(end,bend);ctx.stroke();
      ctx.strokeStyle='#eefeff77';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(47,bend);ctx.lineTo(59,bend+14);ctx.moveTo(72,-bend*.5);ctx.lineTo(83,-bend*.5-12);ctx.stroke();
      const width=4+(i%3)*2,base=end-21,tip=end+6;
      ctx.fillStyle='#80c7e982';ctx.beginPath();ctx.moveTo(base,-width);ctx.lineTo(tip,0);ctx.lineTo(base,width);ctx.lineTo(base-7,0);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e7ffffb0';ctx.beginPath();ctx.moveTo(base-7,0);ctx.lineTo(base,-width);ctx.lineTo(tip,0);ctx.closePath();ctx.fill();ctx.restore();
    }
    for(let i=0;i<95;i++){
      const a=i*2.39996,r=24+Math.sqrt(i/94)*94,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;
      ctx.fillStyle=i%3?'#c6efff60':'#f3ffffb0';ctx.fillRect(x,y,i%4===0?2:1,i%4===0?2:1);
    }
  });
}
export function prepareFireTextures(scene: Phaser.Scene): void {
  cached(scene,'fireball-detail',96,64,g=>{
    g.fillStyle(0xeb582b,.08).fillEllipse(54,32,76,54);
    g.fillStyle(0xff932f,.13).fillEllipse(63,32,49,40);
    polygon(g,[5,22,36,25,21,8,56,20,62,15,82,26,85,35,67,49,36,52,44,42,8,46,28,32],0xcc4327,.6);
    polygon(g,[13,29,40,28,32,18,60,23,67,19,81,29,80,38,66,45,37,44,47,36],0xff8b32);
    polygon(g,[31,30,54,27,47,20,71,25,80,32,70,41,49,39,54,34],0xffcc65);
    g.fillStyle(0xffedaf).fillEllipse(67,32,19,17);
    g.fillStyle(0xfffbe6).fillEllipse(71,30,8,10);
    g.lineStyle(1,0xffe6a4,.75).lineBetween(25,25,37,27).lineBetween(24,41,35,38);
    g.fillStyle(0xffc45b,.85).fillCircle(12,17,2).fillCircle(22,50,1.5).fillCircle(5,36,1);
  });
  material(scene,'fire-impact-detail',ctx=>fireBurst(ctx,false));
  material(scene,'fire-nova-detail',ctx=>fireBurst(ctx,true));
}
export function prepareLightningTextures(scene: Phaser.Scene): void {
  for(let variant=0;variant<3;variant++)cached(scene,`lightning-arc-detail-${variant}`,256,64,g=>{
    const points=[0,32,30,26+variant*3,49,39,71,16+variant*5,87,35,114,24,137,43-variant*4,158,25,183,38,204,20+variant*3,225,35,256,32];
    for(const [width,color,alpha] of [[14,0x8c75df,.13],[7,0x94caff,.45],[2.5,0xfff4ca,1]]) {
      g.lineStyle(width,color,alpha).beginPath().moveTo(points[0],points[1]);
      for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
      g.strokePath();
    }
    g.lineStyle(1.5,0xb2caff,.8).beginPath().moveTo(71,16+variant*5).lineTo(63,7).lineTo(85,10).lineTo(92,2).strokePath();
    g.beginPath().moveTo(137,43-variant*4).lineTo(149,54).lineTo(134,52).lineTo(145,62).strokePath();
    g.beginPath().moveTo(204,20+variant*3).lineTo(216,9).lineTo(203,12).strokePath();
  });
  cached(scene,'lightning-bolt-detail',64,192,g=>{
    const points=[37,1,22,45,41,37,18,95,38,83,25,141,34,128,32,191];
    for(const [width,color,alpha] of [[16,0x8874da,.13],[8,0x9bcaff,.5],[3,0xfff8dc,1]]){
      g.lineStyle(width,color,alpha).beginPath().moveTo(points[0],points[1]);
      for(let i=2;i<points.length;i+=2)g.lineTo(points[i],points[i+1]);
      g.strokePath();
    }
    g.lineStyle(2,0xc4d6ff,.8).beginPath().moveTo(22,45).lineTo(8,66).lineTo(18,60).lineTo(3,89).strokePath();
    g.beginPath().moveTo(38,83).lineTo(54,99).lineTo(44,98).lineTo(60,127).strokePath();
  });
}
