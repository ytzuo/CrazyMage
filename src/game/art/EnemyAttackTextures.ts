import type Phaser from 'phaser';

/** Shared raster materials; prepare at scene creation, never in attack/update paths. */
export function prepareEnemyAttackTextures(scene: Phaser.Scene): void {
  const paint = (key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): void => {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, width, height)!;
    draw(texture.context); texture.refresh();
  };
  for (const [kind, color] of [['melee', '#ffad76'], ['ranged', '#d4adff'], ['boss', '#ff7997']] as const) {
    paint(`enemy-range-${kind}`, 256, 256, ctx => {
      const fog = ctx.createRadialGradient(128,128,20,128,128,128);
      fog.addColorStop(0, `${color}08`); fog.addColorStop(0.75, `${color}12`); fog.addColorStop(0.96, `${color}48`); fog.addColorStop(1, `${color}00`);
      ctx.fillStyle = fog; ctx.fillRect(0,0,256,256);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(128,128,126,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.setLineDash([5,9]);
      ctx.beginPath(); ctx.arc(128,128,114,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      for (let i=0;i<12;i++) {
        const a=i*Math.PI/6, c=Math.cos(a), s=Math.sin(a);
        ctx.beginPath(); ctx.moveTo(128+c*99,128+s*99); ctx.lineTo(128+c*108,128+s*108); ctx.stroke();
      }
      if (kind==='boss') {
        ctx.globalAlpha=0.35;
        ctx.beginPath();
        for(let i=0;i<=6;i++){const a=i*Math.PI/3;const x=128+Math.cos(a)*78,y=128+Math.sin(a)*78;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
        ctx.stroke();
        ctx.beginPath();ctx.moveTo(108,128);ctx.lineTo(148,128);ctx.moveTo(128,108);ctx.lineTo(128,148);ctx.stroke();
      }
    });
  }
  paint('enemy-aim-detail',256,32,ctx=>{
    const glow=ctx.createLinearGradient(0,0,0,32);
    glow.addColorStop(0,'#ffffff00');glow.addColorStop(0.5,'#ffffff60');glow.addColorStop(1,'#ffffff00');
    ctx.fillStyle=glow;ctx.fillRect(0,0,256,32);
    ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.setLineDash([10,9]);
    ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(240,16);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(237,6);ctx.lineTo(254,16);ctx.lineTo(237,26);ctx.stroke();
  });
  paint('enemy-slash-detail',128,128,ctx=>{
    ctx.strokeStyle='#ffffff18';ctx.lineWidth=18;ctx.beginPath();ctx.arc(54,64,49,-1.1,1.1);ctx.stroke();
    ctx.strokeStyle='#ffffffaa';ctx.lineWidth=6;ctx.beginPath();ctx.arc(54,64,49,-1.1,1.1);ctx.stroke();
    ctx.strokeStyle='#fff3da';ctx.lineWidth=2;ctx.beginPath();ctx.arc(54,64,46,-1,0.9);ctx.stroke();
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(83+i*3,42+i*12);ctx.lineTo(103+i*4,37+i*13);ctx.stroke();}
  });
  paint('enemy-shot-detail',64,32,ctx=>{
    const trail=ctx.createLinearGradient(0,0,34,0);
    trail.addColorStop(0,'#b38eff00');trail.addColorStop(1,'#d5b9ff88');
    ctx.fillStyle=trail;ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(31,9);ctx.lineTo(36,16);ctx.lineTo(31,23);ctx.fill();
    const glow=ctx.createRadialGradient(32,16,1,32,16,15);
    glow.addColorStop(0,'#f4deffbb');glow.addColorStop(0.5,'#b58aff55');glow.addColorStop(1,'#a16fff00');
    ctx.fillStyle=glow;ctx.fillRect(16,0,32,32);
    ctx.fillStyle='#bd9af4';ctx.beginPath();ctx.moveTo(32,9);ctx.lineTo(39,16);ctx.lineTo(32,23);ctx.lineTo(25,16);ctx.fill();
    ctx.fillStyle='#fff3ff';ctx.beginPath();ctx.moveTo(32,12);ctx.lineTo(36,16);ctx.lineTo(32,20);ctx.lineTo(29,16);ctx.fill();
  });
  paint('enemy-impact-detail',256,256,ctx=>{
    const glow=ctx.createRadialGradient(128,128,6,128,128,126);
    glow.addColorStop(0,'#fff5d6dd');glow.addColorStop(0.2,'#ffcb8399');glow.addColorStop(0.7,'#ea724630');glow.addColorStop(1,'#ea724600');
    ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);
    for(let i=0;i<18;i++){
      const a=i*2.39996;ctx.strokeStyle=i%2?'#ffd4a399':'#d5796755';ctx.lineWidth=i%3+1;
      ctx.beginPath();ctx.moveTo(128+Math.cos(a)*22,128+Math.sin(a)*22);
      ctx.lineTo(128+Math.cos(a+0.13)*68,128+Math.sin(a+0.13)*68);
      ctx.lineTo(128+Math.cos(a)*112,128+Math.sin(a)*112);ctx.stroke();
    }
    ctx.strokeStyle='#ffcf97bb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(128,128,122,0,Math.PI*2);ctx.stroke();
  });
  paint('boss-skull-mark',48,48,ctx=>{
    ctx.fillStyle='#261c2e';ctx.beginPath();ctx.arc(24,22,21,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffd8aa';ctx.beginPath();ctx.ellipse(24,20,14,13,0,0,Math.PI*2);ctx.fill();ctx.fillRect(16,27,16,11);
    ctx.fillStyle='#493443';for(const x of [18,30]){ctx.beginPath();ctx.ellipse(x,21,4,5,0,0,Math.PI*2);ctx.fill();}
    ctx.beginPath();ctx.moveTo(24,25);ctx.lineTo(21,30);ctx.lineTo(27,30);ctx.fill();
    for(const x of [20,24,28])ctx.fillRect(x,33,1.5,5);
  });
}
