import { prepareSpecialEnemyTextures } from './SpecialEnemyTextures';
import Phaser from 'phaser';
import type { EnemyKind } from '../enemies/roster';
import { SCHOOLS, type School } from '../upgrades/definitions';
import type { EnemyVariant } from '../enemies/variants';

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

export const MAGE_PALETTES = {
  fire: {robe:0xa54b3c,light:0xe18a59,dark:0x602e38,trim:0xffd19a,crystal:0xffae55},
  ice: {robe:0x4c8ba7,light:0xa3d6dd,dark:0x2d526d,trim:0xe0faff,crystal:0x9deaff},
  lightning: {robe:0x735aab,light:0xb59ace,dark:0x3f315f,trim:0xf6dfa0,crystal:0xffe77a},
} as const;
export type CharacterGender = 'male' | 'female';
export const mageBodyTexture = (school:School, gender:CharacterGender='male'):string => gender==='female'?`mage-body-${school}-female-detail`:school==='fire'?'mage-body-detail':`mage-body-${school}-detail`;
export const mageStaffTexture = (school:School):string => school==='fire'?'mage-staff-detail':`mage-staff-${school}-detail`;
export type SchoolArtwork = Record<School,{body:string;staff:string}>;

export function prepareMageTextures(scene: Phaser.Scene): void {
  for (const school of SCHOOLS) {
    const palette = MAGE_PALETTES[school];
    for(const gender of ['male','female'] as const) {
    texture(scene, mageBodyTexture(school,gender), 128, 192, g => {
      g.fillStyle(ink).fillRoundedRect(43, 162, 18, 17, 4).fillRoundedRect(67, 162, 18, 17, 4);
      g.fillStyle(0x6b5550).fillRect(45, 167, 13, 4).fillRect(69, 167, 13, 4);
      shape(g, gender==='female'?[47,112,80,112,91,163,78,176,63,172,45,177,30,164]:[44,112,84,112,96,166,78,173,63,169,47,174,31,166], palette.robe);
      shape(g, [44,119,57,126,49,166,34,163], palette.light, palette.robe);
      shape(g, [71,119,83,116,93,164,77,169], palette.dark, palette.dark);
      g.lineStyle(2,palette.trim).lineBetween(44,128,39,159).lineBetween(56,135,53,164);
      g.lineStyle(2,palette.dark).lineBetween(70,133,74,166).lineBetween(84,140,88,159);
      shape(g, [43,113,32,125,30,145,41,148,49,123], palette.robe);
      g.fillStyle(0xe3bf99).fillRoundedRect(30,141,11,10,4);
      g.fillStyle(0x584839).fillRoundedRect(42,127,42,9,2);
      g.lineStyle(2,0xb49765).strokeRect(59,127,10,9);
      g.fillStyle(0x8a6248).fillRoundedRect(75,132,13,15,3);
      g.lineStyle(1,0xc59464).lineBetween(77,137,86,137);
      shape(g, [42,112,62,123,84,112,78,104,48,104], 0xb5c6d0);
      shape(g, [49,112,63,119,56,128], palette.light);
      if(gender==='female') {
        // Golden cascading curls are baked into the shared body texture.
        shape(g,[42,91,55,88,51,116,47,134,43,150,32,147,35,129,32,112,37,99],0xdbaa4b);
        shape(g,[75,89,86,94,94,109,90,125,96,139,88,153,78,147,81,130,77,112],0xdbaa4b);
        for(let i=0;i<4;i++) {
          const y=103+i*14;
          for(const x of [i%2?38:42,i%2?89:85]) {
            g.fillStyle(0x9c6b2f).fillCircle(x,y,8);
            g.fillStyle(0xe9bb5e).fillCircle(x,y-1,6.5);
            g.fillStyle(0xffe499,0.85).fillEllipse(x-2,y-2,3,8);
            g.lineStyle(1.5,0xb77d36).strokeEllipse(x+1,y+1,7,8);
          }
        }
      }
      g.fillStyle(0xab785b).fillRoundedRect(46,91,36,26,8);
      g.fillStyle(0xe6bf94).fillRoundedRect(47,89,32,24,8);
      g.fillStyle(0xf8d9ad).fillEllipse(57,97,17,13);
      g.fillStyle(gender==='female'?0xe9bb5e:0x674d40).fillTriangle(45,88,58,88,45,103).fillTriangle(79,88,70,89,80,103);
      g.fillStyle(ink).fillRoundedRect(53,98,5,8,2).fillRoundedRect(69,98,5,8,2);
      g.fillStyle(0xffffff).fillRect(54,98,2,2).fillRect(70,98,2,2);
      g.lineStyle(1,0x9f6958).lineBetween(61,110,66,110);
      if(gender==='female') {
        g.lineStyle(2,ink).lineBetween(51,99,56,97).lineBetween(71,97,76,99);
        g.fillStyle(0xd98d88,0.5).fillEllipse(51,107,6,3).fillEllipse(76,107,6,3);
        g.fillStyle(palette.trim).fillCircle(81,108,2.5);
      } else g.lineStyle(2,0x674d40).lineBetween(52,96,58,95).lineBetween(68,95,74,96);
      shape(g, [34,88,52,41,63,36,67,51,84,88], palette.robe);
      shape(g, [37,86,53,44,59,42,53,85], palette.light, palette.light);
      shape(g, [65,51,82,86,65,84], palette.dark, palette.dark);
      g.lineStyle(1,0xb3d2db).lineBetween(49,64,45,77);
      g.lineStyle(2,0xd6b77a).lineBetween(36,83,80,83);
      g.fillStyle(0xa98553).fillRoundedRect(36,82,47,7,2);
      g.fillStyle(0xebd59e).fillRect(59,82,8,7);
      shape(g, [28,88,42,86,81,86,98,91,93,98,36,97,25,93], palette.dark);
      g.lineStyle(2,palette.trim).lineBetween(29,89,48,91).lineBetween(48,91,91,91);
      g.fillStyle(palette.crystal).fillCircle(61,64,2).fillCircle(66,74,1.5);
      if(school==='fire') shape(g,[60,57,56,69,63,67,67,72,69,63,64,53],palette.crystal,palette.trim);
      else if(school==='ice') g.lineStyle(2,palette.crystal).lineBetween(57,61,69,71).lineBetween(57,71,69,61).lineBetween(63,56,63,76);
      else shape(g,[65,53,57,67,64,67,60,79,71,62,65,62],palette.crystal,palette.trim);
    });
    }
    texture(scene, mageStaffTexture(school), 64, 112, g => {
      shape(g,[40,19,47,19,46,97,41,97],0x6f4936);
      g.lineStyle(2,0xbc8a56).lineBetween(42,27,42,91);
      for(let y=48;y<70;y+=5)g.lineStyle(2,0xd4b880).lineBetween(40,y,47,y+2);
      shape(g,[35,15,44,5,53,15,50,27,38,27],0xc79e55);
      shape(g,[38,15,44,9,49,15,46,23,41,23],palette.crystal,0xf2dca1);
      if(school==='fire') shape(g,[38,23,35,15,41,10,44,0,49,10,52,16,48,25],palette.crystal,palette.trim);
      else if(school==='ice') g.lineStyle(2,palette.trim).lineBetween(33,15,55,15).lineBetween(44,4,44,27);
      else shape(g,[47,2,36,17,44,16,40,29,53,12,46,13],palette.crystal,palette.trim);
      g.fillStyle(0xffffff,0.8).fillTriangle(40,15,44,11,44,20);
      g.fillStyle(0xe3bf99).fillRoundedRect(37,57,11,10,4);
      g.lineStyle(1,0xaa7857).lineBetween(39,61,46,61).lineBetween(39,64,46,64);
    });
  }
}

