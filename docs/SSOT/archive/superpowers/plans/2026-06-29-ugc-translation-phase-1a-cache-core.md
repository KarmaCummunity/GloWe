# UGC Translation — Phase 1a: Translation Cache Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the demand-driven translation **cache substrate** — the `content_translations` table (with single-flight UNIQUE, narrow grants, and deletion/moderation purge triggers), the pure domain primitives that describe a translation request and decide whether/how to cache it, and a Supabase cache repository behind an application port. No LLM, no Edge Function, no read-path change, no UI — this stage is inert and stable on its own, exactly like Phase 0. Later phases (1b provider/Edge Function, 1c posts read path) populate and consume it.

**Architecture:** Pure value objects + cache-decision helpers live in `@kc/domain` (`translations/`). The cache contract is a new port `ITranslationCacheRepository` in `@kc/application`; its Supabase adapter owns the `content_translations` table. The table is service-role-write-only (no `anon`/`authenticated` mutations) and self-cleans via `BEFORE DELETE` triggers on `posts`/`messages` plus moderation/redaction purge, so a removed post never leaves a readable translated copy.

**Tech Stack:** TypeScript, vitest, Supabase Postgres migrations (tables + triggers + grants), pnpm + turbo monorepo (packages under `app/`).

> **Spec:** `docs/SSOT/archive/superpowers/specs/2026-06-29-ugc-translation-design.md` §4 (data model), §7 (single-flight/dedup), §8 (variant-aware keys, short-circuit). Builds on Phase 0 (`FR-TRANSLATE-001`): `LanguageTag`, `createLanguageTag`, the `source_language` columns. Implements `FR-TRANSLATE-002` (cache substrate slice).

---

## Pre-flight (do once before Task 1)

- [ ] **Sync to `origin/dev` and branch.** (Phase 0 must be merged first — this plan imports `LanguageTag` from `@kc/domain` and assumes migration `0207` is applied.)

```bash
git fetch origin dev
git switch -c feat/FR-TRANSLATE-002-cache-core origin/dev
```

- [ ] **Determine the next migration number.** It is NOT hardcoded — Phase 0 used `0207`, but other PRs may have landed. Compute it:

```bash
ls supabase/migrations/ | sort | tail -3
```

Take the highest `NNNN` prefix and add 1. Use that zero-padded number wherever this plan writes `<NNNN>` (Task 2).

- [ ] **Install + env.**

```bash
cd app && pnpm install
```

