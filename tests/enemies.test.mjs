import test from 'node:test';
import assert from 'node:assert/strict';
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
