import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem, type Enemy } from '../src/game/enemies/EnemySystem';
import { enemySpec, type EnemyKind } from '../src/game/enemies/roster';
import type { EnemyVariant } from '../src/game/enemies/variants';
import { FireballSpell } from '../src/game/spells/FireballSpell';
import { SpellRunner } from '../src/game/spells/SpellRunner';
import { UltimateSpell } from '../src/game/ultimates/UltimateSpell';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build';
const result=document.querySelector<HTMLPreElement>('#result')!;
let game:Phaser.Game|undefined;
type Fixture = { createEnemy(x:number,y:number,wave:number,spec:ReturnType<typeof enemySpec>,variant:EnemyVariant,warningTime?:number):void };
function spawn(system:EnemySystem,kind:EnemyKind,x:number,y:number,variant:EnemyVariant='normal'):Enemy {
  (system as unknown as Fixture).createEnemy(x,y,13,enemySpec(kind,13),variant,0);
  if(system.enemies.length===1)system.waves.register(13,1);else system.waves.add(13,1);
  return system.enemies[system.enemies.length-1];
}
function launch(scene:Phaser.Scene):void {
  game?.destroy(true);
  game?.loop.wake();
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:900,height:540,scene,backgroundColor:'#17251f',audio:{noAudio:true}});
}
function finish(scene:Phaser.Scene,data:unknown):void {
  result.textContent=JSON.stringify(data,null,2);scene.scene.pause();
  scene.game.events.once(Phaser.Core.Events.POST_RENDER,()=>{scene.game.pause();scene.game.loop.sleep();});
}
function benchmark():void {
  class Sample extends Phaser.Scene {
    private player!:Player; private system!:EnemySystem; private spell!:FireballSpell;
    private trial=0;private frame=0;private started=0;private last=0;private cpu:number[]=[];private intervals:number[]=[];private rows:unknown[]=[];
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>0.9);
      this.spell=new FireballSpell(this,compileBuild(initialBuild(1)).fireball);
      this.cameras.main.centerOn(1200,900);this.prepare();
      this.game.events.on(Phaser.Core.Events.POST_RENDER,this.record,this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.game.events.off(Phaser.Core.Events.POST_RENDER,this.record,this));
    }
    private prepare():void {
      this.system.reset();this.player.reset();this.spell.reset();this.system.waveClock.wave=13;
      const kinds:EnemyKind[]=['chaser','swift','ranged','brute','artillery'];
      for(let i=0;i<(this.trial%3===0?6:36);i++){
        const a=i*2.39996;spawn(this.system,kinds[i%kinds.length],1200+Math.cos(a)*350,900+Math.sin(a)*230);
      }
      this.frame=0;this.last=0;this.cpu=[];this.intervals=[];
    }
    update(_time:number,delta:number):void {
      this.started=performance.now();const step=Math.min(delta,50);this.player.health.reset();
      const a=this.frame/80;
      this.player.update(this.trial%3===0?{x:0,y:0}:{x:Math.cos(a),y:Math.sin(a)},step);
      this.system.update(step,this.player);this.spell.update(step,this.system);
      if(this.trial%3===2)this.spell.cast(this.player.view.x,this.player.view.y,{x:Math.cos(a),y:Math.sin(a)});
    }
    private record():void {
      const now=performance.now();if(this.last)this.intervals.push(now-this.last);this.last=now;this.cpu.push(now-this.started);
      if(++this.frame<120)return;
      const stats=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return {mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.floor(sorted.length*0.95)],over25:values.filter(x=>x>25).length};};
      this.rows.push({trial:Math.floor(this.trial/3)+1,mode:['startup','movement','attack'][this.trial%3],cpu:stats(this.cpu),frame:stats(this.intervals)});
      result.textContent=JSON.stringify({running:true,rows:this.rows},null,2);
      if(++this.trial<9)this.prepare();else {this.game.events.off(Phaser.Core.Events.POST_RENDER,this.record,this);finish(this,{passed:true,viewport:[900,540],dpr:devicePixelRatio,userAgent:navigator.userAgent,rows:this.rows,note:'120 rendered frames per trial; CPU includes update and render submission, excludes GPU completion. Local fixed roster, no arena/HUD; not cold navigation or device certification.'});}
    }
  }
  launch(new Sample());
}
document.querySelector<HTMLButtonElement>('#benchmark')!.onclick=benchmark;

