import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { prepareMageTextures, mageBodyTexture, type CharacterGender } from '../src/game/art/CharacterTextures';
import { SCHOOLS } from '../src/game/upgrades/definitions';
import { PLAYER } from '../src/game/config';
const result=document.querySelector<HTMLPreElement>('#result')!;
const pause=document.querySelector<HTMLButtonElement>('#pause')!;
let game:Phaser.Game|undefined,paused=false,facing=1;
type Rig={leftLeg:Phaser.GameObjects.Image;rightLeg:Phaser.GameObjects.Image;staff:Phaser.GameObjects.Image;figure:Phaser.GameObjects.Container;wand:Phaser.GameObjects.Container};
function launch(scene:Phaser.Scene):void {
  game?.destroy(true);game?.loop.wake();paused=false;pause.textContent='暂停动作';
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:900,height:570,scene,backgroundColor:'#17251f',audio:{noAudio:true}});
}
function checks():void {
  class Checks extends Phaser.Scene {
    create():void {
      const player=new Player(this),rig=player as unknown as Rig,reports:string[]=[];
      const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);};
      const baseline=this.children.list.length,keys=this.textures.getTextureKeys().length;
      try {
        for(const gender of ['male','female'] as CharacterGender[])for(const school of SCHOOLS) {
          player.reset();player.setGender(gender);player.setSchool(school);
          const key=mageBodyTexture(school,gender);
          check(rig.leftLeg.texture.key===`${key}-left`&&rig.rightLeg.texture.key===`${key}-right`,'gender/school legs');
          check(rig.wand.list.length===2&&rig.figure.list.length===4,'original hands / long robe layers');
          const x=player.view.x;player.update({x:1,y:0},45,{x:1,y:0});
          check(Math.abs(player.view.x-x-player.speed*.045)<.001,'movement speed changed');
          check(rig.leftLeg.rotation*rig.rightLeg.rotation<0,'legs/hand not alternating');
          const pose=[rig.leftLeg.rotation,rig.rightLeg.rotation];
          player.update({x:1,y:0},0,{x:1,y:0});check(pose[0]===rig.leftLeg.rotation&&pose[1]===rig.rightLeg.rotation,'zero delta changed gait');
          player.update({x:1,y:0},45,{x:1,y:0});
          check(pose[0]!==rig.leftLeg.rotation,'gait did not advance');
          player.update({x:0,y:0},10);check(rig.leftLeg.rotation===0&&rig.rightLeg.rotation===0,'idle not neutral');
          player.cast({x:-1,y:0},school);player.update({x:1,y:0},70);
          check(rig.figure.scaleX<0&&rig.wand.rotation!==0&&player.casting,'movement overrides cast');
          const cast=rig.wand.rotation;player.update({x:0,y:0},0);check(rig.wand.rotation===cast,'zero delta advanced cast');
          player.update({x:0,y:0},210);check(!player.casting&&rig.wand.rotation===0,'cast not restored');
          player.hurt(1,player.view.x-10,player.view.y);player.update({x:0,y:0},20);
          const alpha=Math.floor((PLAYER.invulnerability-20)/75)%2===0?.4:1;
          check(rig.leftLeg.rotation===0&&rig.rightLeg.rotation===0&&rig.figure.alpha===alpha,'knockback gait / full actor flash');
          player.reset();check(rig.leftLeg.rotation===0&&!player.casting,'reset pose');
          reports.push(`${gender}/${school}: long robe, original hands, two feet, gait, idle, cast facing, hit, reset`);
        }
        player.reset();player.speed=200;player.update({x:1,y:0},45);const full=rig.leftLeg.rotation;
        player.reset();player.speed=100;player.update({x:1,y:0},90);check(Math.abs(full-rig.leftLeg.rotation)<.0001,'gait not distance based');
        for(let i=0;i<10;i++){prepareMageTextures(this);player.reset();check(this.children.list.length===baseline&&this.textures.getTextureKeys().length===keys,'objects/cache accumulated');}
        player.view.destroy();check(this.children.list.length===0,'destroy retained actor or limbs');
        reports.push('same distance gives same gait; ten resets reuse objects/textures; destroy clears all limbs');
        result.textContent=JSON.stringify({passed:true,reports,baseline,cachedKeys:keys},null,2);
      }catch(error){result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
      this.scene.pause();this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.game.pause();this.game.loop.sleep();});
    }
  }
  launch(new Checks());
}
function preview():void {
  class Preview extends Phaser.Scene {
    private players:Player[]=[];private elapsed=0;
    create():void {
      this.cameras.main.centerOn(1200,900);
      for(const [row,gender] of (['male','female'] as const).entries())for(const [col,school] of SCHOOLS.entries()) {
        const base=new Player(this),large=new Player(this);
        for(const p of [base,large]){p.setGender(gender);p.setSchool(school);this.players.push(p);}
        base.view.setPosition(900+col*260,820+row*250);
        large.view.setPosition(1020+col*260,820+row*250).setScale(2.1);
        this.add.text(930+col*260,710+row*250,`${gender==='male'?'男':'女'} · ${{fire:'火',ice:'冰',lightning:'雷'}[school]}`,{fontSize:'18px',color:'#eddbb9'});
      }
      result.textContent='长袍下双脚交替迈步，双手恢复原样，法杖保留原施法动作。';
    }
    update(_time:number,delta:number):void {
      const step=Math.min(delta,50),before=this.elapsed;this.elapsed+=step;
      for(const [i,p] of this.players.entries()) {
        const x=p.view.x,y=p.view.y;
        if(Math.floor(before/1600)!==Math.floor(this.elapsed/1600))p.cast({x:facing,y:0},SCHOOLS[Math.floor(i/2)%3]);
        p.update({x:facing,y:0},step,{x:facing,y:0});p.view.setPosition(x,y);
      }
    }
  }
  launch(new Preview());
}
document.querySelector<HTMLButtonElement>('#preview')!.onclick=preview;
document.querySelector<HTMLButtonElement>('#check')!.onclick=checks;
document.querySelector<HTMLButtonElement>('#direction')!.onclick=()=>{facing*=-1;};
pause.onclick=()=>{if(!game)return;paused=!paused;if(paused){game.pause();game.loop.sleep();}else{game.resume();game.loop.wake();}pause.textContent=paused?'继续动作':'暂停动作';pause.dataset.loopRunning=String(game.loop.running);};
preview();
