import test from 'node:test';
import assert from 'node:assert/strict';
import { Health } from '../src/game/combat/Health.ts';
import { segmentCircleHit } from '../src/game/combat/collision.ts';
import { WaveClock } from '../src/game/enemies/WaveClock.ts';

test('waves arrive at 30 seconds, preserve remainder, and restart at wave one', () => {
  const clock = new WaveClock(30000);
  assert.equal(clock.wave, 1);
  assert.equal(clock.remaining, 30000);
  assert.equal(clock.update(29999), 0);
  assert.equal(clock.remaining, 1);
  assert.equal(clock.elapsedTime, 29999);
  assert.equal(clock.update(2), 1);
  assert.equal(clock.wave, 2);
  assert.equal(clock.remaining, 29999);
  assert.equal(clock.elapsedTime, 30001);
  assert.equal(clock.update(60000), 2);
  assert.equal(clock.wave, 4);
  assert.equal(clock.remaining, 29999);
  clock.reset();
  assert.equal(clock.wave, 1);
  assert.equal(clock.remaining, 30000);
  assert.equal(clock.elapsedTime, 0);
});

test('simultaneous contacts cause one hit during protection, then expire in game time', () => {
  const health = new Health(100);
  assert.equal(health.hurt(10, 900), true);
  for (let i = 0; i < 36; i++) assert.equal(health.hurt(10, 900), false);
  assert.equal(health.current, 90);
  health.update(899);
  assert.equal(health.hurt(10), false);
  health.update(1);
  assert.equal(health.hurt(10), true);
  assert.equal(health.current, 80);
});

test('death clamps health, refuses further hits, and reset restores health and protection', () => {
  const health = new Health(40);
  health.hurt(20);
  assert.equal(health.current, 20);
  health.hurt(50, 900);
  assert.equal(health.current, 0);
  assert.equal(health.dead, true);
  assert.equal(health.hurt(20), false);
  health.reset();
  assert.equal(health.current, 40);
  assert.equal(health.dead, false);
  assert.equal(health.hurt(20), true);
});

test('fast fireball hits a circle even when both endpoints are outside it', () => {
  assert.equal(segmentCircleHit(0, 0, 100, 0, 50, 0, 10), 0.4);
  assert.equal(segmentCircleHit(0, 0, 100, 0, 50, 20, 10), null);
  assert.equal(segmentCircleHit(0, 0, 100, 0, -50, 0, 10), null);
  assert.equal(segmentCircleHit(0, 0, 100, 0, 150, 0, 10), null);
});

test('overlapping spawn and tangent contact are hits; stationary miss is safe', () => {
  assert.equal(segmentCircleHit(50, 0, 50, 0, 50, 0, 10), 0);
  assert.equal(segmentCircleHit(0, 0, 0, 0, 50, 0, 10), null);
  assert.equal(segmentCircleHit(0, 0, 100, 0, 50, 10, 10), 0.5);
  const near = segmentCircleHit(0, 0, 100, 0, 30, 0, 10);
  const far = segmentCircleHit(0, 0, 100, 0, 70, 0, 10);
  assert.ok(near < far);
});
