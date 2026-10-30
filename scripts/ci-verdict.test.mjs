// Unit tests for scripts/ci-verdict.mjs. Run: node --test scripts/ci-verdict.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATE_JOB, VERDICT_CHECK, gateJobErrors, judgeRun, verdictCheck } from './ci-verdict.mjs';

const REPO = 'Org/KC';
const HEAD = 'h'.repeat(40);
const MERGE = 'm'.repeat(40);
const BASE = 'b'.repeat(40);
const ENV = { GITHUB_TOKEN: 't' };
const ok = (name) => ({ name, status: 'completed', conclusion: 'success' });

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
    referenced_workflows: [{ path: `${REPO}/.github/workflows/ci-static-guards.yml@refs/pull/7/merge`, sha: MERGE, ref: 'refs/pull/7/merge' }],
    ...overrides,
  };
}

/** Serve the API a verdict needs for PR #7 into `baseRef`, with `jobs` in run 1. */
async function withApi({ baseRef = 'dev', jobs = [ok('detect changes'), ok(GATE_JOB)] } = {}, fn) {
  const routes = {
    [`/repos/${REPO}/pulls/7`]: { number: 7, base: { ref: baseRef, repo: { full_name: REPO } } },
    [`/repos/${REPO}/commits/${MERGE}`]: { parents: [{ sha: BASE }, { sha: HEAD }] },
    [`/repos/${REPO}/compare/${BASE}...${baseRef}`]: { status: 'identical', files: [] },
    [`/repos/${REPO}/actions/runs/1/jobs`]: { jobs },
  };
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    return path in routes ? { ok: true, json: async () => routes[path] } : { ok: false, status: 404, json: async () => ({}) };
  };
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
}

test('gateJobErrors needs exactly one successful CI gate job', () => {
  assert.deepEqual(gateJobErrors([ok(GATE_JOB)]), []);
  assert.match(gateJobErrors([])[0], /0 "CI gate" jobs/);
  assert.match(gateJobErrors([ok(GATE_JOB), ok(GATE_JOB)])[0], /2 "CI gate" jobs/);
  assert.match(gateJobErrors([{ name: GATE_JOB, status: 'completed', conclusion: 'failure' }])[0], /ended failure/);
});

test('a bound, green PR run into dev certifies its head SHA', async () => {
  assert.deepEqual(await withApi({}, () => judgeRun(prRun(), REPO, ENV)), []);
});

test('a green CI gate from a PR into another branch is not certified', async () => {
  const errors = await withApi({ baseRef: 'attacker' }, () => judgeRun(prRun(), REPO, ENV));
  assert.ok(errors.some((e) => /not dev or main/.test(e)), errors.join('\n'));
});

test('failed or cancelled CI runs get a red verdict', async () => {
  const failed = await withApi({ jobs: [{ name: GATE_JOB, status: 'completed', conclusion: 'failure' }] }, () =>
    judgeRun(prRun({ conclusion: 'failure' }), REPO, ENV),
  );
  assert.deepEqual(failed, ['CI run concluded failure', '"CI gate" ended failure']);
  const cancelled = await withApi({ jobs: [{ name: GATE_JOB, status: 'completed', conclusion: 'cancelled' }] }, () =>
    judgeRun(prRun({ conclusion: 'cancelled' }), REPO, ENV),
  );
  assert.equal(cancelled.length, 2);
});

test('a look-alike workflow is rejected without trusting its jobs', async () => {
  const errors = await withApi({}, () => judgeRun(prRun({ path: '.github/workflows/evil.yml' }), REPO, ENV));
  assert.match(errors[0], /not \.github\/workflows\/ci\.yml/);
});

test('review runs are bound like PR runs; push runs on dev need no PR', async () => {
  assert.deepEqual(await withApi({}, () => judgeRun(prRun({ event: 'pull_request_review' }), REPO, ENV)), []);
  const push = prRun({ event: 'push', head_branch: 'dev', referenced_workflows: [] });
  assert.deepEqual(await withApi({}, () => judgeRun(push, REPO, ENV)), []);
});

test('verdictCheck posts success only without errors, always on the run head SHA', () => {
  const green = verdictCheck(prRun(), []);
  assert.equal(green.name, VERDICT_CHECK);
  assert.equal(green.head_sha, HEAD);
  assert.equal(green.conclusion, 'success');
  const red = verdictCheck(prRun(), ['nope']);
  assert.equal(red.conclusion, 'failure');
  assert.match(red.output.summary, /- nope/);
});

test('the committed ruleset requires CI verdict from its own App, CI gate from Actions, and has no bypass', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const ruleset = JSON.parse(readFileSync(join(root, '.github/rulesets/dev-main.json'), 'utf8'));
  assert.deepEqual(ruleset.bypass_actors, []);
  const checks = ruleset.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks;
  const verdict = checks.find((c) => c.context === VERDICT_CHECK);
  assert.ok(verdict, 'CI verdict must be required');
  assert.notEqual(verdict.integration_id, 15368, 'CI verdict must come from the CI-verdict App, not GitHub Actions');
  assert.equal(checks.find((c) => c.context === GATE_JOB)?.integration_id, 15368);
});
