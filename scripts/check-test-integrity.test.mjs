// Unit tests for scripts/check-test-integrity.mjs.
// Run: node --test scripts/check-test-integrity.test.mjs
//
// Markers are assembled from pieces ('.sk' + 'ip(') so this file never adds a
// literal marker itself, which the guard would flag on the PR adding it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { countAssertions, findViolations, isTest, parseDiff, prDiff } from './check-test-integrity.mjs';

const SKIP = 'it' + '.sk' + 'ip(';
const ONLY = 'describe' + '.on' + 'ly(';
const TODO = 'it' + '.to' + 'do(';
const FIXME = 'test' + '.fix' + 'me(';
const XIT = 'x' + 'it(';
const NOCHECK = '// @ts-' + 'nocheck';
const NO_TESTS = '--pass' + 'WithNoTests';

const mod = (path, { added = [], removed = [] } = {}) => ({ oldPath: path, newPath: path, path, added, removed });

test('isTest covers unit, spec, __tests__, SQL and E2E files only', () => {
  for (const p of ['app/a.test.ts', 'scripts/x.test.mjs', 'app/src/__tests__/helpers.ts', 'supabase/tests/0001_x.sql', 'tests/e2e/journeys/feed.spec.ts']) {
    assert.equal(isTest(p), true, p);
  }
  for (const p of ['app/src/a.ts', 'supabase/migrations/0001_x.sql', 'docs/testing.md']) assert.equal(isTest(p), false, p);
});

test('a clean diff (new tests, app code) has no violations', () => {
  const files = [
    { oldPath: null, newPath: 'app/new.test.ts', path: 'app/new.test.ts', added: ['expect(1).toBe(1);'], removed: [] },
    mod('app/src/a.ts', { added: ['export const a = 2;'], removed: ['export const a = 1;'] }),
  ];
  assert.deepEqual(findViolations(files), []);
});

test('deleting a test file, or renaming it to a non-test path, is flagged', () => {
  const files = [
    { oldPath: 'app/a.test.ts', newPath: null, path: 'app/a.test.ts', added: [], removed: [] },
    { oldPath: 'app/b.test.ts', newPath: 'app/b.ts', path: 'app/b.ts', added: [], removed: [] },
  ];
  assert.deepEqual(findViolations(files), ['app/a.test.ts: deletes a test file', 'app/b.test.ts: renamed to non-test path app/b.ts']);
});

test('renaming a test to another test path is fine', () => {
  assert.deepEqual(findViolations([{ oldPath: 'app/a.test.ts', newPath: 'app/b.test.ts', path: 'app/b.test.ts', added: [], removed: [] }]), []);
});

test('skip, focus, todo, fixme, x-prefixed and nocheck markers in tests are flagged', () => {
  for (const line of [`${SKIP}'x', () => {})`, `${ONLY}'x', () => {})`, `${TODO}'later')`, `${FIXME}'flaky')`, `${XIT}'x', () => {})`, NOCHECK]) {
    const v = findViolations([mod('app/a.test.ts', { added: [line] })]);
    assert.equal(v.length, 1, line);
  }
});

test('markers in non-test code are ignored; pgTAP skip in SQL tests is flagged', () => {
  assert.deepEqual(findViolations([mod('app/src/list.ts', { added: [`rows${'.sk' + 'ip('}2)`] })]), []);
  assert.equal(findViolations([mod('supabase/tests/0001_x.sql', { added: ["select skip('later', 2);"] })]).length, 1);
});

test('a switch that passes with zero tests is flagged anywhere but Markdown', () => {
  assert.equal(findViolations([mod('app/package.json', { added: [`"test": "vitest run ${NO_TESTS}"`] })]).length, 1);
  assert.deepEqual(findViolations([mod('docs/testing.md', { added: [`never use ${NO_TESTS}`] })]), []);
});

test('lowering or dropping a coverage threshold is flagged; raising is fine', () => {
  const cfg = 'app/packages/domain/vitest.config.ts';
  assert.match(findViolations([mod(cfg, { removed: ['lines: 60,'], added: ['lines: 50,'] })])[0], /loosens coverage threshold "lines" 60 → 50/);
  assert.match(findViolations([mod(cfg, { removed: ['branches: 60,'] })])[0], /drops coverage threshold "branches"/);
  assert.deepEqual(findViolations([mod(cfg, { removed: ['lines: 60,'], added: ['lines: 70,'] })]), []);
});

