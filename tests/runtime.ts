import Phaser from 'phaser';
import { Player } from '../src/game/entities/Player';
import { EnemySystem } from '../src/game/enemies/EnemySystem';
import { FireballSpell } from '../src/game/spells/FireballSpell';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build';
import { BuildStore } from '../src/game/upgrades/BuildStore';
const button = document.querySelector<HTMLButtonElement>('#run')!;
const result = document.querySelector<HTMLPreElement>('#result')!;
let game: Phaser.Game | undefined;
button.onclick = () => {
  game?.destroy(true);
  button.disabled = true; result.textContent = '运行中';
  const reports: unknown[] = [];
  const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  class RuntimeChecks extends Phaser.Scene {
    create(): void {
      try {
        const player = new Player(this);
        const completed: number[] = [];
        const store = new BuildStore(() => 0); store.reset();
        const enemies = new EnemySystem(this, wave => { completed.push(wave); store.completeWave(wave); });
        const spec = compileBuild(['fire.multi','fire.pierce','fire.explosion'].reduce(applyUpgrade, initialBuild(1))).fireball;
        const spell = new FireballSpell(this, spec);
        enemies.reset(player);
        enemies.enemies.forEach((enemy,i) => { enemy.spawning=0; enemy.view.setPosition(i<3?1280+i*50:2100, i<3?888:1400+i*40); });
        const targets = enemies.enemies.slice(0,3);
        check(spell.cast(1200,900,{x:1,y:0}), 'cast failed');
        check(spell.projectileCount===3,'multi does not emit three shots');
        for(let i=0;i<12;i++) spell.update(16,enemies);
        check(targets[0].health.current<40,'first target not hit');
        check(targets[1].health.current<40,'pierce/splash did not reach second target');
        reports.push({check:'multi + pierce + explosion actual runtime', health:targets.map(e=>e.health.current), projectiles:spell.projectileCount});
        spell.reset(); enemies.reset(player);
        const single=compileBuild(initialBuild(1)).fireball;
        spell.configure(single);
        enemies.enemies.forEach((enemy,i)=>{enemy.spawning=0;enemy.view.setPosition(i===0?1280:2100,i===0?888:1400+i*40)});
        const launchTarget=enemies.enemies[0]; spell.cast(1200,900,{x:1,y:0});
        const upgraded=compileBuild(applyUpgrade(initialBuild(1),'fire.damage')).fireball;
        spell.configure(upgraded);
        spell.update(100,enemies);
        check(launchTarget.health.current===20,'flying shot changed snapshot damage');
        enemies.hit(launchTarget,20,{x:1,y:0});
        enemies.hit(launchTarget,20,{x:1,y:0});
        check(enemies.kills===1,'death counted twice');
        check(completed.length===0,'partial wave rewarded early');
        for(const enemy of [...enemies.enemies]) enemies.hit(enemy,100,{x:1,y:0});
        check(completed.length===1&&completed[0]===1,'complete wave did not reward exactly once');
        check(store.snapshot.pendingRewards===1,'wave did not create one upgrade batch');
        reports.push({check:'launch snapshot, death deduplication and one reward per full wave',completed});
        spell.reset(); enemies.reset(player);
        const baseCount=this.children.list.length;
        for(let round=0;round<10;round++) {
          spell.cast(1200,900,{x:1,y:0});
          spell.reset();enemies.reset(player);
          check(this.children.list.length===baseCount,'objects accumulate after restart');
        }
        reports.push({check:'10 restarts release objects',objects:baseCount});
        const strongest=compileBuild(['fire.multi','fire.multi','fire.pierce','passive.cooldown','passive.cooldown','passive.cooldown'].reduce(applyUpgrade,initialBuild(1))).fireball;
        spell.configure(strongest);
        enemies.update(150000,player);
        let maxProjectiles=0,maxImpacts=0,maxEnemies=enemies.enemies.length,casts=0;
        const started=performance.now();
        // Three minutes of deterministic active game time, including 36-enemy waves.
        for(let i=0;i<10800;i++) {
          player.health.reset(); enemies.update(1000/60,player);
          spell.update(1000/60,enemies);
          if(spell.cast(player.view.x,player.view.y,{x:1,y:0})) casts++;
          maxProjectiles=Math.max(maxProjectiles,spell.projectileCount);maxImpacts=Math.max(maxImpacts,spell.impactCount);
          maxEnemies=Math.max(maxEnemies,enemies.enemies.length);
        }
        check(maxProjectiles<=64&&maxImpacts<=24&&maxEnemies<=36,'object budget exceeded');
        reports.push({check:'3-minute simulated active-time stress (not rendered-frame or device performance)', cpuMs:Number((performance.now()-started).toFixed(1)),casts,maxProjectiles,maxImpacts,maxEnemies});
        spell.reset();enemies.reset(player);
        check(this.children.list.length===baseCount,'stress cleanup failed');
        result.textContent=JSON.stringify({passed:true,reports},null,2);
      } catch(error) { result.textContent=JSON.stringify({passed:false,error:String(error),reports},null,2); }
      button.disabled=false;
      this.scene.pause();
      queueMicrotask(()=>{game?.pause();game?.loop.sleep();});
    }
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:640,height:360,scene:RuntimeChecks,backgroundColor:'#17251f',audio:{noAudio:true}});
};

