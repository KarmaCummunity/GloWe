import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkMigrationSafety,
  scanMigrationSql,
} from './check-migration-safety.mjs';

test('passes benign migration SQL', () => {
  const errors = scanMigrationSql(
    'ALTER TABLE posts ADD COLUMN IF NOT EXISTS foo text;\n',
    '0001.sql'
  );
  assert.deepEqual(errors, []);
});

test('flags DROP TABLE', () => {
  const errors = scanMigrationSql('DROP TABLE legacy_foo;\n', '0002.sql');
  assert.equal(errors.length, 1);
  assert.match(errors[0], /DROP TABLE/);
});

test('does not flag ALTER PUBLICATION ... DROP TABLE (non-destructive)', () => {
  const errors = scanMigrationSql(
    "execute 'alter publication supabase_realtime drop table public.messages';\n",
    '0004.sql'
  );
  assert.deepEqual(errors, []);
});

test('still flags a real DROP TABLE next to a publication change', () => {
  const errors = scanMigrationSql(
    'ALTER PUBLICATION supabase_realtime DROP TABLE a; DROP TABLE b;\n',
    '0005.sql'
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /DROP TABLE/);
});

test('does not flag dropping a pg_temp table', () => {
  const errors = scanMigrationSql('  drop table if exists pg_temp._find_match_ranked;\n', '0006.sql');
  assert.deepEqual(errors, []);
});

test('allows override marker on the same line', () => {
  const errors = scanMigrationSql(
    'DROP TABLE legacy_foo; -- migration-safety: allow phased removal\n',
    '0003.sql'
  );
  assert.deepEqual(errors, []);
});

test('checkMigrationSafety scans directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mig-safe-'));
  try {
    writeFileSync(join(dir, '0001_ok.sql'), 'SELECT 1;');
    writeFileSync(join(dir, '0002_bad.sql'), 'TRUNCATE users;');
    const result = checkMigrationSafety(dir);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /TRUNCATE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
