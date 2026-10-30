// Binds a finished run of ci.yml to the change it judged (INFRA-CI-2).
//
// A check run attaches to a commit SHA, not to a PR. Any workflow on any
// branch can post a check named `CI gate` on a commit, e.g. a PR from that
// commit into an unprotected branch whose own ci.yml exits 0. So neither the
// trusted verdict (scripts/ci-verdict.mjs) nor a review-triggered gate that
// reuses lane results may trust a run until it is proven to be:
//   • a run of this repository's .github/workflows/ci.yml, on a same-repo head;
//   • for PR events: a run of PR #N's merge ref (refs/pull/N/merge, read from
//     the run's local reusable-workflow references, which GitHub records), PR
//     #N targets dev or main of this repository, the merge commit's second
//     parent is the run's head SHA, and its first parent is already part of
//     that base branch with no gate file (.github/**, scripts/ci-*,
//     scripts/check-*) changed on the base since — so the workflow and judges
//     that ran are the base branch's own;
//   • for merge groups: a queue branch of dev or main; for pushes and
//     dispatches: dev or main itself (rulesets allow no direct pushes there).
// Every failure is reported as a reason; callers fail closed.

import { githubGet, githubList, laneResults } from './ci-github.mjs';

export const CI_PATH = '.github/workflows/ci.yml';
export const PROTECTED = new Set(['dev', 'main']);
const PR_EVENTS = new Set(['pull_request', 'pull_request_review']);
const GATE_FILES = [/^\.github\//, /^scripts\/ci-/, /^scripts\/check-/];
const QUEUE_BRANCH = /^gh-readonly-queue\/(dev|main)\//;

/** Reasons a run's own fields rule it out (empty = plausible). Pure. */
export function runShapeErrors(run, repo) {
  const errors = [];
  const same = (name) => name?.toLowerCase() === repo.toLowerCase();
  if (run.path !== CI_PATH) errors.push(`workflow file is ${run.path}, not ${CI_PATH}`);
  if (!same(run.repository?.full_name)) errors.push('run belongs to another repository');
  if (!same(run.head_repository?.full_name)) errors.push('run head is not a branch of this repository (fork)');
  if (run.status !== 'completed') errors.push(`run is ${run.status}, not completed`);
  if (PR_EVENTS.has(run.event)) return errors;
  if (run.event === 'merge_group' && !QUEUE_BRANCH.test(run.head_branch ?? '')) {
    errors.push(`merge group branch ${run.head_branch} is not a dev/main queue branch`);
  } else if (['push', 'workflow_dispatch'].includes(run.event) && !PROTECTED.has(run.head_branch)) {
    errors.push(`${run.event} run on ${run.head_branch}, not dev or main`);
  } else if (!['merge_group', 'push', 'workflow_dispatch'].includes(run.event)) {
    errors.push(`event ${run.event} is not judged`);
  }
  return errors;
}

/**
 * The merge commit and PR number a PR-event run executed, from its local
 * reusable-workflow references (`<repo>/.github/workflows/x.yml@refs/pull/N/merge`),
 * or null when they are absent or disagree. Pure.
 */
export function mergeRefOf(run, repo) {
  const prefix = `${repo}/.github/workflows/`.toLowerCase();
  const local = (run.referenced_workflows ?? []).filter((w) => w.path?.toLowerCase().startsWith(prefix));
  if (local.length === 0) return null;
  if (new Set(local.map((w) => w.sha)).size !== 1 || new Set(local.map((w) => w.ref)).size !== 1) return null;
  const m = /^refs\/pull\/(\d+)\/merge$/.exec(local[0].ref ?? '');
  return m ? { sha: local[0].sha, pr: Number(m[1]) } : null;
}

/** Gate files among a compare's changed files. Pure. */
export function gateFilesChanged(files) {
  return files.map((f) => f.filename).filter((name) => GATE_FILES.some((re) => re.test(name)));
}

/**
 * Prove a completed PR-event run belongs to a PR into dev/main (see header).
 * `expect.pr` / `expect.baseRef` additionally pin the PR number and base.
 * Returns { errors, pr } — `pr` is the bound PR object when errors is empty.
 */
export async function bindPrRun(run, repo, env, expect = {}) {
  const merge = mergeRefOf(run, repo);
  if (!merge) return { errors: ['run records no single refs/pull/N/merge workflow reference'] };
  if (expect.pr !== undefined && merge.pr !== expect.pr) {
    return { errors: [`run judged PR #${merge.pr}, not PR #${expect.pr}`] };
  }
  const pr = await githubGet(`/repos/${repo}/pulls/${merge.pr}`, env);
  const errors = [];
  if (pr.base?.repo?.full_name?.toLowerCase() !== repo.toLowerCase()) errors.push(`PR #${merge.pr} targets another repository`);
  if (!PROTECTED.has(pr.base?.ref)) errors.push(`PR #${merge.pr} targets ${pr.base?.ref}, not dev or main`);
  if (expect.baseRef !== undefined && pr.base?.ref !== expect.baseRef) errors.push(`PR #${merge.pr} targets ${pr.base?.ref}, not ${expect.baseRef}`);
  if (errors.length) return { errors };
  const commit = await githubGet(`/repos/${repo}/commits/${merge.sha}`, env);
  const parents = commit.parents?.map((p) => p.sha) ?? [];
  if (parents.length !== 2 || parents[1] !== run.head_sha) {
    return { errors: [`merge commit ${merge.sha} does not merge head ${run.head_sha}`] };
  }
  const cmp = await githubGet(`/repos/${repo}/compare/${parents[0]}...${pr.base.ref}`, env);
  if (!['ahead', 'identical'].includes(cmp.status)) {
    return { errors: [`the run's base ${parents[0]} is not part of ${pr.base.ref} (${cmp.status})`] };
  }
  if ((cmp.files?.length ?? 0) >= 300) return { errors: [`${pr.base.ref} moved too far since the run to verify; re-run CI`] };
  const moved = gateFilesChanged(cmp.files ?? []);
  if (moved.length) return { errors: [`${pr.base.ref} changed gate files since the run (${moved.join(', ')}); re-run CI`] };
  return { errors: [], pr };
}

/**
 * The newest `pull_request` run that GitHub associates with PR `prNumber` on
 * base `baseRef`, or null. Only a candidate: `pull_requests` lists every open
 * PR whose head matches, so bindPrRun must still prove the run is this PR's.
 */
export function latestPullRequestRun(runs, prNumber, baseRef) {
  const mine = runs.filter(
    (r) => r.event === 'pull_request' && r.pull_requests?.some((p) => p.number === prNumber && p.base?.ref === baseRef),
  );
  mine.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
  return mine[0] ?? null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lane results of this PR's latest `pull_request` CI run for its head SHA, for
 * a run started by a review event (which re-runs only the cheap lanes). Waits
 * up to `waitMs` for a run still in progress, so this review run's verdict
 * lands after that run's. Throws — the gate fails closed — when there is no
 * such run, it never finishes in time, or it cannot be bound to this PR.
 * Inputs (env): GITHUB_REPOSITORY, HEAD_SHA, PR_NUMBER, BASE_REF, GITHUB_TOKEN.
 */
export async function reusedLaneResults(env, lanes, { waitMs = 12 * 60_000, pollMs = 20_000 } = {}) {
  const repo = env.GITHUB_REPOSITORY;
  const pr = Number(env.PR_NUMBER);
  const query = `event=pull_request&head_sha=${env.HEAD_SHA}&per_page=100`;
  const deadline = Date.now() + waitMs;
  for (;;) {
    const { workflow_runs: runs } = await githubGet(`/repos/${repo}/actions/workflows/ci.yml/runs?${query}`, env);
    const run = latestPullRequestRun(runs, pr, env.BASE_REF);
    if (!run) throw new Error(`no pull_request CI run of PR #${pr} into ${env.BASE_REF} exists for head ${env.HEAD_SHA}; push a commit or re-run CI`);
    if (run.status === 'completed') {
      const { errors } = await bindPrRun(run, repo, env, { pr, baseRef: env.BASE_REF });
      if (errors.length) throw new Error(`run ${run.html_url} cannot be reused: ${errors.join('; ')}`);
      const jobs = await githubList(`/repos/${repo}/actions/runs/${run.id}/jobs?filter=latest`, 'jobs', env);
      return { run, results: laneResults(jobs, lanes) };
    }
    if (Date.now() >= deadline) throw new Error(`the latest pull_request CI run (${run.html_url}) is still ${run.status}`);
    console.log(`Waiting for ${run.html_url} (${run.status}) to finish…`);
    await sleep(pollMs);
  }
}