Test command used throughout (Node 20.17 needs the flag per project memory):

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter <package> test
```

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `app/packages/domain/src/translations/TranslationTypes.ts` | `ContentType` (`'post'\|'message'`), `TranslationField` (`'title'\|'description'\|'body'`) literal unions + guards | Create |
| `app/packages/domain/src/translations/TranslationError.ts` | `TranslationError extends DomainError` | Create |
| `app/packages/domain/src/translations/TranslationRequest.ts` | `TranslationRequest` value object (`createTranslationRequest`) — validates content type/field/langs | Create |
| `app/packages/domain/src/translations/cacheKey.ts` | `normalizeForCache` (whitespace/case fold for dedup) + `isTranslatable` (emoji/url/number-only short-circuit) + `needsTranslation(source,target)` | Create |
| `app/packages/domain/src/translations/__tests__/*.test.ts` | Unit tests for the above | Create |
| `app/packages/domain/src/index.ts` | Barrel — re-export `translations/*` | Modify |
| `supabase/migrations/<NNNN>_content_translations.sql` | `content_translations` table + UNIQUE + grants + comments + deletion/moderation purge triggers | Create |
| `app/packages/application/src/ports/ITranslationCacheRepository.ts` | Port: `get`, `putIfAbsent`, `deleteForContent` | Create |
| `app/packages/application/src/translations/__tests__/ITranslationCacheRepository.contract.ts` | Shared contract-shape assertions reused by adapter test (optional helper) | Create |
| `app/packages/infrastructure-supabase/src/translations/SupabaseTranslationCacheRepository.ts` | Adapter implementing the port over `content_translations` | Create |
| `app/packages/infrastructure-supabase/src/translations/__tests__/SupabaseTranslationCacheRepository.test.ts` | Adapter test with a fake client | Create |
| `app/packages/infrastructure-supabase/src/index.ts` | Barrel — export the new repository | Modify |

---

## Task 1: Domain — content/field types + `TranslationError`

**Files:**
- Create: `app/packages/domain/src/translations/TranslationTypes.ts`
- Create: `app/packages/domain/src/translations/TranslationError.ts`
- Test: `app/packages/domain/src/translations/__tests__/TranslationTypes.test.ts`

- [ ] **Step 1: Write the failing test** — `app/packages/domain/src/translations/__tests__/TranslationTypes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isContentType, isTranslationField, CONTENT_TYPES, TRANSLATION_FIELDS } from '../TranslationTypes';
import { TranslationError } from '../TranslationError';
import { DomainError } from '../../errors';

describe('TranslationTypes guards', () => {
  it('accepts only known content types', () => {
    expect(isContentType('post')).toBe(true);
    expect(isContentType('message')).toBe(true);
    expect(isContentType('comment')).toBe(false);
    expect(isContentType('')).toBe(false);
  });

  it('accepts only known fields', () => {
    expect(isTranslationField('title')).toBe(true);
    expect(isTranslationField('description')).toBe(true);
    expect(isTranslationField('body')).toBe(true);
    expect(isTranslationField('caption')).toBe(false);
  });

  it('exposes the canonical lists', () => {
    expect([...CONTENT_TYPES]).toEqual(['post', 'message']);
    expect([...TRANSLATION_FIELDS]).toEqual(['title', 'description', 'body']);
  });
});

describe('TranslationError', () => {
  it('is a DomainError with code "translation"', () => {
    const err = new TranslationError('boom');
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe('translation');
    expect(err.message).toBe('boom');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- TranslationTypes
```

Expected: FAIL — cannot find module `../TranslationTypes`.

- [ ] **Step 3: Write minimal implementation**

`app/packages/domain/src/translations/TranslationTypes.ts`:

```typescript
export const CONTENT_TYPES = ['post', 'message'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const TRANSLATION_FIELDS = ['title', 'description', 'body'] as const;
export type TranslationField = (typeof TRANSLATION_FIELDS)[number];

export function isContentType(v: unknown): v is ContentType {
  return typeof v === 'string' && (CONTENT_TYPES as readonly string[]).includes(v);
}

export function isTranslationField(v: unknown): v is TranslationField {
  return typeof v === 'string' && (TRANSLATION_FIELDS as readonly string[]).includes(v);
}
```

`app/packages/domain/src/translations/TranslationError.ts` (match the existing `DomainError` subclass shape in `app/packages/domain/src/errors.ts` — confirm the constructor signature there before writing; `ValidationError` passes a `code` to `super`):

```typescript
import { DomainError } from '../errors';

export class TranslationError extends DomainError {
  constructor(message: string) {
    super(message, 'translation');
    this.name = 'TranslationError';
  }
}
```

> If `DomainError`'s constructor signature differs from `(message, code)`, adapt this `super(...)` call to match `errors.ts` exactly — do not change `DomainError`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- TranslationTypes
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/packages/domain/src/translations/TranslationTypes.ts app/packages/domain/src/translations/TranslationError.ts app/packages/domain/src/translations/__tests__/TranslationTypes.test.ts
git commit -m "feat(domain): add translation content/field types and TranslationError"
```

---

## Task 2: Migration — `content_translations` table + triggers

**Files:**
- Create: `supabase/migrations/<NNNN>_content_translations.sql` (`<NNNN>` from Pre-flight)

- [ ] **Step 1: Write the migration** (idempotent; follows house style: `if not exists`, named constraints, `comment on`, service-role-only grants). Confirm the real PK column names of `posts` (`post_id`?) and `messages` (`message_id`?) before finalizing the trigger bodies — grep `supabase/migrations` for `create table public.posts` / `public.messages`:

```sql
-- <NNNN>_content_translations — FR-TRANSLATE-002 (cache core).
-- Demand-driven translation cache. Service-role writes only; self-cleans on
-- source delete / moderation. See design §4, §7, §8.

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  field text not null,
  target_language text not null,
  source_language text,
  translated_text text not null,
  model text,
  confidence real,
  created_at timestamptz not null default now()
);

comment on table public.content_translations is
  'Demand-driven translation cache for UGC (posts/messages). One row per (content_type, content_id, target_language, field). Populated by the translate pipeline (Phase 1b). Service-role writes only.';
comment on column public.content_translations.content_id is
  'Polymorphic FK (no constraint) into posts.<pk> or messages.<pk> depending on content_type. Cleaned by BEFORE DELETE / moderation triggers.';
comment on column public.content_translations.created_at is
  'Basis for chat-translation age eviction (Phase 3). No last_read_at by design (avoids read-path write amplification).';

alter table public.content_translations drop constraint if exists content_translations_type_chk;
alter table public.content_translations
  add constraint content_translations_type_chk check (content_type in ('post','message'));

alter table public.content_translations drop constraint if exists content_translations_field_chk;
alter table public.content_translations
  add constraint content_translations_field_chk check (field in ('title','description','body'));

alter table public.content_translations drop constraint if exists content_translations_conf_chk;
alter table public.content_translations
  add constraint content_translations_conf_chk check (confidence is null or confidence between 0 and 1);

-- Single-flight + per-content prefix lookup. Order matters: content first.
create unique index if not exists content_translations_key_uidx
  on public.content_translations (content_type, content_id, target_language, field);

-- Grants: service-role only. No anon/authenticated mutation (guards grant-drift).
revoke all on public.content_translations from anon, authenticated;
grant select on public.content_translations to authenticated;

alter table public.content_translations enable row level security;
-- Reads flow through SECURITY INVOKER RPCs joined to the already-RLS'd source
-- row (Phase 1c). No direct authenticated SELECT policy here = deny by default;
-- a narrow policy is added in 1c alongside the read RPC. Service role bypasses RLS.

-- Purge translations when the source post is deleted.
create or replace function public.content_translations_purge_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.content_translations
   where content_type = 'post' and content_id = old.post_id;
  return old;
end;
$$;

drop trigger if exists trg_content_translations_purge_post on public.posts;
create trigger trg_content_translations_purge_post
  before delete on public.posts
  for each row execute function public.content_translations_purge_post();

-- Purge translations when the source message is deleted.
create or replace function public.content_translations_purge_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.content_translations
   where content_type = 'message' and content_id = old.message_id;
  return old;
end;
$$;

drop trigger if exists trg_content_translations_purge_message on public.messages;
create trigger trg_content_translations_purge_message
  before delete on public.messages
  for each row execute function public.content_translations_purge_message();

-- Purge translations when a post is moderated/removed (status flips to a removed state)
-- so no readable translated copy of removed content survives.
create or replace function public.content_translations_purge_post_on_remove()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and new.status in ('removed_admin','removed') then
    delete from public.content_translations
     where content_type = 'post' and content_id = new.post_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_content_translations_purge_post_remove on public.posts;
create trigger trg_content_translations_purge_post_remove
  after update of status on public.posts
  for each row execute function public.content_translations_purge_post_on_remove();
```

> **Before applying:** verify the actual `posts.status` enum/text removed-state value(s) (`removed_admin`, `removed`, …) by grepping the posts spec / migrations. Adjust the `in (...)` list to the real values. Verify the PK column names (`post_id`, `message_id`).

- [ ] **Step 2: Apply to dev and verify** (runs under §13 dev-DB authority; apply via Supabase MCP `apply_migration` or local CLI):

```sql
select to_regclass('public.content_translations') is not null as table_exists;
-- expect true
select indexname from pg_indexes where tablename='content_translations';
-- expect content_translations_key_uidx (+ pk)
select tgname from pg_trigger where tgrelid in ('public.posts'::regclass,'public.messages'::regclass)
  and tgname like 'trg_content_translations%';
-- expect the 3 purge triggers
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/<NNNN>_content_translations.sql
git commit -m "feat(infra): add content_translations cache table with purge triggers"
```

---

## Task 3: Domain — `TranslationRequest` value object

**Files:**
- Create: `app/packages/domain/src/translations/TranslationRequest.ts`
- Test: `app/packages/domain/src/translations/__tests__/TranslationRequest.test.ts`

- [ ] **Step 1: Write the failing test**:

```typescript
import { describe, it, expect } from 'vitest';
import { createTranslationRequest } from '../TranslationRequest';
import { ValidationError } from '../../errors';

describe('createTranslationRequest', () => {
  it('builds a normalized request', () => {
    const req = createTranslationRequest({
      contentType: 'post', contentId: '11111111-1111-1111-1111-111111111111',
      field: 'title', sourceLanguage: 'HE', targetLanguage: 'pt-br',
    });
    expect(req.contentType).toBe('post');
    expect(req.field).toBe('title');
    expect(req.sourceLanguage).toBe('he');       // normalized LanguageTag
    expect(req.targetLanguage).toBe('pt-BR');
  });

  it('allows a null/unknown source language', () => {
    const req = createTranslationRequest({
      contentType: 'message', contentId: '11111111-1111-1111-1111-111111111111',
      field: 'body', sourceLanguage: null, targetLanguage: 'en',
    });
    expect(req.sourceLanguage).toBeNull();
  });

  it('rejects an unknown content type', () => {
    expect(() => createTranslationRequest({
      contentType: 'comment' as never, contentId: '11111111-1111-1111-1111-111111111111',
      field: 'body', sourceLanguage: null, targetLanguage: 'en',
    })).toThrow(ValidationError);
  });

  it('rejects a field not valid for the content type (message must use body)', () => {
    expect(() => createTranslationRequest({
      contentType: 'message', contentId: '11111111-1111-1111-1111-111111111111',
      field: 'title', sourceLanguage: null, targetLanguage: 'en',
    })).toThrow(ValidationError);
  });

  it('rejects an invalid target language', () => {
    expect(() => createTranslationRequest({
      contentType: 'post', contentId: '11111111-1111-1111-1111-111111111111',
      field: 'title', sourceLanguage: null, targetLanguage: 'english',
    })).toThrow(ValidationError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- TranslationRequest
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `app/packages/domain/src/translations/TranslationRequest.ts`:

```typescript
import { ValidationError } from '../errors';
import { createLanguageTag, type LanguageTag } from '../language';
import { isContentType, isTranslationField, type ContentType, type TranslationField } from './TranslationTypes';

export interface TranslationRequest {
  readonly contentType: ContentType;
  readonly contentId: string;
  readonly field: TranslationField;
  readonly sourceLanguage: LanguageTag | null;
  readonly targetLanguage: LanguageTag;
}

// posts carry title/description; messages carry body only.
const FIELDS_BY_TYPE: Record<ContentType, readonly TranslationField[]> = {
  post: ['title', 'description'],
  message: ['body'],
};

export function createTranslationRequest(input: {
  contentType: string;
  contentId: string;
  field: string;
  sourceLanguage: string | null;
  targetLanguage: string;
}): TranslationRequest {
  if (!isContentType(input.contentType)) {
    throw new ValidationError(`TranslationRequest: unknown content type '${input.contentType}'`, 'contentType');
  }
  if (!isTranslationField(input.field) || !FIELDS_BY_TYPE[input.contentType].includes(input.field)) {
    throw new ValidationError(`TranslationRequest: field '${input.field}' invalid for ${input.contentType}`, 'field');
  }
  if (!input.contentId) {
    throw new ValidationError('TranslationRequest: contentId is required', 'contentId');
  }
  return {
    contentType: input.contentType,
    contentId: input.contentId,
    field: input.field,
    sourceLanguage: input.sourceLanguage ? createLanguageTag(input.sourceLanguage) : null,
    targetLanguage: createLanguageTag(input.targetLanguage),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- TranslationRequest
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/packages/domain/src/translations/TranslationRequest.ts app/packages/domain/src/translations/__tests__/TranslationRequest.test.ts
git commit -m "feat(domain): add TranslationRequest value object"
```

---

## Task 4: Domain — cache-key + short-circuit helpers

**Files:**
- Create: `app/packages/domain/src/translations/cacheKey.ts`
- Test: `app/packages/domain/src/translations/__tests__/cacheKey.test.ts`

- [ ] **Step 1: Write the failing test**:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeForCache, isTranslatable, needsTranslation } from '../cacheKey';

describe('normalizeForCache', () => {
  it('collapses whitespace and trims (case preserved — meaning-bearing)', () => {
    expect(normalizeForCache('  Hello   world  ')).toBe('Hello world');
    expect(normalizeForCache('line1\n\nline2')).toBe('line1 line2');
  });
});

describe('isTranslatable', () => {
  it('rejects empty / whitespace', () => {
    expect(isTranslatable('   ')).toBe(false);
  });
  it('rejects emoji-only', () => {
    expect(isTranslatable('🎉🎉')).toBe(false);
  });
  it('rejects url-only and number-only', () => {
    expect(isTranslatable('https://example.com')).toBe(false);
    expect(isTranslatable('  42  ')).toBe(false);
  });
  it('accepts real text', () => {
    expect(isTranslatable('שלום עולם')).toBe(true);
    expect(isTranslatable('Check https://x.com now')).toBe(true);
  });
});

describe('needsTranslation', () => {
  it('false when source equals target (same base)', () => {
    expect(needsTranslation('he', 'he')).toBe(false);
    expect(needsTranslation('pt-BR', 'pt-BR')).toBe(false);
  });
  it('true when languages differ', () => {
    expect(needsTranslation('he', 'en')).toBe(true);
  });
  it('true when source is unknown (null)', () => {
    expect(needsTranslation(null, 'en')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- cacheKey
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation** — `app/packages/domain/src/translations/cacheKey.ts`:

```typescript
/** Collapse internal whitespace runs to single spaces and trim. Case is preserved. */
export function normalizeForCache(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const URL_ONLY = /^\s*https?:\/\/\S+\s*$/i;
const NUMBER_ONLY = /^\s*[\d.,\s]+\s*$/;
// Strip emoji + symbol + whitespace; if nothing remains, it's not translatable text.
const NON_TEXT = /[\p{Extended_Pictographic}\p{Emoji_Component}\s\d.,!?()-]/gu;

/** True only when the value contains translatable natural-language text. */
export function isTranslatable(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (URL_ONLY.test(t)) return false;
  if (NUMBER_ONLY.test(t)) return false;
  const residue = t.replace(NON_TEXT, '');
  return residue.length > 0;
}

/** Whether a translation is required: unknown source, or source base != target base. */
export function needsTranslation(source: string | null, target: string): boolean {
  if (!source) return true;
  const base = (s: string) => s.toLowerCase().split('-')[0];
  return base(source) !== base(target);
}
```

> Note: `\p{Extended_Pictographic}` requires the `u` flag (present). If the lint/TS target rejects the Unicode property escape, fall back to a documented emoji range regex — keep the same test behavior.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/domain test -- cacheKey
```

Expected: PASS.

- [ ] **Step 5: Export the translations module from the barrel.** In `app/packages/domain/src/index.ts`, add (mirror existing `export * from './...'` lines):

```typescript
export * from './translations/TranslationTypes';
export * from './translations/TranslationError';
export * from './translations/TranslationRequest';
export * from './translations/cacheKey';
```

- [ ] **Step 6: Typecheck + commit**

```bash
cd app && pnpm --filter @kc/domain typecheck
git add app/packages/domain/src/translations/cacheKey.ts app/packages/domain/src/translations/__tests__/cacheKey.test.ts app/packages/domain/src/index.ts
git commit -m "feat(domain): add translation cache-key + short-circuit helpers and export module"
```

---

## Task 5: Application — `ITranslationCacheRepository` port

**Files:**
- Create: `app/packages/application/src/ports/ITranslationCacheRepository.ts`

- [ ] **Step 1: Define the port** (no test — interfaces are validated by the adapter test in Task 6 and by typecheck). Mirror the doc style of existing `I*.ts` ports:

```typescript
import type { ContentType, TranslationField } from '@kc/domain';

export interface CachedTranslation {
  contentType: ContentType;
  contentId: string;
  field: TranslationField;
  targetLanguage: string;
  sourceLanguage: string | null;
  translatedText: string;
  model: string | null;
  confidence: number | null;
}

export interface TranslationCacheKey {
  contentType: ContentType;
  contentId: string;
  field: TranslationField;
  targetLanguage: string;
}

export interface ITranslationCacheRepository {
  /** FR-TRANSLATE-002 — return the cached translation for a key, or null on miss. */
  get(key: TranslationCacheKey): Promise<CachedTranslation | null>;

  /**
   * Insert a translation only if absent (single-flight via the table's UNIQUE).
   * Returns true if this call inserted the row, false if a row already existed.
   */
  putIfAbsent(row: CachedTranslation): Promise<boolean>;

  /** Remove all cached translations for a piece of content (used on source edit/correction). */
  deleteForContent(contentType: ContentType, contentId: string): Promise<void>;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd app && pnpm --filter @kc/application typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/packages/application/src/ports/ITranslationCacheRepository.ts
git commit -m "feat(application): add ITranslationCacheRepository port"
```

---

## Task 6: Infrastructure — `SupabaseTranslationCacheRepository`

**Files:**
- Create: `app/packages/infrastructure-supabase/src/translations/SupabaseTranslationCacheRepository.ts`
- Test: `app/packages/infrastructure-supabase/src/translations/__tests__/SupabaseTranslationCacheRepository.test.ts`
- Modify: `app/packages/infrastructure-supabase/src/index.ts`

> Match the constructor convention of the sibling repositories (e.g. `SupabaseUserRepository(private readonly client: SupabaseClient)`) — confirm before writing.

- [ ] **Step 1: Write the failing adapter test** — use a hand-rolled fake client that records `from/select/eq/maybeSingle` and `insert`:

```typescript
import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseTranslationCacheRepository } from '../SupabaseTranslationCacheRepository';

/* eslint-disable @typescript-eslint/no-explicit-any */

const ROW = {
  content_type: 'post', content_id: 'p1', field: 'title',
  target_language: 'en', source_language: 'he',
  translated_text: 'Hello', model: 'flash', confidence: 0.9,
};

function makeClient(opts: {
  selectData?: any; selectError?: any;
  insertError?: any; insertConflict?: boolean;
} = {}) {
  const calls: any = { selectFilters: {}, inserted: undefined, deletedFilters: {} };
  const client = {
    from() {
      return {
        select() {
          return {
            eq(col: string, val: unknown) {
              calls.selectFilters[col] = val;
              return this;
            },
            maybeSingle: async () => ({ data: opts.selectData ?? null, error: opts.selectError ?? null }),
          };
        },
        insert(row: any) {
          calls.inserted = row;
          // PostgREST returns code 23505 on unique violation.
          const error = opts.insertConflict ? { code: '23505', message: 'dup' } : (opts.insertError ?? null);
          return Promise.resolve({ error });
        },
        delete() {
          return {
            eq(col: string, val: unknown) { calls.deletedFilters[col] = val; return this; },
            then: undefined,
          };
        },
      };
    },
  } as unknown as SupabaseClient<any>;
  return { client, calls };
}

describe('SupabaseTranslationCacheRepository', () => {
  it('get() returns a mapped row on hit', async () => {
    const { client } = makeClient({ selectData: ROW });
    const repo = new SupabaseTranslationCacheRepository(client);
    const out = await repo.get({ contentType: 'post', contentId: 'p1', field: 'title', targetLanguage: 'en' });
    expect(out?.translatedText).toBe('Hello');
    expect(out?.sourceLanguage).toBe('he');
  });

  it('get() returns null on miss', async () => {
    const { client } = makeClient({ selectData: null });
    const repo = new SupabaseTranslationCacheRepository(client);
    expect(await repo.get({ contentType: 'post', contentId: 'p1', field: 'title', targetLanguage: 'en' })).toBeNull();
  });

  it('putIfAbsent() returns true when inserted', async () => {
    const { client, calls } = makeClient({});
    const repo = new SupabaseTranslationCacheRepository(client);
    const inserted = await repo.putIfAbsent({
      contentType: 'post', contentId: 'p1', field: 'title', targetLanguage: 'en',
      sourceLanguage: 'he', translatedText: 'Hello', model: 'flash', confidence: 0.9,
    });
    expect(inserted).toBe(true);
    expect(calls.inserted).toMatchObject({ content_type: 'post', target_language: 'en', translated_text: 'Hello' });
  });

  it('putIfAbsent() returns false on unique conflict (single-flight loser)', async () => {
    const { client } = makeClient({ insertConflict: true });
    const repo = new SupabaseTranslationCacheRepository(client);
    const inserted = await repo.putIfAbsent({
      contentType: 'post', contentId: 'p1', field: 'title', targetLanguage: 'en',
      sourceLanguage: 'he', translatedText: 'Hello', model: 'flash', confidence: 0.9,
    });
    expect(inserted).toBe(false);
  });

  it('putIfAbsent() throws on a non-conflict error', async () => {
    const { client } = makeClient({ insertError: { code: '42501', message: 'rls' } });
    const repo = new SupabaseTranslationCacheRepository(client);
    await expect(repo.putIfAbsent({
      contentType: 'post', contentId: 'p1', field: 'title', targetLanguage: 'en',
      sourceLanguage: 'he', translatedText: 'Hello', model: null, confidence: null,
    })).rejects.toThrow('putIfAbsent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/infrastructure-supabase test -- SupabaseTranslationCacheRepository
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter** — `app/packages/infrastructure-supabase/src/translations/SupabaseTranslationCacheRepository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ITranslationCacheRepository,
  CachedTranslation,
  TranslationCacheKey,
} from '@kc/application';
import type { ContentType, TranslationField } from '@kc/domain';

