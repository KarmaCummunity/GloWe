#!/usr/bin/env node
// Change detector for .github/workflows/ci.yml (the single `CI gate` check).
//
// Decides, for every lane job in ci.yml, whether this change needs it. The
// rules lean conservative on purpose: CI is the only review this repo gets, so
// a path that no lane claims and that is not provably inert turns every heavy
// lane on instead of slipping through untested.
//
// Inputs (env): EVENT_NAME, DRAFT, ACTOR, REF, BASE_SHA, HEAD_SHA.
// Outputs ($GITHUB_OUTPUT): draft, one true/false flag per lane job, sonar,
// and plan — a JSON object mapping every lane job id to whether it is needed.
// scripts/ci-gate.mjs requires the plan to name every lane explicitly.

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// CI plumbing and the Node pin can break any lane, so they trigger all of them.
const SHARED = [/^\.github\//, /^\.nvmrc$/];

export const LANE_RULES = {
  frontend: [/^app\//, /^scripts\//, /^Dockerfile$/, /^sonar-project\.properties$/, ...SHARED],
  // DB validation also installs the app workspace (sqlProbes), so lockfile and
  // workspace manifests count. Edge Functions are excluded: the local stack
  // starts without the edge runtime.
  backend: [
    /^supabase\/(?!functions\/)/,
    /^app\/packages\/infrastructure-supabase\//,
    /^app\/(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/,
    /^scripts\//,
    ...SHARED,
  ],
  edge: [/^supabase\//, ...SHARED],
};

// Paths that cannot change any build, test or runtime behaviour.
export const INERT = [
  /^docs\//,
  /\.md$/,
  /^\.claude\//,
  /^\.cursor\//,
  /^PRD_V2_NOT_FOR_MVP\//,
  /^LICENSE$/,
];

const LANES = Object.keys(LANE_RULES);

/** Every lane job id in ci.yml; the gate and the drift guard key on this list. */
export const LANE_JOBS = ['hygiene', 'static', ...LANES];

/** Map changed paths to the heavy lanes they need. */
export function classify(files) {
  const lanes = Object.fromEntries(LANES.map((l) => [l, false]));
  for (const file of files) {
    const hits = LANES.filter((l) => LANE_RULES[l].some((re) => re.test(file)));
    if (hits.length === 0 && !INERT.some((re) => re.test(file))) {
      for (const l of LANES) lanes[l] = true;
    }
    for (const l of hits) lanes[l] = true;
  }
  return lanes;
}

/**
 * Build the CI plan. `files` is null when the diff could not be computed;
 * that (like a manual dispatch) runs every lane.
 */
export function plan({ event, draft, actor, ref, files }) {
  const isPr = event === 'pull_request';
  if (isPr && draft) {
    return { draft: true, sonar: false, plan: Object.fromEntries(LANE_JOBS.map((j) => [j, false])) };
  }
  const allLanes = files === null || !['pull_request', 'merge_group', 'push'].includes(event);
  const lanes = allLanes ? Object.fromEntries(LANES.map((l) => [l, true])) : classify(files);
  // SonarCloud's free plan analyses PRs and `main` only, and Dependabot-triggered
  // runs get no secrets, so the scan cannot run for them.
  const sonarTarget = (isPr && actor !== 'dependabot[bot]') || (!isPr && event !== 'merge_group' && ref === 'refs/heads/main');
  return {
    draft: false,
    sonar: lanes.frontend && sonarTarget,
    plan: { hygiene: isPr, static: true, ...lanes },
  };
}

const ZERO_SHA = /^0+$/;

/**
 * Paths changed between the merge-base of `base` and `head`, or null when
 * unknown. `--no-renames` lists both sides of a move, so moving code into an
 * inert path (e.g. app/x.ts → docs/x.md) still triggers the code's lane; it
 * also avoids content reads that would lazily fetch blobs in a blobless clone.
 */
export function changedFiles(base, head, cwd = process.cwd()) {
  if (!base || !head || ZERO_SHA.test(base)) return null;
  try {
    const out = execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...${head}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.split('\n').filter(Boolean);
  } catch (err) {
    console.log(`::warning::git diff ${base}...${head} failed (${err.message.split('\n')[0]}) — running every lane`);
    return null;
  }
}

function main() {
  const env = process.env;
  const files = changedFiles(env.BASE_SHA, env.HEAD_SHA);
  const result = plan({
    event: env.EVENT_NAME,
    draft: env.DRAFT === 'true',
    actor: env.ACTOR,
    ref: env.REF,
    files,
  });
  const lines = [
    `draft=${result.draft}`,
    `sonar=${result.sonar}`,
    ...LANE_JOBS.map((job) => `${job}=${result.plan[job]}`),
    `plan=${JSON.stringify(result.plan)}`,
  ];
  console.log(`changed files: ${files === null ? 'unknown (all lanes)' : files.length}`);
  console.log(lines.join('\n'));
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
