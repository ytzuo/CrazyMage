import Phaser from 'phaser';
import { prepareEnemyTextures,enemyTexture,enemyArtScale } from '../src/game/art/CharacterTextures';
import { ENEMY_TYPES,type EnemyKind } from '../src/game/enemies/roster';
import type { EnemyVariant } from '../src/game/enemies/variants';
const entries:[EnemyKind,EnemyVariant,string][]=[
  ['chaser','normal','追击怪'],['swift','normal','快速小怪'],['ranged','normal','远程小怪'],['brute','normal','重型大怪'],
  ['chaser','splitter','分裂怪'],['swift','dasher','突刺怪'],['ranged','volley','连射怪'],['brute','guardian','盾甲怪'],
  ['artillery','normal','咒印投手'],['boss','normal','魔核守卫'],['bomber','normal','爆核傀儡'],['bomber','chain','连爆傀儡'],
  ['priest','normal','魔核祭司'],['priest','ward','结界祭司'],
  ['artillery','triple','三重咒印'],
];
class Gallery extends Phaser.Scene {
  create():void {
    const started=performance.now();prepareEnemyTextures(this);const prepareMs=performance.now()-started;
    const textures=this.textures.getTextureKeys().length;
    for(let i=0;i<10;i++)prepareEnemyTextures(this);
    if(this.textures.getTextureKeys().length!==textures)throw Error('texture preparation duplicated keys');
    entries.forEach(([kind,variant,label],i)=>{
      const x=112+(i%4)*224,y=60+Math.floor(i/4)*260,key=enemyTexture(kind,variant);
      if(!this.textures.exists(key))throw Error(`Missing artwork ${key}`);
      this.add.text(x,y,label,{fontSize:'23px',color:'#ecebd7'}).setOrigin(0.5);
      this.add.image(x,y+85,key).setScale(1.1);
      this.add.image(x,y+194,key).setScale(enemyArtScale(kind,ENEMY_TYPES[kind].radius));
    });
    document.querySelector('#result')!.textContent=JSON.stringify({passed:true,forms:entries.length,sourceSize:[128,128],prepareMs,cachedKeys:textures,cacheReused:true},null,2);
    this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.scene.pause();this.game.pause();this.game.loop.sleep();});
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:'gallery',width:900,height:1050,scene:Gallery,backgroundColor:'#17251f',audio:{noAudio:true}});
