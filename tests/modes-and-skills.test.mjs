import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyCapacity, waveDifficulty } from '../src/game/enemies/difficulty.ts';
import { bossKind } from '../src/game/enemies/roster.ts';
import { applyUpgrade, compileBuild, initialBuild } from '../src/game/upgrades/build.ts';
import { BuildStore } from '../src/game/upgrades/BuildStore.ts';
import { skillSpec } from '../src/game/spells/skillDefinitions.ts';
import { formatTime, readRecords, saveRecord } from '../src/game/modes.ts';
import { PLAYER } from '../src/game/config.ts';

test('endless difficulty grows without count cap while capacity caps at 72 and bosses alternate', () => {
  assert.equal(enemyCapacity(1), 48);
  assert.equal(enemyCapacity(13), 72);
  assert.equal(enemyCapacity(100), 72);

  const w1 = waveDifficulty(1, 'endless');
  const w50 = waveDifficulty(50, 'endless');
  assert.deepEqual(w1, { count: 6, health: 1, damage: 1, speed: 1 });
  assert.equal(w50.count, 6 + 49 * 2);
  assert.ok(w50.health > waveDifficulty(49, 'endless').health);
  assert.ok(w50.damage > waveDifficulty(49, 'endless').damage);
  assert.ok(w50.speed > 1 && w50.speed < 1.7);

  assert.equal(bossKind(1), null);
  assert.equal(bossKind(5), 'boss');
  assert.equal(bossKind(10), 'weaver');
  assert.equal(bossKind(15), 'boss');
  assert.equal(bossKind(20), 'weaver');
});

test('endless builds lift caps, scale all attack damage, and keep safe speed/cooldown bounds', () => {
  let build = initialBuild(1, 'fire', 'endless');
  const ids = [
    'fire.multi', 'fire.multi', 'fire.multi', 'fire.multi', 'fire.multi',
    'passive.speed', 'passive.health', 'passive.shield', 'passive.cooldown',
    'passive.cooldown', 'passive.cooldown', 'passive.cooldown',
    'skill.fire.tempo', 'skill.fire.tempo', 'skill.fire.tempo', 'skill.fire.tempo',
  ];
  for (const id of ids) build = applyUpgrade(build, id);

  const eff = compileBuild(build);
  assert.equal(build.revision, ids.length);
  assert.equal(Object.keys(build.passives).length, 4);
  assert.equal(eff.fireball.count, 9);
  assert.ok(eff.fireball.cooldown >= 150);
  assert.ok(eff.skill.cooldown >= 1200);
  assert.ok(eff.player.speed > PLAYER.speed && eff.player.speed < PLAYER.speed * 1.8);

  const store = new BuildStore(() => 0);
  store.reset('ice', 'endless');
  for (let wave = 1; wave <= 35; wave++) {
    store.completeWave(wave);
    const choice = store.pendingChoice;
    assert.ok(choice);
    assert.equal(store.choose(choice.id, choice.options[0], wave * 1000), true);
  }
  assert.equal(store.snapshot.exhausted, false);
});

test('school E skills scale power, reach, and cooldown cleanly in race and endless', () => {
  const fire = skillSpec('fire', { power: 2, reach: 1, tempo: 3 });
  assert.equal(fire.damage, 70 * 1.6);
  assert.equal(fire.reach, 230 * 1.15);
  assert.equal(fire.radius, 120 * 1.15);
  assert.equal(fire.cooldown, 7000);

  const ice = skillSpec('ice', { power: 1, reach: 2 });
  assert.equal(ice.initialDamage, 30 * 1.3);
  assert.equal(ice.damage, 6 * 1.3);
  assert.ok(Math.abs(ice.width - 56 * 1.3) < 1e-9);

  let endlessLightning = initialBuild(1, 'lightning', 'endless');
  for (let i = 0; i < 20; i++) endlessLightning = applyUpgrade(endlessLightning, 'skill.lightning.tempo');
  const compiled = compileBuild(endlessLightning);
  assert.equal(compiled.skill.cooldown, 2250);
  assert.ok(Math.abs(compiled.skill.damage - 80 * (1 + 0.02 * 20)) < 1e-9);
});

test('mode records isolate schools, enforce best-only updates, and tolerate missing storage', () => {
  assert.equal(formatTime(0), '00:00.0');
  assert.equal(formatTime(65432), '01:05.4');
  assert.deepEqual(readRecords(), {});

  const data = new Map();
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)); },
  };
  try {
    assert.equal(saveRecord('race', 'fire', 120000), true);
    assert.equal(saveRecord('race', 'fire', 150000), false);
    assert.equal(saveRecord('race', 'fire', 95000), true);
    assert.equal(saveRecord('endless', 'fire', 12), true);
    assert.equal(saveRecord('endless', 'fire', 10), false);
    assert.equal(saveRecord('endless', 'fire', 12.5), false);
    assert.equal(saveRecord('endless', 'ice', 8), true);

    const records = readRecords();
    assert.deepEqual(records.fire, { fastestMs: 95000, mostWaves: 12 });
    assert.deepEqual(records.ice, { fastestMs: undefined, mostWaves: 8 });
  } finally {
    globalThis.localStorage = prev;
  }
});
