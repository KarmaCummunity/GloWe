# UGC Translation — Phase 0: Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the language primitives the rest of the translation system depends on — a validated BCP-47 `LanguageTag`, a pure "which language does this reader want" resolver, a `preferred_language` column on users with a persistence path, and nullable `source_language` columns on posts and messages.

**Architecture:** Pure, dependency-free language value objects + resolver live in `@kc/domain`. Persistence is a new single-field setter on the existing `IUserRepository` port with a Supabase adapter. A thin mobile wrapper reads the device locale via `expo-localization` and feeds the pure resolver. No translation, no LLM, no UI picker yet — this phase only lays inert foundations that later phases populate and consume.

**Tech Stack:** TypeScript, vitest, Supabase Postgres migrations, Expo (`expo-localization`), pnpm + turbo monorepo (packages under `app/`).

> **Spec:** `docs/SSOT/archive/superpowers/specs/2026-06-29-ugc-translation-design.md` §3, §4, §8. This plan implements the §4 schema additions and the §8 `LanguageTag`/locale primitives only.

---

## Pre-flight (do once before Task 1)

- [ ] **Sync to `origin/dev` and branch.** This worktree is stale (its latest migration is `0096`, but `origin/dev` is hundreds of commits ahead). From the repo root:

```bash
git fetch origin dev
git switch -c feat/FR-TRANSLATE-001-language-foundations origin/dev
```

- [ ] **Determine the next migration number.** It is NOT `0097`. Compute it:

```bash
ls supabase/migrations/ | sort | tail -3
```

Take the highest `NNNN` prefix and add 1. Use that zero-padded number wherever this plan writes `<NNNN>` (Task 3).

- [ ] **Install + env (worktree requirement).**

```bash
cd app && pnpm install
# copy a working .env into the worktree if tests need it (see project memory "Local vitest/Node flag")
```

Test command used throughout this plan (Node 20.17 needs the flag per project memory):

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter <package> test
```

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `app/packages/domain/src/language.ts` | `LanguageTag` branded type, `createLanguageTag` (validate+normalize BCP-47), `resolvePreferredLanguage` (pure pick logic) | Create |
| `app/packages/domain/src/__tests__/language.test.ts` | Unit tests for the above | Create |
| `app/packages/domain/src/index.ts` | Barrel — re-export `language.ts` | Modify |
| `supabase/migrations/<NNNN>_ugc_translation_language_columns.sql` | Add `users.preferred_language`, `posts.source_language`(+confidence), `messages.source_language`(+confidence) | Create |
| `app/packages/application/src/ports/IUserRepository.ts` | Add `setPreferredLanguage` method to the port | Modify |
| `app/packages/infrastructure-supabase/src/users/SupabaseUserRepository.ts` | Implement `setPreferredLanguage` | Modify |
| `app/packages/infrastructure-supabase/src/users/__tests__/SupabaseUserRepository.setPreferredLanguage.test.ts` | Adapter test with a fake client | Create |
| `app/apps/mobile/src/i18n/deviceLanguage.ts` | Read device locales via `expo-localization`, expose tags for the resolver | Create |

---

## Task 1: `LanguageTag` value object + `createLanguageTag`

**Files:**
- Create: `app/packages/domain/src/language.ts`
- Test: `app/packages/domain/src/__tests__/language.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/packages/domain/src/__tests__/language.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createLanguageTag } from '../language';
import { ValidationError } from '../errors';

