#!/usr/bin/env node
// The one place store builds (testflight-ios.yml, play-internal.yml) get their
// Supabase backend from (D-195 "Mobile nightly").
//
// Both workflows run in the `mobile-store` GitHub Environment, which names the
// backend explicitly: MOBILE_SUPABASE_TARGET (`prod` | `dev`) picks the project
// and MOBILE_SUPABASE_ANON_KEY is that project's publishable key. This script
// writes them into the eas.json build profile `env` on the runner only (never
// committed). eas-cli gives a profile's `env` precedence over the EAS server
// environment for cloud (Android) and local (iOS) builds alike, so both
// platforms bake the same backend whatever the EAS dashboard holds.
//
// Inputs (env): MOBILE_SUPABASE_TARGET, MOBILE_SUPABASE_ANON_KEY,
// EAS_JSON (default app/apps/mobile/eas.json), EAS_PROFILE (default production).
// Outputs (GITHUB_OUTPUT): target, ref.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Supabase project refs per target, as listed in docs/SSOT/ENVIRONMENTS.md. */
export const SUPABASE_REFS = Object.freeze({
  prod: 'kdqtbdbzwvlugkhonexg',
  dev: 'enbqriuxvvuontiwslun',
});

/** Decode a JWT payload, or return null when the key is not a JWT. */
function jwtPayload(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Check that the key is a client-safe key of project `ref`. Legacy anon keys
 * are JWTs carrying `ref` and `role`; new `sb_publishable_` keys carry neither,
 * so only their prefix can be checked. A service-role or secret key fails.
 */
export function checkAnonKey(key, ref) {
  if (key.startsWith('sb_publishable_')) return [];
  if (key.startsWith('sb_secret_')) return ['MOBILE_SUPABASE_ANON_KEY is a secret key; use the publishable (anon) key'];
  const payload = jwtPayload(key);
  if (!payload) return ['MOBILE_SUPABASE_ANON_KEY is neither an sb_publishable_ key nor a Supabase JWT'];
  const errors = [];
  if (payload.role !== 'anon') errors.push(`MOBILE_SUPABASE_ANON_KEY has role "${payload.role}"; use the anon key`);
  if (payload.ref !== ref) errors.push(`MOBILE_SUPABASE_ANON_KEY belongs to project "${payload.ref}", not "${ref}"`);
  return errors;
}

/** Resolve the backend from the environment's inputs; `errors` is empty when usable. */
export function resolveStoreConfig({ target, anonKey }) {
  const ref = Object.hasOwn(SUPABASE_REFS, target) ? SUPABASE_REFS[target] : undefined;
  if (!ref) return { errors: [`MOBILE_SUPABASE_TARGET must be one of ${Object.keys(SUPABASE_REFS).join(', ')} (got "${target ?? ''}")`] };
  if (!anonKey) return { errors: ['MOBILE_SUPABASE_ANON_KEY is not set'] };
  return { ref, url: `https://${ref}.supabase.co`, errors: checkAnonKey(anonKey, ref) };
}

/** Return a copy of eas.json with `vars` merged into build.<profile>.env. */
export function injectProfileEnv(easJson, profile, vars) {
  const build = easJson.build?.[profile];
  if (!build) throw new Error(`eas.json has no build profile "${profile}"`);
  return {
    ...easJson,
    build: { ...easJson.build, [profile]: { ...build, env: { ...build.env, ...vars } } },
  };
}

function main() {
  const env = process.env;
  const easPath = env.EAS_JSON || 'app/apps/mobile/eas.json';
  const profile = env.EAS_PROFILE || 'production';
  const target = env.MOBILE_SUPABASE_TARGET?.trim();
  const anonKey = env.MOBILE_SUPABASE_ANON_KEY?.trim() ?? '';
  const config = resolveStoreConfig({ target, anonKey });
  if (config.errors.length) {
    for (const e of config.errors) console.log(`::error::${e}`);
    process.exit(1);
  }
  const easJson = JSON.parse(readFileSync(easPath, 'utf8'));
  const next = injectProfileEnv(easJson, profile, {
    EXPO_PUBLIC_SUPABASE_URL: config.url,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  });
  writeFileSync(easPath, `${JSON.stringify(next, null, 2)}\n`);

  const line = `Store build backend: Supabase **${target}** (\`${config.ref}\`, ${config.url}), eas.json profile "${profile}".`;
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `target=${target}\nref=${config.ref}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