const stressButton = document.querySelector<HTMLButtonElement>('#stress')!;
stressButton.onclick = () => {
  game?.destroy(true);
  button.disabled = stressButton.disabled = true;
  class RenderStress extends Phaser.Scene {
    private player!: Player;
    private enemies!: EnemySystem;
    private spell!: FireballSpell;
    private elapsed = 0;
    private frames = 0;
    private maxProjectiles = 0;
    private maxEnemies = 0;
    private maxObjects = 0;
    private intervals: number[] = [];
    private displayTime = 0;
    create(): void {
      this.player = new Player(this);
      this.player.view.setPosition(1200,900);
      this.enemies = new EnemySystem(this);
      this.enemies.reset(this.player); this.enemies.update(150000,this.player);
      this.maxEnemies = this.enemies.enemies.length;
      const spec=compileBuild(['fire.multi','fire.multi','fire.pierce','passive.cooldown','passive.cooldown','passive.cooldown'].reduce(applyUpgrade,initialBuild(1))).fireball;
      this.spell = new FireballSpell(this,spec);
      this.cameras.main.centerOn(1200,900);
      result.textContent = '持续渲染检查开始：5 枚火球、穿透、245 ms 冷却、36 只怪物。';
    }
    update(_time: number, delta: number): void {
      const step = Math.min(delta,50);
      this.elapsed += step; this.frames++;
      // Only retain a bounded frame sample, not one allocation for every frame in the run.
      if(this.intervals.length < 3600) this.intervals.push(delta);
      this.player.health.reset(); this.player.update({x:0,y:0},step);
      this.enemies.update(step,this.player); this.spell.update(step,this.enemies);
      const angle = this.elapsed / 4000;
      this.spell.cast(this.player.view.x,this.player.view.y,{x:Math.cos(angle),y:Math.sin(angle)});
      this.maxProjectiles=Math.max(this.maxProjectiles,this.spell.projectileCount);
      this.maxEnemies=Math.max(this.maxEnemies,this.enemies.enemies.length);
      this.maxObjects=Math.max(this.maxObjects,this.children.list.length);
      if(Math.floor(this.elapsed/1000)!==this.displayTime) {
        this.displayTime=Math.floor(this.elapsed/1000);
        result.textContent=JSON.stringify({running:true,seconds:this.displayTime,frames:this.frames,maxProjectiles:this.maxProjectiles,maxEnemies:this.maxEnemies,maxObjects:this.maxObjects},null,2);
      }
      if(this.elapsed<180000) return;
      this.spell.reset();this.enemies.reset(this.player);
      const sorted=[...this.intervals].sort((a,b)=>a-b);
      result.textContent=JSON.stringify({passed:true,check:'3 minutes of rendered active game time',frames:this.frames,maxProjectiles:this.maxProjectiles,maxEnemies:this.maxEnemies,maxObjects:this.maxObjects,objectsAfterReset:this.children.list.length,frameSample:this.intervals.length,meanFrameMs:this.intervals.reduce((sum,n)=>sum+n,0)/this.intervals.length,p95FrameMs:sorted[Math.floor(sorted.length*0.95)],viewport:[640,360],note:'Local test scene; healed player, placeholder graphics, frame sample limited to first 3600. Not whole-game, phone or GPU validation.'},null,2);
      button.disabled=stressButton.disabled=false;
      this.scene.pause();queueMicrotask(()=>{game?.pause();game?.loop.sleep();});
    }
  }
  game=new Phaser.Game({type:Phaser.AUTO,parent:'test-game',width:640,height:360,scene:RenderStress,backgroundColor:'#17251f',audio:{noAudio:true}});
};