describe('createLanguageTag', () => {
  it('accepts and lowercases a plain language subtag', () => {
    expect(createLanguageTag('HE')).toBe('he');
    expect(createLanguageTag('en')).toBe('en');
  });

  it('normalizes script (Title) and region (UPPER) casing', () => {
    expect(createLanguageTag('zh-hant')).toBe('zh-Hant');
    expect(createLanguageTag('pt-br')).toBe('pt-BR');
    expect(createLanguageTag('ZH-HANT-hk')).toBe('zh-Hant-HK');
  });

  it('accepts a UN M.49 numeric region', () => {
    expect(createLanguageTag('es-419')).toBe('es-419');
  });

  it('trims surrounding whitespace', () => {
    expect(createLanguageTag('  fr-CA  ')).toBe('fr-CA');
  });

  it('throws ValidationError(field=languageTag) on empty input', () => {
    let captured: ValidationError | undefined;
    try { createLanguageTag(''); } catch (e) { captured = e as ValidationError; }
    expect(captured).toBeInstanceOf(ValidationError);
    expect(captured?.field).toBe('languageTag');
  });

  it('throws ValidationError on malformed tags', () => {
    expect(() => createLanguageTag('e')).toThrow(ValidationError);
    expect(() => createLanguageTag('english')).toThrow(ValidationError);
    expect(() => createLanguageTag('he_IL')).toThrow(ValidationError);
    expect(() => createLanguageTag('123')).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- language
```

Expected: FAIL — cannot find module `../language`.

- [ ] **Step 3: Write minimal implementation**

Create `app/packages/domain/src/language.ts`:

```typescript
import { ValidationError } from './errors';

/** A validated, normalized BCP-47 language tag (e.g. 'he', 'en', 'pt-BR', 'zh-Hant'). */
export type LanguageTag = string & { readonly __brand: 'LanguageTag' };

// language(2-3 alpha) [-script(4 alpha)] [-region(2 alpha | 3 digit)]
const BCP47 = /^[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|[0-9]{3}))?$/i;

/**
 * Validate + normalize a raw string into a LanguageTag.
 * Pragmatic BCP-47 subset: language, optional script, optional region.
 * Throws ValidationError(field='languageTag') when invalid.
 */
export function createLanguageTag(raw: string): LanguageTag {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) throw new ValidationError('LanguageTag: value is required', 'languageTag');
  if (!BCP47.test(trimmed)) {
    throw new ValidationError(`LanguageTag: '${raw}' is not a valid BCP-47 tag`, 'languageTag');
  }
  const parts = trimmed.split('-');
  const out: string[] = [parts[0].toLowerCase()];
  for (const part of parts.slice(1)) {
    if (/^[a-z]{4}$/i.test(part)) {
      out.push(part[0].toUpperCase() + part.slice(1).toLowerCase()); // script: Title
    } else {
      out.push(part.toUpperCase()); // region: UPPER (digits unaffected)
    }
  }
  return out.join('-') as LanguageTag;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- language
```

Expected: PASS (all `createLanguageTag` cases).

- [ ] **Step 5: Commit**

```bash
git add app/packages/domain/src/language.ts app/packages/domain/src/__tests__/language.test.ts
git commit -m "feat(domain): add LanguageTag BCP-47 value object"
```

---

## Task 2: `resolvePreferredLanguage` pure resolver

**Files:**
- Modify: `app/packages/domain/src/language.ts`
- Test: `app/packages/domain/src/__tests__/language.test.ts`

- [ ] **Step 1: Write the failing test** — append inside `app/packages/domain/src/__tests__/language.test.ts`:

```typescript
import { resolvePreferredLanguage } from '../language';

describe('resolvePreferredLanguage', () => {
  it('prefers a valid explicit user preference', () => {
    const out = resolvePreferredLanguage({
      userPreference: 'en', deviceLocales: ['fr-FR'], fallback: 'he',
    });
    expect(out).toBe('en');
  });

  it('falls back to the first valid device locale when no user preference', () => {
    const out = resolvePreferredLanguage({
      userPreference: null, deviceLocales: ['not valid', 'pt-br'], fallback: 'he',
    });
    expect(out).toBe('pt-BR');
  });

  it('uses fallback when preference and all device locales are invalid/empty', () => {
    const out = resolvePreferredLanguage({
      userPreference: '   ', deviceLocales: [], fallback: 'he',
    });
    expect(out).toBe('he');
  });

  it('ignores an invalid user preference and uses device locale', () => {
    const out = resolvePreferredLanguage({
      userPreference: 'english', deviceLocales: ['ar'], fallback: 'he',
    });
    expect(out).toBe('ar');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- language
```

Expected: FAIL — `resolvePreferredLanguage` is not exported.

- [ ] **Step 3: Write minimal implementation** — append to `app/packages/domain/src/language.ts`:

```typescript
function tryTag(raw: string | null | undefined): LanguageTag | null {
  if (!raw) return null;
  try { return createLanguageTag(raw); } catch { return null; }
}

/**
 * Resolve the reader's effective language: explicit user preference, else the first
 * device locale that parses, else the provided fallback. The fallback MUST be a valid tag.
 */
export function resolvePreferredLanguage(opts: {
  userPreference?: string | null;
  deviceLocales?: readonly string[];
  fallback: string;
}): LanguageTag {
  const fromUser = tryTag(opts.userPreference);
  if (fromUser) return fromUser;
  for (const loc of opts.deviceLocales ?? []) {
    const tag = tryTag(loc);
    if (tag) return tag;
  }
  return createLanguageTag(opts.fallback);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- language
```

Expected: PASS (both describe blocks).

- [ ] **Step 5: Export from the barrel.** Open `app/packages/domain/src/index.ts` and add (mirror the existing `export * from './...'` style already present):

```typescript
export * from './language';
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd app && pnpm --filter @kc/domain typecheck
git add app/packages/domain/src/language.ts app/packages/domain/src/__tests__/language.test.ts app/packages/domain/src/index.ts
git commit -m "feat(domain): add resolvePreferredLanguage resolver and export language module"
```

---

## Task 3: Migration — language columns

**Files:**
- Create: `supabase/migrations/<NNNN>_ugc_translation_language_columns.sql` (`<NNNN>` from Pre-flight)

- [ ] **Step 1: Write the migration** (copies the house style from `0096_contact_phone.sql`: idempotent, column comments, named CHECK constraints):

```sql
-- <NNNN>_ugc_translation_language_columns — FR-TRANSLATE-001 (foundations).
-- Adds language plumbing for cross-language UGC translation (see
-- docs/SSOT/archive/superpowers/specs/2026-06-29-ugc-translation-design.md §4).
-- All ADD COLUMN are nullable => metadata-only, no table rewrite. Idempotent.

-- Reader's preferred output language (BCP-47). Null => resolve from device locale at runtime.
alter table public.users
  add column if not exists preferred_language text;

comment on column public.users.preferred_language is
  'BCP-47 tag for the language UGC is translated INTO for this reader. Null = fall back to device locale (resolvePreferredLanguage). Validated app-side as a LanguageTag.';

alter table public.users drop constraint if exists users_preferred_language_chk;
alter table public.users
  add constraint users_preferred_language_chk check (
    preferred_language is null
    or char_length(preferred_language) between 2 and 35
  );

-- Detected source language of post content (set later by the translate pipeline).
alter table public.posts
  add column if not exists source_language text;
alter table public.posts
  add column if not exists source_language_confidence real;

comment on column public.posts.source_language is
  'Detected BCP-47 source language of title/description. Null = not yet detected. Set by the translate pipeline (Phase 1).';
comment on column public.posts.source_language_confidence is
  'Detector self-rated confidence 0..1 for source_language. Null = unknown.';

alter table public.posts drop constraint if exists posts_source_language_conf_chk;
alter table public.posts
  add constraint posts_source_language_conf_chk check (
    source_language_confidence is null
    or source_language_confidence between 0 and 1
  );

-- Detected source language of message body.
alter table public.messages
  add column if not exists source_language text;
alter table public.messages
  add column if not exists source_language_confidence real;

comment on column public.messages.source_language is
  'Detected BCP-47 source language of body. Null = not yet detected. Set by the translate pipeline (Phase 1).';
comment on column public.messages.source_language_confidence is
  'Detector self-rated confidence 0..1 for source_language. Null = unknown.';

alter table public.messages drop constraint if exists messages_source_language_conf_chk;
alter table public.messages
  add constraint messages_source_language_conf_chk check (
    source_language_confidence is null
    or source_language_confidence between 0 and 1
  );
```

- [ ] **Step 2: Apply to dev and verify** (this plan runs under the §13 dev-DB authority; apply via the Supabase MCP `apply_migration` or local CLI). After applying, verify the columns exist:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='users' and column_name='preferred_language';
-- expect 1 row
select table_name, column_name from information_schema.columns
where table_schema='public' and column_name='source_language'
  and table_name in ('posts','messages');
-- expect 2 rows
```

Expected: `preferred_language` present on users; `source_language` present on both posts and messages.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/<NNNN>_ugc_translation_language_columns.sql
git commit -m "feat(infra): add language columns for UGC translation foundations"
```

---

## Task 4: `IUserRepository.setPreferredLanguage` port + Supabase adapter

**Files:**
- Modify: `app/packages/application/src/ports/IUserRepository.ts`
- Modify: `app/packages/infrastructure-supabase/src/users/SupabaseUserRepository.ts`
- Test: `app/packages/infrastructure-supabase/src/users/__tests__/SupabaseUserRepository.setPreferredLanguage.test.ts`

- [ ] **Step 1: Add the port method.** In `IUserRepository.ts`, add to the interface (mirror the existing `setBiography` doc/signature style):

```typescript
  /**
   * FR-TRANSLATE-001 — persist the reader's BCP-47 preferred output language.
   * Caller validates the tag (createLanguageTag) upstream. Pass `null` to reset
   * to the device-locale default. Idempotent at the DB layer.
   */
  setPreferredLanguage(userId: string, languageTag: string | null): Promise<void>;
```

- [ ] **Step 2: Write the failing adapter test.** Create `app/packages/infrastructure-supabase/src/users/__tests__/SupabaseUserRepository.setPreferredLanguage.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SupabaseUserRepository } from '../SupabaseUserRepository';

function fakeClient(captured: { table?: string; patch?: unknown; col?: string; val?: unknown }, error: unknown = null) {
  return {
    from(table: string) {
      captured.table = table;
      return {
        update(patch: unknown) {
          captured.patch = patch;
          return {
            eq(col: string, val: unknown) {
              captured.col = col; captured.val = val;
              return Promise.resolve({ error });
            },
          };
        },
      };
    },
  } as never;
}

describe('SupabaseUserRepository.setPreferredLanguage', () => {
  it('updates users.preferred_language for the given user', async () => {
    const captured: { table?: string; patch?: unknown; col?: string; val?: unknown } = {};
    const repo = new SupabaseUserRepository(fakeClient(captured));
    await repo.setPreferredLanguage('user-1', 'pt-BR');
    expect(captured.table).toBe('users');
    expect(captured.patch).toEqual({ preferred_language: 'pt-BR' });
    expect(captured.col).toBe('user_id');
    expect(captured.val).toBe('user-1');
  });

  it('writes null to reset the preference', async () => {
    const captured: { patch?: unknown } = {};
    const repo = new SupabaseUserRepository(fakeClient(captured));
    await repo.setPreferredLanguage('user-1', null);
    expect(captured.patch).toEqual({ preferred_language: null });
  });

  it('throws when the client returns an error', async () => {
    const repo = new SupabaseUserRepository(fakeClient({}, { message: 'boom' }));
    await expect(repo.setPreferredLanguage('user-1', 'en')).rejects.toThrow('boom');
  });
});
```

> Note: the test constructs `SupabaseUserRepository(fakeClient(...))`. If this repo's constructor takes the client differently (e.g. an options object), adjust the two `new SupabaseUserRepository(...)` calls to match the existing constructor signature you see in the file — do not change the production constructor.

- [ ] **Step 3: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/infrastructure-supabase test -- setPreferredLanguage
```

Expected: FAIL — `setPreferredLanguage` is not a function.

- [ ] **Step 4: Implement the adapter method.** In `SupabaseUserRepository.ts`, add (match how sibling methods reference the client — `this.client` or the field name already used in the file):

```typescript
  async setPreferredLanguage(userId: string, languageTag: string | null): Promise<void> {
    const { error } = await this.client
      .from('users')
      .update({ preferred_language: languageTag })
      .eq('user_id', userId);
    if (error) throw new Error(`setPreferredLanguage: ${error.message}`);
  }
```

- [ ] **Step 5: Run test + typecheck to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/infrastructure-supabase test -- setPreferredLanguage
cd app && pnpm --filter @kc/application typecheck && pnpm --filter @kc/infrastructure-supabase typecheck
```

Expected: tests PASS; typecheck clean (the port and adapter signatures match).

- [ ] **Step 6: Commit**

```bash
git add app/packages/application/src/ports/IUserRepository.ts app/packages/infrastructure-supabase/src/users/SupabaseUserRepository.ts app/packages/infrastructure-supabase/src/users/__tests__/SupabaseUserRepository.setPreferredLanguage.test.ts
git commit -m "feat(infra): persist users.preferred_language via IUserRepository.setPreferredLanguage"
```

---

## Task 5: Mobile device-locale wrapper

**Files:**
- Create: `app/apps/mobile/src/i18n/deviceLanguage.ts`

> Rationale: reading the device locale is platform I/O (not unit-testable purely), so this file is a thin wrapper. The decision logic it feeds (`resolvePreferredLanguage`) is already fully tested in Task 2. Keep this file minimal.

- [ ] **Step 1: Create the wrapper**

```typescript
import { getLocales } from 'expo-localization';
import { resolvePreferredLanguage, type LanguageTag } from '@kc/domain';

/** Raw BCP-47 tags from the device, most-preferred first (may be empty). */
export function getDeviceLanguageTags(): string[] {
  return getLocales()
    .map((l) => l.languageTag)
    .filter((t): t is string => Boolean(t));
}

/**
 * Effective reader language: stored user preference, else device locale, else Hebrew.
 * `userPreference` is `users.preferred_language` (nullable).
 */
export function resolveReaderLanguage(userPreference: string | null): LanguageTag {
  return resolvePreferredLanguage({
    userPreference,
    deviceLocales: getDeviceLanguageTags(),
    fallback: 'he',
  });
}
```

- [ ] **Step 2: Typecheck the mobile app**

```bash
cd app && pnpm --filter @kc/mobile typecheck
```

Expected: clean. (If `@kc/domain` isn't yet re-exporting `language.ts`, Task 2 Step 5 fixed that — re-run if needed.)

- [ ] **Step 3: Commit**

```bash
git add app/apps/mobile/src/i18n/deviceLanguage.ts
git commit -m "feat(mobile): resolve reader language from preference + device locale"
```

---

## Final verification (before opening the PR)

- [ ] **Run the full pre-push gate from `app/`:**

```bash
cd app && pnpm typecheck && NODE_OPTIONS=--experimental-require-module pnpm test && pnpm lint
```

Expected: all green. Fix any failures before pushing.

- [ ] **SSOT updates (same PR — required by CLAUDE.md §4):**
  - Create `docs/SSOT/spec/14_translation.md` with the `FR-TRANSLATE-001` foundations AC (language columns + reader-language resolution), status header marking foundations 🟡/✅.
  - Add a `BACKLOG.md` row for the translation epic (Phase 0 → ✅ when merged; Phases 1–4 → ⏳ Planned).
  - Add `DECISIONS.md` entries: provider must be zero-retention/DPA; posts auto-translate / chat opt-in with sender-consent gate.

- [ ] **Open PR to `dev`** per CLAUDE.md §6 (lowercase title, `Mapped to spec` line):

```bash
git push -u origin HEAD
gh pr create --base dev --head "$(git branch --show-current)" \
  --title "feat(translation): language foundations for cross-language ugc" \
  --body-file .github/.pr-body.md
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** §4 user/post/message language columns → Task 3. §8 `LanguageTag` + variant-aware normalization → Task 1. Reader-language resolution (§5/§8 "target = preferred_language else device locale") → Tasks 2 & 5. Persistence path for preferred_language → Task 4. Out of Phase-0 scope (deferred to later phase plans): `content_translations` table, Edge Function, RPC, UI, detection-on-create, chat opt-in.
- **Placeholder scan:** `<NNNN>` is the only intentional placeholder — resolved in Pre-flight against `origin/dev` (cannot be hardcoded because the worktree is stale). No TODO/TBD/"handle errors" left.
- **Type consistency:** `LanguageTag`, `createLanguageTag`, `resolvePreferredLanguage` names are identical across Tasks 1, 2, 5. `setPreferredLanguage(userId, languageTag)` signature is identical in the port (Task 4 Step 1) and adapter (Task 4 Step 4). Column name `preferred_language` matches between migration (Task 3) and adapter patch (Task 4).
- **Known adapt-on-contact points (flagged inline, not guesses):** `SupabaseUserRepository` constructor shape and client field name (`this.client`) — Task 4 notes to match the file's existing convention. Barrel export style in `domain/src/index.ts` — Task 2 Step 5 notes to mirror existing `export *` lines.
