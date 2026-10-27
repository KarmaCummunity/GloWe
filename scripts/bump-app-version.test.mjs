import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, after } from 'node:test';
import {
  parseSemver,
  bumpPatch,
  formatSemver,
  bumpAppVersionFiles,
} from './bump-app-version.mjs';

describe('bump-app-version', () => {
  it('parses and bumps patch', () => {
    assert.equal(formatSemver(bumpPatch(parseSemver('1.2.9'))), '1.2.10');
  });

  it('rejects invalid VERSION', () => {
    assert.throws(() => parseSemver('1.2'), /Invalid semver/);
  });

  it('writes VERSION only', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-ver-'));
    after(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(root, 'VERSION'), '2.0.0\n');

    const plan = bumpAppVersionFiles(root);
    writeFileSync(plan.versionPath, plan.versionBody);

    assert.equal(plan.next, '2.0.1');
    assert.equal(readFileSync(plan.versionPath, 'utf8').trim(), '2.0.1');
  });
});
