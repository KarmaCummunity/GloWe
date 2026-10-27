# GLOWE Web UGC Translation (FR-TRANSLATE-005) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-translate GLOWE user-generated content (posts, wishes, opportunities, projects, profiles) into the reader's interface language, serving anonymous readers, with a "Show original" toggle shown only when a translation was actually applied.

**Architecture:** Mirror the KC FR-TRANSLATE-003 demand-driven pipeline but isolated for GLOWE and anon-friendly. A new anon-readable cache table (`glowe_content_translations`, `content_id text`) + a new anon-allowed Edge Function (`glowe-translate`) that re-reads source text server-side (anti-poisoning) and shares the Gemini provider via extracted `_shared/translation/` modules. The GLOWE static frontend reads the cache directly (anon SELECT) and calls the function for misses, patching rendered cards in place. KC's `translate` path stays behavior-identical (only its imports move to the shared modules).

**Tech Stack:** Supabase Postgres + RLS, Deno Edge Functions, Gemini Flash, vanilla-JS (`app/apps/glowe-web`).

**Scope note (engineering decision):** Phase 1 translates scalar TEXT fields only — `glowe_posts.{title,text}`, `glowe_opportunities.{title,description}`, `glowe_projects.{title,description}`, `glowe_profiles.{about,focus,needs}`. Array fields (`requirements`, `responsibilities`, `skills`, `tags`) and person/org display names are intentionally excluded (names per PM decision; arrays deferred as TD-<new> — element-wise translation is a follow-up). Reader languages: `en`, `he` (GLOWE chrome i18n only offers these).

---

## File Structure

- Create: `supabase/migrations/0219_glowe_content_translations.sql` — cache table, RLS (anon+auth read), purge triggers.
- Create: `supabase/functions/_shared/translation/provider.ts`, `gemini.ts`, `supportedLanguages.ts`, `shortcircuit.ts` — extracted, shared by both functions.
- Modify: `supabase/functions/translate/index.ts` — import shared modules; delete now-duplicated local copies.
- Delete: `supabase/functions/translate/{provider.ts,gemini.ts,supportedLanguages.ts,shortcircuit.ts}`.
- Create: `supabase/functions/glowe-translate/index.ts` — anon-allowed, service-role source re-read + cache write.
- Create: `supabase/functions/glowe-translate/cache.ts` — get/putIfAbsent over `glowe_content_translations`.
- Create: `app/apps/glowe-web/js/glowe-translate.js` — demand-driven DOM-patch module (`window.GloweTranslate`).
- Create: `app/apps/glowe-web/js/__tests__/glowe-translate.test.js` — pure-logic unit tests.
- Modify: `app/apps/glowe-web/index.html` (+ any page that renders cards) — add `<script src="js/glowe-translate.js">`.
- Modify: `app/apps/glowe-web/js/app.js` — add `data-tr-*` attributes to translatable card elements; boot `GloweTranslate` observer.

---

## Task 1: Cache table migration (0219)

