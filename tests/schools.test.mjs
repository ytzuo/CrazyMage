import test from 'node:test';
import assert from 'node:assert/strict';
import { BuildStore } from '../src/game/upgrades/BuildStore.ts';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build.ts';
import { definition, SCHOOLS } from '../src/game/upgrades/definitions.ts';
import { chainTargets } from '../src/game/spells/chain.ts';
import { SlowStatus } from '../src/game/combat/SlowStatus.ts';
const build=(school,...ids)=>ids.reduce(applyUpgrade,initialBuild(1,school));

test('each school offers only its own modules and shared passives, retaining history and caps',()=>{
  for(const school of SCHOOLS){
    const store=new BuildStore(()=>0);store.reset(school);
    let count=0;
    for(let wave=1;wave<=20;wave++){
      store.completeWave(wave);const batch=store.pendingChoice;
      if(!batch)continue;
      assert.ok(batch.options.every(id=>id.startsWith(school+'.')||id.startsWith('passive.')));
      const other=SCHOOLS.find(x=>x!==school)+'.damage';assert.equal(store.choose(batch.id,other,0),false);
      assert.ok(store.choose(batch.id,batch.options[0],wave*1000));count++;
    }
    assert.equal(count,12);assert.equal(store.snapshot.build.spellLevel,4);
    assert.equal(store.snapshot.history.length,12);assert.equal(store.snapshot.exhausted,true);
    assert.ok(store.snapshot.effective.breakdown.every(line=>!line.includes(school==='ice'?'电能增幅':'深度寒霜')));
    assert.throws(()=>applyUpgrade(store.snapshot.build, SCHOOLS.find(x=>x!==school)+'.damage'));
    store.reset(school);assert.equal(store.snapshot.build.spellLevel,1);assert.equal(store.snapshot.history.length,0);
  }
});
test('ice modules combine independently of order and echo snapshots remain immutable',()=>{
  const ids=['ice.radius','ice.cold','ice.echo','passive.cooldown'];
  const a=compileBuild(build('ice',...ids)),b=compileBuild(build('ice',...ids.toReversed()));
  assert.deepEqual(a.ice,b.ice);
  assert.deepEqual(a.ice,{damage:18,cooldown:990,radius:200,slow:0.4,duration:2000,pulses:2,echoDelay:180});
  assert.equal(a.school,'ice');assert.ok(Object.isFrozen(a.ice));
  assert.equal(a.breakdown.length,4);assert.equal(a.fireball.damage,20);
});
test('lightning modules retain jump counts, distance and stable conduction together',()=>{
  const ids=['lightning.chain','lightning.range','lightning.conduction','passive.cooldown'];
  const a=compileBuild(build('lightning',...ids)),b=compileBuild(build('lightning',...ids.toReversed()));
  assert.deepEqual(a.lightning,b.lightning);
  assert.deepEqual(a.lightning,{damage:20,cooldown:810,range:550,jumpRange:225,maxTargets:5,falloff:0.95});
  assert.equal(compileBuild(build('lightning','lightning.chain','lightning.chain')).lightning.maxTargets,7);
  assert.equal(compileBuild(build('ice','ice.cold','ice.cold')).ice.slow,0.5);
});
test('directional first hit excludes rear targets; chain visits each ID once and stops at range',()=>{
  const spec=compileBuild(initialBuild(1,'lightning')).lightning;
  const targets=[{id:1,x:-5,y:0},{id:2,x:100,y:0},{id:3,x:150,y:0},{id:4,x:250,y:0},{id:5,x:800,y:0}];
  assert.deepEqual(chainTargets(targets,0,0,{x:1,y:0},spec).map(t=>t.id),[2,3,4]);
  assert.deepEqual(chainTargets([{id:1,x:-10,y:0}],0,0,{x:1,y:0},spec),[]);
  assert.equal(chainTargets([{id:1,x:0,y:0},{id:1,x:1,y:0}],0,0,{x:1,y:0},spec).length,1);
  assert.equal(chainTargets([{id:1,x:spec.range,y:0}],0,0,{x:1,y:0},spec).length,1);
});
test('repeated slows refresh a single timer, cap strength and expire in active time',()=>{
  const slow=new SlowStatus();slow.apply(0.3,1500);slow.update(1000);slow.apply(0.3,1500);
  assert.equal(slow.strength,0.3);assert.equal(slow.remaining,1500);
  slow.apply(2,2000);assert.equal(slow.strength,0.75);
  slow.update(1999);assert.equal(slow.strength,0.75);slow.update(1);assert.equal(slow.strength,0);
});
