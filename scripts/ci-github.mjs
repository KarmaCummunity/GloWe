// GitHub API helpers shared by the CI judge scripts (scripts/ci-gate.mjs and
// scripts/check-test-integrity.mjs). Like the judges, ci.yml runs this file
// from the BASE commit's copy, so a PR cannot change how owner approvals or
// earlier CI runs are read (D-195, INFRA-CI-2).
//
// Owner override rule: a judge that finds a gate-weakening change passes only
// when an owner listed in the base commit's .github/owners.json approved the
// PR's current head SHA, and that owner is not the PR author.
//
// Every API failure throws; callers turn that into a red gate (fail closed).

import { execFileSync } from 'node:child_process';

export const OWNERS_FILE = '.github/owners.json';

/** Events whose run belongs to one PR, so its reviews can carry an override. */
export const PR_EVENTS = new Set(['pull_request', 'pull_request_review']);

/** Review states that set a reviewer's verdict; COMMENTED and PENDING never do. */
const VERDICT_STATES = new Set(['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED']);

/** Parse the owners allowlist into lower-cased logins. Throws when malformed. */
export function parseOwners(raw) {
  const owners = JSON.parse(raw).owners;
  if (!Array.isArray(owners) || owners.some((o) => typeof o !== 'string' || o.trim() === '')) {
    throw new Error(`${OWNERS_FILE}: "owners" must be an array of GitHub logins`);
  }
  return owners.map((o) => o.trim().toLowerCase());
}

/**
 * Owners allowlist as committed at `ref` (the base commit). A base without the
 * file yields no owners, so no override is possible: the PR's own copy is
 * never trusted, or a PR could list its author as an owner.
 */
