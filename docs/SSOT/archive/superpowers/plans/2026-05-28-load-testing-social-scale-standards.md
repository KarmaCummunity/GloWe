# Load Testing & Social-Scale Standards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish industry-aligned load-testing standards for Karma Community, implement a dev-only harness (data seed + k6 scenarios + CI reporting), and prove MVP NFRs (`NFR-PERF-*`, `NFR-SCALE-*`) without tripping Supabase rate limits.

**Architecture:** Separate **data volume** (one-time SQL/admin seed on Supabase dev) from **traffic shape** (k6 with a fixed JWT persona pool). Measure the real hot path today: `feed_ranked_ids` RPC + `posts` `IN(...)` fetch (two round-trips per page — `TD-137`). Gate `dev` → `main` only after two weeks of scheduled green runs. Never run load against prod (`slxijdfvinbjmrsfgbzx`).

**Tech Stack:** k6 (Grafana), Supabase REST/RPC (`@supabase/supabase-js` patterns in scripts), GitHub Actions (`workflow_dispatch` + nightly cron), Vitest smoke for seed idempotency, archived NFRs in `docs/SSOT/archive/SRS/04_non_functional/01_performance_scalability_availability.md`.

---

## Industry standards → Karma mapping

Social products (Meta/Twitter/LinkedIn SRE practice, k6 docs, Google SRE “Four Golden Signals”) converge on the same model. We adopt it at MVP scale.

| Industry practice | What it means | Karma target (archived SRS) | How we measure |
| --- | --- | --- | --- |
| **SLI: latency** | p95/p99 per endpoint | Feed RPC ≤500ms server (`NFR-PERF-002`); DB query ≤150ms (`NFR-PERF-010`) | k6 `http_req_duration`, Supabase logs |
| **SLI: errors** | 5xx + app errors / all requests | <0.1% at MVP load | k6 `http_req_failed` |
| **SLI: traffic** | RPS, concurrent users | 20 RPS feed reads, 5 RPS chat sends (`NFR-SCALE-002`) | k6 `constant-arrival-rate` |
| **SLI: saturation** | CPU, connections, pool wait | No sustained pool timeouts | Supabase dashboard + k6 abort on 429 |
| **Workload mix** | Read-heavy feed (~80–95% reads) | Feed + search reads dominate | k6 scenario weights |
| **Think time** | 2–8s between actions | Mobile scroll simulation | `sleep()` in k6 default fn |
| **Test types** | Load → Soak → Stress → Spike | MVP: Load + 30m Soak monthly; Stress manual | Separate k6 `options.scenarios` |
| **Data realism** | Volume + skew (power-law followers) | 10k posts, 10k users design headroom (`NFR-SCALE-001`) | `seed-load` SQL |
| **Environment** | Staging fork, never prod blast | **Dev only** `roeefqpdbftlndzsvhfj` | `ENVIRONMENTS.md` + secrets |
| **Auth during load** | Token pool, not mass signup | 30 fixed personas, rotate JWT | `scripts/seed-load-personas.mjs` |
| **Gate promotion** | Warn → block after baseline | 14 consecutive green nightly runs | `ci-load-dev.yml` |

**Explicit non-goals for Wave 1:** mass `signUp` during k6, prod load, 1k Realtime WebSocket clients (`NFR-SCALE-003` → Wave 3).

---

## File map

