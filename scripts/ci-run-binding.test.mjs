// Unit tests for scripts/ci-run-binding.mjs. Run: node --test scripts/ci-run-binding.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindPrRun, gateFilesChanged, latestPullRequestRun, mergeRefOf, runShapeErrors } from './ci-run-binding.mjs';

const REPO = 'Org/KC';
const HEAD = 'h'.repeat(40);
const MERGE = 'm'.repeat(40);
const BASE = 'b'.repeat(40);

/** A completed pull_request run of PR #7 whose reusable workflows ran at MERGE. */
function prRun(overrides = {}) {
  return {
    id: 1,
    event: 'pull_request',
    status: 'completed',
    conclusion: 'success',
    path: '.github/workflows/ci.yml',
    head_sha: HEAD,
    head_branch: 'feat/x',
    html_url: 'https://github.com/Org/KC/actions/runs/1',
    repository: { full_name: REPO },
    head_repository: { full_name: REPO },
    referenced_workflows: [
      { path: `${REPO}/.github/workflows/ci-static-guards.yml@refs/pull/7/merge`, sha: MERGE, ref: 'refs/pull/7/merge' },
      { path: `${REPO}/.github/workflows/ci-pr.yml@refs/pull/7/merge`, sha: MERGE, ref: 'refs/pull/7/merge' },
    ],
    ...overrides,
  };
}

/** API answers for a PR #7 into `baseRef` whose merge commit merges HEAD onto BASE. */
function api({ baseRef = 'dev', parents = [BASE, HEAD], status = 'ahead', files = [] } = {}) {
  return {
    [`/repos/${REPO}/pulls/7`]: { number: 7, base: { ref: baseRef, repo: { full_name: REPO } }, head: { sha: HEAD } },
    [`/repos/${REPO}/commits/${MERGE}`]: { parents: parents.map((sha) => ({ sha })) },
    [`/repos/${REPO}/compare/${BASE}...${baseRef}`]: { status, files },
  };
}

/** Run `fn` with global fetch serving `routes` (path → JSON; query ignored). */
async function withApi(routes, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (!(path in routes)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => routes[path] };
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
}

const ENV = { GITHUB_TOKEN: 't' };

test('a well-formed PR run has no shape errors', () => {
  assert.deepEqual(runShapeErrors(prRun(), REPO), []);
});

test('look-alike workflows, forks and unfinished runs are rejected', () => {
  assert.match(runShapeErrors(prRun({ path: '.github/workflows/evil.yml' }), REPO)[0], /not \.github\/workflows\/ci\.yml/);
  assert.match(runShapeErrors(prRun({ head_repository: { full_name: 'fork/KC' } }), REPO)[0], /fork/);
  assert.match(runShapeErrors(prRun({ status: 'in_progress' }), REPO)[0], /in_progress/);
});

test('push and dispatch runs count only on dev or main; merge groups only on their queues', () => {
  assert.deepEqual(runShapeErrors(prRun({ event: 'push', head_branch: 'dev' }), REPO), []);
  assert.equal(runShapeErrors(prRun({ event: 'push', head_branch: 'x' }), REPO).length, 1);
  assert.equal(runShapeErrors(prRun({ event: 'workflow_dispatch', head_branch: 'feat/y' }), REPO).length, 1);
  assert.deepEqual(runShapeErrors(prRun({ event: 'merge_group', head_branch: 'gh-readonly-queue/main/pr-7-abc' }), REPO), []);
  assert.equal(runShapeErrors(prRun({ event: 'merge_group', head_branch: 'gh-readonly-queue/x/pr-7' }), REPO).length, 1);
  assert.equal(runShapeErrors(prRun({ event: 'schedule' }), REPO).length, 1);
});