const COLUMNS =
  'content_type, content_id, field, target_language, source_language, translated_text, model, confidence';

export class SupabaseTranslationCacheRepository implements ITranslationCacheRepository {
  constructor(private readonly client: SupabaseClient) {}

  async get(key: TranslationCacheKey): Promise<CachedTranslation | null> {
    const { data, error } = await this.client
      .from('content_translations')
      .select(COLUMNS)
      .eq('content_type', key.contentType)
      .eq('content_id', key.contentId)
      .eq('field', key.field)
      .eq('target_language', key.targetLanguage)
      .maybeSingle();
    if (error) throw new Error(`getTranslation: ${error.message}`);
    return data ? mapRow(data) : null;
  }

  async putIfAbsent(row: CachedTranslation): Promise<boolean> {
    const { error } = await this.client.from('content_translations').insert({
      content_type: row.contentType,
      content_id: row.contentId,
      field: row.field,
      target_language: row.targetLanguage,
      source_language: row.sourceLanguage,
      translated_text: row.translatedText,
      model: row.model,
      confidence: row.confidence,
    });
    if (!error) return true;
    if ((error as { code?: string }).code === '23505') return false; // unique violation = already cached
    throw new Error(`putIfAbsent: ${error.message}`);
  }

  async deleteForContent(contentType: ContentType, contentId: string): Promise<void> {
    const { error } = await this.client
      .from('content_translations')
      .delete()
      .eq('content_type', contentType)
      .eq('content_id', contentId);
    if (error) throw new Error(`deleteForContent: ${error.message}`);
  }
}

