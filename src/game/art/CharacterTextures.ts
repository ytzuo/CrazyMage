import Phaser from 'phaser';
import type { EnemyKind } from '../enemies/roster';

const ink = 0x252b35;
type Painter = (g: Phaser.GameObjects.Graphics) => void;
/** Static artwork is rasterized once; entities only transform cached images. */
function texture(scene: Phaser.Scene, key: string, width: number, height: number, paint: Painter): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({}, false);
  paint(g); g.generateTexture(key, width, height); g.destroy();
}
function shape(g: Phaser.GameObjects.Graphics, points: number[], color: number, outline = ink): void {
  g.fillStyle(color).lineStyle(2, outline).beginPath().moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath().fillPath().strokePath();
}
function eyes(g: Phaser.GameObjects.Graphics, y: number, color = 0xffdf93): void {
  for (const x of [48, 78]) {
    g.fillStyle(ink).fillEllipse(x, y, 17, 20);
    g.fillStyle(color).fillEllipse(x + 1, y - 1, 9, 12);
    g.fillStyle(0xffffff, 0.85).fillCircle(x - 1, y - 4, 2);
  }
}

export function prepareMageTextures(scene: Phaser.Scene): void {
  texture(scene, 'mage-body-detail', 128, 192, g => {
    g.fillStyle(ink).fillRoundedRect(43, 162, 18, 17, 4).fillRoundedRect(67, 162, 18, 17, 4);
    g.fillStyle(0x6b5550).fillRect(45, 167, 13, 4).fillRect(69, 167, 13, 4);
    shape(g, [44,112,84,112,96,166,78,173,63,169,47,174,31,166], 0x47638e);
    shape(g, [44,119,57,126,49,166,34,163], 0x7698bc, 0x47638e);
    shape(g, [71,119,83,116,93,164,77,169], 0x304363, 0x304363);
    g.lineStyle(2,0xa4c8d0).lineBetween(44,128,39,159).lineBetween(56,135,53,164);
    g.lineStyle(2,0x263b5d).lineBetween(70,133,74,166).lineBetween(84,140,88,159);
    shape(g, [43,113,32,125,30,145,41,148,49,123], 0x5779a3);
    g.fillStyle(0xe3bf99).fillRoundedRect(30,141,11,10,4);
    g.fillStyle(0x584839).fillRoundedRect(42,127,42,9,2);
    g.lineStyle(2,0xb49765).strokeRect(59,127,10,9);
    g.fillStyle(0x8a6248).fillRoundedRect(75,132,13,15,3);
    g.lineStyle(1,0xc59464).lineBetween(77,137,86,137);
    shape(g, [42,112,62,123,84,112,78,104,48,104], 0xb5c6d0);
    shape(g, [49,112,63,119,56,128], 0x7695b7);
    g.fillStyle(0xab785b).fillRoundedRect(46,91,36,26,8);
    g.fillStyle(0xe6bf94).fillRoundedRect(47,89,32,24,8);
    g.fillStyle(0xf8d9ad).fillEllipse(57,97,17,13);
    g.fillStyle(0x674d40).fillTriangle(45,88,58,88,45,103).fillTriangle(79,88,70,89,80,103);
    g.fillStyle(ink).fillRoundedRect(53,98,5,8,2).fillRoundedRect(69,98,5,8,2);
    g.fillStyle(0xffffff).fillRect(54,98,2,2).fillRect(70,98,2,2);
    g.lineStyle(1,0x9f6958).lineBetween(61,110,66,110);
    shape(g, [34,88,52,41,63,36,67,51,84,88], 0x57749f);
    shape(g, [37,86,53,44,59,42,53,85], 0x89abc8, 0x89abc8);
    shape(g, [65,51,82,86,65,84], 0x364e78, 0x364e78);
    g.lineStyle(1,0xb3d2db).lineBetween(49,64,45,77);
    g.lineStyle(2,0xd6b77a).lineBetween(36,83,80,83);
    g.fillStyle(0xa98553).fillRoundedRect(36,82,47,7,2);
    g.fillStyle(0xebd59e).fillRect(59,82,8,7);
    shape(g, [28,88,42,86,81,86,98,91,93,98,36,97,25,93], 0x3c567d);
    g.lineStyle(2,0x9bbad0).lineBetween(29,89,48,91).lineBetween(48,91,91,91);
    g.fillStyle(0xded8a5).fillCircle(61,64,2).fillCircle(66,74,1.5);
  });
  texture(scene, 'mage-staff-detail', 64, 112, g => {
    shape(g,[40,19,47,19,46,97,41,97],0x6f4936);
    g.lineStyle(2,0xbc8a56).lineBetween(42,27,42,91);
    for(let y=48;y<70;y+=5)g.lineStyle(2,0xd4b880).lineBetween(40,y,47,y+2);
    shape(g,[35,15,44,5,53,15,50,27,38,27],0xc79e55);
    shape(g,[38,15,44,9,49,15,46,23,41,23],0xa6e1df,0xf2dca1);
    g.fillStyle(0xffffff,0.8).fillTriangle(40,15,44,11,44,20);
    g.fillStyle(0xe3bf99).fillRoundedRect(37,57,11,10,4);
    g.lineStyle(1,0xaa7857).lineBetween(39,61,46,61).lineBetween(39,64,46,64);
  });
}

