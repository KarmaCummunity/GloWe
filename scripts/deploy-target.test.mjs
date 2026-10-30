// Unit tests for scripts/deploy-target.mjs. Run: node --test scripts/deploy-target.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findGatedRun, findReleasePr, resolveTarget } from './deploy-target.mjs';

const SHA = 'a'.repeat(40);
const RUN_SHA = 'b'.repeat(40);
const REPO = 'KarmaCummunity/KC';
const pushRun = (branch) => ({ event: 'push', conclusion: 'success', head_branch: branch, head_sha: RUN_SHA, head_repository: { full_name: REPO } });

test('a successful dev push CI run deploys its own head SHA to dev', () => {
  const r = resolveTarget({ event: 'workflow_run', ref: 'refs/heads/main', repo: REPO, sha: SHA, workflowRun: pushRun('dev') });
  assert.deepEqual(r, { branch: 'dev', sha: RUN_SHA, target: 'dev' });
});

test('main maps to prod', () => {
  assert.equal(resolveTarget({ event: 'workflow_run', ref: 'refs/heads/main', repo: REPO, sha: SHA, workflowRun: pushRun('main') }).target, 'prod');
});

test('PR-event or failed CI runs never deploy', () => {
  const pr = { ...pushRun('dev'), event: 'pull_request' };
  assert.throws(() => resolveTarget({ event: 'workflow_run', ref: 'refs/heads/main', workflowRun: pr }), /only successful pushes deploy/);
  const failed = { ...pushRun('dev'), conclusion: 'failure' };
  assert.throws(() => resolveTarget({ event: 'workflow_run', ref: 'refs/heads/main', workflowRun: failed }), /only successful pushes/);
});

test('a dispatch deploys the dispatched ref SHA, from dev or main only', () => {
  assert.deepEqual(resolveTarget({ event: 'workflow_dispatch', ref: 'refs/heads/main', sha: SHA }), { branch: 'main', sha: SHA, target: 'prod' });
  assert.throws(() => resolveTarget({ event: 'workflow_dispatch', ref: 'refs/heads/feat/x', sha: SHA }), /only dev and main deploy/);
  assert.throws(() => resolveTarget({ event: 'workflow_dispatch', ref: 'refs/tags/main', sha: SHA }), /only dev and main deploy/);
});

test('other events and malformed SHAs are refused', () => {
  assert.throws(() => resolveTarget({ event: 'push', ref: 'refs/heads/dev', sha: SHA }), /cannot run on push/);
  assert.throws(() => resolveTarget({ event: 'workflow_dispatch', ref: 'refs/heads/dev', sha: 'abc' }), /not a commit SHA/);
});

test('findGatedRun needs a successful push run whose CI gate job succeeded', async () => {
  const jobs = {
    1: [{ name: 'CI gate', conclusion: 'success' }],
    2: [{ name: 'CI gate', conclusion: 'failure' }],
    3: [{ name: 'frontend / quality', conclusion: 'success' }],
  };
  const jobsOf = async (id) => jobs[id];
  const run = (id, extra = {}) => ({ id, event: 'push', conclusion: 'success', ...extra });
  assert.equal(await findGatedRun([run(3), run(1)], jobsOf), 1);
  assert.equal(await findGatedRun([run(2), run(3)], jobsOf), null);
  assert.equal(await findGatedRun([run(1, { event: 'pull_request' })], jobsOf), null);
  assert.equal(await findGatedRun([run(1, { conclusion: 'failure' })], jobsOf), null);
  assert.equal(await findGatedRun([], jobsOf), null);
});

test('a CI run from another repository never deploys', () => {
  const forked = { ...pushRun('main'), head_repository: { full_name: 'evil/KC' } };
  assert.throws(() => resolveTarget({ event: 'workflow_run', ref: 'refs/heads/main', repo: REPO, workflowRun: forked }), /came from evil\/KC/);
});

test('findReleasePr needs a merged dev → main PR of this repo whose merge commit is the SHA', () => {
  const pr = {
    number: 7,
    merged_at: '2026-10-30T00:00:00Z',
    merge_commit_sha: SHA,
    base: { ref: 'main', repo: { full_name: REPO } },
    head: { ref: 'dev', repo: { full_name: REPO } },
  };
  assert.equal(findReleasePr([pr], { repo: REPO, sha: SHA }), 7);
  assert.equal(findReleasePr([{ ...pr, merged_at: null }], { repo: REPO, sha: SHA }), null);
  assert.equal(findReleasePr([{ ...pr, merge_commit_sha: RUN_SHA }], { repo: REPO, sha: SHA }), null);
  assert.equal(findReleasePr([{ ...pr, head: { ref: 'feat/x', repo: { full_name: REPO } } }], { repo: REPO, sha: SHA }), null);
  assert.equal(findReleasePr([{ ...pr, head: { ref: 'dev', repo: { full_name: 'fork/KC' } } }], { repo: REPO, sha: SHA }), null);
  assert.equal(findReleasePr([], { repo: REPO, sha: SHA }), null);
});