function checks(preview=false):void {
  class Checks extends Phaser.Scene {
    create():void {
      const player=new Player(this),clears:number[]=[],kills:string[]=[];
      const system=new EnemySystem(this,wave=>clears.push(wave),source=>kills.push(source),()=>0.9);
      const reports:string[]=[];
      const check=(ok:boolean,message:string)=>{if(!ok)throw Error(message);};
      const fresh=()=>{system.reset();player.reset();clears.length=kills.length=0;system.waveClock.wave=13;system.waveClock.scheduleNext(1e9);};
      const anchor=()=>{const e=spawn(system,'brute',2100,1500);e.cooldown=100000;return e;};
      try {
        fresh();
        const fixture=system as unknown as {spawn(player:Player,wave:number,kind:EnemyKind):boolean};
        for(let i=0;i<6;i++)check(fixture.spawn(player,13,'bomber'),'bomber spawn failed');
        for(let i=0;i<5;i++)check(fixture.spawn(player,13,'priest'),'priest spawn failed');
        check(system.enemies.filter(e=>e.spec.kind==='bomber').length===3&&system.enemies.filter(e=>e.spec.kind==='priest').length===2&&system.enemies.length===11,'special caps dropped wave slots');
        reports.push('3 bombers / 2 priests; excess slots become chasers');

        fresh();anchor();let bomb=spawn(system,'bomber',1280,900);
        system.update(1,player);check(bomb.windup===1200&&bomb.warning.visible,'missing bomb telegraph');
        system.hit(bomb,1,{x:1,y:0});check(bomb.windup===1200&&bomb.knockback.x>0,'hit cancelled countdown or missed push');
        system.freeze(bomb,500,false);const wait=bomb.windup;
        system.update(250,player);check(bomb.windup===wait,'frozen bomb countdown advanced');
        system.update(250,player);check(bomb.windup===wait&&bomb.warning.visible,'thaw consumed frozen countdown time');
        player.view.setPosition(1600,900);bomb.knockback.x=0;
        system.update(1200,player);check(bomb.health.dead&&player.health.current===120&&kills.length===0,'dodged self-blast damaged player or granted kill energy');
        reports.push('bomb telegraph, push, non-executing freeze/thaw and dodge; self-blast grants no kill charge');

        fresh();bomb=spawn(system,'bomber',1250,900);let ally=spawn(system,'chaser',1290,900);
        system.update(1,player);system.hit(bomb,10000,{x:0,y:0},'ultimate');system.update(0,player);
        check(ally.health.dead&&player.health.current===120&&clears.length===1&&kills.every(source=>source==='ultimate'),'friendly blast damage/source/wave settlement failed');
        check(!system.hit(bomb,10000,{x:0,y:0})&&clears.length===1,'duplicate bomb death');
        reports.push('killing a charging bomb damages enemies only; ultimate provenance and wave reward settle once');

        fresh();for(let i=0;i<3;i++)spawn(system,'bomber',1240+i*20,900,'chain');
        system.update(1,player);system.hit(system.enemies[0],10000,{x:0,y:0});system.update(0,player);
        check(system.enemies.length===0&&clears.length===1&&system.special.counts.blasts===0,'chain reaction leaked actors/zones or duplicate reward');
        reports.push('three-bomb chain reaction is bounded and releases all zones on arena clear');

        for(const distance of [0,140,230]) {
          fresh();anchor();bomb=spawn(system,'bomber',1250,900,'chain');
          system.update(1,player);player.view.setPosition(1800,900);system.update(1200,player);
          check(system.special.counts.blasts===2,'chain blast lost a stage');
          system.special.update(300,player,system);check(system.special.counts.blasts===1,'first blast feedback retained');
          player.view.setPosition(1250+distance,900);system.special.update(750,player,system);
          check(player.health.current===(distance===140?120-bomb.spec.damage:120),'ring safe center or outer boundary incorrect');
          system.special.update(300,player,system);check(system.special.counts.blasts===0,'ring impact did not expire');
        }
        reports.push('second blast has a safe center, damages only annulus and recycles after feedback');

        fresh();let priest=spawn(system,'priest',1000,900);ally=spawn(system,'chaser',1050,900);player.view.setPosition(1300,900);
        system.special.updateEnemy(priest,1,player,system);check(priest.windup===1000,'priest failed to start cast');
        system.hit(priest,1,{x:0,y:0});check(priest.windup===0&&system.special.counts.shields===0,'hit failed to interrupt priest');
        priest.cooldown=0;system.special.updateEnemy(priest,1,player,system);system.special.updateEnemy(priest,1000,player,system);
        check(system.special.counts.shields===1,'priest failed to shield ally');
        const health=ally.health.current;
        check(system.hit(ally,10,{x:1,y:0})&&ally.health.current===health&&system.special.counts.shields===0&&ally.knockback.x>0,'shield did not settle contact/control once');
        system.hit(ally,10,{x:0,y:0});check(ally.health.current===health-10,'single-hit shield absorbed twice');
        priest.cooldown=0;system.special.updateEnemy(priest,1,player,system);system.special.updateEnemy(priest,1000,player,system);
        system.hit(priest,10000,{x:0,y:0});check(system.special.counts.shields===0,'dead priest retained shields');
        reports.push('priest cast is interruptible; single-hit shield preserves push and disappears with owner');

        fresh();priest=spawn(system,'priest',1000,900);ally=spawn(system,'chaser',1050,900);player.view.setPosition(1300,900);
        system.special.updateEnemy(priest,1,player,system);system.special.updateEnemy(priest,1000,player,system);
        system.special.update(4000,player,system);check(system.special.counts.shields===0,'shield did not expire');
        reports.push('normal shields expire after four active seconds');

        fresh();priest=spawn(system,'priest',1000,900,'ward');ally=spawn(system,'chaser',1050,900);player.view.setPosition(1300,900);
        let second=spawn(system,'priest',1000,910,'ward');
        for(const owner of [priest,second]) {system.special.updateEnemy(owner,1,player,system);system.special.updateEnemy(owner,1000,player,system);}
        check(system.special.counts.wards===2,'missing wards');
        let before=ally.health.current;system.hit(ally,10,{x:0,y:0},'spell',null,true);check(Math.abs(ally.health.current-(before-7))<0.01,'ward reduction stacked');
        before=priest.health.current;system.hit(priest,10,{x:0,y:0},'spell',null,true);check(priest.health.current===before-10,'priest shielded itself');
        ally.view.setPosition(1500,900);before=ally.health.current;system.hit(ally,10,{x:0,y:0});check(ally.health.current===before-10,'ward followed departing ally');
        system.freeze(priest,500,false);check(system.special.counts.wards===1,'freezing priest retained ward');
        system.hit(second,10000,{x:0,y:0});check(system.special.counts.wards===0,'dead ward owner retained ward');
        reports.push('wards stay fixed, never stack, exclude priests; walking out, freeze and owner death remove protection');

        fresh();priest=spawn(system,'priest',1000,900,'ward');ally=spawn(system,'chaser',1050,900);player.view.setPosition(1300,900);
        system.special.updateEnemy(priest,1,player,system);system.special.updateEnemy(priest,1000,player,system);
        system.freeze(ally,1000);system.hit(ally,1,{x:0,y:0});check(ally.health.dead,'ward prevented ice ultimate execution');
        system.special.update(4000,player,system);check(system.special.counts.wards===0,'ward did not expire');
        reports.push('ice execution bypasses protection; wards expire after four active seconds');

        fresh();const baseline=this.children.list.length,textureCount=this.textures.getTextureKeys().length;
        for(let i=0;i<10;i++) {
          const owner=spawn(system,'priest',1000,900,i%2?'ward':'normal');spawn(system,'chaser',1050,900);player.view.setPosition(1300,900);
          system.special.updateEnemy(owner,1,player,system);system.special.updateEnemy(owner,1000,player,system);
          bomb=spawn(system,'bomber',1350,900,'chain');system.special.updateEnemy(bomb,1,player,system);system.special.updateEnemy(bomb,1200,player,system);
          system.reset();check(this.children.list.length===baseline&&Object.values(system.special.counts).every(count=>count===0),'restart leaked protection or blasts');
          check(this.textures.getTextureKeys().length===textureCount,'restart generated new textures');
        }
        reports.push('ten restarts return object counts to baseline and reuse cached textures');
        if(preview) {
          fresh();const labels=['爆核傀儡','连爆傀儡','魔核祭司','结界祭司'];
          const kinds:EnemyKind[]=['bomber','bomber','priest','priest'];const variants:EnemyVariant[]=['normal','chain','normal','ward'];
          for(let i=0;i<4;i++) {
            const enemy=spawn(system,kinds[i],880+i*210,820,variants[i]);enemy.view.setAlpha(1);enemy.warning.setVisible(false);enemy.bar.setVisible(false);enemy.body.setScale(enemy.body.scaleX*1.8);
            enemy.motion.apply(enemy.body,false);
            this.add.text(enemy.view.x,690,labels[i],{fontSize:'22px',color:'#e6e8dd'}).setOrigin(0.5);
          }
          player.view.setPosition(1200,1070);this.cameras.main.centerOn(1200,850);
        }
        finish(this,preview?{passed:true,note:'普通爆核、连爆变种、普通祭司、结界变种（放大形态预览）'}:{passed:true,reports});
      }catch(error){finish(this,{passed:false,error:String(error),reports});}
    }
  }
  launch(new Checks());
}
document.querySelector<HTMLButtonElement>('#check')!.onclick=()=>checks();
document.querySelector<HTMLButtonElement>('#preview')!.onclick=()=>checks(true);