test('mergeRefOf reads the PR number and merge commit, and rejects disagreeing references', () => {
  assert.deepEqual(mergeRefOf(prRun(), REPO), { sha: MERGE, pr: 7 });
  assert.equal(mergeRefOf(prRun({ referenced_workflows: [] }), REPO), null);
  const mixed = prRun().referenced_workflows.map((w, i) => (i ? { ...w, sha: BASE } : w));
  assert.equal(mergeRefOf(prRun({ referenced_workflows: mixed }), REPO), null);
  const branch = [{ path: `${REPO}/.github/workflows/ci-pr.yml@refs/heads/x`, sha: MERGE, ref: 'refs/heads/x' }];
  assert.equal(mergeRefOf(prRun({ referenced_workflows: branch }), REPO), null);
});

test('gateFilesChanged picks workflow and judge files only', () => {
  const files = ['.github/workflows/ci.yml', 'scripts/ci-gate.mjs', 'scripts/check-x.mjs', 'app/a.ts'].map((filename) => ({ filename }));
  assert.deepEqual(gateFilesChanged(files), ['.github/workflows/ci.yml', 'scripts/ci-gate.mjs', 'scripts/check-x.mjs']);
});

test('bindPrRun binds a run of a PR into dev', async () => {
  const { errors, pr } = await withApi(api(), () => bindPrRun(prRun(), REPO, ENV, { pr: 7, baseRef: 'dev' }));
  assert.deepEqual(errors, []);
  assert.equal(pr.number, 7);
});

test('bindPrRun rejects a PR into an unprotected branch (the spoofing path)', async () => {
  const { errors } = await withApi(api({ baseRef: 'attacker' }), () => bindPrRun(prRun(), REPO, ENV));
  assert.match(errors[0], /targets attacker, not dev or main/);
});

test('bindPrRun rejects another PR, another base, a foreign merge and a stale base', async () => {
  assert.match((await withApi(api(), () => bindPrRun(prRun(), REPO, ENV, { pr: 8 }))).errors[0], /PR #7, not PR #8/);
  assert.match((await withApi(api(), () => bindPrRun(prRun(), REPO, ENV, { baseRef: 'main' }))).errors[0], /not main/);
  assert.match((await withApi(api({ parents: [BASE, MERGE] }), () => bindPrRun(prRun(), REPO, ENV))).errors[0], /does not merge head/);
  assert.match((await withApi(api({ status: 'diverged' }), () => bindPrRun(prRun(), REPO, ENV))).errors[0], /not part of dev/);
  const moved = api({ files: [{ filename: '.github/workflows/ci.yml' }] });
  assert.match((await withApi(moved, () => bindPrRun(prRun(), REPO, ENV))).errors[0], /changed gate files/);
});

test('bindPrRun rejects a run without a merge reference before calling the API', async () => {
  const { errors } = await withApi({}, () => bindPrRun(prRun({ referenced_workflows: [] }), REPO, ENV));
  assert.match(errors[0], /no single refs\/pull\/N\/merge/);
});

test('latestPullRequestRun picks the newest pull_request run listed for the same PR and base', () => {
  const run = (id, created, { event = 'pull_request', pr = 7, base = 'dev' } = {}) => ({
    id,
    created_at: created,
    event,
    pull_requests: [{ number: pr, base: { ref: base } }],
  });
  const runs = [
    run(1, '2026-10-30T10:00:00Z'),
    run(2, '2026-10-30T11:00:00Z'),
    run(3, '2026-10-30T12:00:00Z', { event: 'pull_request_review' }),
    run(4, '2026-10-30T13:00:00Z', { pr: 8 }),
    run(5, '2026-10-30T14:00:00Z', { base: 'attacker' }),
  ];
  assert.equal(latestPullRequestRun(runs, 7, 'dev').id, 2);
  assert.equal(latestPullRequestRun(runs, 7, 'main'), null);
  assert.equal(latestPullRequestRun([{ ...run(6, '2026-10-30T10:00:00Z'), pull_requests: [] }], 7, 'dev'), null);
});
