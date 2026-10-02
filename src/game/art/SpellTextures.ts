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
  cached(scene,'fire-impact-detail',128,128,g=>{
    g.fillStyle(0xe7612c,.09).fillCircle(64,64,60);
    g.lineStyle(3,0xffb55c,.8).strokeCircle(64,64,52);
    g.lineStyle(1,0xffe1a0,.55).strokeCircle(64,64,46);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,c=Math.cos(a),s=Math.sin(a),r=28+(i%3)*6;
      polygon(g,[64+c*r-s*6,64+s*r+c*6,64+c*59,64+s*59,64+c*r+s*6,64+s*r-c*6],i%2?0xffd57c:0xff8e3d,.75);
    }
    g.fillStyle(0xff943c,.45).fillCircle(64,64,30);
    polygon(g,[42,64,59,57,61,41,68,57,87,64,71,71,64,88,57,71],0xffe4a2,.9);
    g.fillStyle(0xfff6d5).fillCircle(64,64,9);
  });
  cached(scene,'fire-nova-detail',256,256,g=>{
    g.fillStyle(0xe8642b,.045).fillCircle(128,128,121);
    g.lineStyle(3,0xffc277,.75).strokeCircle(128,128,115);
    g.lineStyle(2,0xffe4a0,.45).strokeCircle(128,128,101);
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,c=Math.cos(a),s=Math.sin(a);
      polygon(g,[128+c*91-s*5,128+s*91+c*5,128+c*121-s*3,128+s*121+c*3,128+c*108+s*5,128+s*108-c*5,128+c*78,128+s*78],i%2?0xffce7c:0xff893d,.8);
    }
    g.lineStyle(2,0xffe3ae,.45).strokeCircle(128,128,48);
  });
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
