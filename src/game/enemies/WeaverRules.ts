import { ARENA } from '../config.ts';
export const WEAVER = {
  initialRest:1800, rest:5000, teleportWarning:800, landing:800, enragedLanding:1200,
  lineWarning:1000, lineLife:1400, lineRadius:18, lineLength:600,
  orbWarning:1000, orbTravel:2000, orbPause:550, orbDistance:420, orbRadius:12,
  maximumFights:6, linesPerBoss:2, orbsPerBoss:3,
} as const;
export type WeaverMove = 'teleport' | 'lines' | 'orbs';
export const weaverMove = (last:WeaverMove|null):WeaverMove => last==='teleport'?'lines':last==='lines'?'orbs':'teleport';
/** Clip a ray without bending it at the arena walls. */
export function weaverRay(x:number,y:number,angle:number,length:number,margin:number) {
  const dx=Math.cos(angle),dy=Math.sin(angle);
  let reach=length;
  if(dx>1e-8)reach=Math.min(reach,(ARENA.width-margin-x)/dx);
  if(dx< -1e-8)reach=Math.min(reach,(margin-x)/dx);
  if(dy>1e-8)reach=Math.min(reach,(ARENA.height-margin-y)/dy);
  if(dy< -1e-8)reach=Math.min(reach,(margin-y)/dy);
  reach=Math.max(0,reach);
  return {x:x+dx*reach,y:y+dy*reach,length:reach};
}
export function weaverDestination(x:number,y:number,px:number,py:number,radius:number) {
  const margin=ARENA.inset+radius,angle=Math.atan2(y-py,x-px)+Math.PI*.7;
  // Only evaluated once per cast. Prefer a visible 300px gap, with bounded wall fallback.
  let best={x,y},score=-1;
  for(let i=0;i<8;i++) {
    const a=angle+i*Math.PI/4;
    const nx=Math.max(margin,Math.min(ARENA.width-margin,px+Math.cos(a)*300));
    const ny=Math.max(margin,Math.min(ARENA.height-margin,py+Math.sin(a)*300));
    const distance=Math.hypot(nx-px,ny-py);
    if(distance>score){best={x:nx,y:ny};score=distance;}
    if(distance>=280&&Math.hypot(nx-x,ny-y)>180)return best;
  }
  return best;
}
