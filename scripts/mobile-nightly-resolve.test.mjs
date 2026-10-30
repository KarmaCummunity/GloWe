// Unit tests for scripts/mobile-nightly-resolve.mjs. Run: node --test scripts/mobile-nightly-resolve.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markerSha, parseVersion, pickGreenSha, planNightly } from './mobile-nightly-resolve.mjs';

test('picks the newest commit that has a green CI push run, not the tip', () => {
  assert.equal(pickGreenSha(['tip', 'mid', 'old'], ['old', 'mid']), 'mid');
});

test('returns null when no scanned commit is green', () => {
  assert.equal(pickGreenSha(['a', 'b'], ['z']), null);
  assert.equal(pickGreenSha([], []), null);
});

test('builds when the green commit differs from the last nightly build', () => {
  assert.deepEqual(planNightly({ greenSha: 'b', lastSha: 'a', force: false }), {
    build: true,
    reason: 'new green commit since a',
  });
});

test('builds on the first run, when no marker exists', () => {
  assert.equal(planNightly({ greenSha: 'a', lastSha: null, force: false }).build, true);
});

test('skips when the green commit is already the last nightly build', () => {
  assert.equal(planNightly({ greenSha: 'a', lastSha: 'a', force: false }).build, false);
});

test('force rebuilds an unchanged commit', () => {
  assert.equal(planNightly({ greenSha: 'a', lastSha: 'a', force: true }).build, true);
});

test('planNightly refuses to plan without a green commit', () => {
  assert.throws(() => planNightly({ greenSha: null, lastSha: 'a', force: true }), /green SHA/);
});

test('parseVersion accepts MAJOR.MINOR.PATCH and rejects anything else', () => {
  assert.equal(parseVersion('1.5.3\n'), '1.5.3');
  assert.throws(() => parseVersion('1.5'), /MAJOR\.MINOR\.PATCH/);
  assert.throws(() => parseVersion('v1.5.3'), /MAJOR\.MINOR\.PATCH/);
});

test('markerSha reads a lightweight tag and treats a missing tag as no previous build', () => {
  assert.equal(markerSha({ object: { type: 'commit', sha: 'abc' } }), 'abc');
  assert.equal(markerSha(null), null);
});

test('markerSha rejects an annotated tag, whose object is not the commit', () => {
  assert.throws(() => markerSha({ object: { type: 'tag', sha: 'tagobj' } }), /lightweight/);
});
