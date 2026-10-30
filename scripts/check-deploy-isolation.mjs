#!/usr/bin/env node
// Guard: production can only be deployed through .github/workflows/deploy.yml
// (D-195, INFRA-CI-3), behind CI and the owner's one approval click.
//
// Agents edit workflows unsupervised; one push-triggered job with a prod
// environment or a deploy command would bypass both. So, for every workflow:
//   • deploy.yml triggers only on workflow_run / workflow_dispatch, and is the
//     only file that may use the `production` (approval) environment;
//   • the stage workflows (STAGES) are reusable: workflow_call only, plus a
//     manual dispatch where STAGES allows one;
//   • only deploy.yml and the stages may reference a prod environment
//     (supabase-prod, cloudflare-prod, or a templated supabase-/cloudflare-
//     name that could resolve to one);
//   • each deploy command appears only in its own stage.
// Regex over YAML text (no YAML dependency, like the other guards); full-line
// comments are ignored.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORCHESTRATOR = 'deploy.yml';

/** Stage workflow → triggers it may have besides workflow_call. */
export const STAGES = {
  'deploy-db.yml': ['workflow_dispatch'],
  'deploy-functions.yml': [],
  'deploy-web.yml': [],
  'deploy-smoke.yml': ['workflow_dispatch'],
  'deploy-rollback.yml': [],
  'deploy-tag.yml': [],
};

/** Deploy command → the only workflow allowed to run it. */
export const COMMANDS = [
  { re: /\bsupabase\s+db\s+push\b/, owner: 'deploy-db.yml', what: 'supabase db push' },
  { re: /\bsupabase\s+functions\s+deploy\b/, owner: 'deploy-functions.yml', what: 'supabase functions deploy' },
  { re: /\bpages\s+deploy\b/, owner: 'deploy-web.yml', what: 'wrangler pages deploy' },
];

const PROD_ENV = /\b(?:supabase|cloudflare)-(?:prod\b|\$\{\{)/;
const APPROVAL_ENV = /^\s+(?:environment|name):\s*['"]?production['"]?\s*$/m;

function stripComments(content) {
  return content.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
}

/** Trigger names under `on:` (block or inline form). */
export function triggers(content) {
  const inline = content.match(/^on:[ \t]*(\S.*)$/m);
  if (inline) return inline[1].replace(/[[\]]/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  const block = content.match(/^on:[ \t]*\n((?:(?: {2}.*)?\n)*)/m);
  return block ? [...block[1].matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1]) : [];
}

/** Violations for one workflow file. */
export function checkWorkflow(file, raw) {
  const content = stripComments(raw);
  const errors = [];
  const on = triggers(content);
  const isStage = Object.hasOwn(STAGES, file);
  if (file === ORCHESTRATOR) {
    const extra = on.filter((t) => !['workflow_run', 'workflow_dispatch'].includes(t));
    if (extra.length) errors.push(`${file}: may trigger only on workflow_run / workflow_dispatch (found ${extra.join(', ')})`);
  } else if (isStage) {
    const extra = on.filter((t) => t !== 'workflow_call' && !STAGES[file].includes(t));
    if (extra.length) errors.push(`${file}: deploy stages are reusable; trigger ${extra.join(', ')} is not allowed`);
  }
  if (file !== ORCHESTRATOR && APPROVAL_ENV.test(content)) {
    errors.push(`${file}: only ${ORCHESTRATOR} may use the production approval environment`);
  }
  if (file !== ORCHESTRATOR && !isStage && PROD_ENV.test(content)) {
    errors.push(`${file}: references a prod (or templated) Supabase/Cloudflare environment; deploy through ${ORCHESTRATOR}`);
  }
  for (const { re, owner, what } of COMMANDS) {
    if (file !== owner && re.test(content)) errors.push(`${file}: runs \`${what}\`, which only ${owner} may run`);
  }
  return errors;
}

export function checkDeployIsolation(root = DEFAULT_ROOT) {
  const dir = join(root, '.github/workflows');
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  const errors = files.flatMap((f) => checkWorkflow(f, readFileSync(join(dir, f), 'utf8')));
  for (const required of [ORCHESTRATOR, ...Object.keys(STAGES)]) {
    if (!files.includes(required)) errors.push(`.github/workflows/${required} is missing`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkDeployIsolation();
  for (const e of errors) console.error(`  • ${e}`);
  if (errors.length) {
    console.error('✗ Deploy isolation guard failed: production deploys must go through deploy.yml.');
    process.exit(1);
  }
  console.log('✓ Deploy isolation guard passed — deploys run only through deploy.yml and its stages.');
}