**Files:**
- Create: `supabase/migrations/0219_glowe_content_translations.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0219_glowe_content_translations — FR-TRANSLATE-005 (GLOWE UGC translation cache).
--
-- GLOWE-isolated mirror of public.content_translations. Differences from the KC
-- cache (0208):
--   • content_id is TEXT (GLOWE PKs are text, e.g. 'post-<uuid>'); profiles use
--     the auth uid cast to text.
--   • anon MAY read (GLOWE serves anonymous readers — FR-TRANSLATE-005 AC8). All
--     GLOWE source content is already anon-public ("glowe public read"), so the
--     translation cache carries no additional visibility surface.
--   • Writes remain service-role-only (populated by the glowe-translate function).
-- All statements additive / idempotent. KC's content_translations is untouched.
--
-- Mapped to spec: FR-TRANSLATE-005 (spec/18_translation.md).

set search_path = public;

create table if not exists public.glowe_content_translations (
  id              uuid primary key default gen_random_uuid(),
  content_type    text not null,
  content_id      text not null,
  field           text not null,
  target_language text not null,
  source_language text,
  translated_text text not null,
  model           text,
  confidence      real,
  created_at      timestamptz not null default now()
);

comment on table public.glowe_content_translations is
  'FR-TRANSLATE-005 demand-driven translation cache for GLOWE UGC. One row per (content_type, content_id, target_language, field). Service-role writes only; anon+authenticated read.';

alter table public.glowe_content_translations drop constraint if exists glowe_ct_type_chk;
alter table public.glowe_content_translations
  add constraint glowe_ct_type_chk check (
    content_type in ('glowe_post','glowe_opportunity','glowe_project','glowe_profile')
  );

alter table public.glowe_content_translations drop constraint if exists glowe_ct_field_chk;
alter table public.glowe_content_translations
  add constraint glowe_ct_field_chk check (
    field in ('title','text','description','about','focus','needs')
  );

alter table public.glowe_content_translations drop constraint if exists glowe_ct_conf_chk;
alter table public.glowe_content_translations
  add constraint glowe_ct_conf_chk check (confidence is null or confidence between 0 and 1);

create unique index if not exists glowe_content_translations_key_uidx
  on public.glowe_content_translations (content_type, content_id, target_language, field);

-- Grants: anon + authenticated may read (deliberate — anon readers). Writes are
-- service-role only (bypasses grants + RLS).
revoke all on public.glowe_content_translations from anon, authenticated;
grant select on public.glowe_content_translations to anon, authenticated;

alter table public.glowe_content_translations enable row level security;

-- All GLOWE content is anon-public, so the translation cache is readable by all.
drop policy if exists glowe_ct_public_read on public.glowe_content_translations;
create policy glowe_ct_public_read
  on public.glowe_content_translations
  for select
  to anon, authenticated
  using (true);

-- ── Purge on source delete / edit (stale translations must not survive) ──────
-- glowe_posts: purge on delete + when title/text change.
create or replace function public.glowe_ct_purge_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.glowe_content_translations
   where content_type = 'glowe_post' and content_id = old.id;
  return old;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_post_del on public.glowe_posts;
create trigger trg_glowe_ct_purge_post_del
  before delete on public.glowe_posts
  for each row execute function public.glowe_ct_purge_post();

create or replace function public.glowe_ct_purge_post_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is distinct from old.title or new.text is distinct from old.text then
    delete from public.glowe_content_translations
     where content_type = 'glowe_post' and content_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_post_edit on public.glowe_posts;
create trigger trg_glowe_ct_purge_post_edit
  after update of title, text on public.glowe_posts
  for each row execute function public.glowe_ct_purge_post_edit();

-- glowe_opportunities: purge on delete + when title/description change.
create or replace function public.glowe_ct_purge_opportunity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.glowe_content_translations
   where content_type = 'glowe_opportunity' and content_id = old.id;
  return old;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_opp_del on public.glowe_opportunities;
create trigger trg_glowe_ct_purge_opp_del
  before delete on public.glowe_opportunities
  for each row execute function public.glowe_ct_purge_opportunity();

create or replace function public.glowe_ct_purge_opportunity_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is distinct from old.title
     or new.description is distinct from old.description then
    delete from public.glowe_content_translations
     where content_type = 'glowe_opportunity' and content_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_opp_edit on public.glowe_opportunities;
create trigger trg_glowe_ct_purge_opp_edit
  after update of title, description on public.glowe_opportunities
  for each row execute function public.glowe_ct_purge_opportunity_edit();

-- glowe_projects: purge on delete + when title/description change.
create or replace function public.glowe_ct_purge_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.glowe_content_translations
   where content_type = 'glowe_project' and content_id = old.id;
  return old;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_proj_del on public.glowe_projects;
create trigger trg_glowe_ct_purge_proj_del
  before delete on public.glowe_projects
  for each row execute function public.glowe_ct_purge_project();

create or replace function public.glowe_ct_purge_project_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is distinct from old.title
     or new.description is distinct from old.description then
    delete from public.glowe_content_translations
     where content_type = 'glowe_project' and content_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_proj_edit on public.glowe_projects;
create trigger trg_glowe_ct_purge_proj_edit
  after update of title, description on public.glowe_projects
  for each row execute function public.glowe_ct_purge_project_edit();

-- glowe_profiles: PK is uuid; store content_id as id::text. Purge on delete +
-- when about/focus/needs change.
create or replace function public.glowe_ct_purge_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.glowe_content_translations
   where content_type = 'glowe_profile' and content_id = old.id::text;
  return old;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_profile_del on public.glowe_profiles;
create trigger trg_glowe_ct_purge_profile_del
  before delete on public.glowe_profiles
  for each row execute function public.glowe_ct_purge_profile();

create or replace function public.glowe_ct_purge_profile_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.about is distinct from old.about
     or new.focus is distinct from old.focus
     or new.needs is distinct from old.needs then
    delete from public.glowe_content_translations
     where content_type = 'glowe_profile' and content_id = new.id::text;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_glowe_ct_purge_profile_edit on public.glowe_profiles;
create trigger trg_glowe_ct_purge_profile_edit
  after update of about, focus, needs on public.glowe_profiles
  for each row execute function public.glowe_ct_purge_profile_edit();
```

