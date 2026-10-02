import type Phaser from 'phaser';
import type { EnemyKind } from '../enemies/roster';
import type { EnemyVariant } from '../enemies/variants';

export const ENEMY_LEGS = {
  chaser: { y:94, left:29, right:68, width:32, pivotLeft:45, pivotRight:82 },
  swift: { y:99, left:0, right:78, width:50, pivotLeft:34, pivotRight:96 },
  brute: { y:110, left:34, right:73, width:26, pivotLeft:46, pivotRight:85 },
  bomber: { y:104, left:33, right:72, width:25, pivotLeft:46, pivotRight:84 },
} as const;
export const LEG_OVERLAP = 8;
export function enemyLegLayout(kind:EnemyKind) {
  return kind==='chaser'||kind==='swift'||kind==='brute'||kind==='bomber' ? ENEMY_LEGS[kind] : null;
}

/** Derive shared limb layers once, retaining the original texture for static previews. */
export function prepareEnemyLegTextures(scene:Phaser.Scene):void {
  const forms:[EnemyKind,EnemyVariant][]=[['chaser','normal'],['chaser','splitter'],['swift','normal'],['swift','dasher'],['brute','normal'],['brute','guardian'],['bomber','normal'],['bomber','chain']];
  for(const [kind,variant] of forms) {
    const key=`enemy-${kind}-detail${variant==='normal'?'':`-${variant}`}`;
    if(scene.textures.exists(`${key}-torso`))continue;
    const layout=enemyLegLayout(kind)!;
    const source=scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
    const torso=scene.textures.createCanvas(`${key}-torso`,128,128)!;
    torso.context.drawImage(source,0,0);
    for(const [side,x] of [['left',layout.left],['right',layout.right]] as const) {
      const foot=scene.textures.createCanvas(`${key}-${side}`,layout.width,128-layout.y+LEG_OVERLAP)!;
      const pivot=(side==='left'?layout.pivotLeft:layout.pivotRight)-x;
      // Hidden upper shins overlap the torso, keeping joints connected through a step.
      foot.context.fillStyle=kind==='chaser'?'#825269':kind==='swift'?'#4c6941':kind==='brute'?'#433c35':'#795943';
      foot.context.fillRect(pivot-5,0,10,LEG_OVERLAP+2);
      foot.context.fillStyle=kind==='chaser'?'#be8392':kind==='swift'?'#829953':kind==='brute'?'#a2885f':'#9c765b';
      foot.context.fillRect(pivot-3,1,3,LEG_OVERLAP);
      foot.context.drawImage(source,x,layout.y,layout.width,128-layout.y,0,LEG_OVERLAP,layout.width,128-layout.y);
      foot.refresh();torso.context.clearRect(x,layout.y,layout.width,128-layout.y);
    }
    // The shield tip belongs to the arm, not the left foot.
    if(variant==='guardian') {
      torso.context.save();torso.context.beginPath();torso.context.moveTo(10,61);
      for(const [x,y] of [[44,53],[52,83],[32,113],[9,93]])torso.context.lineTo(x,y);
      torso.context.closePath();torso.context.clip();torso.context.drawImage(source,0,0);torso.context.restore();
      const left=scene.textures.get(`${key}-left`) as Phaser.Textures.CanvasTexture;
      left.context.save();left.context.globalCompositeOperation='destination-out';left.context.beginPath();
      for(const [i,[x,y]] of [[10,61],[44,53],[52,83],[32,113],[9,93]].entries()) {
        if(i===0)left.context.moveTo(x-layout.left,y-layout.y+LEG_OVERLAP);
        else left.context.lineTo(x-layout.left,y-layout.y+LEG_OVERLAP);
      }
      left.context.closePath();left.context.fill();left.context.restore();left.refresh();
    }
    torso.refresh();
  }
}
