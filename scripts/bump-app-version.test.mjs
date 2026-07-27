import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, after } from 'node:test';
import {
  parseSemver,
  bumpPatch,
  formatSemver,
  bumpAppVersionFiles,
  stampGloweVersionFiles,
  gloweVersionSource,
} from './bump-app-version.mjs';

describe('bump-app-version', () => {
  it('parses and bumps patch', () => {
    assert.equal(formatSemver(bumpPatch(parseSemver('1.2.9'))), '1.2.10');
  });

  it('rejects invalid VERSION', () => {
    assert.throws(() => parseSemver('1.2'), /Invalid semver/);
  });

  it('writes VERSION and glowe-version.js', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-ver-'));
    after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, 'apps', 'glowe-web', 'js'), { recursive: true });
    writeFileSync(join(root, 'VERSION'), '2.0.0\n');
    writeFileSync(join(root, 'apps', 'glowe-web', 'js', 'glowe-version.js'), gloweVersionSource('2.0.0'));

    const plan = bumpAppVersionFiles(root);
    writeFileSync(plan.versionPath, plan.versionBody);
    writeFileSync(plan.glowePath, plan.gloweBody);

    assert.equal(plan.next, '2.0.1');
    assert.equal(readFileSync(plan.versionPath, 'utf8').trim(), '2.0.1');
    assert.match(readFileSync(plan.glowePath, 'utf8'), /version: '2\.0\.1'/);
  });

  it('stamps glowe-version.js from VERSION without bumping', () => {
    const root = mkdtempSync(join(tmpdir(), 'kc-stamp-'));
    after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, 'apps', 'glowe-web', 'js'), { recursive: true });
    writeFileSync(join(root, 'VERSION'), '3.1.4\n');
    writeFileSync(join(root, 'apps', 'glowe-web', 'js', 'glowe-version.js'), gloweVersionSource('9.9.9'));

    const plan = stampGloweVersionFiles(root);
    writeFileSync(plan.glowePath, plan.gloweBody, 'utf8');

    assert.equal(plan.version, '3.1.4');
    assert.match(readFileSync(plan.glowePath, 'utf8'), /version: '3\.1\.4'/);
  });
});
