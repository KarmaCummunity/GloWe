// `/version.json` for the KC web export.
//
// The deploy smoke (scripts/smoke-deploy.mjs) and the release lane of CI poll
// this file to prove which commit a host is serving, so the SHA must be the
// commit that was built, never a guess. The deploy pipeline passes it
// explicitly in EXPO_PUBLIC_GIT_COMMIT_SHA (in a `workflow_run` deploy,
// GITHUB_SHA is the default branch tip, not the deployed commit); local and
// PR builds fall back to the checked-out HEAD.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FULL_SHA = /^[0-9a-f]{40}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** Read and validate `app/VERSION` (MAJOR.MINOR.PATCH). */
export function readAppVersion(versionPath) {
  const version = readFileSync(versionPath, 'utf8').trim();
  if (!SEMVER.test(version)) {
    throw new Error(`${versionPath} must hold MAJOR.MINOR.PATCH, got "${version}"`);
  }
  return version;
}

/** HEAD of the git checkout at `cwd`, or null outside a git checkout (e.g. the Docker build context). */
export function gitHead(cwd) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/**
 * The full commit SHA to stamp. An explicit EXPO_PUBLIC_GIT_COMMIT_SHA wins and
 * must be a full 40-hex SHA (a short or malformed value would never match the
 * smoke's expected SHA, so fail the build instead). Without it, use `head`;
 * 'unknown' only when neither exists.
 */
export function resolveBuildSha({ env, head }) {
  const explicit = env.EXPO_PUBLIC_GIT_COMMIT_SHA?.trim();
  if (explicit) {
    if (!FULL_SHA.test(explicit)) {
      throw new Error(`EXPO_PUBLIC_GIT_COMMIT_SHA must be a full 40-character SHA, got "${explicit}"`);
    }
    return explicit;
  }
  return head && FULL_SHA.test(head) ? head : 'unknown';
}

/** Body of `/version.json`. */
export function renderVersionFile({ version, sha, builtAt }) {
  return `${JSON.stringify({ version, sha, builtAt }, null, 2)}\n`;
}