| Path | Responsibility |
| --- | --- |
| `docs/SSOT/TESTING.md` | **Create** — pyramid + load-test policy, flake/abort rules |
| `docs/SSOT/LOAD_TESTING.md` | **Create** — SLIs, scenarios, thresholds, operator runbook |
| `docs/SSOT/BACKLOG.md` | **Modify** — `INFRA-LOAD-W0` … `INFRA-LOAD-W3` |
| `docs/SSOT/DECISIONS.md` | **Modify** — `D-56` load-test env + gate policy |
| `docs/SSOT/ENVIRONMENTS.md` | **Modify** — secrets table, “do not load prod” callout |
| `docs/SSOT/OPERATOR_RUNBOOK.md` | **Modify** — seed/reset/cleanup section |
| `scripts/load/seed-load-personas.mjs` | **Create** — 30 auth users + JWT export (gitignored output) |
| `scripts/load/seed-load-volume.mjs` | **Create** — 10k posts + follow skew + sample chats |
| `scripts/load/seed-load-cleanup.mjs` | **Create** — delete `loadtest+*` data |
| `scripts/load/export-jwt-pool.mjs` | **Create** — sign-in each persona → `.load-test/jwts.json` |
| `scripts/k6/lib/supabase.js` | **Create** — shared REST helpers |
| `scripts/k6/scenarios/feed-read.js` | **Create** — ranked + flat feed path |
| `scripts/k6/scenarios/chat-send.js` | **Create** — message insert at 5 RPS cap |
| `scripts/k6/scenarios/search-read.js` | **Create** — light search RPC/table read |
| `scripts/k6/run-mvp-load.js` | **Create** — orchestrates weighted scenarios |
| `scripts/k6/run-soak.js` | **Create** — 30m low-rate soak |
| `scripts/load/__tests__/seed-idempotency.test.mjs` | **Create** — dry-run counts / prefix guards |
| `.gitignore` | **Modify** — `.load-test/` |
| `.github/workflows/ci-load-dev.yml` | **Create** — nightly + manual, non-blocking → blocking |
| `package.json` (repo root) | **Modify** — `load:seed`, `load:k6`, `load:cleanup` scripts |

---

## Wave 0 — Policy & SSOT (`INFRA-LOAD-W0`)

### Task 0.1: `LOAD_TESTING.md` canonical thresholds

**Files:**
- Create: `docs/SSOT/LOAD_TESTING.md`

- [ ] **Step 1: Create the document**

```markdown
# Load Testing (dev only)

## Environments
| Env | Supabase ref | Load allowed? |
| --- | --- | --- |
| dev | `roeefqpdbftlndzsvhfj` | Yes — scheduled + manual |
| prod | `slxijdfvinbjmrsfgbzx` | **Never** (synthetic uptime only) |

## MVP pass/fail (k6)
| Scenario | Arrival rate | Duration | Threshold |
| --- | --- | --- | --- |
| `feed_read` | 20 iter/s | 5m | `http_req_failed < 0.1%`, `p(95)<500ms` on feed RPC |
| `chat_send` | 5 iter/s | 5m | `p(95)<500ms` (`NFR-PERF-006`) |
| `search_read` | 2 iter/s | 3m | `p(95)<400ms` (`NFR-PERF-004`) |

Abort immediately if HTTP 429 rate > 1% for 30s (Supabase throttle).

## Data volume target (seed, not during k6)
- 30 auth personas (`loadtest+personaNN@kc-load.invalid`)
- 10,000 `posts` rows (`status=open`, `visibility=Public`)
- ~2,000 `follow_edges` (power-law: top 5% users get 50+ followers)
- 200 `chats` × 20 `messages` each

## Operator order
1. `node scripts/load/seed-load-personas.mjs`
2. `node scripts/load/export-jwt-pool.mjs`
3. `node scripts/load/seed-load-volume.mjs`
4. `k6 run scripts/k6/run-mvp-load.js`
5. Cleanup: `node scripts/load/seed-load-cleanup.mjs`
```

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/LOAD_TESTING.md
git commit -m "docs(ssot): add load testing thresholds and dev-only policy"
```

### Task 0.2: Decision record `D-56`

**Files:**
- Modify: `docs/SSOT/DECISIONS.md` (append)

- [ ] **Step 1: Append entry**

```markdown
### D-56 — Load testing on Supabase dev only; seed vs traffic separation

**Decision.** Load tests run only against project `roeefqpdbftlndzsvhfj`. Data volume is seeded once via service-role scripts (`loadtest+*` prefix). k6 uses a fixed pool of ~30 JWTs — never mass Auth signup during the test. CI nightly job is non-blocking for 14 days, then required on `dev` → `main` release PRs.

**Rationale.** Industry social-scale practice (read-heavy mix, token pool, staging isolation). Avoids Supabase Auth rate limits and keeps prod untouched (`D-53`).

**Alternatives rejected.** (a) Creating thousands of users via `signUp` during k6 — triggers 429. (b) Prod synthetic load — unacceptable risk.
```

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/DECISIONS.md
git commit -m "docs(ssot): record D-56 load test env and gate policy"
```

### Task 0.3: BACKLOG rows

**Files:**
- Modify: `docs/SSOT/BACKLOG.md`

