// GloWe auth setup — mints Playwright storage states for the seeded personas
// (scripts/seed-glowe-dev.mjs) by signing in with password against the real
// Supabase dev project. When the seed has not run yet (personas missing),
// member/org/full-flow specs skip gracefully via glowe-meta.json.
import { test as setup } from '@playwright/test';
import fs from 'node:fs';
import {
  AUTH_DIR, META_FILE, PERSONAS, SEED_PASSWORD,
  gloweStorageState, signInWithPassword, stateFile,
} from '../lib/glowe';

setup('mint glowe persona sessions', async () => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const { isLocalSupabaseUrl, mockLoginStorageState } = await import('../lib/mockAuth.js');
  const useMockLogin = isLocalSupabaseUrl();

  let seeded = true;
  for (const [key, persona] of Object.entries(PERSONAS)) {
    let state = useMockLogin
      ? await mockLoginStorageState(persona.name, { email: persona.email })
      : null;
    if (!state) {
      const session = await signInWithPassword(persona.email, SEED_PASSWORD);
      if (!session) {
        console.warn(`[glowe-setup] persona ${key} cannot sign in — run scripts/seed-glowe-dev.mjs (member specs will skip)`);
        seeded = false;
        continue;
      }
      state = gloweStorageState(session, persona.name);
    }
    fs.writeFileSync(stateFile(key), JSON.stringify(state));
  }

  // Optional admin persona: the CI E2E user (super_admin ⇒ GloWe admin).
  let admin = false;
  const adminEmail = process.env.E2E_TEST_EMAIL;
  const adminPassword = process.env.E2E_TEST_PASSWORD;
  if (adminEmail && adminPassword) {
    const session = await signInWithPassword(adminEmail, adminPassword);
    if (session) {
      fs.writeFileSync(stateFile('admin'), JSON.stringify(gloweStorageState(session, 'Admin')));
      admin = true;
    } else {
      console.warn('[glowe-setup] admin credentials failed to sign in — admin specs will skip');
    }
  } else {
    console.warn('[glowe-setup] E2E_TEST_EMAIL/PASSWORD not set — admin specs will skip');
  }

  fs.writeFileSync(META_FILE, JSON.stringify({ seeded, admin }));
});
