import test from 'node:test';
import assert from 'node:assert/strict';
import { initialBuild, applyUpgrade, compileBuild, canAcquire } from '../src/game/upgrades/build.ts';
import { BuildStore } from '../src/game/upgrades/BuildStore.ts';
import { definition } from '../src/game/upgrades/definitions.ts';
import { resolveProjectileHit, preserveCooldown } from '../src/game/combat/DamageResolver.ts';
import { Health } from '../src/game/combat/Health.ts';
import { WaveTracker } from '../src/game/enemies/WaveTracker.ts';
const buildWith = (...ids) => ids.reduce(applyUpgrade, initialBuild(1));

test('different acquisition orders preserve identical combined specs and immutable launch snapshots', () => {
  const ids = ['fire.multi', 'fire.pierce', 'fire.explosion', 'passive.cooldown'];
  const a = compileBuild(buildWith(...ids));
  const b = compileBuild(buildWith(...ids.toReversed()));
  assert.deepEqual(a.fireball, b.fireball);
  assert.equal(a.fireball.count, 3); assert.equal(a.fireball.damage, 13);
  assert.equal(a.fireball.maxTargets, 2); assert.equal(a.fireball.cooldown, 315);
  assert.deepEqual(a.fireball.explosion, {radius:80, multiplier:0.35});
  const initial = initialBuild(1), snapshot = compileBuild(initial);
  applyUpgrade(initial, 'fire.multi');
  assert.equal(snapshot.fireball.count, 1); assert.equal(initial.spellLevel, 1);
  assert.ok(Object.isFrozen(a.fireball));
});

test('additive damage, repeated multi and cooldown respect defined coefficients', () => {
  const effective = compileBuild(buildWith('fire.damage', 'fire.multi', 'fire.damage', 'passive.cooldown', 'passive.cooldown', 'passive.cooldown'));
  assert.equal(effective.fireball.damage, 20.8);
  assert.ok(Math.abs(effective.fireball.cooldown - 245) < 1e-9);
  assert.equal(compileBuild(buildWith('fire.multi','fire.multi')).fireball.count, 5);
  assert.equal(preserveCooldown(175, 350, 245), 122.5);
});

test('spell levels, module caps and three passive slots are enforced', () => {
  const full = buildWith('fire.multi','fire.pierce','fire.explosion');
  assert.equal(full.spellLevel, 4); assert.throws(() => applyUpgrade(full, 'fire.damage'));
  assert.throws(() => applyUpgrade(buildWith('fire.multi', 'fire.multi'), 'fire.multi'));
  const slots = buildWith('passive.speed', 'passive.health', 'passive.shield');
  assert.equal(canAcquire(slots, definition('passive.cooldown')), false);
  assert.equal(canAcquire(slots, definition('passive.speed')), true);
  assert.throws(() => applyUpgrade(slots, 'passive.cooldown'));
});

test('offers are unique and preview consumes neither reward nor RNG', () => {
  let calls=0; const store = new BuildStore(() => { calls++; return 0; });
  store.reset(); store.completeWave(1);
  const before = store.snapshot, count = calls;
  assert.equal(before.choice.options.length, 3);
  assert.equal(new Set(before.choice.options).size, 3);
  assert.ok(before.choice.options.some(id => id.startsWith('fire.')));
  store.preview(before.choice.options[0]); store.preview(before.choice.options[0]);
  assert.equal(calls,count); assert.deepEqual(store.snapshot,before);
  assert.throws(() => store.preview('unknown'));
});

test('each completed wave rewards once; queued waves are consumed once and retain source wave in history', () => {
  const store = new BuildStore(() => 0); store.reset();
  store.completeWave(2);store.completeWave(2);store.completeWave(1);
  assert.equal(store.snapshot.pendingRewards,2);
  const choice = store.snapshot.choice;
  assert.equal(choice.wave,2);
  assert.equal(store.choose(choice.id, 'not-offered', 1000), false);
  assert.equal(store.choose(choice.id, choice.options[0], 1000), true);
  assert.equal(store.snapshot.pendingRewards,1);
  assert.equal(store.choose(choice.id, choice.options[0], 1000), false);
  const next = store.snapshot.choice;assert.equal(next.wave,1);
  assert.equal(store.choose(next.id,next.options[0],2000),true);
  assert.equal(store.snapshot.choice,null);assert.equal(store.snapshot.pendingRewards,0);
  assert.deepEqual(store.snapshot.history.map(entry=>entry.wave),[2,1]);
  store.completeWave(3);const stale=store.snapshot.choice;
  store.reset();store.completeWave(1);
  assert.notEqual(store.snapshot.choice.id,stale.id);
  assert.equal(store.choose(stale.id,stale.options[0],0),false);
  assert.equal(store.snapshot.history.length,0);
});

