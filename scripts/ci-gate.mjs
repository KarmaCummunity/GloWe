#!/usr/bin/env node
// Verdict for the `CI gate` job in .github/workflows/ci.yml — the only
// required status check on `dev` and `main`.
//
// GitHub counts a skipped job as passing, so the gate cannot just mirror its
// needs. It fails closed. It fails when:
//   • the PR is a draft (CI did not run; `ready_for_review` re-triggers it, and
//     a green gate on the draft's head SHA would otherwise satisfy branch
//     protection before the real run reports);
//   • a manual dispatch ran on a ref other than dev/main (it would post a gate
//     verdict on a commit without the PR checks);
//   • the change detector failed or produced no plan;
//   • any needed job failed or was cancelled;
//   • a lane job is not in the plan, or a planned lane is missing from the
//     gate's `needs:`;
//   • a lane the plan marks as needed did not succeed (e.g. it was skipped).
// A lane may be skipped only when the plan explicitly marks it not needed.
//
// Inputs (env): NEEDS (toJSON(needs)), PLAN (JSON object lane → needed, from
// scripts/ci-changes.mjs), DRAFT ('true' | 'false'), EVENT_NAME, REF.

import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DISPATCH_REFS = new Set(['refs/heads/dev', 'refs/heads/main']);

// Lanes the change detector names only when needed (scripts/ci-changes.mjs
// OPTIONAL_LANES; this file runs standalone, so the list is repeated). Absent
// from the plan, such a lane is "not needed" and may only have been skipped.
const OPTIONAL_LANES = new Set(['release']);

/** Return the list of reasons the gate must fail (empty = pass). */
export function evaluateGate({ needs, plan, draft, event, ref }) {
  if (draft) {
    return ['Draft PR: CI does not run on drafts. Mark the PR ready for review to run the full gate.'];
  }
  if (event === 'workflow_dispatch' && !DISPATCH_REFS.has(ref)) {
    return [`Manual runs gate only dev or main (got ${ref}); open or update a PR to run CI on this commit.`];
  }
  const detector = needs.changes?.result;
  if (detector !== 'success') return [`change detector did not succeed (result: ${detector ?? 'missing'})`];
  if (!plan || typeof plan !== 'object' || Object.keys(plan).length === 0) {
    return ['change detector produced no lane plan'];
  }
  const errors = [];
  for (const [job, { result }] of Object.entries(needs)) {
    if (result === 'failure' || result === 'cancelled') errors.push(`job "${job}" ${result}`);
    else if (job !== 'changes' && typeof plan[job] !== 'boolean' && !(OPTIONAL_LANES.has(job) && result === 'skipped')) {
      errors.push(`job "${job}" is not in the change detector's plan`);
    }
  }
  for (const [job, needed] of Object.entries(plan)) {
    const result = needs[job]?.result;
    if (result === undefined) {
      errors.push(`job "${job}" is planned but missing from the gate's needs: list`);
    } else if (needed === true && result === 'skipped') {
      errors.push(`job "${job}" is needed for this change but was skipped`);
    } else if (needed === true && result !== 'success' && result !== 'failure' && result !== 'cancelled') {
      errors.push(`job "${job}" is needed for this change but ended ${result}`);
    }
  }
  return errors;
}

function parseJson(name, raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${name} is not valid JSON: ${raw}`);
  }
}

function main() {
  const env = process.env;
  const needs = parseJson('NEEDS', env.NEEDS) ?? {};
  const plan = parseJson('PLAN', env.PLAN);
  const errors = evaluateGate({ needs, plan, draft: env.DRAFT === 'true', event: env.EVENT_NAME, ref: env.REF });
  const rows = Object.entries(needs).map(
    ([job, { result }]) => `| ${job} | ${result} | ${job === 'changes' ? '-' : String(plan?.[job] ?? 'unplanned')} |`,
  );
  const summary = ['| Job | Result | Needed |', '| --- | --- | --- |', ...rows].join('\n');
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (errors.length) {
    for (const e of errors) console.log(`::error::${e}`);
    process.exit(1);
  }
  console.log('CI gate passed.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
