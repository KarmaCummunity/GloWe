#!/usr/bin/env node
// Test-integrity guard (INFRA-CI-2, D-195): a PR may freely ADD tests, but a
// change that could weaken the test gate needs the owner's approval.
//
// It fails a PR or merge-group diff (merge-base of base → head) that:
//   • deletes an existing test file, or renames one to a non-test path;
//   • adds a skip / focus / todo marker or `@ts-nocheck` to a test file, or a
//     "pass with no tests" switch anywhere outside Markdown;
//   • lowers or drops a coverage threshold in a vitest config;
//   • raises or drops an ESLint `--max-warnings` limit;
//   • removes assertions net: assertions removed from existing test files
//     outweigh assertions added to test files anywhere in the diff (so moving
//     tests into a new file is fine).
//
// Override: an owner listed in the base commit's .github/owners.json approves
// the PR's current head SHA (and is not its author). The static lane runs this
// file from the base commit (like the CI judges), and `CI gate` re-runs the
// static lane when a review is submitted or dismissed.
//
// Pushes and dispatches are not judged: their commits already passed a PR.
//
// Inputs (env): EVENT_NAME, BASE_SHA, HEAD_SHA, JUDGE_REF, PR_NUMBER,
// PR_AUTHOR, GITHUB_REPOSITORY, GITHUB_TOKEN.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findOwnerOverride } from './ci-github.mjs';