test('overlapping waves finish independently; empty capped waves do not reward; reset clears tracking', () => {
  const waves=new WaveTracker();waves.register(1,6);waves.register(2,2);waves.register(3,0);
  for(let i=0;i<5;i++)assert.equal(waves.defeat(1),false);
  assert.equal(waves.defeat(2),false);assert.equal(waves.defeat(2),true);
  assert.equal(waves.remaining(1),1);assert.equal(waves.defeat(2),false);
  assert.equal(waves.defeat(3),false);assert.equal(waves.defeat(1),true);
  assert.equal(waves.cleared,2);waves.reset();assert.equal(waves.cleared,0);
  waves.register(1,1);assert.equal(waves.defeat(1),true);
});

test('fully upgraded offers stop without fourth passive or empty choice panel', () => {
  const store=new BuildStore(()=>0);store.reset();
  let choices=0;
  for(let wave=1;wave<=20;wave++) {
    store.completeWave(wave);
    const batch=store.snapshot.choice;
    if(batch){assert.ok(batch.options.every(id=>canAcquire(store.snapshot.build,definition(id))));store.choose(batch.id,batch.options[0],0);choices++;}
  }
  assert.equal(choices,12);assert.equal(store.snapshot.exhausted,true);
  assert.equal(store.snapshot.choice,null);assert.equal(store.snapshot.pendingRewards,0);
  assert.equal(Object.keys(store.snapshot.build.passives).length,3);
});

test('multi + pierce + explosion settle once per projectile and root cast splash, never recurse', () => {
  const spec=compileBuild(buildWith('fire.multi','fire.pierce','fire.explosion')).fireball;
  const cast={runId:1,castId:1,splashTargets:new Set()};
  const pellet = id => ({id,cast,spec,directTargets:new Set()});
  const p1=pellet(1), p2=pellet(2);
  const targets=[{id:1,x:0,y:0},{id:2,x:20,y:0},{id:3,x:40,y:0}];
  const events=[], apply=event=>{events.push(event);return true;};
  assert.equal(resolveProjectileHit(p1,targets[0],targets,apply),true);
  const firstCount=events.length;
  resolveProjectileHit(p1,targets[0],targets,apply);assert.equal(events.length,firstCount);
  assert.equal(resolveProjectileHit(p1,targets[1],targets,apply),false);
  resolveProjectileHit(p1,targets[2],targets,apply);resolveProjectileHit(p2,targets[0],targets,apply);
  assert.equal(events.filter(e=>e.source==='direct'&&e.targetId===1).length,2);
  assert.equal(events.filter(e=>e.source==='direct'&&e.targetId===2).length,1);
  assert.equal(events.filter(e=>e.source==='direct'&&e.targetId===3).length,0);
  assert.equal(events.filter(e=>e.source==='splash'&&e.targetId===2).length,1);
  assert.equal(events.filter(e=>e.source==='splash'&&e.targetId===3).length,1);
  assert.ok(Math.abs(events.find(e=>e.source==='splash').damage-4.55)<1e-9);
});

test('shield absorbs health damage, shares protection and recovers after ten seconds', () => {
  const h=new Health(200);h.configure(220,20);assert.equal(h.current,220);
  assert.equal(h.hurt(10,900),true);assert.equal(h.current,220);assert.equal(h.shield,10);
  assert.equal(h.hurt(10,900),false);h.update(9999);assert.equal(h.shield,10);
  h.update(1);assert.equal(h.shield,20);
  h.hurt(30);assert.equal(h.current,210);assert.equal(h.shield,0);
  h.configure(240,40);assert.equal(h.current,230);assert.equal(h.shield,20);
  h.configure(200,0);h.reset();assert.equal(h.current,200);assert.equal(h.shield,0);
});