- [ ] **Step 1: Add INFRA section rows**

```markdown
| INFRA-LOAD-W0 | Load testing policy SSOT + D-56 + LOAD_TESTING.md | infra | ⏳ Planned | `docs/SSOT/LOAD_TESTING.md` |
| INFRA-LOAD-W1 | Dev seed scripts (personas + 10k posts volume) | infra | ⏳ Planned | dev only |
| INFRA-LOAD-W2 | k6 MVP scenarios (feed/chat/search) + local runner | infra | ⏳ Planned | `NFR-SCALE-002` |
| INFRA-LOAD-W3 | ci-load-dev.yml nightly + promote to main gate | infra | ⏳ Planned | 14-day baseline |
```

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/BACKLOG.md
git commit -m "docs(ssot): track INFRA-LOAD-W0..W3 load testing waves"
```

---

## Wave 1 — Data seed (`INFRA-LOAD-W1`)

### Task 1.1: Gitignore + directory scaffold

**Files:**
- Modify: `.gitignore`
- Create: `scripts/load/.gitkeep`, `scripts/k6/lib/.gitkeep`

- [ ] **Step 1: Add to `.gitignore`**

```
# Load-test artifacts (JWTs — dev only)
.load-test/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore scripts/load/.gitkeep scripts/k6/lib/.gitkeep
git commit -m "chore(load): scaffold load test dirs and gitignore jwt pool"
```

### Task 1.2: Persona seed script (30 users, no k6 signup)

**Files:**
- Create: `scripts/load/seed-load-personas.mjs`

- [ ] **Step 1: Create script**

```javascript
#!/usr/bin/env node
/**
 * Creates 30 load-test auth users + public.users rows on Supabase dev.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (source ~/.kc-dev-secrets.env)
 * Idempotent: skips emails that already exist.
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (URL.includes('slxijdfvinbjmrsfgbzx')) {
  console.error('Refusing to seed personas on PROD');
  process.exit(1);
}

const PERSONA_COUNT = 30;
const PASSWORD = 'LoadTest-KC-2026!'; // dev-only fixture password
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

const personas = [];

for (let i = 1; i <= PERSONA_COUNT; i++) {
  const email = `loadtest+persona${String(i).padStart(2, '0')}@kc-load.invalid`;
  const shareHandle = `load_p${String(i).padStart(2, '0')}`;
  const displayName = `Load Persona ${i}`;

  let userId;
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const hit = existing.data.users.find((u) => u.email === email);
  if (hit) {
    userId = hit.id;
    console.log(`skip existing ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    userId = data.user.id;
    console.log(`created ${email}`);
  }

  const { error: upsertErr } = await admin.from('users').upsert(
    {
      user_id: userId,
      auth_provider: 'email',
      share_handle: shareHandle,
      display_name: displayName,
      city: 'tel-aviv',
      city_name: 'תל אביב',
      account_status: 'active',
      onboarding_state: 'completed',
      privacy_mode: 'Public',
    },
    { onConflict: 'user_id' },
  );
  if (upsertErr) throw new Error(`users upsert ${email}: ${upsertErr.message}`);

  personas.push({ email, password: PASSWORD, userId, shareHandle });
}

mkdirSync('.load-test', { recursive: true });
writeFileSync('.load-test/personas.json', JSON.stringify(personas, null, 2));
console.log(`Wrote .load-test/personas.json (${personas.length} personas)`);
```

- [ ] **Step 2: Run locally (dev only)**

```bash
source ~/.kc-dev-secrets.env
export SUPABASE_URL="https://roeefqpdbftlndzsvhfj.supabase.co"
node scripts/load/seed-load-personas.mjs
```

Expected: `Wrote .load-test/personas.json (30 personas)` (or skips for re-run).

- [ ] **Step 3: Commit**

```bash
git add scripts/load/seed-load-personas.mjs
git commit -m "chore(load): add dev persona seed script for load harness"
```

### Task 1.3: JWT pool export

**Files:**
- Create: `scripts/load/export-jwt-pool.mjs`

- [ ] **Step 1: Create script**

```javascript
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.error('Missing SUPABASE_URL / ANON key');
  process.exit(1);
}

const personas = JSON.parse(readFileSync('.load-test/personas.json', 'utf8'));
const tokens = [];

for (const p of personas) {
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: p.email,
    password: p.password,
  });
  if (error) throw new Error(`signIn ${p.email}: ${error.message}`);
  tokens.push({
    userId: p.userId,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
  // Avoid Auth burst: 200ms between sign-ins
  await new Promise((r) => setTimeout(r, 200));
}

writeFileSync('.load-test/jwts.json', JSON.stringify(tokens, null, 2));
console.log(`Wrote .load-test/jwts.json (${tokens.length} tokens)`);
```

- [ ] **Step 2: Run**

```bash
node scripts/load/export-jwt-pool.mjs
```

Expected: `Wrote .load-test/jwts.json (30 tokens)`

- [ ] **Step 3: Commit**

```bash
git add scripts/load/export-jwt-pool.mjs
git commit -m "chore(load): export jwt pool for k6 personas"
```

### Task 1.4: Volume seed (10k posts + follow skew)

**Files:**
- Create: `scripts/load/seed-load-volume.mjs`

- [ ] **Step 1: Create script**

```javascript
#!/usr/bin/env node
/**
 * Bulk volume via service role — NOT during k6.
 * Targets: 10k public open posts, ~2k follow edges (skewed).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TARGET_POSTS = Number(process.env.LOAD_POST_COUNT ?? 10_000);
const BATCH = 500;

const admin = createClient(URL, KEY, { auth: { persistSession: false } });
const personas = JSON.parse(readFileSync('.load-test/personas.json', 'utf8'));
const ownerIds = personas.map((p) => p.userId);

async function countPosts() {
  const { count, error } = await admin
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .like('title', 'LOADTEST:%');
  if (error) throw error;
  return count ?? 0;
}

let existing = await countPosts();
console.log(`Existing LOADTEST posts: ${existing}`);
if (existing >= TARGET_POSTS) {
  console.log('Volume seed already satisfied — skip');
  process.exit(0);
}

while (existing < TARGET_POSTS) {
  const n = Math.min(BATCH, TARGET_POSTS - existing);
  const rows = Array.from({ length: n }, (_, i) => {
    const owner = ownerIds[(existing + i) % ownerIds.length];
    return {
      owner_id: owner,
      type: 'Give',
      title: `LOADTEST:${existing + i}`,
      status: 'open',
      visibility: 'Public',
      city: 'tel-aviv',
      street: 'Load',
      street_number: '1',
      location_display_level: 'CityOnly',
      category: 'Other',
    };
  });
  const { error } = await admin.from('posts').insert(rows);
  if (error) throw new Error(`insert posts: ${error.message}`);
  existing += n;
  console.log(`posts: ${existing}/${TARGET_POSTS}`);
}

// Power-law follows: persona[0] is hub — everyone follows hub
const hub = ownerIds[0];
for (const follower of ownerIds.slice(1)) {
  const { error } = await admin.from('follow_edges').upsert(
    { follower_id: follower, followed_id: hub },
    { onConflict: 'follower_id,followed_id', ignoreDuplicates: true },
  );
  if (error && !error.message.includes('duplicate')) {
    console.warn(`follow_edges ${follower}->${hub}: ${error.message}`);
  }
}

console.log('Volume seed complete');
```

- [ ] **Step 2: Run (takes 1–3 min)**

```bash
node scripts/load/seed-load-volume.mjs
```

Expected: `Volume seed complete` with `posts: 10000/10000`.

- [ ] **Step 3: Commit**

```bash
git add scripts/load/seed-load-volume.mjs
git commit -m "chore(load): add 10k post volume seed for dev load tests"
```

### Task 1.5: Cleanup script + operator runbook

**Files:**
- Create: `scripts/load/seed-load-cleanup.mjs`
- Modify: `docs/SSOT/OPERATOR_RUNBOOK.md`

- [ ] **Step 1: Cleanup script**

```javascript
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

await admin.from('posts').delete().like('title', 'LOADTEST:%');
console.log('Deleted LOADTEST posts');

if (readFileSync('.load-test/personas.json', 'utf8')) {
  const personas = JSON.parse(readFileSync('.load-test/personas.json', 'utf8'));
  for (const p of personas) {
    await admin.auth.admin.deleteUser(p.userId);
    console.log(`deleted auth ${p.email}`);
  }
}
console.log('Cleanup done — remove .load-test/ locally if desired');
```

- [ ] **Step 2: Add runbook section** under a new `## Load testing (dev)` heading in `OPERATOR_RUNBOOK.md` pointing to `LOAD_TESTING.md` and the three scripts.

- [ ] **Step 3: Commit**

```bash
git add scripts/load/seed-load-cleanup.mjs docs/SSOT/OPERATOR_RUNBOOK.md
git commit -m "chore(load): add dev load data cleanup and operator runbook"
```

### Task 1.6: Idempotency unit test

**Files:**
- Create: `scripts/load/__tests__/seed-idempotency.test.mjs`

- [ ] **Step 1: Write test**

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('load seed conventions', () => {
  it('persona emails use loadtest+ prefix and kc-load.invalid domain', () => {
    const src = readFileSync(join(root, 'seed-load-personas.mjs'), 'utf8');
    expect(src).toContain('loadtest+persona');
    expect(src).toContain('@kc-load.invalid');
    expect(src).toContain('slxijdfvinbjmrsfgbzx');
  });

  it('volume seed marks posts with LOADTEST title prefix', () => {
    const src = readFileSync(join(root, 'seed-load-volume.mjs'), 'utf8');
    expect(src).toContain('LOADTEST:');
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm exec vitest run scripts/load/__tests__/seed-idempotency.test.mjs
```

Expected: PASS (2 tests).

- [ ] **Step 3: Commit + flip BACKLOG W1**

```bash
git add scripts/load/__tests__/seed-idempotency.test.mjs
git commit -m "test(load): guard load seed naming and prod refusal"
```

---

## Wave 2 — k6 harness (`INFRA-LOAD-W2`)

### Task 2.1: Shared Supabase k6 helpers

**Files:**
- Create: `scripts/k6/lib/supabase.js`

- [ ] **Step 1: Create helper module**

```javascript
export function supabaseRest(env) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  return {
    rpc(name, body) {
      return http.post(`${base}/rpc/${name}`, JSON.stringify(body), { headers });
    },
    from(table) {
      return {
        select(query) {
          return http.get(`${base}/${table}?${query}`, { headers });
        },
      };
    },
  };
}

export function pickToken(jwtPool) {
  return jwtPool[Math.floor(Math.random() * jwtPool.length)];
}
```

Note: k6 provides global `http` — import in scenario files via:

```javascript
import http from 'k6/http';
```

- [ ] **Step 2: Commit**

```bash
git add scripts/k6/lib/supabase.js
git commit -m "chore(load): add k6 supabase rest helpers"
```

### Task 2.2: Feed read scenario (real two-hop path)

**Files:**
- Create: `scripts/k6/scenarios/feed-read.js`

- [ ] **Step 1: Create scenario** (models `feedQueryRanked.ts`)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { pickToken } from '../lib/supabase.js';

export function feedReadScenario(data) {
  const token = pickToken(data.jwtPool);
  const headers = {
    apikey: data.anonKey,
    Authorization: `Bearer ${token.accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const base = `${data.supabaseUrl}/rest/v1`;

  const rpcRes = http.post(
    `${base}/rpc/feed_ranked_ids`,
    JSON.stringify({
      p_viewer_id: token.userId,
      p_filter_status: 'open',
      p_sort_order: 'newest',
      p_page_limit: 21,
      p_followers_only: false,
    }),
    { headers, tags: { name: 'rpc_feed_ranked_ids' } },
  );

  check(rpcRes, {
    'feed rpc 200': (r) => r.status === 200,
    'feed rpc p95 under 500ms': (r) => r.timings.duration < 500,
  });

  const rows = rpcRes.json() ?? [];
  if (rows.length === 0) {
    sleep(2);
    return;
  }
  const ids = rows.slice(0, 20).map((r) => r.post_id);
  const inFilter = `post_id=in.(${ids.join(',')})`;
  const postsRes = http.get(`${base}/posts?select=post_id,title,status&${inFilter}`, {
    headers,
    tags: { name: 'posts_in_fetch' },
  });
  check(postsRes, { 'posts in 200': (r) => r.status === 200 });

  sleep(2 + Math.random() * 4); // think time 2–6s
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/k6/scenarios/feed-read.js
git commit -m "chore(load): k6 feed ranked ids + posts in scenario"
```

### Task 2.3: Chat send scenario (5 RPS cap in orchestrator)

**Files:**
- Create: `scripts/k6/scenarios/chat-send.js`

- [ ] **Step 1: Create scenario**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { pickToken } from '../lib/supabase.js';

export function chatSendScenario(data) {
  const token = pickToken(data.jwtPool);
  const chatId = data.fixtureChatId;
  if (!chatId) return;

  const headers = {
    apikey: data.anonKey,
    Authorization: `Bearer ${token.accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const res = http.post(
    `${data.supabaseUrl}/rest/v1/messages`,
    JSON.stringify({
      chat_id: chatId,
      sender_id: token.userId,
      body: `load ${Date.now()}`,
      kind: 'user',
      status: 'pending',
    }),
    { headers, tags: { name: 'messages_insert' } },
  );
  check(res, {
    'chat send 201': (r) => r.status === 201 || r.status === 200,
    'chat p95 under 500ms': (r) => r.timings.duration < 500,
  });
  sleep(3);
}
```

- [ ] **Step 2: Pre-create one fixture chat** in `seed-load-volume.mjs` (append after posts): insert `chats` row + `chat_participants` for persona[0] and persona[1]; write `chatId` to `.load-test/fixtures.json`.

- [ ] **Step 3: Commit**

```bash
git add scripts/k6/scenarios/chat-send.js scripts/load/seed-load-volume.mjs
git commit -m "chore(load): k6 chat send scenario with fixture chat"
```

### Task 2.4: MVP orchestrator + thresholds

**Files:**
- Create: `scripts/k6/run-mvp-load.js`

- [ ] **Step 1: Create orchestrator**

```javascript
import { SharedArray } from 'k6/data';
import { feedReadScenario } from './scenarios/feed-read.js';
import { chatSendScenario } from './scenarios/chat-send.js';

const jwtPool = new SharedArray('jwts', () => JSON.parse(open('../../.load-test/jwts.json')));
const fixtures = JSON.parse(open('../../.load-test/fixtures.json'));

export const options = {
  scenarios: {
    feed_read: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 40,
      maxVUs: 80,
      exec: 'feedRead',
    },
    chat_send: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: 'chatSend',
      startTime: '30s',
    },
  },
  thresholds: {
    'http_req_failed{scenario:feed_read}': ['rate<0.001'],
    'rpc_feed_ranked_ids': ['p(95)<500'],
    'messages_insert': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const env = {
  supabaseUrl: __ENV.SUPABASE_URL,
  anonKey: __ENV.SUPABASE_ANON_KEY,
  jwtPool,
  fixtureChatId: fixtures.chatId,
};

export function feedRead() {
  feedReadScenario(env);
}

export function chatSend() {
  chatSendScenario(env);
}
```

- [ ] **Step 2: Local smoke run (2 min shortened)**

```bash
source ~/.kc-dev-secrets.env
export SUPABASE_URL="https://roeefqpdbftlndzsvhfj.supabase.co"
k6 run --duration 2m --vus 5 scripts/k6/run-mvp-load.js
```

Expected: thresholds mostly green; tune VUs if 429s appear.

- [ ] **Step 3: Root `package.json` scripts**

```json
"load:seed": "node scripts/load/seed-load-personas.mjs && node scripts/load/export-jwt-pool.mjs && node scripts/load/seed-load-volume.mjs",
"load:k6": "k6 run scripts/k6/run-mvp-load.js",
"load:cleanup": "node scripts/load/seed-load-cleanup.mjs"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/k6/run-mvp-load.js package.json
git commit -m "chore(load): add k6 mvp orchestrator matching NFR-SCALE-002"
```

### Task 2.5: Soak test (monthly)

**Files:**
- Create: `scripts/k6/run-soak.js`

- [ ] **Step 1: 30m low-rate script** — copy `run-mvp-load.js` but `rate: 5` feed only, `duration: '30m'`.

- [ ] **Step 2: Commit**

```bash
git add scripts/k6/run-soak.js
git commit -m "chore(load): add 30m soak profile for dev"
```

---

## Wave 3 — CI & gate promotion (`INFRA-LOAD-W3`)

### Task 3.1: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/ci-load-dev.yml`

- [ ] **Step 1: Create workflow**

```yaml
name: CI — load (dev)

on:
  schedule:
    - cron: '0 4 * * *' # 04:00 UTC — off-peak Israel
  workflow_dispatch:

concurrency:
  group: ci-load-dev
  cancel-in-progress: false

jobs:
  k6-mvp-load:
    runs-on: ubuntu-latest
    environment: supabase-dev
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - name: Seed personas + JWT + volume
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          node scripts/load/seed-load-personas.mjs
          node scripts/load/export-jwt-pool.mjs
          node scripts/load/seed-load-volume.mjs
      - name: Run k6 MVP load
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: k6 run scripts/k6/run-mvp-load.js
      - name: Upload k6 summary
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: k6-summary
          path: |
            summary.json
```

- [ ] **Step 2: Add GitHub secrets** (operator): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` on environment `supabase-dev` — document in `ENVIRONMENTS.md`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci-load-dev.yml docs/SSOT/ENVIRONMENTS.md
git commit -m "ci(load): nightly k6 against supabase dev"
```

### Task 3.2: Gate promotion (warn → block)

**Files:**
- Modify: `docs/SSOT/RELEASE_CHECKLIST.md`
- Modify: `docs/SSOT/LOAD_TESTING.md`

- [ ] **Step 1: Document 14-day rule** — after 14 consecutive green `CI — load (dev)` runs, add `CI — load (dev)` to required checks for PRs `dev` → `main` only (not every feature PR to `dev`).

- [ ] **Step 2: Commit**

```bash
git add docs/SSOT/RELEASE_CHECKLIST.md docs/SSOT/LOAD_TESTING.md
git commit -m "docs(ssot): promote load test to main release gate after baseline"
```

---

## Wave 4 (optional) — Realtime & stress (`INFRA-LOAD-W4` backlog stub)

Defer until REST path is green.

| Test | Tool | Target |
| --- | --- | --- |
| 1k Realtime subscribers | k6 `ws` or custom Node | `NFR-SCALE-003` |
| Stress (find knee) | k6 ramp 20→200 RPS | manual, dev only |
| Spike | 0→50 RPS in 10s | post-mortem only |

Add BACKLOG row when Wave 3 is ✅.

---

## Self-review (plan author checklist)

| Check | Result |
| --- | --- |
| `NFR-PERF-002` feed ≤500ms | Task 2.2 threshold on `rpc_feed_ranked_ids` |
| `NFR-SCALE-002` 20/5 RPS | Task 2.4 `constant-arrival-rate` |
| `NFR-PERF-006` chat ≤500ms | Task 2.3 threshold |
| No prod load | Tasks 0.2, 1.2 prod ref guard |
| No mass signup in k6 | JWT pool Tasks 1.2–1.3 |
| Data volume separate | Wave 1 vs Wave 2 |
| SSOT updates | Waves 0–3 |
| Placeholder scan | No TBD steps |

**Gap vs `INFRA-QA-W4`:** This plan subsumes Wave 4.2 k6 from `2026-05-28-comprehensive-quality-automation.md`; when implementing, cross-link and mark `INFRA-QA-W4` perf slice as satisfied or merge rows to avoid duplicate workflows.

---

## Relationship to existing work

| Existing item | How this plan relates |
| --- | --- |
| `INFRA-QA-W4` (quality automation plan) | Same k6 feed script — implement here first, link from `TESTING.md` |
| `PERF-*` waves | Optimizations (TD-137 one-round-trip RPC) **improve** load results — re-baseline after PERF-5 ships |
| `sqlProbes.integration.test.ts` | Pattern for `seedUser` — load personas use same admin API, different scale |
| `RELEASE_CHECKLIST.md` dev smoke | Complements manual smoke; does not replace E2E Playwright |

---

## Verification before calling Wave 2 done

```bash
source ~/.kc-dev-secrets.env
export SUPABASE_URL="https://roeefqpdbftlndzsvhfj.supabase.co"
pnpm run load:seed
pnpm run load:k6
# Expect: ✓ rpc_feed_ranked_ids p(95)<500ms, http_req_failed < 1%
pnpm run load:cleanup
```

---

## SSOT flip when all waves complete

- `BACKLOG.md`: `INFRA-LOAD-W0` … `W3` → ✅
- `LOAD_TESTING.md` status header: ✅
- Optional: add `NFR-SCALE-002` measurement note to archive SRS cross-link (no requirement text change)
