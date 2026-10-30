// Unit tests for scripts/ci-changes.mjs. Run: node --test scripts/ci-changes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LANE_JOBS, changedFiles, classify, plan } from './ci-changes.mjs';

const PR = { event: 'pull_request', draft: false, actor: 'agent', ref: 'refs/pull/1/merge' };
const ALL = { hygiene: true, static: true, frontend: true, backend: true, edge: true };

test('docs-only PR runs only hygiene and static', () => {
  const r = plan({ ...PR, files: ['docs/SSOT/BACKLOG.md', 'CLAUDE.md', '.claude/settings.json'] });
  assert.deepEqual(r.plan, { hygiene: true, static: true, frontend: false, backend: false, edge: false });
  assert.equal(r.sonar, false);
});

test('the plan names every lane job explicitly', () => {
  const r = plan({ ...PR, files: ['app/a.ts'] });
  assert.deepEqual(Object.keys(r.plan).sort(), [...LANE_JOBS].sort());
});

test('app change runs frontend + sonar only', () => {
  const r = plan({ ...PR, files: ['app/apps/mobile/src/lib/x.ts'] });
  assert.deepEqual(r.plan, { hygiene: true, static: true, frontend: true, backend: false, edge: false });
  assert.equal(r.sonar, true);
});

test('infrastructure-supabase change runs frontend and backend', () => {
  const lanes = classify(['app/packages/infrastructure-supabase/src/database.types.ts']);
  assert.deepEqual(lanes, { frontend: true, backend: true, edge: false });
});

test('lockfile change also runs backend (sqlProbes install the workspace)', () => {
  assert.equal(classify(['app/pnpm-lock.yaml']).backend, true);
});

test('migration runs backend + edge, not frontend', () => {
  assert.deepEqual(classify(['supabase/migrations/0200_x.sql']), { frontend: false, backend: true, edge: true });
});

test('edge function change runs edge only', () => {
  assert.deepEqual(classify(['supabase/functions/translate/index.ts']), { frontend: false, backend: false, edge: true });
});

test('CI plumbing and the Node pin run every lane', () => {
  for (const f of ['.github/workflows/ci.yml', '.github/actions/setup-pnpm-turbo/action.yml', '.nvmrc']) {
    assert.deepEqual(classify([f]), { frontend: true, backend: true, edge: true }, f);
  }
});

test('scripts/** runs frontend and backend', () => {
  assert.deepEqual(classify(['scripts/generate-typed-routes.mjs']), { frontend: true, backend: true, edge: false });
});

test('unclaimed non-inert path runs every lane (fail closed)', () => {
  assert.deepEqual(classify(['railway.json']), { frontend: true, backend: true, edge: true });
  assert.deepEqual(classify(['tests/e2e/auth.spec.ts']), { frontend: true, backend: true, edge: true });
});

test('draft PR plans every lane as not needed and flags draft', () => {
  const r = plan({ ...PR, draft: true, files: ['app/x.ts'] });
  assert.equal(r.draft, true);
  assert.deepEqual(Object.values(r.plan), [false, false, false, false, false]);
});

test('unknown diff runs every lane', () => {
  assert.deepEqual(plan({ ...PR, files: null }).plan, ALL);
});

test('dependabot PR skips sonar (no secrets)', () => {
  assert.equal(plan({ ...PR, actor: 'dependabot[bot]', files: ['app/package.json'] }).sonar, false);
});

test('merge queue runs no hygiene and no sonar', () => {
  const r = plan({ event: 'merge_group', draft: false, actor: 'x', ref: 'refs/heads/gh-readonly-queue/dev/pr-1', files: ['app/a.ts'] });
  assert.equal(r.plan.hygiene, false);
  assert.equal(r.plan.frontend, true);
  assert.equal(r.sonar, false);
});

test('push runs sonar on main only', () => {
  const files = ['app/a.ts'];
  assert.equal(plan({ event: 'push', draft: false, actor: 'x', ref: 'refs/heads/main', files }).sonar, true);
  assert.equal(plan({ event: 'push', draft: false, actor: 'x', ref: 'refs/heads/dev', files }).sonar, false);
});

test('push to dev runs every lane even for a docs-only diff', () => {
  const r = plan({ event: 'push', draft: false, actor: 'x', ref: 'refs/heads/dev', files: ['docs/a.md'] });
  assert.deepEqual(r.plan, { ...ALL, hygiene: false });
});

test('push to main runs every lane and sonar', () => {
  const r = plan({ event: 'push', draft: false, actor: 'x', ref: 'refs/heads/main', files: [] });
  assert.deepEqual(r.plan, { ...ALL, hygiene: false });
  assert.equal(r.sonar, true);
});

test('the same docs-only diff on a PR stays diff-based', () => {
  const r = plan({ ...PR, files: ['docs/a.md'] });
  assert.deepEqual(r.plan, { hygiene: true, static: true, frontend: false, backend: false, edge: false });
});

test('manual dispatch runs every heavy lane', () => {
  const r = plan({ event: 'workflow_dispatch', draft: false, actor: 'x', ref: 'refs/heads/dev', files: [] });
  assert.deepEqual(r.plan, { ...ALL, hygiene: false });
});

// ── changedFiles against a real repository ───────────────────────────────

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function repoWith(files) {
  const dir = mkdtempSync(join(tmpdir(), 'ci-changes-'));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'ci@example.com');
  git(dir, 'config', 'user.name', 'ci');
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  return { dir, base: git(dir, 'rev-parse', 'HEAD') };
}

function moveAndCommit(dir, from, to) {
  mkdirSync(join(dir, to, '..'), { recursive: true });
  git(dir, 'mv', from, to);
  git(dir, 'commit', '-q', '-m', 'move');
  return git(dir, 'rev-parse', 'HEAD');
}

test('moving code into docs still runs the code lane (renames are split)', () => {
  const { dir, base } = repoWith({ 'app/src/foo.ts': 'export const foo = 1;\n' });
  try {
    const head = moveAndCommit(dir, 'app/src/foo.ts', 'docs/foo.md');
    const files = changedFiles(base, head, dir);
    assert.deepEqual(files.sort(), ['app/src/foo.ts', 'docs/foo.md']);
    assert.equal(classify(files).frontend, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('moving a migration out of supabase/migrations still runs backend', () => {
  const { dir, base } = repoWith({ 'supabase/migrations/0001_init.sql': 'create table t (id int);\n' });
  try {
    const head = moveAndCommit(dir, 'supabase/migrations/0001_init.sql', 'docs/archive/0001_init.sql');
    const files = changedFiles(base, head, dir);
    assert.ok(files.includes('supabase/migrations/0001_init.sql'));
    assert.equal(classify(files).backend, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unresolvable base yields null (every lane runs)', () => {
  assert.equal(changedFiles('0000000000000000000000000000000000000000', 'HEAD'), null);
  assert.equal(changedFiles('', 'HEAD'), null);
});