test('raising or dropping --max-warnings is flagged; lowering is fine', () => {
  const pkg = 'app/apps/mobile/package.json';
  const line = (n) => `"lint": "eslint . --max-warnings=${n}"`;
  assert.match(findViolations([mod(pkg, { removed: [line(70)], added: [line(80)] })])[0], /loosens --max-warnings 70 → 80/);
  assert.match(findViolations([mod(pkg, { removed: [line(70)], added: ['"lint": "eslint ."'] })])[0], /drops --max-warnings/);
  assert.deepEqual(findViolations([mod(pkg, { removed: [line(70)], added: [line(69)] })]), []);
});

test('a net loss of assertions in existing tests is flagged', () => {
  const v = findViolations([mod('app/a.test.ts', { removed: ['expect(a).toBe(1);', 'assert.equal(b, 2);'], added: ['expect(a).toBe(1);'] })]);
  assert.deepEqual(v, ['removes 1 assertion(s) net from existing tests (2 removed, 1 added; files: app/a.test.ts)']);
});

test('assertions moved into a new test file are not a loss', () => {
  const files = [
    mod('app/a.test.ts', { removed: ['expect(a).toBe(1);', 'expect(b).toBe(2);'] }),
    { oldPath: null, newPath: 'app/a2.test.ts', path: 'app/a2.test.ts', added: ['expect(a).toBe(1);', 'expect(b).toBe(2);'], removed: [] },
  ];
  assert.deepEqual(findViolations(files), []);
});

test('countAssertions knows JS and SQL assertion styles', () => {
  assert.equal(countAssertions('a.test.ts', ['expect(x).toBe(1); expect.soft(y).toBe(2);', 'assert.deepEqual(a, b)']), 3);
  assert.equal(countAssertions('supabase/tests/x.sql', ["assert v = 1, 'msg';", "raise exception 'bad';", "select ok(true);"]), 3);
});

test('parseDiff reads statuses, renames and hunks, and treats removed SQL comments as content', () => {
  const diff = [
    'diff --git a/app/a.test.ts b/app/a.test.ts',
    'index 1..2 100644',
    '--- a/app/a.test.ts',
    '+++ b/app/a.test.ts',
    '@@ -1 +1 @@',
    '-expect(a).toBe(1);',
    '+expect(a).toBe(2);',
    'diff --git a/supabase/tests/x.sql b/supabase/tests/x.sql',
    'deleted file mode 100644',
    '--- a/supabase/tests/x.sql',
    '+++ /dev/null',
    '@@ -1,2 +0,0 @@',
    '--- a comment',
    '-select 1;',
    'diff --git a/old.test.ts b/new.ts',
    'similarity index 100%',
    'rename from old.test.ts',
    'rename to new.ts',
  ].join('\n');
  const [a, b, c] = parseDiff(diff);
  assert.deepEqual(a, { oldPath: 'app/a.test.ts', newPath: 'app/a.test.ts', path: 'app/a.test.ts', added: ['expect(a).toBe(2);'], removed: ['expect(a).toBe(1);'] });
  assert.equal(b.newPath, null);
  assert.deepEqual(b.removed, ['-- a comment', 'select 1;']);
  assert.deepEqual([c.oldPath, c.newPath], ['old.test.ts', 'new.ts']);
});

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

test('prDiff + findViolations catch a deleted test in a real repository', () => {
  const dir = mkdtempSync(join(tmpdir(), 'test-integrity-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    git(dir, 'config', 'user.email', 'ci@example.com');
    git(dir, 'config', 'user.name', 'ci');
    mkdirSync(join(dir, 'app'), { recursive: true });
    writeFileSync(join(dir, 'app/a.test.ts'), 'expect(1).toBe(1);\n');
    writeFileSync(join(dir, 'app/pnpm-lock.yaml'), 'lockfileVersion: 9\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');
    const base = git(dir, 'rev-parse', 'HEAD');
    git(dir, 'rm', '-q', 'app/a.test.ts', 'app/pnpm-lock.yaml');
    git(dir, 'commit', '-q', '-m', 'drop');
    const files = parseDiff(prDiff(base, git(dir, 'rev-parse', 'HEAD'), dir));
    assert.deepEqual(files.map((f) => f.path), ['app/a.test.ts']);
    assert.deepEqual(findViolations(files), ['app/a.test.ts: deletes a test file']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
