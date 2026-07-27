// Shared helpers for the GloWe E2E suite (FR-GLOWE-*).
//
// The suite runs against either the deployed dev site (DEV_WEB_URL + /glowe)
// or a local static server (`npx serve app/apps/glowe-web -l 4321`). The
// backend is always the real Supabase dev project — its URL and publishable
// key are parsed straight from backend-config.js so they can never drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendConfigSource = fs.readFileSync(
  path.resolve(here, '../../../app/apps/glowe-web/js/backend-config.js'),
  'utf8',
);

function extract(name: string): string {
  const match = backendConfigSource.match(new RegExp(`${name}:\\s*'([^']+)'`));
  if (!match) throw new Error(`Could not parse ${name} from backend-config.js`);
  return match[1];
}

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extract('supabaseUrl');
export const SUPABASE_ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY ?? extract('supabaseAnonKey');

const devWebUrl = (process.env.DEV_WEB_URL ?? '').replace(/\/$/, '');
const stagingUrl = (process.env.GLOWE_STAGING_URL ?? '').replace(/\/$/, '');
const prodUrl = (process.env.GLOWE_PROD_URL ?? '').replace(/\/$/, '');

function firstGloweRoot(...candidates: string[]): string {
  for (const raw of candidates) {
    const trimmed = raw.trim().replace(/\/$/, '');
    if (trimmed) return trimmed;
  }
  return 'http://127.0.0.1:4321';
}

/** Resolve the GloWe site root for functional E2E (journeys + visual). */
export const GLOWE_BASE = firstGloweRoot(
  process.env.GLOWE_WEB_URL ?? '',
  stagingUrl,
  devWebUrl ? `${devWebUrl}/glowe` : '',
  prodUrl,
);
export const GLOWE_ORIGIN = new URL(GLOWE_BASE).origin;

export function gloweUrl(page: string): string {
  if (!page || page === '/' || page === 'index.html') return `${GLOWE_BASE}/index.html`;
  return `${GLOWE_BASE}/pages/${page}`;
}

// Seeded personas (scripts/seed-glowe-dev.mjs). The password is a dev-only
// fixture credential.
export const SEED_PASSWORD = process.env.GLOWE_SEED_PASSWORD ?? 'GloweSeed!2026';
export const PERSONAS = {
  michal: { email: 'glowe-user-michal@seed.karma-community-kc.com', name: 'מיכל רוזן', kind: 'individual' },
  yossi: { email: 'glowe-user-yossi@seed.karma-community-kc.com', name: 'יוסי מזרחי', kind: 'individual' },
  levpatuach: { email: 'glowe-org-levpatuach@seed.karma-community-kc.com', name: 'לב פתוח', kind: 'organization' },
  code4good: { email: 'glowe-org-code4good@seed.karma-community-kc.com', name: 'קוד למען הקהילה', kind: 'organization' },
} as const;

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
};

export async function signInWithPassword(email: string, password: string): Promise<SupabaseSession | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  if (!body.access_token) return null;
  return body as SupabaseSession;
}

/** Public profile row shape used by create-menu + auth UI (FR-GLOWE-016). */
export type GloweProfileSnapshot = {
  id: string;
  name: string;
  email?: string;
  accountType: 'individual' | 'organization' | null;
  approvalStatus: string;
  type?: string;
  avatarUrl?: string;
  orgName?: string;
};

/**
 * Load the signed-in persona's glowe_profiles row so storageState mirrors what
 * auth.js writes after fetchProfile() — without this, create-menu thinks every
 * seeded org is an individual (3 options instead of 4).
 */
