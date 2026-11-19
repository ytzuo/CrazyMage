import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyKind, enemySpec, ENEMY_TYPES } from '../src/game/enemies/roster.ts';
import { waveDifficulty } from '../src/game/enemies/difficulty.ts';

test('wave one retains the original encounter and later waves grow', () => {
  assert.deepEqual(waveDifficulty(1), {count:6, health:1, damage:1, speed:1});
  const w2 = waveDifficulty(2);
  assert.equal(w2.count, 8);
  assert.ok(Math.abs(w2.health - 1.142) < 1e-12);
  assert.ok(Math.abs(w2.damage - 1.085) < 1e-12);
  assert.ok(Math.abs(w2.speed - 1.025) < 1e-12);
  assert.equal(waveDifficulty(3).count, 10);
});
test('enemy growth is monotonic and stops at explicit limits', () => {
  let previous=waveDifficulty(1);
  for(let wave=2;wave<=100;wave++) {
    const current=waveDifficulty(wave);
    for(const key of Object.keys(current)) assert.ok(current[key]>=previous[key]);
    assert.ok(current.count<=48&&current.speed<=1.3);
    previous=current;
  }
  const late = waveDifficulty(1000);
  assert.equal(late.count, 48);
  assert.equal(late.speed, 1.3);
  assert.ok(late.health > 2 && late.damage > 2);
});

test('new threats enter progressively and all normal types remain in later waves', () => {
  const kinds=wave=>new Set(Array.from({length:waveDifficulty(wave).count},(_,i)=>enemyKind(wave,i)));
  assert.deepEqual(kinds(1),new Set(['chaser']));
  assert.deepEqual(kinds(2),new Set(['chaser','swift']));
  assert.ok(kinds(3).has('ranged'));assert.ok(!kinds(3).has('brute'));
  assert.deepEqual(kinds(4),new Set(['chaser','swift','ranged','brute','artillery']));
  assert.equal(kinds(100).size,7);
});
test('fragile enemies trade health for range or speed; brutes retain size and power', () => {
  const {chaser,swift,ranged,brute}=ENEMY_TYPES;
  assert.ok(swift.health<chaser.health&&swift.speed>chaser.speed);
  assert.ok(ranged.health<chaser.health&&ranged.range>chaser.range);
  assert.ok(brute.radius>chaser.radius&&brute.health>chaser.health&&brute.damage>chaser.damage);
  assert.ok(brute.windup>chaser.windup&&brute.knockback<chaser.knockback);
  const growth = waveDifficulty(1000);
  for(const kind of Object.keys(ENEMY_TYPES)) {
    const spec=enemySpec(kind,1000),base=ENEMY_TYPES[kind];
    assert.equal(spec.health,Math.round(base.health*growth.health));
    assert.equal(spec.damage,Math.round(base.damage*growth.damage));
    assert.equal(spec.speed,base.speed*growth.speed);assert.equal(spec.radius,base.radius);
    assert.ok(Object.isFrozen(spec));
  }
});