const TEST_PATHS = [/\.(test|spec)\.[^/]+$/, /(^|\/)__tests__\//, /^supabase\/tests\/.+\.sql$/, /^tests\/e2e\//];

/** Whether `path` is a test file this guard protects. */
export const isTest = (path) => TEST_PATHS.some((re) => re.test(path));

const isSqlTest = (path) => path.endsWith('.sql');

/** Markers that silence or narrow a JS/TS test run when added to a test file. */
const JS_MARKERS = [
  { re: /\.(skip|skipIf|only|todo|fixme)\s*\(/, why: 'skip / focus / todo marker' },
  { re: /\b(xit|xdescribe|xtest)\s*\(/, why: 'disabled test (x-prefix)' },
  { re: /@ts-nocheck/, why: '@ts-nocheck in a test' },
];

/** pgTAP markers that skip or defer SQL assertions. */
const SQL_MARKERS = [{ re: /\b(skip|todo|todo_start)\s*\(/i, why: 'pgTAP skip / todo' }];

/** Lets a test command pass when it finds no tests at all (CLI flag or config key). */
const NO_TESTS_SWITCH = /pass-?with-?no-?tests/i;

const VITEST_CONFIG = /(^|\/)vitest\.(config|workspace)\.[^/]+$/;
const THRESHOLD = /\b(lines|functions|branches|statements)\s*:\s*(\d+(?:\.\d+)?)/g;
const MAX_WARNINGS = /--max-warnings(?:=|\s+)(\d+)/g;

const JS_ASSERTION = /\b(?:expect|assert)\b(?:\.\w+)*\s*\(/g;
const SQL_ASSERTION = /\bassert\b|\braise\s+exception\b|\b(?:ok|is|isnt|throws_ok|lives_ok|results_eq|set_eq|bag_eq|is_empty)\s*\(/gi;

/** Count assertions in `lines` of a test file at `path`. */
export function countAssertions(path, lines) {
  const re = isSqlTest(path) ? SQL_ASSERTION : JS_ASSERTION;
  return lines.reduce((n, line) => n + (line.match(re)?.length ?? 0), 0);
}

/** Numbers captured by `re` in `lines`, grouped by key ('' when the regex has one group). */
function numbersByKey(lines, re) {
  const byKey = new Map();
  for (const line of lines) {
    for (const m of line.matchAll(re)) {
      const [key, value] = m.length > 2 ? [m[1], m[2]] : ['', m[1]];
      byKey.set(key, [...(byKey.get(key) ?? []), Number(value)].sort((a, b) => a - b));
    }
  }
  return byKey;
}

/**
 * Compare a limit's values on removed vs added lines of one file. `weaker(old,
 * new)` says whether the new value loosens the gate. A value removed without a
 * replacement also loosens it (the limit is gone).
 */
function loosenedLimits(file, re, weaker, label) {
  const removed = numbersByKey(file.removed, re);
  const added = numbersByKey(file.added, re);
  const out = [];
  for (const [key, olds] of removed) {
    const news = added.get(key) ?? [];
    const name = key ? `${label} "${key}"` : label;
    if (news.length < olds.length) out.push(`${file.path}: drops ${name} (${olds.join(', ')})`);
    else if (olds.some((v, i) => weaker(v, news[i]))) out.push(`${file.path}: loosens ${name} ${olds.join(', ')} → ${news.join(', ')}`);
  }
  return out;
}

/** Added lines of `file` matching any marker, as violations. */
function markerHits(file, markers) {
  const out = [];
  for (const line of file.added) {
    const hit = markers.find((m) => m.re.test(line));
    if (hit) out.push(`${file.path}: adds ${hit.why}: \`${line.trim().slice(0, 120)}\``);
  }
  return out;
}

/**
 * Every gate-weakening change in a parsed diff (see parseDiff). Pure: the
 * caller decides whether an owner approval overrides them.
 */
export function findViolations(files) {
  const out = [];
  let removedAssertions = 0;
  let addedAssertions = 0;
  const losers = [];
  for (const file of files) {
    const wasTest = file.oldPath !== null && isTest(file.oldPath);
    const isTestNow = file.newPath !== null && isTest(file.newPath);
    if (wasTest && file.newPath === null) out.push(`${file.oldPath}: deletes a test file`);
    if (wasTest && file.newPath !== null && !isTestNow) out.push(`${file.oldPath}: renamed to non-test path ${file.newPath}`);
    if (isTestNow) out.push(...markerHits(file, isSqlTest(file.path) ? SQL_MARKERS : JS_MARKERS));
    if (!file.path.endsWith('.md')) out.push(...markerHits(file, [{ re: NO_TESTS_SWITCH, why: 'a switch that passes when no tests exist' }]));
    if (VITEST_CONFIG.test(file.path)) out.push(...loosenedLimits(file, THRESHOLD, (o, n) => n < o, 'coverage threshold'));
    out.push(...loosenedLimits(file, MAX_WARNINGS, (o, n) => n > o, '--max-warnings'));
    if (isTestNow) addedAssertions += countAssertions(file.path, file.added);
    if (wasTest && isTestNow) {
      const lost = countAssertions(file.path, file.removed);
      removedAssertions += lost;
      if (lost > countAssertions(file.path, file.added)) losers.push(file.path);
    }
  }
  if (removedAssertions > addedAssertions) {
    out.push(`removes ${removedAssertions - addedAssertions} assertion(s) net from existing tests (${removedAssertions} removed, ${addedAssertions} added; files: ${losers.join(', ')})`);
  }
  return out;
}

/**
 * Parse `git diff -U0 -M` output into { oldPath, newPath, path, added, removed }
 * per file (oldPath null = added file, newPath null = deleted file; `path` is
 * the surviving name). Header lines are read only before a file's first hunk,
 * so a removed SQL comment (`--- x`) is content, not a header.
 */
export function parseDiff(text) {
  const files = [];
  let file = null;
  let inHunk = false;
  for (const line of text.split('\n')) {
    const head = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (head) {
      file = { oldPath: head[1], newPath: head[2], added: [], removed: [] };
      files.push(file);
      inHunk = false;
    } else if (!file) {
      continue;
    } else if (line.startsWith('@@')) {
      inHunk = true;
    } else if (inHunk && line.startsWith('+')) {
      file.added.push(line.slice(1));
    } else if (inHunk && line.startsWith('-')) {
      file.removed.push(line.slice(1));
    } else if (!inHunk) {
      readHeader(file, line);
    }
  }
  for (const f of files) f.path = f.newPath ?? f.oldPath;
  return files;
}

/** Apply one extended-header line of `git diff` to `file`. */
function readHeader(file, line) {
  if (line.startsWith('new file mode')) file.oldPath = null;
  else if (line.startsWith('deleted file mode')) file.newPath = null;
  else if (line.startsWith('rename from ')) file.oldPath = line.slice('rename from '.length);
  else if (line.startsWith('rename to ')) file.newPath = line.slice('rename to '.length);
}

/** The PR diff from the merge-base of `base` and `head`, lockfiles excluded. */
export function prDiff(base, head, cwd = process.cwd()) {
  const args = ['-c', 'core.quotePath=false', 'diff', '--no-color', '--no-ext-diff', '--no-textconv', '-U0', '-M'];
  const pathspec = ['--', '.', ':(exclude)**/pnpm-lock.yaml', ':(exclude)**/package-lock.json'];
  return execFileSync('git', [...args, `${base}...${head}`, ...pathspec], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main() {
  const env = process.env;
  if (!['pull_request', 'pull_request_review', 'merge_group'].includes(env.EVENT_NAME)) {
    console.log(`Test integrity: a ${env.EVENT_NAME} run is not a PR diff; nothing to judge.`);
    return;
  }
  const violations = findViolations(parseDiff(prDiff(env.BASE_SHA, env.HEAD_SHA)));
  if (violations.length === 0) {
    console.log('Test integrity: no deleted tests, skip/focus markers, loosened limits or lost assertions.');
    return;
  }
  const override = await findOwnerOverride(env, env.JUDGE_REF);
  if (override.login) {
    for (const v of violations) console.log(`::notice::${v} — accepted: @${override.login} approved head ${env.HEAD_SHA}`);
    return;
  }
  for (const v of violations) console.log(`::error::Test integrity: ${v}`);
  console.log(
    `::error::This change can weaken the test gate, so it needs an owner's approval: ${override.why}. ` +
      'Either restore the tests / limits, or ask an owner to approve this exact head SHA (a new push dismisses it); ' +
      'the approval re-runs CI and turns the gate green.',
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
