# Server-Driven Terms of Service & Privacy Policy Design

> **Status:** Draft, pending PM approval.
> **Spec targets:** `docs/SSOT/spec/11_settings.md` § FR-SETTINGS-010 (rewrite), `docs/SSOT/spec/01_auth_and_onboarding.md` § FR-AUTH-002 (addition).
> **Backlog target:** `docs/SSOT/BACKLOG.md` P2.18.
> **Tech debt closed:** TD-80.
> **Context:** Replaces the current static `/legal` screen (single route, inline i18n Hebrew strings for both Terms and Privacy) with a server-driven, two-document model. Editable from Supabase Studio without a frontend redeploy. Captures explicit user consent at signup and on material updates, satisfying baseline obligations under the Israeli Privacy Protection Law (חוק הגנת הפרטיות, including תיקון 13) and GDPR Art. 7. Council review (Legal + Engineering + UX, 2026-05-24) is incorporated.

---

## 1. Goal

A super-admin can publish new versions of two distinct legal documents (Terms of Service, Privacy Policy) by running a single SQL RPC in Supabase Studio. The new text reaches every user instantly without any app deploy. When the publisher marks a change as `standard` or `critical`, all existing users are required to re-acknowledge before continuing to use the app — `critical` blocks immediately on the next foreground, `standard` shows a 7-day soft banner then escalates. Users see the documents in three places (Settings, post-signup consent, blocking update modal); the three surfaces share a single Hebrew-RTL Markdown renderer that works identically on iOS, Android, and web with offline cache.

## 2. Non-goals

- In-app admin UI for editing documents (deferred — TD added; Supabase Studio is the V1 editor).
- Multi-language support (R-MVP-Core-4 keeps MVP Hebrew-only; schema reserves the door via `language` column).
- Per-section consent / consent for specific data uses (cookie banner equivalents) — single-document acceptance only.
- Date-of-birth field at signup (TD added; current age check is the Terms self-declaration of 13+).
- COPPA verifiable parental consent flow (under-13 explicitly forbidden, not gated with parental flow).
- Two-person publish approval workflow (TD added; super-admin alone publishes in V1).
- Self-service data export UI (Privacy Policy commits to a 30-day SLA via the existing "Report an issue" channel).

## 3. Data model

Three new tables in `public`, one new enum.

### `public.legal_doc_type` (enum)

`'terms' | 'privacy'`. Exactly two members for MVP.

### `public.legal_documents`

The "current pointer" table — two rows in the entire database, one per `doc_type`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `doc_type` | `legal_doc_type` UNIQUE NOT NULL | only one row per type |
| `current_version` | int NOT NULL DEFAULT 1 | latest published version |
| `current_effective_date` | timestamptz NOT NULL | when `current_version` is in force |
| `last_material_version` | int NOT NULL DEFAULT 1 | **denormalized** — highest version with `severity ∈ ('standard','critical')`. Updated inside `publish_legal_document`. Makes the gate check O(1). |
| `last_material_severity` | text NULL | `'standard'` or `'critical'`, mirroring `last_material_version`'s severity. Drives gate UX. |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

### `public.legal_document_versions`

