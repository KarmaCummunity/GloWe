#!/usr/bin/env node
// Picks the commit the nightly mobile pipeline (.github/workflows/mobile-nightly.yml)
// builds and decides whether it needs to build at all (D-195 tier 2, INFRA-CI-4).
//
// The candidate is the newest commit on BRANCH whose `CI` workflow push run
// concluded success. That exact SHA is built, never the branch tip, so a red or
// still-running tip never reaches testers. The build is skipped when the
// candidate is the commit the marker tag (MARKER_TAG) already points at, which
// the pipeline moves only after both store submissions succeeded — unless FORCE.
//
// Inputs (env): GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_API_URL (optional),
// BRANCH (default dev), LOOKBACK (commits to scan, default 30), FORCE ('true'),
// MARKER_TAG (default mobile-nightly/last).
// Outputs (GITHUB_OUTPUT): sha, version, build ('true' | 'false'), last_sha.

import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Return the first SHA in `commitShas` (newest first) that has a green CI push run. */
export function pickGreenSha(commitShas, greenShas) {
  const green = new Set(greenShas);
  return commitShas.find((sha) => green.has(sha)) ?? null;
}

/** Decide whether tonight's candidate must be built. */
export function planNightly({ greenSha, lastSha, force }) {
  if (!greenSha) throw new Error('planNightly needs a green SHA');
  if (force) return { build: true, reason: 'forced by the `force` input' };
  if (greenSha === lastSha) return { build: false, reason: `${greenSha} is already the last nightly build` };
  return { build: true, reason: lastSha ? `new green commit since ${lastSha}` : 'no previous nightly build' };
}

/** Validate the `MAJOR.MINOR.PATCH` content of app/VERSION. */
export function parseVersion(text) {
  const version = String(text).trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`app/VERSION is not MAJOR.MINOR.PATCH: "${version}"`);
  return version;
}

/** Read the commit a lightweight tag points at from a git/ref API response (null when absent). */
export function markerSha(ref) {
  if (!ref) return null;
  if (ref.object?.type !== 'commit') {
    throw new Error(`marker tag must be a lightweight tag on a commit (got ${ref.object?.type ?? 'nothing'})`);
  }
  return ref.object.sha;
}

/** GET a GitHub REST path; resolves to null on 404 when `allow404` is set. */
async function api(path, { raw = false, allow404 = false } = {}) {
  const base = process.env.GITHUB_API_URL || 'https://api.github.com';
  const res = await fetch(`${base}${path}`, {
    headers: {
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}: ${await res.text()}`);
  return raw ? res.text() : res.json();
}

function writeOutputs(outputs) {
  const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`);
  console.log(lines.join('\n'));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

function writeSummary(markdown) {
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

async function main() {
  const env = process.env;
  const repo = env.GITHUB_REPOSITORY;
  const branch = env.BRANCH || 'dev';
  const lookback = Number(env.LOOKBACK || 30);
  const marker = env.MARKER_TAG || 'mobile-nightly/last';

  const commits = await api(`/repos/${repo}/commits?sha=${branch}&per_page=${lookback}`);
  // `status=success` filters on the run conclusion; 100 runs cover the lookback window.
  const runs = await api(`/repos/${repo}/actions/workflows/ci.yml/runs?branch=${branch}&event=push&status=success&per_page=100`);
  const greenSha = pickGreenSha(
    commits.map((c) => c.sha),
    runs.workflow_runs.map((r) => r.head_sha),
  );
  if (!greenSha) {
    console.log(`::error::No commit among the last ${lookback} on ${branch} has a successful CI push run.`);
    process.exit(1);
  }
  const lastSha = markerSha(await api(`/repos/${repo}/git/ref/tags/${marker}`, { allow404: true }));
  const plan = planNightly({ greenSha, lastSha, force: env.FORCE === 'true' });
  const version = parseVersion(await api(`/repos/${repo}/contents/app/VERSION?ref=${greenSha}`, { raw: true }));

  writeOutputs({ sha: greenSha, version, build: String(plan.build), last_sha: lastSha ?? '' });
  writeSummary(
    [
      `### Mobile nightly — ${plan.build ? 'building' : 'nothing to build'}`,
      '',
      `- Green ${branch} commit: \`${greenSha}\` (version ${version})`,
      `- Last nightly build: ${lastSha ? `\`${lastSha}\`` : 'none'}`,
      `- Decision: ${plan.reason}`,
    ].join('\n'),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.log(`::error::${err.message}`);
    process.exit(1);
  });
}
