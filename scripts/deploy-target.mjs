#!/usr/bin/env node
// Resolve what .github/workflows/deploy.yml deploys, and refuse anything CI
// did not pass.
//
// The deploy runs on `workflow_run` (a CI run on a dev/main push finished) or
// on `workflow_dispatch` from dev/main. Either way it deploys one exact commit:
// the CI run's head SHA, or the dispatched ref's SHA — never "whatever the
// branch tip is by the time a job starts". It then requires, via the GitHub
// API, that:
//   • the commit is still the branch tip — a slower CI run of an older commit
//     must not overwrite a newer deploy (the newer commit's own CI triggers
//     its deploy);
//   • a push-event CI run for that commit succeeded with its `CI gate` job
//     successful (a dispatch cannot deploy an ungated commit).
//
// Env: EVENT_NAME, REF, SHA (github.sha), WORKFLOW_RUN (toJSON of
// github.event.workflow_run, or empty), GITHUB_REPOSITORY, GITHUB_TOKEN.
// Outputs ($GITHUB_OUTPUT): deploy (true|false), target (dev|prod), branch, sha.

import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BRANCH_TARGETS = { dev: 'dev', main: 'prod' };
const GATE_JOB = 'CI gate';

/** Branch, SHA and target of this deploy, or throw when the event cannot deploy. */
export function resolveTarget({ event, ref, sha, workflowRun }) {
  let branch;
  if (event === 'workflow_run') {
    if (workflowRun?.event !== 'push' || workflowRun?.conclusion !== 'success') {
      throw new Error(`CI run was a ${workflowRun?.event} event ending ${workflowRun?.conclusion}; only successful pushes deploy`);
    }
    branch = workflowRun.head_branch;
    sha = workflowRun.head_sha;
  } else if (event === 'workflow_dispatch') {
    branch = ref?.replace(/^refs\/heads\//, '');
  } else {
    throw new Error(`deploy cannot run on ${event}`);
  }
  const target = Object.hasOwn(BRANCH_TARGETS, branch) && ref?.startsWith('refs/heads/') ? BRANCH_TARGETS[branch] : null;
  if (!target) throw new Error(`only dev and main deploy (got ${branch ?? ref})`);
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error(`not a commit SHA: ${sha}`);
  return { branch, sha, target };
}

/**
 * Id of a successful push-event CI run whose `CI gate` job succeeded, or null.
 * `runs` are CI runs for the SHA; `jobsOf(id)` resolves a run's jobs.
 */
export async function findGatedRun(runs, jobsOf) {
  for (const run of runs) {
    if (run.event !== 'push' || run.conclusion !== 'success') continue;
    const jobs = await jobsOf(run.id);
    if (jobs.some((j) => j.name === GATE_JOB && j.conclusion === 'success')) return run.id;
  }
  return null;
}

function githubApi(token, repo) {
  return async (path) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${path} → HTTP ${res.status}`);
    return res.json();
  };
}

function emit(values) {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`);
  console.log(lines.join('\n'));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

async function main() {
  const env = process.env;
  const { branch, sha, target } = resolveTarget({
    event: env.EVENT_NAME,
    ref: env.REF,
    sha: env.SHA,
    workflowRun: env.WORKFLOW_RUN ? JSON.parse(env.WORKFLOW_RUN) : null,
  });
  const api = githubApi(env.GITHUB_TOKEN, env.GITHUB_REPOSITORY);
  const tip = (await api(`/branches/${branch}`)).commit.sha;
  if (tip !== sha) {
    console.log(`::notice::${branch} has moved on to ${tip}; skipping ${sha} (the newer commit deploys after its own CI run).`);
    emit({ deploy: false, target, branch, sha });
    return;
  }
  const { workflow_runs: runs } = await api(`/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&per_page=20`);
  const runId = await findGatedRun(runs, async (id) => (await api(`/actions/runs/${id}/jobs?per_page=100`)).jobs);
  if (!runId) throw new Error(`no successful push CI run with a green "${GATE_JOB}" for ${sha}; refusing to deploy`);
  console.log(`CI gate passed for ${sha} in run ${runId}; deploying ${branch} → ${target}.`);
  emit({ deploy: true, target, branch, sha });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.log(`::error::${err.message}`);
    process.exit(1);
  });
}