- [ ] **Step 2: Apply on dev via CLI** (per CLAUDE.md §9 — never MCP `apply_migration`)

Run: `cd <repo> && supabase db push` (or `supabase migration up`) with dev creds sourced from `~/.kc-dev-secrets.env`.
Expected: `0219_glowe_content_translations` applied, no errors.

- [ ] **Step 3: Verify** with MCP `execute_sql` (read-only)

Run: `select count(*) from public.glowe_content_translations;` → `0`. `\d` shows anon SELECT grant + `glowe_ct_public_read` policy.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0219_glowe_content_translations.sql
git commit -m "feat(infra): add glowe_content_translations cache table (FR-TRANSLATE-005)"
```

---

## Task 2: Extract shared translation modules

**Files:**
- Create: `supabase/functions/_shared/translation/{provider.ts,gemini.ts,supportedLanguages.ts,shortcircuit.ts}`
- Modify: `supabase/functions/translate/index.ts`
- Delete: `supabase/functions/translate/{provider.ts,gemini.ts,supportedLanguages.ts,shortcircuit.ts}`

- [ ] **Step 1: Move the four modules verbatim** into `_shared/translation/` (content unchanged — they have no relative imports outside the group; `provider.ts` imports `./gemini.ts`, which stays valid in the new folder).

- [ ] **Step 2: Repoint KC `translate/index.ts` imports**

```ts
import { isTranslatable, needsTranslation } from '../_shared/translation/shortcircuit.ts';
import { selectProvider } from '../_shared/translation/provider.ts';
import { isSupportedTarget } from '../_shared/translation/supportedLanguages.ts';
```

- [ ] **Step 3: Delete the old local copies** (`git rm supabase/functions/translate/{provider,gemini,supportedLanguages,shortcircuit}.ts`). `translate/cache.ts` and `translate/auth.ts` stay local (KC-specific).

- [ ] **Step 4: Deploy + smoke** the KC `translate` function on dev; confirm a known post still translates (behavior unchanged).

Run: `supabase functions deploy translate`

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/translation supabase/functions/translate/index.ts
git commit -m "refactor(infra): extract shared translation provider modules (FR-TRANSLATE-005)"
```

---

## Task 3: `glowe-translate` Edge Function (anon-allowed)

**Files:**
- Create: `supabase/functions/glowe-translate/cache.ts`
- Create: `supabase/functions/glowe-translate/index.ts`

- [ ] **Step 1: cache.ts** (get/putIfAbsent over `glowe_content_translations`)

