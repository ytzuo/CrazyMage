import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem, type Enemy } from '../src/game/enemies/EnemySystem';
import { enemySpec, type EnemyKind } from '../src/game/enemies/roster';
import type { EnemyVariant } from '../src/game/enemies/variants';
import { prepareEnemyTextures } from '../src/game/art/CharacterTextures';
const result=document.querySelector<HTMLPreElement>('#result')!;
const pause=document.querySelector<HTMLButtonElement>('#pause')!;
let game:Phaser.Game|undefined, direction=1, paused=false;
type Fixture={createEnemy(x:number,y:number,wave:number,spec:ReturnType<typeof enemySpec>,variant:EnemyVariant,warning:number):void};
function spawn(system:EnemySystem,kind:EnemyKind,variant:EnemyVariant='normal'):Enemy {
  (system as unknown as Fixture).createEnemy(800,900,13,enemySpec(kind,13),variant,0);
  if(system.enemies.length===1)system.waves.register(13,1);else system.waves.add(13,1);
  const enemy=system.enemies.at(-1)!;enemy.cooldown=100000;enemy.view.setAlpha(1);enemy.warning.setVisible(false);return enemy;
}
function launch(scene:Phaser.Scene):void {
  // Phaser defers destruction to its next frame, including a sleeping check scene.
  game?.destroy(true);game?.loop.wake();paused=false;pause.textContent='暂停动作';
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:980,height:560,scene,backgroundColor:'#17251f',audio:{noAudio:true}});
}
function preview():void {
  class Preview extends Phaser.Scene {
    private system!:EnemySystem;private player!:Player;
    create():void {
      this.player=new Player(this);this.player.view.setVisible(false);
      this.system=new EnemySystem(this,undefined,undefined,()=>0.9);this.system.waveClock.wave=13;this.system.waveClock.scheduleNext(1e9);
      const forms:[EnemyKind,EnemyVariant,string][]=[['chaser','normal','追击怪'],['swift','normal','迅捷怪'],['brute','normal','重型怪'],['bomber','normal','爆核傀儡'],['priest','normal','魔核祭司'],['chaser','splitter','分裂怪'],['swift','dasher','突刺怪'],['brute','guardian','盾甲怪'],['bomber','chain','连爆傀儡'],['priest','ward','结界祭司']];
      forms.forEach(([kind,variant,label],i)=>{
        spawn(this.system,kind,variant);const x=804+(i%5)*92,y=800+Math.floor(i/5)*150;
        this.add.text(x,y+52,label,{fontSize:'10px',color:'#dfdfc7'}).setOrigin(0.5);
        this.add.ellipse(x,y+16,68,16,0x0c1713).setDepth(0);
      });
      this.cameras.main.setZoom(2).centerOn(988,876);
      result.textContent='迈步中：左右脚交替，减速时步频跟随位移。';
    }
    update(_time:number,delta:number):void {
      this.player.view.setPosition(direction>0?2200:150,856);this.player.health.reset();
      this.system.enemies.forEach((e,i)=>{e.view.setPosition(804+(i%5)*92,800+Math.floor(i/5)*150);});
      this.system.update(Math.min(delta,50),this.player);
    }
  }
  launch(new Preview());
}
function checks():void {
  class Checks extends Phaser.Scene {
    create():void {
      const player=new Player(this),system=new EnemySystem(this,undefined,undefined,()=>0.9),reports:string[]=[];
      const baseline=this.children.list.length,keys=this.textures.getTextureKeys().length;
      const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);};
      const fresh=()=>{system.reset();player.reset();system.waveClock.wave=13;system.waveClock.scheduleNext(1e9);};
      const pose=(e:Enemy)=>JSON.stringify([e.body.x,e.body.y,e.body.rotation,e.body.scaleX,e.body.scaleY,e.motion.phase,...e.motion.legs.flatMap(l=>[l.x,l.y,l.rotation])]);
      try {
        for(const [kind,variant] of [['swift','normal'],['swift','dasher'],['brute','normal'],['brute','guardian'],['bomber','normal'],['bomber','chain']] as const) {
          fresh();const enemy=spawn(system,kind,variant),x=enemy.view.x;
          check(enemy.motion.legs.every(l=>l.y>0&&l.scaleX===enemy.body.scaleX),'spawn had unposed limbs');
          system.update(100,player);
          check(enemy.motion.legs.length===2&&enemy.motion.amount>0.7,'missing gait');
          check(Math.abs(enemy.view.x-x-enemy.spec.speed*0.1)<0.0001,'animation changed movement speed');
          check(enemy.motion.legs.some(l=>l.rotation!==enemy.body.rotation),'legs remained rigid');
          const walkingY=enemy.body.y;system.update(37,player);
          check(enemy.body.y!==walkingY,'walking body remained rigid');
          const stable=pose(enemy);system.update(0,player);check(pose(enemy)===stable,'zero active time changed pose');
          player.view.setPosition(300,900);system.update(50,player);check(enemy.body.flipX,'left movement did not face left');
          player.view.setPosition(enemy.view.x,1500);const facing=enemy.body.flipX;system.update(50,player);check(enemy.body.flipX===facing,'vertical travel jittered facing');
          system.freeze(enemy,400,false);const frozen=pose(enemy);system.update(200,player);
          check(pose(enemy)===frozen&&enemy.motion.legs.every(l=>l.tintTopLeft===enemy.body.tintTopLeft),'freeze moved feet or lost tint');
          system.update(200,player);check(enemy.frozen===0,'failed to thaw');
          system.hit(enemy,1,{x:1,y:0});check(enemy.motion.amount===0&&enemy.motion.legs.every(l=>l.tintFill),'hit did not settle/sync limb tint');
          reports.push(`${kind}/${variant}: alternating limbs, unchanged speed, facing, zero time, freeze, thaw, hit`);
        }
        fresh();let e=spawn(system,'swift');system.update(100,player);const normal=e.motion.phase;
        fresh();e=spawn(system,'swift');e.slow.apply(0.5,1000);system.update(100,player);
        check(Math.abs(e.motion.phase*2-normal)<1e-6,'slow did not reduce step cadence with travel');reports.push('50% slow advances half the gait distance');
        player.view.setPosition(e.view.x+1,e.view.y);const phase=e.motion.phase;e.knockback.x=100;system.update(100,player);
        check(e.motion.phase===phase,'knockback or stationary actor advanced steps');
        e.knockback.x=0;for(let i=0;i<8;i++){player.view.setPosition(e.view.x+1,e.view.y);system.update(100,player);}
        check(e.motion.amount===0&&e.body.y===-3,'stopping did not settle');reports.push('idle settles; knockback never walks');
        fresh();e=spawn(system,'swift','dasher');e.aim.x=1;e.dashTime=200;const dashPhase=e.motion.phase;system.update(100,player);check(e.motion.phase===dashPhase,'dash played walking cycle');
        fresh();e=spawn(system,'brute');e.cooldown=0;e.view.setPosition(1200+e.spec.range-5,900);system.update(1,player);system.update(e.spec.windup/2,player);
        check(e.windup>0&&e.body.x!==0&&e.motion.legs.every(l=>l.rotation===e.body.rotation),'attack gait overrode windup');
        const hp=player.health.current;system.update(e.windup,player);check(player.health.current===hp-e.spec.damage,'animation changed attack timing');reports.push('dash and attack retain locked direction and original damage timing');
        fresh();e=spawn(system,'ranged');e.view.setPosition(1300,900);system.update(100,player);check(e.view.x>1300&&!e.body.flipX,'retreat did not face travel');reports.push('ranged retreat faces movement');
        const limbs:Phaser.GameObjects.Image[]=[];
        for(let round=0;round<10;round++) {
          fresh();for(let i=0;i<72;i++) {const actor=spawn(system,'brute',i%2?'guardian':'normal');limbs.push(...actor.motion.legs);}
          check(system.enemies.reduce((n,actor)=>n+actor.motion.legs.length,0)===144,'limb count exceeded budget');system.reset();
          check(this.children.list.length===baseline&&limbs.every(l=>!l.scene),'reset retained limb objects');prepareEnemyTextures(this);check(this.textures.getTextureKeys().length===keys,'reset duplicated textures');
        }
        reports.push('ten resets at 72 actors / 144 limbs return to baseline; shared textures reused');
        result.textContent=JSON.stringify({passed:true,reports,baseline,cachedKeys:keys},null,2);
      }catch(error){result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2);}
      this.scene.pause();this.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{this.game.pause();this.game.loop.sleep();});
    }
  }
  launch(new Checks());
}
document.querySelector<HTMLButtonElement>('#preview')!.onclick=preview;
document.querySelector<HTMLButtonElement>('#check')!.onclick=checks;
document.querySelector<HTMLButtonElement>('#direction')!.onclick=()=>{direction*=-1;};
pause.onclick=()=>{
  if(!game)return;paused=!paused;
  if(paused){game.pause();game.loop.sleep();}else{game.resume();game.loop.wake();}
  pause.dataset.loopRunning=String(game.loop.running);
  pause.textContent=paused?'继续动作':'暂停动作';result.textContent=paused?'动作已暂停，循环休眠。':'迈步中。';
};
preview();