export const enemyTexture = (kind: EnemyKind, variant: EnemyVariant = 'normal'): string => `enemy-${kind}-detail${variant === 'normal' ? '' : `-${variant}`}`;
/** Double-resolution source art keeps the original logical size and hit radius. */
export const enemyArtScale = (kind: EnemyKind, radius: number): number => radius / (kind === 'brute' ? 58 : 40);
export function prepareEnemyTextures(scene: Phaser.Scene): void {
  prepareSpecialEnemyTextures(scene);
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
  texture(scene, enemyTexture('artillery'), 128, 128, g => {
    g.fillStyle(0x29253f).fillEllipse(64,101,84,22);
    shape(g,[30,100,41,47,64,30,88,47,102,101,79,109,53,109],0x5f608d);
    shape(g,[42,48,64,33,79,50,68,97,49,98],0x9898cb);
    g.fillStyle(0x343448).fillEllipse(64,48,36,27);
    g.fillStyle(0xe6d8ff).fillEllipse(56,47,6,5).fillEllipse(73,47,6,5);
    g.lineStyle(4,0x73749b).strokeCircle(64,23,21);
    g.lineStyle(2,0xd6c5ff).strokeCircle(64,23,16);
    shape(g,[64,10,76,23,64,36,52,23],0xc4abf5);
    shape(g,[64,14,70,23,64,32,59,23],0xffe5ef);
    g.fillStyle(0x7f78a5).fillEllipse(28,71,17,26).fillEllipse(101,71,17,26);
    for(const x of [28,101])g.lineStyle(2,0xd2b8f1).strokeCircle(x,66,10);
    g.lineStyle(2,0xb8abe1).lineBetween(50,74,64,85).lineBetween(64,85,80,74);
  });
  texture(scene, enemyTexture('boss'), 128, 128, g => {
    // Floating obsidian sentinel: crown, detached arms and a molten core.
    g.fillStyle(0x241b32).fillTriangle(64,4,112,91,16,91);
    for (const x of [17,91]) {
      g.fillStyle(0x43334d).fillRoundedRect(x,42,20,48,6);
      g.lineStyle(2,0xff805a).strokeRoundedRect(x,42,20,48,6);
      g.fillStyle(0xf9b66c).fillCircle(x+10,55,4);
    }
    g.fillStyle(0x55425e).fillTriangle(64,22,96,94,32,94);
    g.fillStyle(0x352a43).fillTriangle(64,34,86,91,42,91);
    g.lineStyle(3,0xc98c6a).lineBetween(36,40,23,15).lineBetween(92,40,105,15).lineBetween(64,25,64,5);
    g.fillStyle(0xff9862,0.2).fillCircle(64,70,24);
    g.fillStyle(0xff774d).fillTriangle(64,49,77,70,64,91).fillTriangle(64,49,51,70,64,91);
    g.fillStyle(0xffe3a7).fillTriangle(64,57,69,70,64,82);
    g.lineStyle(3,0xffd7a2).lineBetween(48,40,58,44).lineBetween(70,44,80,40);
    g.lineStyle(2,0xa788a7).lineBetween(33,95,52,110).lineBetween(95,95,76,110);
    g.fillStyle(0xffb470).fillCircle(64,116,4);
  });
  // Distinct silhouettes and insignia remain visible through hit/ice tinting.
  const variants: [EnemyKind, EnemyVariant][] = [['chaser','splitter'],['swift','dasher'],['ranged','volley'],['brute','guardian']];
  for (const [kind, variant] of variants) {
    if (scene.textures.exists(enemyTexture(kind, variant))) continue;
    const art = scene.textures.createCanvas(enemyTexture(kind, variant),128,128)!;
    const ctx = art.context;
    ctx.drawImage(scene.textures.get(enemyTexture(kind)).getSourceImage() as HTMLCanvasElement,0,0);
    ctx.lineWidth = 3; ctx.strokeStyle = '#263342';
    if (variant === 'splitter') {
      ctx.fillStyle = '#76dac6';
      for (const x of [39,88]) { ctx.beginPath();ctx.arc(x,23,12,0,Math.PI*2);ctx.fill();ctx.stroke(); }
      ctx.strokeStyle='#bcffdb';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(63,33);ctx.lineTo(58,55);ctx.lineTo(70,73);ctx.lineTo(63,102);ctx.stroke();
    } else if (variant === 'dasher') {
      ctx.fillStyle='#ed875b';ctx.beginPath();ctx.moveTo(47,29);ctx.lineTo(64,0);ctx.lineTo(82,30);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#ffd2a0';ctx.lineWidth=5;
      for(const y of [77,91]) {ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(64,y-9);ctx.lineTo(80,y);ctx.stroke();}
    } else if (variant === 'volley') {
      ctx.fillStyle='#ff8fd2';
      for(const [x,y] of [[91,22],[106,6],[119,22]]) {ctx.beginPath();ctx.moveTo(x,y-6);ctx.lineTo(x+6,y+3);ctx.lineTo(x,y+11);ctx.lineTo(x-6,y+3);ctx.closePath();ctx.fill();ctx.stroke();}
      ctx.strokeStyle='#ffc9ec';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(34,85);ctx.lineTo(46,90);ctx.lineTo(57,85);ctx.stroke();
    } else {
      ctx.fillStyle='#759fb4';ctx.beginPath();ctx.moveTo(10,61);ctx.lineTo(44,53);ctx.lineTo(52,83);ctx.lineTo(32,113);ctx.lineTo(9,93);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#d9f3ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(29,63);ctx.lineTo(34,88);ctx.lineTo(23,84);ctx.lineTo(32,101);ctx.stroke();
      ctx.fillStyle='#b5dcea';ctx.fillRect(49,13,31,5);
    }
    art.refresh();
  }
}