```ts
// supabase/functions/glowe-translate/cache.ts
// Service-role get/insert over glowe_content_translations. content_id is TEXT.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface CacheKey {
  contentType: string;
  contentId: string;
  field: string;
  targetLanguage: string;
}
export interface CacheRow extends CacheKey {
  sourceLanguage: string | null;
  translatedText: string;
  model: string | null;
  confidence: number | null;
}

const COLUMNS =
  'content_type, content_id, field, target_language, source_language, translated_text, model, confidence';

export async function getCached(svc: SupabaseClient, key: CacheKey): Promise<CacheRow | null> {
  const { data, error } = await svc
    .from('glowe_content_translations')
    .select(COLUMNS)
    .eq('content_type', key.contentType)
    .eq('content_id', key.contentId)
    .eq('field', key.field)
    .eq('target_language', key.targetLanguage)
    .maybeSingle();
  if (error) throw new Error(`getCached: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function putIfAbsent(svc: SupabaseClient, row: CacheRow): Promise<boolean> {
  const { error } = await svc.from('glowe_content_translations').insert({
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
  if ((error as { code?: string }).code === '23505') return false;
  throw new Error(`putIfAbsent: ${error.message}`);
}

function mapRow(d: Record<string, unknown>): CacheRow {
  return {
    contentType: d.content_type as string,
    contentId: d.content_id as string,
    field: d.field as string,
    targetLanguage: d.target_language as string,
    sourceLanguage: (d.source_language as string | null) ?? null,
    translatedText: d.translated_text as string,
    model: (d.model as string | null) ?? null,
    confidence: (d.confidence as number | null) ?? null,
  };
}
```

- [ ] **Step 2: index.ts** (anon-allowed; service-role source re-read; all GLOWE content is public so no per-user RLS visibility check is needed)

```ts
// supabase/functions/glowe-translate/index.ts — FR-TRANSLATE-005.
//
// Demand-driven, single-target translation of one GLOWE content field. Anon is
// allowed (GLOWE serves anonymous readers). Anti-poisoning: the text is READ
// FROM THE SOURCE ROW with the service-role client, never from the request body,
// so a client cannot poison the shared cache. All GLOWE source tables are
// anon-public, so no per-user visibility check is required.
//
// POST { contentType, contentId, field, targetLanguage }
//   → 200 { status:'translated'|'cached'|'skipped', translation?: {...} }
//   → 400 invalid_body|unsupported_language   405 method_not_allowed
//   → 502 provider_failed                     500 internal
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
import { isTranslatable, needsTranslation } from '../_shared/translation/shortcircuit.ts';
import { selectProvider } from '../_shared/translation/provider.ts';
import { isSupportedTarget } from '../_shared/translation/supportedLanguages.ts';
import { getCached, putIfAbsent, type CacheKey } from './cache.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_INPUT = 5000;

// content_type → source table + PK column + { field: db column }.
// Names (author_name, organization, display_name) are deliberately absent.
const SOURCE: Record<string, { table: string; pk: string; fields: Record<string, string> }> = {
  glowe_post: { table: 'glowe_posts', pk: 'id', fields: { title: 'title', text: 'text' } },
  glowe_opportunity: {
    table: 'glowe_opportunities', pk: 'id',
    fields: { title: 'title', description: 'description' },
  },
  glowe_project: {
    table: 'glowe_projects', pk: 'id',
    fields: { title: 'title', description: 'description' },
  },
  glowe_profile: {
    table: 'glowe_profiles', pk: 'id',
    fields: { about: 'about', focus: 'focus', needs: 'needs' },
  },
};

function json(body: unknown, status: number, h: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...h },
  });
}