function mapRow(r: Record<string, unknown>): CachedTranslation {
  return {
    contentType: r.content_type as ContentType,
    contentId: r.content_id as string,
    field: r.field as TranslationField,
    targetLanguage: r.target_language as string,
    sourceLanguage: (r.source_language as string | null) ?? null,
    translatedText: r.translated_text as string,
    model: (r.model as string | null) ?? null,
    confidence: (r.confidence as number | null) ?? null,
  };
}
```

- [ ] **Step 4: Run test + typecheck to verify it passes**

```bash
cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/infrastructure-supabase test -- SupabaseTranslationCacheRepository
cd app && pnpm --filter @kc/infrastructure-supabase typecheck
```

Expected: tests PASS; typecheck clean.

- [ ] **Step 5: Export from the infra barrel.** In `app/packages/infrastructure-supabase/src/index.ts`, add (mirror existing export style):

```typescript
export * from './translations/SupabaseTranslationCacheRepository';
```

- [ ] **Step 6: Commit**

```bash
git add app/packages/infrastructure-supabase/src/translations/SupabaseTranslationCacheRepository.ts app/packages/infrastructure-supabase/src/translations/__tests__/SupabaseTranslationCacheRepository.test.ts app/packages/infrastructure-supabase/src/index.ts
git commit -m "feat(infra): add SupabaseTranslationCacheRepository over content_translations"
```

---

## Final verification (before opening the PR)

- [ ] **Run the full pre-push gate from `app/`:**

```bash
cd app && pnpm typecheck && NODE_OPTIONS=--experimental-require-module pnpm test && pnpm lint && pnpm lint:arch
```

Expected: all green.

- [ ] **SSOT updates (same PR):**
  - `docs/SSOT/spec/18_translation.md` — flesh out `FR-TRANSLATE-002` ACs (cache table, single-flight, purge-on-delete/moderation, repository contract) and flip status to 🟡.
  - `docs/SSOT/BACKLOG.md` — flip `TRANSLATE-P1` to 🟡 / split a `TRANSLATE-P1a` row to ✅ when merged.
  - `docs/SSOT/TECH_DEBT.md` — note the RLS read policy for `content_translations` is intentionally deferred to Phase 1c (added with the read RPC).

- [ ] **Open PR to `dev`** (lowercase title, `Mapped to spec` line) per CLAUDE.md §6.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §4 `content_translations` schema + grants + deletion/moderation triggers → Task 2. §4/§7 single-flight UNIQUE → Task 2 index + Task 6 `putIfAbsent` 23505 handling. §8 variant-aware keys (distinct `target_language` rows) → cache key includes full `LanguageTag`; short-circuit (emoji/url/number-only) → Task 4; dedup normalization → Task 4 `normalizeForCache`. Domain request modeling → Tasks 1 & 3. Port + adapter → Tasks 5 & 6. **Deferred to later phases (not this plan):** Edge Function + provider (1b), `TranslateAndCache`/`GetTranslatedContent` use cases (1b/1c), SECURITY INVOKER read RPC + `content_translations` SELECT policy + client batching/dwell (1c), reader UX (Phase 2), chat opt-in (Phase 3).
- **Placeholder scan:** `<NNNN>` resolved in Pre-flight. Two flagged adapt-on-contact points (real removed-status values + PK column names in Task 2; sibling constructor convention in Task 6) — verification commands given, not guesses.
- **Type consistency:** `ContentType`/`TranslationField` literal unions are defined once (Task 1) and reused in `TranslationRequest` (Task 3), the port (Task 5), and the adapter (Task 6). `CachedTranslation`/`TranslationCacheKey` shapes are identical between port (Task 5) and adapter map/insert (Task 6). Column names (`content_type`, `content_id`, `field`, `target_language`, `translated_text`, `confidence`) match between migration (Task 2) and adapter (Task 6).
```
