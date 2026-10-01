import type { DamageTarget } from '../combat/DamageResolver.ts';
import type { LightningSpec } from '../upgrades/build.ts';
/** First hit is within a forward cone; subsequent hops choose distinct nearest enemies. */
export function chainTargets(targets:readonly DamageTarget[],x:number,y:number,aim:{x:number;y:number},spec:LightningSpec):DamageTarget[] {
  const result:DamageTarget[]=[],visited=new Set<number>();
  for(let hop=0;hop<spec.maxTargets;hop++) {
    let nearest:DamageTarget|undefined,best=(hop?spec.jumpRange:spec.range)**2;
    for(const target of targets) {
      if(visited.has(target.id))continue;
      const dx=target.x-x,dy=target.y-y,d=dx*dx+dy*dy;
      if(d>best)continue;
      if(hop===0&&d>0&&(dx*aim.x+dy*aim.y)/Math.sqrt(d)<0.5)continue;
      if(!nearest||d<best||(d===best&&target.id<nearest.id)){nearest=target;best=d;}
    }
    if(!nearest)break;
    result.push(nearest);visited.add(nearest.id);x=nearest.x;y=nearest.y;
  }
  return result;
}
