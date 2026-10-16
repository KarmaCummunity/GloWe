#!/usr/bin/env node
/** #898 — guard: no OFFSET pagination in SQL migrations / infra adapters. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = [
  join(import.meta.dirname, '../../supabase/migrations'),
  join(import.meta.dirname, '../packages/infrastructure-supabase/src'),
];

const OFFSET_RE = /\bOFFSET\s+\$/i;

function walk(dir, out = []) {
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p, out);
      else if (/\.(sql|ts)$/.test(name)) out.push(p);
    }
  } catch {
    /* missing dir ok */
  }
  return out;
}

const hits = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (OFFSET_RE.test(line) && !line.includes('migration-safety: allow')) {
        hits.push(`${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}

if (hits.length) {
  console.error('OFFSET pagination found (use keyset cursors instead):');
  for (const h of hits) console.error(h);
  process.exit(1);
}
console.log('check-sql-no-offset: ok');