Immutable history of every publish. **Trigger-enforced immutability** (RLS alone isn't sufficient because `publish_legal_document` runs `SECURITY DEFINER`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `doc_type` | `legal_doc_type` NOT NULL | |
| `version` | int NOT NULL | starts at 1, monotonic per `doc_type` |
| `language` | text NOT NULL DEFAULT 'he' | reserved for future locales |
| `effective_date` | timestamptz NOT NULL | may be in the future |
| `body_md` | text NOT NULL | Markdown source |
| `content_hash` | text NOT NULL | SHA-256 of `body_md`, computed via `BEFORE INSERT` trigger. Client uses this to verify cache integrity. |
| `severity` | text NOT NULL CHECK (severity IN ('minor','standard','critical')) | `minor` = silent. `standard` = 7-day banner then modal. `critical` = immediate blocking modal. |
| `change_summary` | text NULL | Required (`NOT NULL` via CHECK) when `severity ≠ 'minor'`. Rendered as bullet list, max 3 short bullets per authoring guideline. |
| `published_by` | uuid NOT NULL REFERENCES auth.users(id) | |
| `published_at` | timestamptz NOT NULL DEFAULT now() | |
| `created_at` | timestamptz NOT NULL DEFAULT now() | distinct from `published_at` for audit clarity |
| UNIQUE `(doc_type, version)` | | |

**Indexes:**
- `(doc_type, version DESC)` — for "latest" lookups.
- Partial: `(doc_type, version) WHERE severity IN ('standard','critical')` — kept for diagnostic queries; the gate hot path uses `last_material_version`.

**Trigger:** `legal_document_versions_immutable_trg` — `BEFORE UPDATE OR DELETE` → `RAISE EXCEPTION 'legal_document_versions is append-only'`.

### `public.user_legal_acceptances`

**Append-only event log** (not upsert). One row per acceptance event. Audit-ready per GDPR Art. 7(1).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE | |
| `doc_type` | `legal_doc_type` NOT NULL | |
| `version` | int NOT NULL | references `legal_document_versions(doc_type, version)` |
| `accepted_at` | timestamptz NOT NULL DEFAULT now() | |
| `ip_inet` | inet NULL | best-effort, from request header |
| `user_agent` | text NULL | best-effort, truncated to 500 chars |
| `locale` | text NULL | e.g. `'he'` |
| FK `(doc_type, version) → legal_document_versions(doc_type, version)` | | |

**Indexes:** `(user_id, doc_type, accepted_at DESC)` — for "latest acceptance" view.

**Trigger:** `user_legal_acceptances_immutable_trg` — `BEFORE UPDATE OR DELETE` → `RAISE EXCEPTION`. Even the user cannot retract a consent event from the log.

### View `user_legal_acceptances_latest`

```sql
CREATE VIEW user_legal_acceptances_latest AS
SELECT DISTINCT ON (user_id, doc_type)
  user_id, doc_type, version, accepted_at
FROM user_legal_acceptances
ORDER BY user_id, doc_type, accepted_at DESC;
```

Read-only view used by the gate's RPC and by the user's own "view my acceptances" surface (future).

## 4. RLS

### `legal_documents` + `legal_document_versions`

```sql
-- SELECT: anon + authenticated. Legal documents are public content by
-- definition; restricting to authenticated broke pre-signup readers, expired
-- sessions, and shared deep links (PGRST205 because the table is invisible
-- to anon's schema cache without a GRANT). See D-47 (supersedes D-46).
CREATE POLICY legal_documents_select_public ON legal_documents
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY legal_document_versions_select_public ON legal_document_versions
  FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON legal_documents, legal_document_versions TO anon, authenticated;
```

No direct INSERT/UPDATE/DELETE grants. All writes go through `publish_legal_document` (SECURITY DEFINER, which checks super_admin role internally).

### `user_legal_acceptances`

```sql
CREATE POLICY user_legal_acceptances_select_self ON user_legal_acceptances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY user_legal_acceptances_insert_self ON user_legal_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

No UPDATE / DELETE policies — append-only.

## 5. RPCs

### `publish_legal_document(p_doc_type, p_body_md, p_severity, p_change_summary, p_effective_date)`

```
SECURITY DEFINER
LANGUAGE plpgsql

RETURNS json { version int, effective_date timestamptz, content_hash text }
```

Transaction:
1. Assert `public.is_admin(auth.uid())`; else `RAISE EXCEPTION 'forbidden'`. (`is_admin(uuid)` is the existing helper from `0005_init_moderation.sql`; we reuse it rather than introducing a parallel `is_super_admin`.)
2. Assert `p_severity IN ('minor','standard','critical')`.
3. Assert `p_severity = 'minor' OR length(trim(p_change_summary)) > 0` (else `RAISE EXCEPTION 'change_summary required for non-minor severity'`).
4. Assert `p_effective_date >= now()` (else `RAISE EXCEPTION 'effective_date must be in the future or now'`).
5. **Assert `p_severity != 'critical' OR p_effective_date <= now() + interval '1 hour'`** (else `RAISE EXCEPTION 'critical severity must be effective immediately (within 1 hour)'`). Critical = urgent; scheduled rollouts must use `standard`.
6. `new_version := (SELECT current_version + 1 FROM legal_documents WHERE doc_type = p_doc_type)`.
7. `INSERT INTO legal_document_versions (...)` with `published_by = auth.uid()`, `content_hash` computed by trigger.
8. `UPDATE legal_documents SET current_version = new_version, current_effective_date = p_effective_date, updated_at = now(), last_material_version = CASE WHEN p_severity IN ('standard','critical') THEN new_version ELSE last_material_version END, last_material_severity = CASE WHEN p_severity IN ('standard','critical') THEN p_severity ELSE last_material_severity END WHERE doc_type = p_doc_type`.
9. Return the new version.

### `accept_legal_document(p_doc_type, p_version, p_locale, p_user_agent)`

```
SECURITY DEFINER
LANGUAGE plpgsql

RETURNS json { acceptance_id uuid, accepted_at timestamptz }
```

1. Assert `auth.uid() IS NOT NULL`; else `RAISE EXCEPTION 'unauthenticated'`.
2. **Read `last_material_version` + `current_version` atomically** for `p_doc_type`. Assert `p_version >= last_material_version AND p_version <= current_version`; else `RAISE EXCEPTION 'accepted version must be at least last_material_version'`. This closes the hole where a buggy/malicious client logs an acceptance of an older version that doesn't actually satisfy the gate — every successful acceptance is guaranteed to clear the user from `needs_legal_reacknowledgement`.
3. `INSERT INTO user_legal_acceptances (user_id, doc_type, version, ip_inet, user_agent, locale) VALUES (auth.uid(), p_doc_type, p_version, inet_client_addr(), p_user_agent, p_locale)`.
4. Return the new row's id + timestamp.

Server captures `ip_inet` via `inet_client_addr()` for audit; client passes `user_agent` (truncated client-side to 500 chars) and `locale`. Function is `SECURITY DEFINER` to read `last_material_version` atomically alongside the insert.

### `needs_legal_reacknowledgement()`

```
LANGUAGE sql STABLE
SECURITY INVOKER

RETURNS TABLE (
  doc_type legal_doc_type,
  current_version int,
  current_effective_date timestamptz,
  last_material_version int,
  last_material_severity text,
  last_accepted_version int,
  block_mode text  -- 'banner' | 'modal'
)
```

**No `p_user_id` parameter** — operates on `auth.uid()` only. This closes a privacy hole where any authenticated user could query the acceptance state of any other user. If `auth.uid() IS NULL` (guest), returns no rows.

Returns one row per `doc_type` where the user is in arrears. The `block_mode` is computed server-side using the database clock, so the client cannot bypass the 7-day standard grace by tampering with its system clock.

```sql
SELECT
  ld.doc_type,
  ld.current_version,
  ld.current_effective_date,
  ld.last_material_version,
  ld.last_material_severity,
  COALESCE(ula.version, 0) AS last_accepted_version,
  CASE
    WHEN ld.last_material_severity = 'critical' THEN 'modal'
    WHEN ld.last_material_severity = 'standard'
         AND (now() - ld.current_effective_date) >= interval '7 days' THEN 'modal'
    ELSE 'banner'
  END AS block_mode
FROM legal_documents ld
LEFT JOIN user_legal_acceptances_latest ula
  ON ula.doc_type = ld.doc_type AND ula.user_id = auth.uid()
WHERE
  auth.uid() IS NOT NULL
  AND ld.current_effective_date <= now()
  AND COALESCE(ula.version, 0) < ld.last_material_version
```

O(1) per `doc_type` thanks to denormalized `last_material_version`. The `current_effective_date <= now()` clause ensures future-dated publishes don't trigger the gate prematurely. The `block_mode` column moves the policy from the client into SQL — single source of truth.

## 6. Application layer

### Domain (`packages/domain`)

```ts
// value-objects.ts additions
export type LegalDocType = 'terms' | 'privacy';
export type LegalSeverity = 'minor' | 'standard' | 'critical';

// entities/legalDocument.ts
export interface LegalDocument {
  readonly docType: LegalDocType;
  readonly currentVersion: number;
  readonly currentEffectiveDate: Date;
  readonly lastMaterialVersion: number;
  readonly lastMaterialSeverity: LegalSeverity | null;
}

export interface LegalDocumentContent {
  readonly docType: LegalDocType;
  readonly version: number;
  readonly effectiveDate: Date;
  readonly bodyMd: string;
  readonly contentHash: string;
  readonly severity: LegalSeverity;
  readonly changeSummary: string | null;
  readonly publishedAt: Date;
}

export type LegalBlockMode = 'banner' | 'modal';

export interface LegalPendingItem {
  readonly docType: LegalDocType;
  readonly currentVersion: number;
  readonly currentEffectiveDate: Date;
  readonly lastAcceptedVersion: number;  // 0 if never accepted
  readonly severity: LegalSeverity;       // standard | critical (minor never appears here)
  readonly blockMode: LegalBlockMode;     // computed server-side from severity + clock
}

// Pure policy function — derives "any item in modal mode" from server-supplied blockMode.
export function shouldBlockImmediately(pending: LegalPendingItem[]): boolean {
  return pending.some((p) => p.blockMode === 'modal');
}
```

### Application (`packages/application`)

```ts
// ports/ILegalDocumentRepository.ts
export interface ILegalDocumentRepository {
  getCurrentContent(docType: LegalDocType): Promise<LegalDocumentContent>;
  // No userId param — server uses auth.uid() internally.
  getPendingForCurrentUser(): Promise<LegalPendingItem[]>;
  acceptVersion(input: {
    docType: LegalDocType;
    version: number;
    locale: string;
    userAgent: string;
  }): Promise<{ acceptanceId: string; acceptedAt: Date }>;
}

// use-cases
export class LoadLegalDocumentUseCase { ... }
export class CheckPendingLegalAcksUseCase { ... }
export class AcceptLegalDocumentUseCase { ... }
```

`CheckPendingLegalAcksUseCase` owns the policy: dedupes results, orders Terms before Privacy in UI, exposes `mustBlockImmediately` (via `shouldBlockImmediately`). It does NOT compute block_mode itself — that comes pre-computed from the server in each `LegalPendingItem`.

### Infrastructure (`packages/infrastructure-supabase`)

`SupabaseLegalDocumentRepository` implements the port, calling the three RPCs and mapping rows to domain types. Caches the latest `LegalDocumentContent` in `AsyncStorage` under key `legal:{docType}:v{version}:{contentHash}`. Old cache entries are inert (version is in the key) and pruned opportunistically.

### Mobile (`apps/mobile`)

**New files:**
- `apps/mobile/app/legal/terms.tsx` — Settings → Terms entry
- `apps/mobile/app/legal/privacy.tsx` — Settings → Privacy entry
- `apps/mobile/app/legal/_layout.tsx` — group layout (BackButton chrome)
- `apps/mobile/src/components/legal/LegalDocumentReader.tsx` — shared renderer
- `apps/mobile/src/components/legal/LegalConsentGate.tsx` — root-level gate
- `apps/mobile/src/components/legal/LegalConsentScreen.tsx` — the consent surface (used in signup + material-update modes)
- `apps/mobile/src/components/legal/LegalMarkdownStyles.ts` — RTL-corrected styles for `react-native-markdown-display`

**Deleted:**
- `apps/mobile/app/legal.tsx` (replaced by `legal/terms.tsx` + `legal/privacy.tsx`)
- Inline `legalContent.*` keys in `src/i18n/locales/he/modules/` (replaced by DB content)

**Modified:**
- `apps/mobile/app/settings.tsx` — split the single "תנאי שימוש ומדיניות" row into two rows: "תנאי שימוש" → `/legal/terms`, "מדיניות פרטיות" → `/legal/privacy`.
- `apps/mobile/app/_layout.tsx` — wrap authenticated shell in `<LegalConsentGate>` above `<OnboardingSoftGate>`.

## 7. UX — three surfaces, one renderer

### 7.1 `LegalDocumentReader` (shared)

- `react-native-markdown-display` with custom style overrides:
  - **RTL fixes:** `blockquote` border on right (`borderRightWidth`, `borderLeftWidth: 0`), `ordered_list_icon` custom renderer placing digits on the right of each item, `bullet_list_icon` mirrored.
  - **Typography:** `h1`/`h2`/`h3` map to `@kc/ui` `typography.h2`/`h3`/`h4`. `paragraph` → `typography.body`. `link` underlined, `colors.primary`.
  - **Spacing:** generous `marginBottom` on headings; `lineHeight: 24` on body.
- Sticky header: doc title, effective date ("בתוקף מ-DD.MM.YYYY"), version chip ("גרסה N").
- **No scroll gating** on checkbox activation (council change — was anti-pattern).
- Loading: RTL-aligned skeleton (3 heading-width bars + 2 paragraphs × 4 lines, all `alignSelf: 'flex-end'`, varying widths).
- Error: soft card; if cache present, falls back with banner "מציג גרסה שמורה — לא ניתן לעדכן כרגע".
- Cache: AsyncStorage read first (instant), Supabase fetch in background, fade-replace if `content_hash` differs.
- Web: max-width 720px centered, `overscrollBehavior: contain`, focus ring visible in dark mode.
- Accessibility: all headings `accessibilityRole="header"` with `accessibilityLevel`. Body text has implicit role.

### 7.2 Settings entries

Two rows in `apps/mobile/app/settings.tsx` Support/Legal section:
- "תנאי שימוש" → `/legal/terms` → full-screen `<LegalDocumentReader docType="terms" />` with BackButton.
- "מדיניות פרטיות" → `/legal/privacy` → full-screen `<LegalDocumentReader docType="privacy" />` with BackButton.

User can leave freely. No checkboxes here.

### 7.3 Post-OAuth consent screen — `<LegalConsentScreen mode="signup">`

Fired by `<LegalConsentGate>` when `getPendingForCurrentUser` returns both Terms and Privacy (the new-user case).

Layout (vertical scroll):
1. Soft heading: *"עוד דבר אחרון לפני שמתחילים — נשמח שתכיר/י את הכללים שלנו."*
2. Card 1 — Terms: title, effective date, 4-line preview, "פתח וקרא במלואו" button (opens reader as covering screen), checkbox *"קראתי ואני מאשר/ת את תנאי השימוש"*.
3. Card 2 — Privacy: same structure with privacy-specific copy.
4. Primary button "המשך" — **enabled only when both checkboxes are checked** (no scroll gate).
5. Secondary link "אפשר לחזור בהמשך — [יציאה]" → opens sign-out confirmation modal: *"להתנתק? תאבד/י גישה לפרופיל ולשיחות עד שתחזור/י להיכנס."*

On "המשך": two `accept_legal_document` calls in parallel; on success, gate re-checks and falls through to `<OnboardingSoftGate>` or the shell.

### 7.4 Material-update flows — `<LegalConsentScreen mode="update" blockMode="banner|modal">`

Fired by `<LegalConsentGate>` when `getPendingForCurrentUser` returns at least one item. The `blockMode` for each pending item comes pre-computed from the server (see §5 `needs_legal_reacknowledgement`). The client never computes the 7-day deadline itself.

#### `blockMode === 'modal'` (immediate block — fires for `critical` always, and for `standard` after 7 days)
- Full-screen modal, no dismiss.
- Header: bold *"המסמך התעדכן — נדרש אישור"*.
- `change_summary` rendered as bullet list (≤3 bullets, validated client-side and authored that way).
- Reader inline below summary (scrollable).
- Bottom: checkbox *"קראתי ואני מאשר/ת"* + "אישור" button (enabled when checked) + "יציאה" link with the same sign-out confirmation as 7.3.
- Web: `history.pushState` + `popstate` handler intercepts browser back; Esc swallowed silently.

#### `blockMode === 'banner'` (standard severity, within the 7-day server-computed grace window)
- On first foreground after publish (i.e., the first time the gate sees the item with `blockMode='banner'`): dismissible bottom sheet with summary + "פתח לקריאה" CTA + "אזכיר לי בעוד יום" + "אישור עכשיו".
- After dismissal, a persistent top banner sits **inside the shell, just below the app top bar** (same surface as the existing optional-phone affordance in `ShellWithTabBar`): *"המסמך התעדכן — אישור נדרש תוך N ימים"* with countdown. Banner is dismissible per session (re-appears next foreground) but not permanently.
- Countdown N is **displayed only** by the client, derived from `currentEffectiveDate` returned by the RPC: `N = 7 - floor((Date.now() - currentEffectiveDate) / day)`. If the user's clock is wrong, the displayed N may be off — but **enforcement** (banner → modal transition) is driven by the server's next response (`block_mode` switches to `'modal'`), not by the client's clock. The client never makes a "should-block" decision locally.
- When the server flips `block_mode` to `'modal'` (day 7+), the next gate check renders the blocking modal above. No special "promotion" code on the client beyond responding to the new value.

### 7.5 Gate placement and triggers

`<LegalConsentGate>` lives in `app/_layout.tsx`, wrapping the authenticated shell **above** `<OnboardingSoftGate>` (legal trumps onboarding).

Triggers:
- On mount (cold start).
- On `AppState` `active` transition, **debounced 500ms**.
- On session-change events from `authStore` (sign-in, sign-out, session refresh — covers the guest→authenticated transition described in §7.6).

**Defer conditions** — the gate does NOT render the consent screen if any of the following holds, even when `getPendingForCurrentUser` returns items:
- A bottom sheet, modal, or composer is currently open. Detected via a new `useActiveModalStack()` hook (small ref-counter wrapping the existing modal-providing components). When the stack empties, the gate's `useEffect([stackEmpty])` re-fires the deferred check after a 500ms debounce.
- The user is currently on `/legal/terms` or `/legal/privacy` (detected via `usePathname()`). They are already reading the document; opening the consent screen on top would be confusing. Gate re-fires when the user leaves the route.
- Network is offline (see below).

**Network failure → fall open.** If the RPC throws (any error — offline, timeout, DB unreachable), the gate **does not block** the user. Without an analytics infrastructure in the repo today, the skipped check is recorded via `console.warn('[legal] consent_check_skipped_offline', { reason, timestamp })`. This surfaces in Expo dev logs and (once Sentry is wired) in breadcrumbs. **TD added (immediate):** wire `consent_check_skipped_offline` events to a server-side `legal_events` table for ILITA-audit-ready offline-skip trail — see §15.

### 7.6 Edge cases: guests and session transitions

- **Guest preview (`FR-AUTH-014`):** the gate is conditioned on `auth.uid() != null` (the RPC returns no rows for guests, and `<LegalConsentGate>` short-circuits when `session === null`). Guests never see the consent screen. They have not signed up; they have not provided personal data beyond ephemeral browse state.
- **Guest → authenticated transition (signup mid-session):** when the guest taps "Sign up" inline and OAuth succeeds, `authStore.session` flips from `null` to a real session. `<LegalConsentGate>` has a `useEffect([session?.userId])` that re-runs `getPendingForCurrentUser` on this transition; the consent screen then appears for the now-new user. This is functionally identical to the cold-start signup path.
- **Sign-out from anywhere:** clears `session` → gate goes back to passive guest mode (no consent screen). Acceptance log entries remain — they are not deleted on sign-out (only on account delete via `ON DELETE CASCADE`).
- **User accepts on web, then opens iOS:** the acceptance is in the DB; the iOS gate's first foreground check finds `last_accepted_version >= last_material_version` and stays quiet. Cross-device parity is automatic.

## 8. Backfill — handling existing users at launch

**Council change:** we do NOT fabricate `accepted_at = users.created_at` records. Instead:

1. The migration seeds `legal_documents` v1 with `severity = 'standard'` (so existing users will see the gate, but with the 7-day soft grace, not an immediate block).
2. No `user_legal_acceptances` rows are pre-seeded.
3. The migration sets `last_material_version = 1` and `last_material_severity = 'standard'`. Existing users' `last_accepted_version` is `NULL → 0 < 1`, so `needs_legal_reacknowledgement` returns Terms + Privacy for them.
4. On next app foreground, they see the 7-day soft banner (per 7.4 `standard` flow), with intro copy: *"עדכנו את האופן שאנחנו מציגים את התנאים והפרטיות. אנא קרא ואשר כדי להמשיך — יש לך 7 ימים."*

This is a **one-time spike** in consent activity and a small amount of user friction for the legal cleanliness of having every user with a real `accepted_at` timestamp tied to a version they actually saw.

## 9. Authoring workflow (Supabase Studio V1)

The PM publishes by running a saved Studio snippet:

```sql
-- Snippet: "Publish Terms (minor)" — typo fixes, no re-ack
SELECT publish_legal_document(
  p_doc_type       => 'terms',
  p_body_md        => $$
# תנאי שימוש
... full Markdown ...
$$,
  p_severity       => 'minor',
  p_change_summary => NULL,
  p_effective_date => now()
);

-- Snippet: "Publish Terms (material — requires user re-ack)"
SELECT publish_legal_document(
  p_doc_type       => 'terms',
  p_body_md        => $$
# תנאי שימוש
...
$$,
  p_severity       => 'standard',  -- or 'critical' for urgent breaks
  p_change_summary => $$- הוספנו סעיף על שמירת נתוני מיקום
- שינינו את מדיניות התגובה לדיווחים
- הבהרנו את זכויות המשתמש למחיקת חשבון$$,
  p_effective_date => now()         -- or future timestamptz
);
```

Three snippets shipped with the migration: "Publish Terms (minor)", "Publish Terms (material)", "Publish Privacy (minor)", "Publish Privacy (material)". The snippet bodies are pre-filled with the current `v1` content so the PM is editing-not-authoring.

**TD added:** in-app super-admin UI with Markdown preview, severity selector, scheduled-publish picker, diff against previous version. Replaces this snippet workflow.

## 10. Initial Hebrew content (v1)

Drafted from PM brainstorm + council legal review. Placeholders marked with `{{...}}` will be filled by PM via a minor update before public launch:

- `{{LEGAL_ENTITY_NAME}}` — legal entity (default fallback: "קהילת קארמה")
- `{{CONTACT_EMAIL}}` — privacy contact (default fallback: `karmacommunity2.0@gmail.com`)
- `{{CONTACT_ADDRESS}}` — postal address (must be filled before launch)

### 10.1 Terms of Service — `terms` v1 structure

Section titles in Hebrew; each section is 2–4 short paragraphs. Full text drafted in the migration file.

1. **מי אנחנו ומה האפליקציה** — operator identity, contact, service description (community of giving).
2. **תנאי שימוש כחוזה מחייב** — usage = agreement.
3. **גיל מינימום (13+)** — explicit declaration; account removal if discovered under-13.
4. **חשבון משתמש** — password security, no impersonation, no multiple accounts.
5. **תוכן שמשתמשים מעלים** — ownership retained, license granted for display/storage/distribution, user responsibility for legality.
6. **שימוש אסור** — spam, deception, incitement, harassment, doxxing, commercial posts, hacking attempts.
7. **מודרציה** — right to remove content and suspend accounts at our discretion; appeal via "Report an issue".
8. **השירות As-Is** — no warranty of availability, content accuracy, or transaction success; platform is not a party to user-to-user transactions.
9. **הגבלת אחריות** — subject to law, liability capped at a nominal sum (default 0 ILS, free service).
10. **שינויים בתנאים** — we may update; material change = in-app notice + re-acknowledgement (this very flow).
11. **דין וסמכות שיפוט** — Israeli law; competent courts in Tel Aviv.
12. **יצירת קשר** — `{{CONTACT_EMAIL}}`, `{{CONTACT_ADDRESS}}`.

### 10.2 Privacy Policy — `privacy` v1 structure

1. **מי בעל הבקרה על המידע** — `{{LEGAL_ENTITY_NAME}}`, contact details. (No DPO declared unless threshold per תיקון 13 §17B is crossed — see council notes.)
2. **איזה מידע אנחנו אוספים**
   - שמסרת: שם, עיר, ביוגרפיה, אווטר, טלפון/אימייל (לאימות), פוסטים, הודעות.
   - שנאסף אוטומטית: סוג מכשיר, גרסת אפליקציה, IP, לוגים תפעוליים, אירועי הסכמה משפטיים.
3. **למה אנחנו צריכים את המידע** — תפעול השירות, אבטחה, מודרציה, תמיכה, סטטיסטיקות אגרגטיביות.
4. **הבסיס החוקי** — הסכמה; אינטרס לגיטימי (אבטחה, מניעת ספאם); חובה חוקית (תגובה לדרישת רשויות).
5. **שיתוף עם צדדים שלישיים (sub-processors)** — explicit list:
   - **Supabase, Inc.** (US/EU regions — אחסון מסד נתונים, אימות, אחסון קבצים, Realtime).
   - **Google LLC / Apple Inc.** — לאימות SSO בלבד (אנחנו לא מקבלים מהם מידע מעבר ל-display name, email, avatar).
   - **Expo / EAS** — לשליחת push notifications.
   - אין מכירת מידע. אין שימוש פרסומי. אין tracking של גורמי צד שלישי.
6. **העברה לחו"ל** — חלק מהמידע מאוחסן בשרתי Supabase מחוץ לישראל; ההעברה בכפוף ל-EU Standard Contractual Clauses.
7. **זמן שמירה** — תוכן פעיל: כל עוד החשבון פעיל. תוכן שהוסר על-ידי מודרציה: 90 יום ואז מחיקה. חשבון מחוק: 30 יום ואז מחיקה קשה (`FR-SETTINGS-012`).
8. **זכויותיך** — גישה, תיקון, מחיקה, ניידות (data export), ביטול הסכמה.
   - גישה / תיקון / מחיקה: דרך הגדרות.
   - ניידות (data export): פנייה דרך "דווח על בעיה" → קטגוריה Privacy → אנחנו מספקים JSON תוך **30 יום**.
   - ביטול הסכמה: מחיקת חשבון.
9. **קטינים (13-18)** — שירות מגיל 13. הורים שמעוניינים שחשבון של ילדם יוסר יכולים לפנות באמצעות "דווח על בעיה" → קטגוריה Privacy. אנחנו לא אוספים מידע במודע ממי שמתחת ל-13.
10. **אבטחה** — TLS בתעבורה, הצפנה במנוחה אצל Supabase, RLS על כל הטבלאות. אין אחריות מוחלטת.
11. **שינויים במדיניות** — כמו ב-Terms; שינוי מהותי = חובת אישור.
12. **תלונות וערעורים** — פנייה אלינו `{{CONTACT_EMAIL}}`; זכות פנייה לרשות להגנת הפרטיות בישראל ([https://www.gov.il/he/departments/the_privacy_protection_authority](https://www.gov.il/he/departments/the_privacy_protection_authority)).

## 11. Migration

Single file: `supabase/migrations/0108_legal_documents_and_consent.sql`. One transaction.

Order of operations:
1. `CREATE TYPE public.legal_doc_type AS ENUM ('terms', 'privacy');`
2. `CREATE TABLE legal_documents`, `legal_document_versions`, `user_legal_acceptances`.
3. Triggers: `legal_document_versions_immutable_trg`, `user_legal_acceptances_immutable_trg`, `legal_document_versions_content_hash_trg` (computes SHA-256).
4. Indexes per §3.
5. View `user_legal_acceptances_latest`.
6. RLS policies + grants per §4.
7. RPCs: `publish_legal_document`, `accept_legal_document`, `needs_legal_reacknowledgement`.
8. Seed v1 of both documents with the Hebrew Markdown from §10. `severity = 'standard'`, `effective_date = now()`. `change_summary` (shown to every existing user once on next foreground per §8):
   ```
   - העברנו את תנאי השימוש ומדיניות הפרטיות לפורמט חי שמתעדכן ישירות בלי צורך בעדכון של האפליקציה.
   - התוכן עצמו לא השתנה מהותית מהגרסה הקודמת שהוצגה במסך ההגדרות.
   - אנא קרא ואשר תוך 7 ימים כדי להמשיך להשתמש באפליקציה.
   ```
9. `INSERT INTO legal_documents` two rows pointing to the v1 versions, with `last_material_version = 1`, `last_material_severity = 'standard'`.
10. **No backfill of `user_legal_acceptances`** — existing users will go through the 7-day soft-grace flow on next foreground.

Idempotency: all `CREATE` statements use `IF NOT EXISTS`. The seed `INSERT`s use `ON CONFLICT (doc_type, version) DO NOTHING` so re-running the migration on a partially-applied state succeeds.

## 12. Test plan

### Domain (`packages/domain/__tests__/`)
- `shouldBlockImmediately` — empty list, only standard, only critical, mixed.

### Application (`packages/application/__tests__/`)
- `CheckPendingLegalAcksUseCase` — dedupe, ordering (terms before privacy), severity policy.
- `AcceptLegalDocumentUseCase` — happy path, repo failure surfaces a domain `LegalError`.

### Infrastructure (`packages/infrastructure-supabase/__tests__/`)
- `SupabaseLegalDocumentRepository.getCurrentContent` — cache hit, cache miss, cache stale (different content_hash).
- `SupabaseLegalDocumentRepository.acceptVersion` — RPC call shape, error mapping.
- RLS smoke tests via `supabase test db`:
  - Anon CAN SELECT `legal_documents` + `legal_document_versions` (public content; D-47).
  - Anon CANNOT SELECT or INSERT `user_legal_acceptances` (still authenticated-only — `auth.uid()` predicate).
  - Authenticated user can SELECT documents.
  - Authenticated user can only INSERT acceptance with own user_id.
  - Authenticated user cannot UPDATE/DELETE any of the legal tables.
  - Super_admin can publish via RPC; non-super_admin gets `forbidden`.
  - `legal_document_versions` UPDATE/DELETE blocked by trigger even when bypass-attempted.

### Mobile (manual QA checklist in PR description)
- ✅ `/legal/terms` and `/legal/privacy` open from Settings, scroll smoothly on iOS / Android / web.
- ✅ RTL correct on all three platforms (text right-aligned, numbered list digits on right, blockquote bar on right).
- ✅ Dark mode AA contrast.
- ✅ Offline cache: turn off network, open a previously-viewed doc → renders from cache + banner.
- ✅ First-time signup → consent screen with two cards, checkboxes work, "המשך" disabled until both checked.
- ✅ "יציאה" → sign-out confirmation modal → confirm → back to welcome.
- ✅ Publish a v2 with `severity = 'critical'` via Studio → next foreground → immediate blocking modal.
- ✅ Publish a v3 with `severity = 'standard'` → bottom sheet on next foreground, dismissible, banner persists; jump system clock 7 days → blocking modal.
- ✅ Publish a v4 with `severity = 'minor'` → no UI interruption; Settings reflects new content + version chip.
- ✅ Publish a v5 with `effective_date = now() + 1 day` → banner "ייכנס לתוקף ב-..." in reader; gate quiet until day passes.
- ✅ Material publish does NOT interrupt user mid-compose (post form / chat input open) — defers to next clean foreground.
- ✅ Web back button in blocking modal does nothing (history pushState intercepts).
- ✅ Screen reader (VoiceOver on iOS, TalkBack on Android, NVDA on web): can navigate document, can hear checkbox label, can submit.
- ✅ Existing user (before this PR) opens app post-migration: sees 7-day soft banner, not immediate block.

## 13. SSOT updates (in the same PR)

- `docs/SSOT/BACKLOG.md` — P2.18 → ✅ Done.
- `docs/SSOT/spec/11_settings.md` — `FR-SETTINGS-010` rewritten:
  - AC1: "Two settings rows ('תנאי שימוש', 'מדיניות פרטיות') open dedicated screens rendering server-driven Markdown content natively (no WebView)."
  - AC2: "Document content is editable via `publish_legal_document` RPC; no remote-config URL configuration is involved."
  - AC3: "Re-acknowledgement is required when a published version has `severity ∈ ('standard','critical')`. `critical` blocks on next foreground; `standard` shows a 7-day soft banner that escalates to blocking on day 7."
  - AC4 (new): "Post-OAuth consent screen presents both documents as cards; user must check both before proceeding. Skipping is only possible via sign-out (with confirmation)."
  - AC5 (new): "Documents support `effective_date` in the future; until the date arrives, the document is visible in Settings with a 'ייכנס לתוקף ב-DATE' banner, but does not trigger the gate."
  - AC6 (new): "Network failure during gate check falls open (allows the user through) and logs the bypass; next online foreground re-checks."
  - Status header: 🔴 → ✅.
- `docs/SSOT/spec/01_auth_and_onboarding.md` — `FR-AUTH-002` gets a new AC explicitly defining the post-OAuth handoff to the legal consent gate:
  - **AC (new, FR-AUTH-002 AC-Nxt):** "On successful OAuth completion (Google / Apple / email-password), the user is routed to `<LegalConsentGate>` BEFORE the shell renders and before `<OnboardingSoftGate>` is evaluated. The gate is satisfied either by an existing `user_legal_acceptances` row clearing `needs_legal_reacknowledgement`, or by completing the post-OAuth consent screen (`FR-SETTINGS-010` AC4). Sign-out from the consent screen returns the user to the welcome screen with the OAuth session terminated."
- `docs/SSOT/TECH_DEBT.md` — TD-80 → Resolved. New TDs added (see §15).
- `docs/SSOT/DECISIONS.md` — new entry (see §14).

## 14. Decisions log addition (`docs/SSOT/DECISIONS.md`)

- **D-XX (Legal docs delivery model):** legal documents are delivered as server-driven Markdown rendered natively in the app, not as WebViews of canonical URLs. Rationale: native RTL/theming/offline consistency on iOS+Android+web; no website CMS dependency for a free MVP; simpler editing workflow (one SQL snippet vs. a CMS publish). Trade-off accepted: no rich layout beyond Markdown.
- **D-XX (Severity tiers):** three-tier severity (minor / standard / critical) replaces the originally-proposed `is_material_change` boolean. Rationale: protects the user from "wall of text on app open" while still meeting consent requirements; publisher decides per release.
- **D-XX (Append-only acceptance log):** `user_legal_acceptances` is an append-only event log, not an upsert table. Rationale: GDPR Art. 7(1) requires the controller to *demonstrate* consent per version; council legal review identified upsert-only as the highest-priority blocker.
- **D-XX (No grandfather backfill):** existing users at launch are NOT fabricated consent records; they are routed through the 7-day soft-grace flow. Rationale: a backfilled `accepted_at = users.created_at` for a v1 the user never saw is a fabricated audit record that exposes the operator to ILITA enforcement risk; one-time soft-grace UX cost is the right trade.
- **D-XX (Server-computed `block_mode`):** the 7-day standard→critical promotion is computed in SQL inside `needs_legal_reacknowledgement`, not on the client. Rationale: client clocks can be wrong (DST, deliberate tampering, OS bug); enforcement must live with the source of truth. Client uses the server-supplied countdown for display only.
- **D-XX (`critical` must publish-now):** `publish_legal_document` rejects `critical` severity with `effective_date > now() + 1 hour`. Rationale: critical = urgent; scheduled rollouts should use `standard`. Prevents the operator from setting an "alarm bomb" critical that catches users off-guard.
- **D-46 (superseded by D-47, 2026-05-25):** initial design granted SELECT on `legal_documents` + `legal_document_versions` to `authenticated` only. Reverted same-day after a regression: expired sessions, pre-signup readers, and shared `/legal/*` deep links all 404'd because PostgREST hides the table from anon's schema cache when no GRANT exists. Public legal content has no security value to gate, so D-47 restores anon read.

## 15. Tech debt added (`docs/SSOT/TECH_DEBT.md`)

| ID | Severity | Item | Priority |
|---|---|---|---|
| TD-XXX (FE) | 🟡 | Build in-app super-admin UI for legal document editing with Markdown preview, severity selector, scheduled-publish, and diff vs previous version. Replaces Supabase Studio snippet workflow. | P3 |
| TD-XXX (BE) | 🟡 | Two-person approval workflow for `publish_legal_document` (second super_admin must approve before `effective_date` arrives). Audit-readiness hardening. | P3 |
| TD-XXX (FE) | 🟡 | Add date-of-birth field to signup flow (`FR-AUTH-002`) to satisfy תיקון 13 minor-data heightened expectations. Out of scope for legal-docs PR. | P2 |
| TD-XXX (BE) | 🟡 | Periodic check + alert when ILITA database registration threshold per תיקון 13 §17B is approached (per user-count / data-class triggers). | P3 |
| TD-XXX (FE) | 🟢 | "View my consent history" surface for users in Settings → Privacy (reads `user_legal_acceptances` for `auth.uid()`). Self-service transparency. | P3 |
| TD-XXX (BE) | 🟡 | **Wire `consent_check_skipped_offline` events to a server-side `legal_events` log table** (currently `console.warn` only). Required to defend offline-fall-open posture in an ILITA audit. P2 — should ship within one sprint of legal-docs PR. | P2 |
| TD-XXX (BE) | 🟢 | Multi-language support — extend `language` column usage; add locale-aware variant selection in `LoadLegalDocumentUseCase`. Deferred per R-MVP-Core-4. | P3 |

## 16. Open items requiring PM input before launch

1. **`{{LEGAL_ENTITY_NAME}}`** — registered legal entity (חברה / ע.מ. / עמותה / יחיד עוסק).
2. **`{{CONTACT_EMAIL}}`** — confirmed privacy contact (default: `karmacommunity2.0@gmail.com`).
3. **`{{CONTACT_ADDRESS}}`** — postal address (required by GDPR Art. 13(1)(a) + Israeli norm).
4. **Lawyer review** of the v1 Hebrew text before public production launch — minor update can swap text in 30 seconds via Studio. Engineering can ship the infrastructure independently.

## 17. Out-of-scope reminders

- Cookie banner on web (we're a mobile-app-first PWA; no third-party cookies).
- Data export self-service UI (committed via support channel + 30-day SLA).
- COPPA verifiable parental consent flow (under-13 forbidden, not gated).
- Marketing email opt-in/out (we don't send marketing email).
- Children's-specific policy (under-13 forbidden makes this moot).
