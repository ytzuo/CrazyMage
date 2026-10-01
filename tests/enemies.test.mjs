import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyKind, enemySpec, ENEMY_TYPES } from '../src/game/enemies/roster.ts';
import { waveDifficulty } from '../src/game/enemies/difficulty.ts';

test('wave one retains the original encounter and later waves grow', () => {
  assert.deepEqual(waveDifficulty(1), {count:6, health:1, damage:1, speed:1});
  assert.deepEqual(waveDifficulty(2), {count:8, health:1.08, damage:1.06, speed:1.02});
  assert.equal(waveDifficulty(3).count, 10);
});
test('enemy growth is monotonic and stops at explicit limits', () => {
  let previous=waveDifficulty(1);
  for(let wave=2;wave<=100;wave++) {
    const current=waveDifficulty(wave);
    for(const key of Object.keys(current)) assert.ok(current[key]>=previous[key]);
    assert.ok(current.count<=24&&current.health<=2.5&&current.damage<=2&&current.speed<=1.2);
    previous=current;
  }
  assert.deepEqual(waveDifficulty(1000), {count:24, health:2.5, damage:2, speed:1.2});
});

test('new threats enter progressively and all four types remain in later waves', () => {
  const kinds=wave=>new Set(Array.from({length:waveDifficulty(wave).count},(_,i)=>enemyKind(wave,i)));
  assert.deepEqual(kinds(1),new Set(['chaser']));
  assert.deepEqual(kinds(2),new Set(['chaser','swift']));
  assert.ok(kinds(3).has('ranged'));assert.ok(!kinds(3).has('brute'));
  assert.deepEqual(kinds(4),new Set(['chaser','swift','ranged','brute']));
  assert.equal(kinds(100).size,4);
});
test('fragile enemies trade health for range or speed; brutes retain size and power', () => {
  const {chaser,swift,ranged,brute}=ENEMY_TYPES;
  assert.ok(swift.health<chaser.health&&swift.speed>chaser.speed);
  assert.ok(ranged.health<chaser.health&&ranged.range>chaser.range);
  assert.ok(brute.radius>chaser.radius&&brute.health>chaser.health&&brute.damage>chaser.damage);
  assert.ok(brute.windup>chaser.windup&&brute.knockback<chaser.knockback);
  for(const kind of Object.keys(ENEMY_TYPES)) {
    const spec=enemySpec(kind,1000),base=ENEMY_TYPES[kind];
    assert.equal(spec.health,Math.round(base.health*2.5));assert.equal(spec.damage,base.damage*2);
    assert.equal(spec.speed,base.speed*1.2);assert.equal(spec.radius,base.radius);
    assert.ok(Object.isFrozen(spec));
  }
});
