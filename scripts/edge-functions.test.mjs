// Unit tests for scripts/edge-functions.mjs. Run: node --test scripts/edge-functions.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LOCAL_ONLY, listDeployableFunctions } from './edge-functions.mjs';

function makeFunctionsDir(layout) {
  const dir = mkdtempSync(join(tmpdir(), 'edge-fns-'));
  for (const [name, files] of Object.entries(layout)) {
    mkdirSync(join(dir, name));
    for (const f of files) writeFileSync(join(dir, name, f), '');
  }
  return dir;
}

test('lists function directories with an index.ts, sorted', () => {
  const dir = makeFunctionsDir({ translate: ['index.ts'], 'delete-account': ['index.ts', 'deno.json'] });
  try {
    assert.deepEqual(listDeployableFunctions(dir), ['delete-account', 'translate']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('skips shared code, local-only functions and directories without an entry point', () => {
  const dir = makeFunctionsDir({ _shared: ['cors.ts'], 'mock-login': ['index.ts'], drafts: ['notes.md'], translate: ['index.ts'] });
  try {
    assert.deepEqual(listDeployableFunctions(dir), ['translate']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the real tree deploys every function except the local-only ones', () => {
  const names = listDeployableFunctions();
  assert.ok(names.length > 0);
  for (const local of LOCAL_ONLY) assert.ok(!names.includes(local), `${local} must not deploy`);
});