function stress():void {
  class Stress extends Phaser.Scene {
    private player!:Player;private system!:EnemySystem;private spell!:SpellRunner;private ultimate!:UltimateSpell;
    private elapsed=0;private refill=0;private lastSecond=-1;private frames=0;private intervals:number[]=[];
    private max={enemies:0,shots:0,projectiles:0,shields:0,wards:0,blasts:0,objects:0};
    create():void {
      this.player=new Player(this);this.system=new EnemySystem(this,undefined,undefined,()=>0.9);this.system.mode='endless';
      this.system.waveClock.wave=40;this.system.waveClock.scheduleNext(1e9);
      this.spell=new SpellRunner(this,compileBuild(initialBuild(1)));this.ultimate=new UltimateSpell(this);
      this.configure(0);this.fill();this.cameras.main.centerOn(1200,900);
    }
    private configure(index:number):void {
      const school=(['fire','ice','lightning'] as const)[index];
      const upgrades=school==='fire'?['fire.multi','fire.multi','fire.pierce','fire.explosion','fire.burn','fire.rebound']:school==='ice'?['ice.radius','ice.echo','ice.shards','ice.frost']:['lightning.chain','lightning.chain','lightning.range','lightning.conduction'];
      const build=upgrades.reduce((build,id)=>applyUpgrade(build,id),initialBuild(1,school,'endless'));
      const effective=compileBuild(build);this.spell.configure(effective);this.ultimate.configure(effective.ultimate);
    }
    private fill():void {
      const counts={bomber:0,priest:0};for(const enemy of this.system.enemies)if(enemy.spec.kind==='bomber'||enemy.spec.kind==='priest')counts[enemy.spec.kind]++;
      if(this.system.enemies.length===0)this.system.waves.reset();
      for(const kind of ['bomber','priest'] as const)for(let i=counts[kind];i<(kind==='bomber'?3:2);i++) {
        const enemy=spawn(this.system,kind,kind==='bomber'?1240+i*35:1090,870+i*45,kind==='bomber'?'chain':i===0?'ward':'normal');
        enemy.spawning=500;
      }
      const kinds:EnemyKind[]=['chaser','swift','ranged','brute','artillery'];
      while(this.system.enemies.length<72){const i=this.system.enemies.length,a=i*2.39996;const enemy=spawn(this.system,kinds[i%5],1200+Math.cos(a)*320,900+Math.sin(a)*240);enemy.spawning=500;}
    }
    update(_time:number,delta:number):void {
      const step=Math.min(delta,50),previousSchool=Math.floor(this.elapsed/60000);this.elapsed+=step;this.frames++;
      if(this.intervals.length<21600)this.intervals.push(delta);
      const currentSchool=Math.min(2,Math.floor(this.elapsed/60000));if(currentSchool!==previousSchool)this.configure(currentSchool);
      this.player.health.reset();this.player.update({x:Math.cos(this.elapsed/1300)*0.4,y:Math.sin(this.elapsed/1300)*0.4},step);
      this.ultimate.update(step);this.spell.update(step,this.system,{x:this.player.view.x,y:this.player.view.y});this.system.update(step,this.player);
      this.spell.cast(this.player.view.x,this.player.view.y,{x:Math.cos(this.elapsed/1300),y:Math.sin(this.elapsed/1300)},this.system);
      if(Math.floor(this.elapsed/10000)!==Math.floor((this.elapsed-step)/10000)){this.ultimate.charge.fill();this.ultimate.cast(this.player.view.x,this.player.view.y,this.system);}
      this.refill+=step;if(this.refill>=500){this.refill=0;this.fill();}
      const counts=this.system.special.counts;
      for(const key of ['shields','wards','blasts'] as const)this.max[key]=Math.max(this.max[key],counts[key]);
      this.max.enemies=Math.max(this.max.enemies,this.system.enemies.length);this.max.shots=Math.max(this.max.shots,this.system.shots.count);
      this.max.projectiles=Math.max(this.max.projectiles,this.spell.projectileCount);this.max.objects=Math.max(this.max.objects,this.children.list.length);
      if(this.max.enemies>72||this.max.shields>6||this.max.wards>2||this.max.blasts>6) {finish(this,{passed:false,max:this.max,error:'resource cap exceeded'});return;}
      const second=Math.floor(this.elapsed/1000);
      if(second!==this.lastSecond){this.lastSecond=second;result.textContent=JSON.stringify({running:true,seconds:second,school:['fire','ice','lightning'][currentSchool],frames:this.frames,max:this.max},null,2);}
      if(this.elapsed<180000)return;
      this.spell.reset();this.ultimate.reset();this.system.reset();
      const sorted=[...this.intervals].sort((a,b)=>a-b);
      finish(this,{passed:true,seconds:180,frames:this.frames,max:this.max,objectsAfterReset:this.children.list.length,countsAfterReset:this.system.special.counts,textures:this.textures.getTextureKeys().length,meanFrame:this.intervals.reduce((a,b)=>a+b,0)/this.intervals.length,p95Frame:sorted[Math.floor(sorted.length*0.95)],over25:this.intervals.filter(n=>n>25).length,viewport:[900,540],dpr:devicePixelRatio,note:'Three minutes of rendered active time; replenished 72-enemy roster with 3 chain bombers, normal/ward priests and each school for 60 s. Healed player, boosted builds, test scene without arena/HUD. Not mobile, GPU or whole-run certification.'});
    }
  }
  launch(new Stress());
}
document.querySelector<HTMLButtonElement>('#stress')!.onclick=stress;