export function ownersAt(ref, cwd = process.cwd()) {
  let raw;
  try {
    raw = execFileSync('git', ['show', `${ref}:${OWNERS_FILE}`], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return [];
  }
  return parseOwners(raw);
}

/**
 * The owner login whose approval covers `headSha`, or null. `reviews` is the
 * chronological list from the reviews API. Only each reviewer's latest verdict
 * counts, so an owner who later requests changes (or whose approval was
 * dismissed) withdraws the override. The approval must be on the exact head
 * commit, by an allowlisted owner, and not by the PR author.
 */
export function ownerApproval({ reviews, owners, headSha, author }) {
  const allow = new Set(owners);
  const latest = new Map();
  for (const review of reviews) {
    const login = review.user?.login?.toLowerCase();
    if (login && VERDICT_STATES.has(review.state)) latest.set(login, review);
  }
  const authorLogin = author?.toLowerCase();
  for (const [login, review] of latest) {
    const approves = review.state === 'APPROVED' && review.commit_id === headSha;
    if (approves && allow.has(login) && login !== authorLogin) return login;
  }
  return null;
}

/** GET one REST resource; throws on any non-2xx answer. */
export async function githubGet(path, env = process.env) {
  const api = env.GITHUB_API_URL || 'https://api.github.com';
  const res = await fetch(`${api}${path}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub API GET ${path} answered HTTP ${res.status}`);
  return res.json();
}

/** GET every page (100 per page, at most 10 pages) of a list endpoint. */
export async function githubList(path, key, env = process.env) {
  const items = [];
  const sep = path.includes('?') ? '&' : '?';
  for (let page = 1; page <= 10; page += 1) {
    const body = await githubGet(`${path}${sep}per_page=100&page=${page}`, env);
    const batch = key ? body[key] : body;
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

/**
 * Look for an owner approval that overrides a gate-weakening change.
 * Returns { login } on success, or { login: null, why } explaining what is
 * missing. Inputs (env): EVENT_NAME, PR_NUMBER, PR_AUTHOR, HEAD_SHA,
 * GITHUB_REPOSITORY, GITHUB_TOKEN; `judgeRef` is the base commit.
 */
export async function findOwnerOverride(env, judgeRef, cwd = process.cwd()) {
  if (!PR_EVENTS.has(env.EVENT_NAME) || !env.PR_NUMBER) {
    return { login: null, why: `a ${env.EVENT_NAME} run has no PR review to carry an owner approval` };
  }
  const owners = ownersAt(judgeRef, cwd);
  if (owners.length === 0) return { login: null, why: `the base commit has no ${OWNERS_FILE}` };
  const reviews = await githubList(`/repos/${env.GITHUB_REPOSITORY}/pulls/${env.PR_NUMBER}/reviews`, null, env);
  const login = ownerApproval({ reviews, owners, headSha: env.HEAD_SHA, author: env.PR_AUTHOR });
  if (login) return { login };
  const list = owners.map((o) => `@${o}`).join(', ');
  return { login: null, why: `no approving review by ${list} on head ${env.HEAD_SHA} (the PR author cannot approve)` };
}

/** Conclusions that mean a lane did not pass, besides `cancelled`. */
const FAILED = new Set(['failure', 'timed_out', 'startup_failure', 'action_required', 'stale']);

/**
 * Fold the jobs of an earlier CI run into one result per lane, mirroring the
 * `needs.<lane>.result` values the gate judges. A lane's jobs are the caller
 * job itself (listed alone when it skipped) or `<lane> / <inner job>`. A job
 * that never completed counts as a failure; a lane with no job is `missing`.
 */
export function laneResults(jobs, lanes) {
  const results = {};
  for (const lane of lanes) {
    const own = jobs.filter((j) => j.name === lane || j.name.startsWith(`${lane} / `));
    const conclusions = own.map((j) => (j.status === 'completed' ? j.conclusion : 'incomplete'));
    if (own.length === 0) results[lane] = 'missing';
    else if (conclusions.some((c) => FAILED.has(c) || c === 'incomplete')) results[lane] = 'failure';
    else if (conclusions.includes('cancelled')) results[lane] = 'cancelled';
    else if (conclusions.every((c) => c === 'skipped')) results[lane] = 'skipped';
    else if (conclusions.every((c) => c === 'success' || c === 'skipped')) results[lane] = 'success';
    else results[lane] = 'failure';
  }
  return results;
}

/**
 * The newest `pull_request` run of ci.yml that belongs to PR `prNumber`, or
 * null. Runs of other PRs on the same SHA are ignored: their hygiene and
 * release lanes judged a different title, body or base.
 */
export function latestPullRequestRun(runs, prNumber) {
  const mine = runs.filter((r) => r.event === 'pull_request' && r.pull_requests?.some((p) => p.number === prNumber));
  mine.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
  return mine[0] ?? null;
}

/**
 * Lane results of the latest completed `pull_request` CI run for this PR's
 * head SHA, for a run started by a review event (which re-runs only the cheap
 * lanes). Throws — so the gate fails closed — when there is no such run or the
 * latest one has not finished (it will report its own gate).
 */
export async function reusedLaneResults(env, lanes) {
  const repo = env.GITHUB_REPOSITORY;
  const query = `event=pull_request&head_sha=${env.HEAD_SHA}&per_page=100`;
  const { workflow_runs: runs } = await githubGet(`/repos/${repo}/actions/workflows/ci.yml/runs?${query}`, env);
  const run = latestPullRequestRun(runs, Number(env.PR_NUMBER));
  if (!run) {
    throw new Error(`no pull_request CI run of PR #${env.PR_NUMBER} exists for head ${env.HEAD_SHA}; push a commit or re-run CI`);
  }
  if (run.status !== 'completed') {
    throw new Error(`the latest pull_request CI run (${run.html_url}) is still ${run.status}; its own CI gate decides`);
  }
  const jobs = await githubList(`/repos/${repo}/actions/runs/${run.id}/jobs?filter=latest`, 'jobs', env);
  return { run, results: laneResults(jobs, lanes) };
}
