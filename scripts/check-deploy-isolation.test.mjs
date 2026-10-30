// Unit tests for scripts/check-deploy-isolation.mjs. Run: node --test scripts/check-deploy-isolation.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDeployIsolation, checkWorkflow, triggers } from './check-deploy-isolation.mjs';

const wf = (on, body = '') => `name: x\non:\n${on}\njobs:\n  a:\n${body}`;

test('triggers reads block and inline forms, ignoring comment lines', () => {
  assert.deepEqual(triggers('on:\n  # note\n  push:\n    branches: [dev]\n\n  workflow_dispatch:\njobs:\n'), ['push', 'workflow_dispatch']);
  assert.deepEqual(triggers('on: [push, pull_request]\n'), ['push', 'pull_request']);
  assert.deepEqual(triggers('on: workflow_call\n'), ['workflow_call']);
});

test('the real workflows pass', () => {
  assert.deepEqual(checkDeployIsolation(), []);
});

test('deploy.yml may not gain a push trigger', () => {
  const errors = checkWorkflow('deploy.yml', wf('  workflow_run:\n  push:'));
  assert.deepEqual(errors, ['deploy.yml: may trigger only on workflow_run / workflow_dispatch (found push)']);
});

test('a stage may not trigger on its own beyond its allowed dispatch', () => {
  assert.match(checkWorkflow('deploy-web.yml', wf('  workflow_call:\n  workflow_dispatch:'))[0], /trigger workflow_dispatch is not allowed/);
  assert.deepEqual(checkWorkflow('deploy-db.yml', wf('  workflow_call:\n  workflow_dispatch:')), []);
  assert.match(checkWorkflow('deploy-db.yml', wf('  workflow_call:\n  push:'))[0], /trigger push is not allowed/);
});

test('no other workflow may reference a prod or templated environment', () => {
  const direct = wf('  push:', '    environment: supabase-prod\n');
  assert.match(checkWorkflow('sneaky.yml', direct)[0], /references a prod/);
  const templated = wf('  push:', '    environment: cloudflare-${{ github.ref_name }}\n');
  assert.match(checkWorkflow('sneaky.yml', templated)[0], /references a prod/);
  assert.deepEqual(checkWorkflow('seed.yml', wf('  push:', '    environment: supabase-dev\n')), []);
});

test('only deploy.yml may use the production approval environment', () => {
  const body = '    environment:\n      name: production\n';
  assert.deepEqual(checkWorkflow('deploy.yml', wf('  workflow_run:', body)), []);
  assert.match(checkWorkflow('deploy-web.yml', wf('  workflow_call:', body))[0], /only deploy\.yml may use the production approval/);
});

test('deploy commands are confined to their stage; comments do not count', () => {
  const errors = checkWorkflow('ci-backend.yml', wf('  workflow_call:', '    steps:\n      - run: supabase db push --linked\n'));
  assert.deepEqual(errors, ['ci-backend.yml: runs `supabase db push`, which only deploy-db.yml may run']);
  assert.deepEqual(checkWorkflow('ci-backend.yml', wf('  workflow_call:', '    # supabase functions deploy is in deploy-functions.yml\n')), []);
});