export const enemyTexture = (kind: EnemyKind): string => `enemy-${kind}-detail`;
/** Double-resolution source art keeps the original logical size and hit radius. */
export const enemyArtScale = (kind: EnemyKind, radius: number): number => radius / (kind === 'brute' ? 58 : 40);
export function prepareEnemyTextures(scene: Phaser.Scene): void {
  for (const kind of ['chaser','swift','ranged','brute'] as EnemyKind[]) {
    texture(scene, enemyTexture(kind), 128, 128, g => {
      if(kind==='chaser') {
        shape(g,[27,41,15,7,44,30],0x9a6575);shape(g,[85,31,113,7,102,45],0x9a6575);
        shape(g,[26,30,22,15,38,31],0xe4b7a6);shape(g,[91,31,107,15,101,34],0xe4b7a6);
        g.fillStyle(ink).fillRoundedRect(19,30,91,79,28);
        g.fillStyle(0x9e617a).fillRoundedRect(22,32,85,74,26);
        g.fillStyle(0xc68c9b).fillEllipse(59,53,70,48);
        g.fillStyle(0xe0afaf,0.7).fillEllipse(48,42,36,16);
        g.fillStyle(0x774b65).fillEllipse(99,75,14,37).fillEllipse(64,96,52,17);
        eyes(g,61);
        g.lineStyle(3,0x75465c).lineBetween(37,46,51,49).lineBetween(77,49,90,44);
        g.fillStyle(0x54384a).fillEllipse(63,83,31,12);
        shape(g,[51,80,56,89,60,80],0xf6dfb5);shape(g,[68,80,72,89,77,80],0xf6dfb5);
        g.fillStyle(0xd3a1a5).fillEllipse(30,84,13,20).fillEllipse(98,85,13,20);
        for(const x of [29,35,91,97])g.lineStyle(2,0xf0cbb2).lineBetween(x,96,x+1,101);
        for(const [x,y] of [[37,65],[89,70],[41,91],[83,94]])g.fillStyle(0x81546d,0.55).fillCircle(x,y,2);
      } else if(kind==='swift') {
        shape(g,[27,74,11,106,40,94,64,105,91,94,116,108,101,72,67,16],0x39594b);
        shape(g,[26,85,52,28,66,13,81,36,101,90,71,102,43,98],0x72964f);
        shape(g,[36,81,63,29,73,40,60,91],0xc0d978,0x91b965);
        shape(g,[72,42,96,87,76,93,63,88],0x536f43,0x536f43);
        shape(g,[44,36,32,11,58,26],0xbed38a);shape(g,[74,25,94,10,88,42],0x9fb97a);
        eyes(g,65,0xffed9d);
        g.lineStyle(3,0x334b3d).lineBetween(37,52,54,57).lineBetween(74,56,91,51);
        g.lineStyle(2,0x334b3d).lineBetween(55,82,70,84);
        shape(g,[50,95,41,109,28,112,32,103],0xcbd9a1);shape(g,[80,95,86,109,101,112,97,103],0xcbd9a1);
        g.lineStyle(2,0xc9e297).lineBetween(51,37,47,44).lineBetween(40,79,35,90);
      } else if(kind==='ranged') {
        shape(g,[36,47,77,42,98,106,69,101,57,110,39,103,21,109],0x54406e);
        shape(g,[42,54,59,66,49,101,28,104],0x9772bc,0x775898);
        shape(g,[67,60,76,50,91,102,68,98],0x362d53,0x362d53);
        g.lineStyle(2,0xc29ee0).lineBetween(37,79,32,98).lineBetween(53,80,50,96);
        shape(g,[28,49,38,26,62,13,82,24,91,49,77,67,41,66],0x8763ad);
        shape(g,[37,46,45,31,64,25,77,34,81,49,72,59,44,59],0x302b48,0xbaa0d5);
        g.fillStyle(0xe3b8ff).fillEllipse(51,45,7,5).fillEllipse(69,45,7,5);
        g.lineStyle(2,0xc8acdd).lineBetween(46,24,59,19);
        g.fillStyle(0xb08bcb).fillRoundedRect(85,66,14,14,5);
        shape(g,[104,30,110,30,110,108,104,108],0x654a71);
        g.lineStyle(2,0xc5a8d6).lineBetween(106,42,106,101);
        shape(g,[95,25,107,8,120,25,112,40,102,40],0x986bb5);
        shape(g,[101,25,107,13,114,25,108,34],0xe3bdff,0xf2dbff);
        g.fillStyle(0xffffff).fillTriangle(103,23,107,17,107,28);
        g.fillStyle(0xd0b07a).fillCircle(59,71,4);
        g.lineStyle(1,0xd0b07a).lineBetween(44,62,59,71).lineBetween(59,71,75,60);
        g.lineStyle(2,0xae8fba).lineBetween(48,103,53,107).lineBetween(65,102,69,104);
      } else {
        shape(g,[12,39,28,26,101,27,117,42,119,104,101,112,27,111,8,100],0x67503f);
        shape(g,[20,37,38,29,43,66,18,79,9,66],0xa27a4c);
        shape(g,[89,32,108,36,118,69,102,80,85,65],0x987047);
        shape(g,[31,24,43,13,89,14,101,27,96,70,79,84,42,77,29,59],0xbe9259);
        shape(g,[35,27,44,19,85,19,91,28,80,40,44,40],0xe1b675,0xe1b675);
        shape(g,[86,39,97,29,93,66,77,77,75,47],0x8a633f,0x8a633f);
        eyes(g,49,0xbfeaf0);
        g.lineStyle(4,0x705235).lineBetween(38,35,54,39).lineBetween(73,39,89,34);
        shape(g,[44,66,82,66,77,75,49,75],0x6c4d35);
        g.lineStyle(2,0xe9c48a).lineBetween(38,24,48,22).lineBetween(25,40,19,55);
        g.lineStyle(2,0x72553d).lineBetween(66,17,61,29).lineBetween(61,29,66,37).lineBetween(90,55,82,59);
        shape(g,[15,78,40,76,43,104,18,108,10,98],0xb68c53);
        shape(g,[90,76,115,78,120,99,111,108,88,103],0xb68c53);
        for(const x of [17,27,96,106])g.lineStyle(3,0x765638).lineBetween(x,92,x,102);
        g.fillStyle(0x433c35).fillRoundedRect(35,103,23,14,3).fillRoundedRect(73,103,23,14,3);
        g.lineStyle(2,0xa2885f).lineBetween(39,109,52,109).lineBetween(77,109,90,109);
        shape(g,[49,83,79,83,75,103,52,103],0x7a6750);
        shape(g,[60,85,69,85,73,92,65,99,57,92],0x9ed6d7,0xd0e6d3);
        for(const [x,y] of [[21,42],[108,43],[20,83],[108,84]])g.fillStyle(0xedd19d).fillCircle(x,y,2);
      }
    });
  }
}