export async function fetchPersonaProfile(session: SupabaseSession): Promise<GloweProfileSnapshot | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/glowe_profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,display_name,account_type,approval_status,avatar_url,profile_type,org_name`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );
  if (!res.ok) return null;
  const rows = await res.json() as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.display_name ?? ''),
    email: session.user.email,
    accountType: (row.account_type as GloweProfileSnapshot['accountType']) ?? null,
    approvalStatus: String(row.approval_status ?? 'not_required'),
    type: row.profile_type ? String(row.profile_type) : undefined,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : '',
    orgName: row.org_name ? String(row.org_name) : '',
  };
}

// Build a Playwright storageState that GloWe reads as "signed in": the raw
// Supabase session under storageKey glowe-auth-v1 (supabase-js v2 shape) plus
// the gloweUser + glowePersonalProfile mirrors auth.js keeps for the static UI,
// and the one-time guest-welcome flag so no toast interferes.
export function gloweStorageState(
  session: SupabaseSession,
  displayName: string,
  profile: GloweProfileSnapshot | null = null,
) {
  const isOrg = profile?.accountType === 'organization';
  const gloweUser = {
    id: session.user.id,
    name: displayName,
    email: session.user.email ?? '',
    type: isOrg ? 'organization' : (profile?.type || 'member'),
    avatarUrl: profile?.avatarUrl ?? '',
  };
  const personal = profile
    ? {
        id: profile.id,
        name: profile.name || displayName,
        email: profile.email ?? session.user.email ?? '',
        accountType: profile.accountType,
        approvalStatus: profile.approvalStatus,
        type: profile.type,
        avatarUrl: profile.avatarUrl ?? '',
        orgName: profile.orgName ?? '',
      }
    : null;
  const localStorage = [
    { name: 'glowe-auth-v1', value: JSON.stringify(session) },
    { name: 'gloweUser', value: JSON.stringify(gloweUser) },
    { name: 'glowe-guest-welcomed', value: '1' },
  ];
  if (personal) {
    localStorage.push({ name: 'glowePersonalProfile', value: JSON.stringify(personal) });
  }
  return {
    cookies: [],
    origins: [
      {
        origin: GLOWE_ORIGIN,
        localStorage,
      },
    ],
  };
}

export const AUTH_DIR = path.resolve(here, '../.auth');
export const stateFile = (name: string) => path.join(AUTH_DIR, `glowe-${name}.json`);
export const META_FILE = path.join(AUTH_DIR, 'glowe-meta.json');

export type GloweMeta = { seeded: boolean; admin: boolean };

export function readMeta(): GloweMeta {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8')) as GloweMeta;
  } catch {
    return { seeded: false, admin: false };
  }
}

/**
 * Skip the current describe when setup has not minted personas.
 * Must run in beforeEach/beforeAll — NOT at module top-level — because Playwright
 * collects tests before `glowe-setup` writes glowe-meta.json.
 */
export function skipUnlessSeeded(testApi: { skip: (condition: boolean, description?: string) => void }): void {
  testApi.skip(!readMeta().seeded, 'GloWe seed personas missing — run scripts/seed-glowe-dev.mjs');
}

export function skipUnlessAdmin(testApi: { skip: (condition: boolean, description?: string) => void }): void {
  testApi.skip(!readMeta().admin, 'admin credentials unavailable — set E2E_TEST_EMAIL/E2E_TEST_PASSWORD');
}

/**
 * Wait until a GloWe list board finishes its Loading… placeholder.
 * Matches cards OR a settled empty-state (excludes `.loading-state` and
 * Loading… copy so staging stays compatible until the product class deploys).
 */
export async function waitForGloweBoard(
  page: Page,
  cardSelector: string,
  timeout = 20_000,
): Promise<void> {
  const cards = page.locator(cardSelector);
  const settledEmpty = page
    .locator('.empty-state:not(.loading-state)')
    .filter({ hasNotText: /Loading/i });
  await expect(cards.first().or(settledEmpty.first())).toBeVisible({ timeout });
}

// REST call as a signed-in persona (RLS applies) — used by specs to clean up
// rows they created, keeping the suite idempotent on the shared dev DB.
export async function personaRest(
  session: SupabaseSession,
  pathWithQuery: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