interface Body {
  contentType: string; contentId: string; field: string; targetLanguage: string;
}
function isValid(b: unknown): b is Body {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  const src = typeof o.contentType === 'string' ? SOURCE[o.contentType] : undefined;
  if (!src) return false;
  if (typeof o.contentId !== 'string' || !o.contentId) return false;
  if (typeof o.field !== 'string' || !src.fields[o.field]) return false;
  if (typeof o.targetLanguage !== 'string' || !o.targetLanguage) return false;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    return isAllowedOrigin(origin)
      ? new Response('ok', { status: 200, headers: corsHeaders(origin) })
      : json({ error: 'origin_not_allowed' }, 403);
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const hdrs = isAllowedOrigin(origin) ? corsHeaders(origin) : {};

  let body: Body;
  try {
    const raw = await req.json();
    if (!isValid(raw)) return json({ error: 'invalid_body' }, 400, hdrs);
    body = raw;
  } catch {
    return json({ error: 'invalid_body' }, 400, hdrs);
  }
  if (!isSupportedTarget(body.targetLanguage)) {
    return json({ error: 'unsupported_language' }, 400, hdrs);
  }

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const src = SOURCE[body.contentType];
  const column = src.fields[body.field];

  const { data: srcRow, error: readErr } = await svc
    .from(src.table).select(`${src.pk}, ${column}`).eq(src.pk, body.contentId).maybeSingle();
  if (readErr) return json({ error: 'internal' }, 500, hdrs);
  if (!srcRow) return json({ status: 'skipped' }, 200, hdrs);
  const sourceText = (srcRow as Record<string, unknown>)[column];
  if (typeof sourceText !== 'string' || sourceText.trim().length === 0) {
    return json({ status: 'skipped' }, 200, hdrs);
  }
  if (sourceText.length > MAX_INPUT || !isTranslatable(sourceText)) {
    return json({ status: 'skipped' }, 200, hdrs);
  }

  const key: CacheKey = {
    contentType: body.contentType, contentId: body.contentId,
    field: body.field, targetLanguage: body.targetLanguage,
  };
  const cached = await getCached(svc, key);
  if (cached) return json({ status: 'cached', translation: cached }, 200, hdrs);

  let result;
  try {
    result = await selectProvider().translate({ text: sourceText, targetLanguage: body.targetLanguage });
  } catch (_e) {
    console.warn('[glowe-translate] provider failed', { contentType: body.contentType, field: body.field });
    return json({ error: 'provider_failed' }, 502, hdrs);
  }
  if (!needsTranslation(result.detectedSourceLanguage, body.targetLanguage)) {
    return json({ status: 'skipped' }, 200, hdrs);
  }

  const row = {
    ...key,
    sourceLanguage: result.detectedSourceLanguage,
    translatedText: result.translatedText,
    model: result.model,
    confidence: result.confidence,
  };
  const inserted = await putIfAbsent(svc, row);
  const translation = inserted ? row : (await getCached(svc, key)) ?? row;
  return json({ status: inserted ? 'translated' : 'cached', translation }, 200, hdrs);
});
```

- [ ] **Step 3: Confirm `glowe-web` origin is allowed** in `_shared/cors.ts` (dev preview + `dev.karma-community.pages.dev`). Add the GLOWE origin if missing.

- [ ] **Step 4: Deploy `glowe-translate` (JWT verification OFF — anon must call)**

Run: `supabase functions deploy glowe-translate --no-verify-jwt`

- [ ] **Step 5: Smoke via curl** (anon key, Hebrew post → en)

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/glowe-translate" \
  -H "Authorization: Bearer $ANON_KEY" -H 'Content-Type: application/json' \
  -H "Origin: https://dev.karma-community.pages.dev" \
  -d '{"contentType":"glowe_post","contentId":"<real-id>","field":"text","targetLanguage":"en"}'
```
Expected: `{"status":"translated","translation":{...}}` first call, `"cached"` second.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/glowe-translate
git commit -m "feat(infra): add anon glowe-translate edge function (FR-TRANSLATE-005)"
```

---

## Task 4: Frontend module `glowe-translate.js`

**Files:**
- Create: `app/apps/glowe-web/js/glowe-translate.js`
- Create: `app/apps/glowe-web/js/__tests__/glowe-translate.test.js`

Design: after cards render, a debounced observer scans `[data-tr-card]` nodes. For each card it reads `data-tr-type` + `data-tr-id` and collects child `[data-tr-field]` elements (source text = current `textContent`). It (a) batch-reads the cache table for the reader language, (b) calls `glowe-translate` for misses, (c) swaps `textContent` when a translation applies and stores the source in `data-tr-source`, (d) injects a "Show original"/"הצג מקור" toggle into the card ONLY when ≥1 field was translated. A session skip-set avoids re-calling skipped/failed tuples. Reader-language change reloads the page (existing `setGloweLanguage`), so no live re-scan is needed.

- [ ] **Step 1: Write the module**

```js
// GloWe UGC translation (FR-TRANSLATE-005).
//
// Progressive enhancement: cards render in their source language immediately;
// this module translates them into the reader's interface language in the
// background and injects a "Show original" toggle only when a translation was
// actually applied. Pure helpers are exported for unit tests; the DOM/network
// driver runs only in the browser.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweTranslate = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const TOGGLE_LABELS = { he: { show: 'הצג מקור', hide: 'הצג תרגום' },
                            en: { show: 'Show original', hide: 'Show translation' } };

    // Base language subtag, lowercased ("en-US" -> "en").
    function baseLang(tag) { return String(tag || '').split('-')[0].toLowerCase(); }

    // True when source is unknown or its base differs from target.
    function needsTranslation(source, target) {
        if (!source) return true;
        return baseLang(source) !== baseLang(target);
    }

    // Session key for the skip-set / de-dupe.
    function tupleKey(type, id, field, target) {
        return type + '|' + id + '|' + field + '|' + target;
    }

    // Collect { type, id, fields:[{field, el}] } for every not-yet-processed card.
    function collectCards(root) {
        const cards = [];
        const nodes = root.querySelectorAll('[data-tr-card]:not([data-tr-done])');
        nodes.forEach(function (card) {
            const type = card.getAttribute('data-tr-type');
            const id = card.getAttribute('data-tr-id');
            if (!type || !id) return;
            const fields = [];
            card.querySelectorAll('[data-tr-field]').forEach(function (el) {
                const field = el.getAttribute('data-tr-field');
                const source = (el.textContent || '').trim();
                if (field && source) fields.push({ field: field, el: el });
            });
            if (fields.length) cards.push({ card: card, type: type, id: id, fields: fields });
        });
        return cards;
    }

    return {
        baseLang: baseLang,
        needsTranslation: needsTranslation,
        tupleKey: tupleKey,
        collectCards: collectCards,
        TOGGLE_LABELS: TOGGLE_LABELS,
    };
});
```

- [ ] **Step 2: Append the browser driver** (guarded by `typeof window`)

```js
// --- browser driver (appended to glowe-translate.js) ---
if (typeof window !== 'undefined') {
    (function () {
        const T = window.GloweTranslate;
        const skip = new Set();
        let observer = null, scheduled = false;

        function readerLang() {
            const fn = window.getGloweLanguage;
            return typeof fn === 'function' ? fn() : 'en';
        }

        async function client() {
            if (typeof gloweBackend === 'undefined' || !gloweBackend.configured()) return null;
            return gloweBackend.getClient ? gloweBackend.getClient() : null;
        }

        // Batch-read cached translations for the given card ids + target.
        async function readCache(sb, ids, target) {
            const { data, error } = await sb
                .from('glowe_content_translations')
                .select('content_type, content_id, field, translated_text, source_language')
                .eq('target_language', target)
                .in('content_id', ids);
            if (error || !data) return {};
            const map = {};
            data.forEach(function (r) {
                map[r.content_type + '|' + r.content_id + '|' + r.field] = r;
            });
            return map;
        }

        function applyTranslation(el, source, translated) {
            if (!translated || translated === source) return false;
            el.setAttribute('data-tr-source', source);
            el.setAttribute('data-tr-translated', translated);
            el.textContent = translated;
            return true;
        }

        function injectToggle(card, target) {
            if (card.querySelector('.tr-toggle')) return;
            const labels = T.TOGGLE_LABELS[T.baseLang(target)] || T.TOGGLE_LABELS.en;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tr-toggle';
            btn.textContent = labels.show;
            btn.setAttribute('data-showing', 'translation');
            btn.addEventListener('click', function () {
                const showingSource = btn.getAttribute('data-showing') === 'source';
                card.querySelectorAll('[data-tr-translated]').forEach(function (el) {
                    el.textContent = showingSource
                        ? el.getAttribute('data-tr-translated')
                        : el.getAttribute('data-tr-source');
                });
                btn.setAttribute('data-showing', showingSource ? 'translation' : 'source');
                btn.textContent = showingSource ? labels.show : labels.hide;
            });
            card.appendChild(btn);
        }

        async function translateMiss(sb, type, id, field, target) {
            const key = T.tupleKey(type, id, field, target);
            if (skip.has(key)) return null;
            try {
                const { data, error } = await sb.functions.invoke('glowe-translate', {
                    body: { contentType: type, contentId: id, field: field, targetLanguage: target },
                });
                if (error || !data || data.status === 'skipped' || !data.translation) {
                    skip.add(key); return null;
                }
                return data.translation; // { translated_text, source_language }
            } catch (_e) { skip.add(key); return null; }
        }

        async function processCard(sb, entry, target, cacheMap) {
            let any = false;
            for (const f of entry.fields) {
                const source = (f.el.textContent || '').trim();
                const hit = cacheMap[entry.type + '|' + entry.id + '|' + f.field];
                let translated = null, srcLang = null;
                if (hit) { translated = hit.translated_text; srcLang = hit.source_language; }
                else {
                    const res = await translateMiss(sb, entry.type, entry.id, f.field, target);
                    if (res) { translated = res.translated_text; srcLang = res.source_language; }
                }
                if (translated && T.needsTranslation(srcLang, target)
                    && applyTranslation(f.el, source, translated)) any = true;
            }
            if (any) injectToggle(entry.card, target);
        }

        async function scan(rootEl) {
            const root = rootEl || document;
            const entries = T.collectCards(root);
            if (!entries.length) return;
            const sb = await client();
            if (!sb) return;
            const target = readerLang();
            entries.forEach(function (e) { e.card.setAttribute('data-tr-done', '1'); });
            const ids = Array.from(new Set(entries.map(function (e) { return e.id; })));
            const cacheMap = await readCache(sb, ids, target);
            for (const e of entries) await processCard(sb, e, target, cacheMap);
        }

        function schedule() {
            if (scheduled) return;
            scheduled = true;
            setTimeout(function () { scheduled = false; scan(); }, 150);
        }

        function boot() {
            scan();
            observer = new MutationObserver(function (muts) {
                for (const m of muts) {
                    if (m.addedNodes && m.addedNodes.length) { schedule(); return; }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else { boot(); }

        window.GloweTranslate.scan = scan;
    })();
}
```

- [ ] **Step 3: Unit tests** (pure helpers only — jsdom-free)

```js
const GT = require('../glowe-translate.js');

describe('GloweTranslate helpers', () => {
  test('baseLang strips region', () => {
    expect(GT.baseLang('en-US')).toBe('en');
    expect(GT.baseLang('HE')).toBe('he');
    expect(GT.baseLang('')).toBe('');
  });
  test('needsTranslation: unknown source always true', () => {
    expect(GT.needsTranslation(null, 'en')).toBe(true);
    expect(GT.needsTranslation('', 'he')).toBe(true);
  });
  test('needsTranslation: same base false, diff base true', () => {
    expect(GT.needsTranslation('en-US', 'en')).toBe(false);
    expect(GT.needsTranslation('he', 'en')).toBe(true);
  });
  test('tupleKey is stable', () => {
    expect(GT.tupleKey('glowe_post', 'post-1', 'title', 'en'))
      .toBe('glowe_post|post-1|title|en');
  });
});
```

Run: `cd app && pnpm --filter <glowe-web pkg> test` (or the repo's vitest config for `app/apps/glowe-web/js/__tests__`).
Expected: 4 passing.

- [ ] **Step 4: Commit**

```bash
git add app/apps/glowe-web/js/glowe-translate.js app/apps/glowe-web/js/__tests__/glowe-translate.test.js
git commit -m "feat(glowe): add UGC translation frontend module (FR-TRANSLATE-005)"
```

---

## Task 5: Wire attributes + script into render paths

**Files:**
- Modify: `app/apps/glowe-web/index.html` and every page under `pages/` that renders cards — add `<script src="js/glowe-translate.js"></script>` (or `../js/...` for subpages) AFTER `js/app.js`.
- Modify: `app/apps/glowe-web/js/app.js` — add `data-tr-*` to translatable elements.

- [ ] **Step 1: Add the script tag** after `app.js` in `index.html`:

```html
    <script src="js/app.js"></script>
    <script src="js/glowe-translate.js"></script>
```
Repeat for each page in `pages/` using the correct relative path.

- [ ] **Step 2: Opportunity card** — mark wrapper + fields (`renderOpportunityCard`)

```html
<div class="opportunity-card" data-tr-card data-tr-type="glowe_opportunity" data-tr-id="${opportunity.id}">
  ...
  <h3 class="opportunity-title" data-tr-field="title">${escapeHtml(opportunity.title)}</h3>
  <p class="opportunity-description" data-tr-field="description">${escapeHtml(opportunity.description)}</p>
```

- [ ] **Step 3: Wish card** (`renderWishCard`) — same table as posts (`glowe_post`); wish `description` renders the `text` column

```html
<article class="wish-card" ... data-tr-card data-tr-type="glowe_post" data-tr-id="${wish.id}">
  ...
  <h3><button ...>${escapeHtml(wish.title)}</button></h3>  <!-- wrap title text: see step 3a -->
  ...
  <p data-tr-field="text">${escapeHtml(wish.description)}</p>
```

- [ ] **Step 3a:** For the wish title (text sits inside a `<button>`), put `data-tr-field="title"` on the inner `<button>` so its `textContent` is the source:

```html
<h3><button type="button" data-tr-field="title" onclick="openWishDetail('${wish.id}')">${escapeHtml(wish.title)}</button></h3>
```

- [ ] **Step 4: Community post card** (`renderPostCard`) — `glowe_post`, fields `title` + `text`. Add `data-tr-card data-tr-type="glowe_post" data-tr-id="${postId}"` to the card root, `data-tr-field="title"` to the title element and `data-tr-field="text"` to the body element. (Match the exact elements after reading `renderPostCard` in full.)

- [ ] **Step 5: Project card** (`renderProjectCard`)

```html
<div class="project-card" data-tr-card data-tr-type="glowe_project" data-tr-id="${project.id}">
  ...
  <h3 data-tr-field="title">${escapeHtml(project.title)}</h3>
  <p data-tr-field="description">${escapeHtml(project.description)}</p>
```

- [ ] **Step 6: Profile detail** (profile page render of about/focus/needs) — wrap the profile container with `data-tr-card data-tr-type="glowe_profile" data-tr-id="${profile.id}"` and tag the about/focus/needs elements with `data-tr-field="about|focus|needs"`. Organization/person `display_name` stays UNtagged (never translated).

- [ ] **Step 7: Guard against toggle CSS clash** — add a minimal `.tr-toggle` style (small text button) to the GLOWE stylesheet so the injected control is legible.

- [ ] **Step 8: Verify in browser** (per memory: verify UI before claiming done)

Load `dev.karma-community.pages.dev/glowe/` (or local preview), switch chrome language to a language differing from a seeded post, confirm: (a) card text swaps to reader language, (b) a "Show original"/"הצג מקור" toggle appears on translated cards only, (c) a same-language card shows NO toggle, (d) toggle round-trips source ↔ translation, (e) anonymous (logged-out) session still translates.

- [ ] **Step 9: Commit**

```bash
git add app/apps/glowe-web/index.html app/apps/glowe-web/pages app/apps/glowe-web/js/app.js app/apps/glowe-web/css
git commit -m "feat(glowe): render UGC translations with show-original toggle (FR-TRANSLATE-005)"
```

---

## Task 6: SSOT + verification

- [ ] **Step 1:** From `app/`: `pnpm typecheck && pnpm test && pnpm lint` — all green.
- [ ] **Step 2:** `docs/SSOT/spec/18_translation.md` — flip FR-TRANSLATE-005 status header 🟡 → ✅ once ACs pass.
- [ ] **Step 3:** `docs/SSOT/BACKLOG.md` — FR-TRANSLATE-005 → ✅ Done.
- [ ] **Step 4:** `docs/SSOT/TECH_DEBT.md` — add TD for deferred array-field translation (`requirements`, `responsibilities`, `skills`, `tags`) and note `app.js` 6213-line file-cap violation as pre-existing (do not grow it).
- [ ] **Step 5:** Open PR to `dev`: `gh pr create --base dev` with the `Mapped to spec: FR-TRANSLATE-005` line; `gh pr merge --auto --squash --delete-branch`; watch CI.

---

## Self-Review

- **Spec coverage:** AC1 table (Task 1) · AC2 function (Task 3) · AC3 shared extraction (Task 2) · AC4 name-excluding field registry (Task 3 SOURCE + Task 5 attributes) · AC5 frontend module (Task 4) · AC6 reader lang via `getGloweLanguage` (Task 4 `readerLang`) · AC7 toggle only-when-translated (Task 4 `injectToggle` gated by `any`) · AC8 anon (Task 1 anon SELECT + Task 3 `--no-verify-jwt`) · AC9 graceful degradation + skip-set (Task 4). ✅
- **Type consistency:** cache row shape (`content_type/content_id/field/target_language/source_language/translated_text/model/confidence`) identical across migration, `glowe-translate/cache.ts`, and frontend `readCache`. ✅
- **Placeholder scan:** none. Task 5 steps 4/6 require reading the exact render elements before tagging — flagged inline, not a placeholder. ✅
