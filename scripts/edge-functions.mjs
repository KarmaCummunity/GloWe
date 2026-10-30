#!/usr/bin/env node
// The Edge Functions the deploy pipeline ships to a hosted Supabase project.
//
// One list for the deploy job (scripts/edge-functions.mjs prints it) and the
// smoke (which probes every name on it), so a function cannot be deployed
// without being checked or checked without being deployed. Every directory
// under supabase/functions with an index.ts is deployable, except shared code
// (`_*`) and LOCAL_ONLY functions, which must never exist on a hosted project.

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'functions');

/** mock-login mints sessions without OAuth for local E2E; it 404s on hosted projects but has no business there. */
export const LOCAL_ONLY = new Set(['mock-login']);

/** Sorted deployable function names under `dir`. */
export function listDeployableFunctions(dir = DEFAULT_DIR) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !LOCAL_ONLY.has(e.name))
    .filter((e) => existsSync(join(dir, e.name, 'index.ts')))
    .map((e) => e.name)
    .sort();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const names = listDeployableFunctions(process.argv[2]);
  if (names.length === 0) {
    console.error('::error::no deployable Edge Functions found');
    process.exit(1);
  }
  console.log(names.join(' '));
}
