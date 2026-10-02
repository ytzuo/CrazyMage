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
/** Layered frozen ground: translucent plates, branched fractures and edge frost. */
function frozenGround(ctx:CanvasRenderingContext2D,fan:boolean):void {
  ctx.save();ctx.beginPath();
  if(fan){ctx.moveTo(128,128);ctx.arc(128,128,123,-Math.PI*5/18,Math.PI*5/18);ctx.closePath();}
  else ctx.arc(128,128,123,0,Math.PI*2);
  ctx.clip();
  cloud(ctx,128,128,126,126,[[0,'#255d8540'],[.45,'#67b8da48'],[.8,'#b5f2fa65'],[1,'#d8ffff00']]);
  for(let i=0;i<32;i++){
    const a=i*2.39996,r=20+Math.sqrt(i/31)*94,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;
    const size=12+(i%4)*5;
    const gradient=ctx.createLinearGradient(x-size,y-size,x+size,y+size);
    gradient.addColorStop(0,'#e9ffff50');gradient.addColorStop(.5,'#87cde52b');gradient.addColorStop(1,'#285e8725');
    ctx.fillStyle=gradient;ctx.strokeStyle='#bdefff35';ctx.lineWidth=.8;
    ctx.beginPath();
    for(let j=0;j<6;j++){const angle=j*Math.PI/3+a;const px=x+Math.cos(angle)*size,py=y+Math.sin(angle)*size*.75;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  for(let i=0;i<18;i++){
    const angle=i*2.39996,end=90+(i%4)*8;
    ctx.save();ctx.translate(128,128);ctx.rotate(angle);
    ctx.strokeStyle='#285e8366';ctx.lineWidth=2.6;
    ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(42,7);ctx.lineTo(69,-4);ctx.lineTo(end,4);ctx.stroke();
    ctx.strokeStyle='#d7ffffab';ctx.lineWidth=.8;ctx.stroke();
    ctx.beginPath();ctx.moveTo(42,7);ctx.lineTo(53,22);ctx.moveTo(69,-4);ctx.lineTo(80,-20);ctx.stroke();ctx.restore();
  }
  for(let i=0;i<42;i++){
    const angle=i*2.39996,r=100+(i%4)*4,x=128+Math.cos(angle)*r,y=128+Math.sin(angle)*r;
    cloud(ctx,x,y,15+(i%3)*3,9+(i%4)*2,[[0,'#eeffff66'],[.5,'#c5f4ff22'],[1,'#b1edff00']]);
    ctx.fillStyle='#ecffffaa';ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+2,y);ctx.lineTo(x,y+4);ctx.lineTo(x-2,y);ctx.closePath();ctx.fill();
  }
  ctx.restore();
}
export function prepareIceTextures(scene:Phaser.Scene):void {
  cached(scene,'ice-shard-flight',96,48,g=>{
    g.fillStyle(0x8cecff,.08).fillEllipse(57,24,76,38);
    polygon(g,[0,24,49,13,76,24,49,35],0x75ddff,.25);
    polygon(g,[9,24,54,20,77,24,54,28],0xcaffff,.65);
    polygon(g,[39,24,65,6,94,24,65,42],0x3988bd,.95);
    polygon(g,[39,24,65,6,94,24],0xc9faff);
    polygon(g,[65,6,65,42,94,24],0x81daf4);
    polygon(g,[54,24,69,15,94,24,69,29],0xf4ffff);
    g.lineStyle(2,0xf0ffff,.95).lineBetween(39,24,65,6).lineBetween(65,6,94,24);
    g.lineStyle(1,0xb9faff,.8).lineBetween(12,16,37,18).lineBetween(7,33,33,30);
  });
  cached(scene,'ice-shard-impact',64,64,g=>{
    g.fillStyle(0x92eaff,.12).fillCircle(32,32,30);
    g.fillStyle(0xd6ffff,.3).fillCircle(32,32,15);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
      polygon(g,[32+c*8-s*3,32+s*8+c*3,32+c*29,32+s*29,32+c*8+s*3,32+s*8-c*3],i%2?0x9be3ff:0xeaffff,.95);
    }
    g.fillStyle(0xffffff,.95).fillCircle(32,32,5);
  });
  material(scene,'ice-domain-detail',ctx=>frozenGround(ctx,false));
  cached(scene,'ice-lance-detail',96,24,g=>{
    polygon(g,[0,12,35,5,66,8,94,12,66,16,35,19],0x78cee9,.35);
    polygon(g,[18,12,61,3,94,12,61,21],0x64aeca,.95);
    polygon(g,[18,12,61,3,94,12],0xd9fcff,.95);
    polygon(g,[37,12,65,8,94,12,65,16],0xf3ffff,.9);
    g.lineStyle(1,0xc6faff,.8).lineBetween(4,12,36,12);
  });
  material(scene,'ice-fan-ground',ctx=>frozenGround(ctx,true));
  cached(scene,'ice-ground-spike',64,96,g=>{
    g.fillStyle(0x81d8ef,.18).fillEllipse(32,85,58,18);
    polygon(g,[4,84,13,47,22,81],0x8fddf1,.8);
    polygon(g,[40,86,51,33,62,85],0x6bbddc,.8);
    polygon(g,[40,86,51,33,51,84],0xd7fcff,.8);
    polygon(g,[9,83,25,25,34,4,55,80,34,91],0x55a7ce,.8);
    polygon(g,[25,25,34,4,34,91,9,83],0xc5f7ff,.9);
    polygon(g,[34,4,55,80,42,73],0x8cdbea,.85);
    g.lineStyle(2,0xefffff,.95).lineBetween(25,25,34,4).lineBetween(34,4,55,80);
    g.lineStyle(1,0xffffff,.6).lineBetween(34,20,34,76);
  });
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
export function prepareIcePrisonTexture(scene:Phaser.Scene):void {
  material(scene,'ice-prison-detail',ctx=>{
    const gradient=ctx.createLinearGradient(35,30,204,227);gradient.addColorStop(0,'#eaffffb8');gradient.addColorStop(.35,'#82c8e554');gradient.addColorStop(.7,'#4185bf80');gradient.addColorStop(1,'#c9f7ffc4');
    ctx.fillStyle=gradient;ctx.strokeStyle='#defaffdc';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(70,25);ctx.lineTo(174,21);ctx.lineTo(219,69);ctx.lineTo(212,208);ctx.lineTo(165,237);ctx.lineTo(55,224);ctx.lineTo(32,174);ctx.lineTo(39,63);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#e6ffff4d';ctx.beginPath();ctx.moveTo(70,25);ctx.lineTo(85,69);ctx.lineTo(39,63);ctx.closePath();ctx.fill();
    ctx.fillStyle='#366da450';ctx.beginPath();ctx.moveTo(174,21);ctx.lineTo(164,81);ctx.lineTo(165,237);ctx.lineTo(212,208);ctx.lineTo(219,69);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#eaffffb0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(39,63);ctx.lineTo(85,69);ctx.lineTo(164,81);ctx.lineTo(219,69);ctx.moveTo(85,69);ctx.lineTo(75,203);ctx.lineTo(55,224);ctx.moveTo(164,81);ctx.lineTo(165,237);ctx.stroke();
    ctx.strokeStyle='#f3ffffb0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(54,84);ctx.lineTo(51,153);ctx.moveTo(97,40);ctx.lineTo(143,39);ctx.stroke();
    ctx.strokeStyle='#93d5f480';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(117,94);ctx.lineTo(103,120);ctx.lineTo(115,138);ctx.lineTo(106,172);ctx.moveTo(103,120);ctx.lineTo(86,123);ctx.stroke();
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
  cached(scene,'lightning-charge-mark',64,64,g=>{
    g.lineStyle(5,0x9874ff,0.25).strokeCircle(32,32,23);
    g.lineStyle(1.5,0xc4ddff,0.9).strokeCircle(32,32,23);
    polygon(g,[35,9,21,34,31,31,27,54,44,26,34,29],0xfff4bc);
    g.fillStyle(0xd4e5ff,1);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;g.fillCircle(32+23*Math.cos(a),32+23*Math.sin(a),2);}
  });
  cached(scene,'lightning-discharge-detail',128,128,g=>{
    g.fillStyle(0x9c79ef,0.08).fillCircle(64,64,60);
    g.lineStyle(4,0x9cbaff,0.25).strokeCircle(64,64,49);
    g.lineStyle(1.5,0xe1eaff,0.8).strokeCircle(64,64,49);
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5,c=Math.cos(a),s=Math.sin(a);
      for(const [width,color,alpha] of [[7,0x987aff,0.25],[2,0xfff5cc,1]]){
        g.lineStyle(width,color,alpha).beginPath().moveTo(64+12*c,64+12*s)
          .lineTo(64+29*c-7*s,64+29*s+7*c).lineTo(64+36*c+5*s,64+36*s-5*c)
          .lineTo(64+59*c,64+59*s).strokePath();
      }
    }
    g.fillStyle(0xfff8df,0.9).fillCircle(64,64,7);
  });
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
