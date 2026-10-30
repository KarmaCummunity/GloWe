#!/usr/bin/env node
// Trusted CI verdict (INFRA-CI-2): posts the `CI verdict` check that the
// dev/main ruleset requires, from a dedicated GitHub App.
//
// Why: `CI gate` is an ordinary Actions job, and a check run attaches to a
// commit, not a PR. Any workflow an agent pushes on any branch can post a
// green `CI gate` on a commit (for example through a PR from that commit into
// an unprotected branch), and GitHub Actions is the source either way. Only
// .github/workflows/ci-verdict.yml — which runs from the default branch on
// `workflow_run` of CI, with App credentials held in the `ci-verdict`
// environment that only the default branch may use — can post `CI verdict`.
//
// For every completed CI run it posts one check on the run's head SHA:
// success only when the run is bound to a protected change
// (scripts/ci-run-binding.mjs), the run succeeded and its single `CI gate` job
// succeeded; failure otherwise, including on any API error.
//
// Inputs (env): RUN_ID, GITHUB_REPOSITORY, GITHUB_TOKEN (App installation
// token: checks write; actions, contents and pull requests read).

import { fileURLToPath } from 'node:url';
import { githubGet, githubList, githubPost } from './ci-github.mjs';
import { bindPrRun, runShapeErrors } from './ci-run-binding.mjs';

export const VERDICT_CHECK = 'CI verdict';
export const GATE_JOB = 'CI gate';

/** Reasons the run's gate job does not certify it (empty = it does). Pure. */
export function gateJobErrors(jobs) {
  const gates = jobs.filter((j) => j.name === GATE_JOB);
  if (gates.length !== 1) return [`run has ${gates.length} "${GATE_JOB}" jobs, expected exactly one`];
  const [gate] = gates;
  if (gate.status !== 'completed' || gate.conclusion !== 'success') {
    return [`"${GATE_JOB}" ended ${gate.conclusion ?? gate.status}`];
  }
  return [];
}

/** Every reason the run must not certify its head SHA (empty = green). */
export async function judgeRun(run, repo, env) {
  const errors = runShapeErrors(run, repo);
  if (errors.length) return errors;
  if (run.conclusion !== 'success') errors.push(`CI run concluded ${run.conclusion}`);
  if (['pull_request', 'pull_request_review'].includes(run.event)) {
    errors.push(...(await bindPrRun(run, repo, env)).errors);
  }
  const jobs = await githubList(`/repos/${repo}/actions/runs/${run.id}/jobs?filter=latest`, 'jobs', env);
  return [...errors, ...gateJobErrors(jobs)];
}

/** The check-run payload for a judged run. Pure. */
export function verdictCheck(run, errors) {
  const ok = errors.length === 0;
  const summary = ok
    ? `CI run ${run.html_url} (${run.event}) is bound to this commit and its \`${GATE_JOB}\` passed.`
    : ['The CI run for this commit cannot be trusted or did not pass:', ...errors.map((e) => `- ${e}`), '', `Run: ${run.html_url ?? 'unknown'}`].join('\n');
  return {
    name: VERDICT_CHECK,
    head_sha: run.head_sha,
    status: 'completed',
    conclusion: ok ? 'success' : 'failure',
    details_url: run.html_url,
    output: { title: ok ? 'CI passed' : 'CI not certified', summary },
  };
}

async function main() {
  const env = process.env;
  const repo = env.GITHUB_REPOSITORY;
  const run = await githubGet(`/repos/${repo}/actions/runs/${env.RUN_ID}`, env);
  let errors;
  try {
    errors = await judgeRun(run, repo, env);
  } catch (err) {
    errors = [`verification failed: ${err.message}`];
  }
  const check = verdictCheck(run, errors);
  await githubPost(`/repos/${repo}/check-runs`, check, env);
  console.log(`${VERDICT_CHECK} on ${run.head_sha}: ${check.conclusion}`);
  for (const e of errors) console.log(`::warning::${e}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
