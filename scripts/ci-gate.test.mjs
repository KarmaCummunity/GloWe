// Unit tests for scripts/ci-gate.mjs. Run: node --test scripts/ci-gate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGate, mergeReused } from './ci-gate.mjs';

const ok = { result: 'success' };
const skipped = { result: 'skipped' };
const PR = { draft: false, event: 'pull_request', ref: 'refs/pull/1/merge' };
const PLAN = { hygiene: true, static: true, frontend: true, backend: false, edge: false };
const NEEDS = { changes: ok, hygiene: ok, static: ok, frontend: ok, backend: skipped, edge: skipped };

test('passes when every needed lane succeeded and the rest were explicitly not needed', () => {
  assert.deepEqual(evaluateGate({ ...PR, needs: NEEDS, plan: PLAN }), []);
});

test('fails a draft PR even when nothing ran', () => {
  const errors = evaluateGate({ ...PR, draft: true, needs: { changes: ok }, plan: null });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Draft PR/);
});

test('fails when a needed lane was skipped', () => {
  const errors = evaluateGate({ ...PR, needs: { ...NEEDS, frontend: skipped }, plan: PLAN });
  assert.deepEqual(errors, ['job "frontend" is needed for this change but was skipped']);
});

test('fails on any failed or cancelled job, needed or not', () => {
  const needs = { ...NEEDS, backend: { result: 'failure' }, edge: { result: 'cancelled' } };
  assert.deepEqual(evaluateGate({ ...PR, needs, plan: PLAN }), ['job "backend" failure', 'job "edge" cancelled']);
});

test('fails closed when the plan is missing or empty', () => {
  for (const plan of [null, {}]) {
    assert.deepEqual(evaluateGate({ ...PR, needs: NEEDS, plan }), ['change detector produced no lane plan']);
  }
});

test('fails when a skipped lane is absent from the plan', () => {
  const { edge: _edge, ...partial } = PLAN;
  assert.deepEqual(evaluateGate({ ...PR, needs: NEEDS, plan: partial }), [
    'job "edge" is not in the change detector\'s plan',
  ]);
});

test('fails when a planned lane is not wired into needs', () => {
  const { edge: _edge, ...needs } = NEEDS;
  assert.deepEqual(evaluateGate({ ...PR, needs, plan: PLAN }), [
    'job "edge" is planned but missing from the gate\'s needs: list',
  ]);
});

test('fails when the change detector did not succeed', () => {
  const errors = evaluateGate({ ...PR, needs: { changes: { result: 'failure' } }, plan: null });
  assert.deepEqual(errors, ['change detector did not succeed (result: failure)']);
});

test('manual dispatch gates only dev and main', () => {
  const all = { hygiene: false, static: true, frontend: true, backend: true, edge: true };
  const needs = { ...NEEDS, hygiene: skipped, backend: ok, edge: ok };
  assert.deepEqual(evaluateGate({ needs, plan: all, draft: false, event: 'workflow_dispatch', ref: 'refs/heads/dev' }), []);
  const errors = evaluateGate({ needs, plan: all, draft: false, event: 'workflow_dispatch', ref: 'refs/heads/feat/x' });
  assert.match(errors[0], /Manual runs gate only dev or main/);
});

test('a release into main cannot pass with the release lane skipped', () => {
  const plan = { ...PLAN, release: true };
  assert.deepEqual(evaluateGate({ ...PR, needs: { ...NEEDS, release: skipped }, plan }), [
    'job "release" is needed for this change but was skipped',
  ]);
  assert.deepEqual(evaluateGate({ ...PR, needs: { ...NEEDS, release: ok }, plan }), []);
});

// Review events re-run only the static lane and reuse the rest.
const REVIEW_PLAN = { hygiene: true, static: true, release: false, frontend: true, backend: false, edge: false };
const REVIEW_OWN = { changes: ok, hygiene: skipped, static: ok, release: skipped, frontend: skipped, backend: skipped, edge: skipped };
const REVIEW = { ...PR, event: 'pull_request_review' };

test('a review event judges reused lane results but keeps its own static result', () => {
  const reused = { hygiene: 'success', static: 'failure', release: 'skipped', frontend: 'success', backend: 'skipped', edge: 'skipped' };
  const merged = mergeReused(REVIEW_OWN, reused);
  assert.deepEqual(merged.static, ok);
  assert.deepEqual(merged.frontend, ok);
  assert.deepEqual(evaluateGate({ ...REVIEW, needs: merged, plan: REVIEW_PLAN }), []);
});

test('a review event fails when the reused run lacks or failed a needed lane', () => {
  const missing = mergeReused(REVIEW_OWN, { hygiene: 'success', release: 'skipped', backend: 'skipped', edge: 'skipped' });
  assert.deepEqual(evaluateGate({ ...REVIEW, needs: missing, plan: REVIEW_PLAN }), [
    'job "frontend" is needed for this change but ended missing',
  ]);
  const failed = mergeReused(REVIEW_OWN, { hygiene: 'success', release: 'skipped', frontend: 'failure', backend: 'skipped', edge: 'skipped' });
  assert.deepEqual(evaluateGate({ ...REVIEW, needs: failed, plan: REVIEW_PLAN }), ['job "frontend" failure']);
});
