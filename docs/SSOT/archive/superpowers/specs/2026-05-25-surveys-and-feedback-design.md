# Server-Driven Surveys & Market Research — Design

> **Status:** Approved (PM, 2026-05-26) — v0.2 after 4-agent council review.
> **Spec targets:** `docs/SSOT/spec/11_settings.md` — FR-SETTINGS-015..017 (Survey A) **and** new file `docs/SSOT/spec/16_public_research.md` — FR-RESEARCH-001..003 (Survey B).
> **Backlog targets:** P2.34 (Survey A) and P1.x (Survey B — research is acquisition-critical, ahead of in-app UX poll).
> **Pattern reference:** `docs/SSOT/archive/superpowers/specs/2026-05-24-server-driven-legal-documents-design.md` (server content, Studio publish, append-only answers).

---

## 1. Goal

Run **two distinct surveys** that together form a two-column phrasebook for Karma's positioning, roadmap, and acquisition messaging:

- **Survey A — `ux-experience`** (in-app, authenticated). 6 questions, ~3 minutes. Surfaces the *exact phrasing* retained users use to describe Karma (the "relief language").
- **Survey B — `alt-platforms-research`** (public web, anonymous). 11 questions, ~4 minutes. Surfaces the *exact phrasing* alt-platform users (Facebook Marketplace, FB giving-groups, WhatsApp neighborhood groups, Agora) use to describe their pain (the "pain language").

Both reuse one native Hebrew RTL question runner (validated demo, single question type: required rating 1–7 + optional free text). Product can publish new question sets without an app deploy via SQL/RPC in Supabase Studio.

## 2. Output: Karma Phrasebook

This is **not** a backend deliverable — it is the actual product of the research, and is part of the spec so it does not get forgotten after the tables fill up.

After ≥50 responses per survey, the PM (or assigned operator) exports all free-text answers via the admin portal (`docs/SSOT/archive/superpowers/specs/2026-05-25-admin-portal-design.md`) to CSV, then maps quotes into a 3-column Google Sheet:

| Pain language (Survey B quote) | Relief language (Survey A quote) | Where it ships |
|---|---|---|
| "מתחייבים לבוא ולא מגיעים" | "אם הוא קיבל פעם — אני יודע שהוא יבוא" | landing page banner #2 |
| "ספאם של 'אני!' 'ראשון!' בתגובות" | "פיד שקט, רואה רק בקשה אחת בכל פעם" | App Store screenshot caption |
| "מנהלי קבוצה עם פייבוריטיזם" | "אין מנהלים — הכלל אותו דבר לכולם" | onboarding screen 2 |
| (etc.) | | |

The phrasebook becomes the canonical source for: landing page copy, App Store description, ad creative headlines, onboarding microcopy, push notification copy. Without this synthesis step, both surveys are wasted effort.

**Operational owner:** PM. **Cadence:** after each Survey B distribution wave (target: ≥50 responses per wave). **Storage:** Google Sheet linked from `docs/SSOT/spec/16_public_research.md`.

## 3. Non-goals (V1)

- In-app admin UI to author surveys (Studio + `publish_survey_version` RPC).
- Multi-language (`language` column reserved, default `'he'`).
- External NPS link survey (KPI #8 stays out-of-product until a later FR).
- Replacing **Report an issue** (`FR-SETTINGS-008` / `FR-MOD-002`) — support chat stays separate.
- Captcha / Turnstile on Survey B V1 — deferred to V1.1 if abuse appears; honeypot + rate limit + origin check ship first.
- Mobile entry to Survey B — public research is web-only on purpose (alt-platform users aren't in our native shell).

## 4. Product decisions (locked after council review)

| Topic | Decision |
|-------|----------|
| Delivery — Survey A | Native UI in `/settings/surveys`; questions from server |
| Delivery — Survey B | Public web URL `/research/[slug]?src=...`; no login; web-only bundle |
| Question shape | Single ENUM: required rating 1–7 + optional free text. No multi-select. Per-question rating anchors (low / high). |
| Survey A navigation | One question at a time + compact top map (number + 1–2 word label + status dot); non-linear jump (existing demo UX, unchanged) |
| Survey A completion | Always available in Settings; answers editable until a **new version** is published |
| Survey A prompt | Banner after milestones + full screen in hub; snooze 7 days via AsyncStorage |
| Milestones (V1) | `sessions ≥ 3`, `first_closure` (≥1 `closed_delivered` post), `profile_complete` (`display_name` + ≥1 post) |
| Survey B distribution | PM posts link to FB giving-groups, WhatsApp neighborhood groups, Agora threads. Each channel gets a different `?src=` for funnel attribution. |
| Survey B anti-abuse | (1) Honeypot field. (2) `Origin` allowlist via Edge Function gateway. (3) Rate limit per IP-hash: 5/min, 30/hour, 100/day. (4) Global circuit breaker at >500 inserts/min. |
| Contact email (Survey B Q11) | Stored in **separate** table `public_research_contact_requests` with FK to response, enabling independent deletion (privacy) |

## 5. Routes (mobile + web)

| Route | Platform | Purpose |
|---|---|---|
| `/settings/surveys` | mobile + web | Hub: active Survey A entries + "חוות דעת חופשית" |
| `/settings/survey/[slug]` | mobile + web | Survey A runner |
| `/settings/feedback` | mobile + web | Short free feedback form (rating optional + text) |
| `/research/[slug]` | **web only** (`.web.tsx`) | Survey B runner; no auth shell, no tab bar |
| `/research/thanks` | **web only** (`.web.tsx`) | Thank-you page with optional "be first to see launch" email opt-in |

Demo route `/settings/survey-demo` stays behind `__DEV__` only.

## 6. Data model (summary)

**Tables shared (Survey A):** `surveys`, `survey_versions`, `survey_questions`, `survey_answers`. (Plan defines DDL.)

**Per-question rating anchors:** `survey_questions` adds `rating_anchor_low_he text NOT NULL DEFAULT 'לא מספיק'` and `rating_anchor_high_he text NOT NULL DEFAULT 'מצוין'`. Replaces the global hints in `surveyDemo.ts`.

**New for Survey B:**
- `public_research_responses` — anonymous; `(survey_slug, version, source, ip_hash, answers jsonb, created_at)`. `answers` shape: `{ "<question_id>": { rating: int, answer_text: text|null } }`. **RLS denies all to `anon`/`authenticated`**; inserts only via `SECURITY DEFINER` RPC.
- `public_research_contact_requests` — `(id, response_id FK, contact_email, contact_window_he, consent_at)`. Separate table for PII isolation per Israeli privacy law (חוק הגנת הפרטיות התשמ"א-1981 / GDPR data minimization).

**Free feedback (Survey-independent):** `user_feedback` table (rating optional + text required ≥10 chars), unchanged from V1 plan.

## 7. Technical decisions (security + ops)

### 7.1 Anonymous RPC hardening (Survey B)

The `submit_public_research_response()` RPC is the highest-risk surface in the app — callable by the `anon` role from any origin. Mandatory hardening:

```sql
CREATE OR REPLACE FUNCTION public.submit_public_research_response(...)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''      -- mandatory: prevents search_path hijack
AS $$ ... $$;

REVOKE ALL ON FUNCTION public.submit_public_research_response(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_research_response(...) TO anon;
```

All table references inside the function are fully qualified (`public.public_research_responses`, not `public_research_responses`).

### 7.2 Real client IP

`inet_client_addr()` in Postgres behind Supabase PgBouncer returns the connection-pool node IP, not the actual client. **The RPC cannot trust IP from inside Postgres.** Solution:

1. Public form POSTs to an Edge Function `public-research-submit`.
2. Edge Function validates `Origin` header against allowlist (`https://karma.community`, `https://karma-research.community`, etc.).
3. Edge Function reads `x-forwarded-for`, hashes with daily salt, passes hash + payload to the RPC.
4. RPC uses the passed-in hash for rate limit decisions.

Daily salt rotation: a `secrets.daily_research_salt` row, rotated by scheduled Edge Function at 00:00 UTC. Documented in `docs/SSOT/OPERATOR_RUNBOOK.md`.

### 7.3 Web-only routing

`app/apps/mobile/app/research/[slug].web.tsx` (not `.tsx`). Expo Router's platform extensions guarantee the file is excluded from native iOS/Android bundles entirely — no runtime `Platform.OS === 'web'` branch, no dead code shipped to mobile users.

### 7.4 `source` column (campaign attribution)

`text NOT NULL DEFAULT 'direct'` with `CHECK (source ~ '^[a-z0-9_-]{1,32}$')`. Avoids ENUM-migration-per-campaign overhead while preventing free-form garbage. Indexed for analytics.

### 7.5 Two migrations, not one

`0130_surveys_and_feedback.sql` (Survey A — authenticated, RLS-heavy) and `0131_public_research_responses.sql` (Survey B — anon, RPC + Edge Function gated). Separation forces reviewers to evaluate each security posture in isolation; bundling risks rubber-stamping the `GRANT EXECUTE TO anon` because surrounding context looks authenticated.

## 8. Survey A — questions (final v3)

All questions: rating 1–7 (required) + free text (optional). Anchors per question:

| # | label | prompt | anchor 1 | anchor 7 | text placeholder |
|---|---|---|---|---|---|
| 1 | המלצה | השבוע הקרוב — מה הסיכוי שתספר/י על קארמה למישהו/י? | אפס סיכוי | כבר סיפרתי השבוע | מה הכי משכנע אותך לספר — או הכי מונע ממך? |
| 2 | חוויה אחרונה | הפעם האחרונה שניסית לתת או לבקש בקארמה — איך הייתה החוויה? | מעצבן | זרם | תספר/י מה קרה — מהפתיחה ועד שיצאת |
| 3 | סיפור בפועל | ב-3 השבועות האחרונים — לכמה אנשים סיפרת על קארמה בפועל? | אף אחד | ל-5+ אנשים | מי היו, ומה אמרת להם? |
| 4 | כמעט מחיקה | עד כמה היית קרוב/ה למחוק את האפליקציה החודש? | אף פעם לא חשבתי | ידי הייתה על הכפתור | מה היה כמעט הקש האחרון? (גם דברים קטנים) |
| 5 | בחירה | בפעם האחרונה שרצית לתת — באיזו פלטפורמה בחרת לפרסם? | תמיד ווטסאפ/פייסבוק | תמיד קארמה | למה בחרת בזו ולא בשנייה? |
| 6 | חסם | עד כמה היה לך קל להגיע מרעיון לפעולה השבוע? | קשה, מתיש | פשוט וקל | מה הדבר האחרון שעצר או האט אותך השבוע? |

## 9. Survey B — questions (final v4)

All questions: rating 1–7 (required) + free text (optional). For Q11 the free text prompt asks for email + availability; the email itself is captured in a separate form field and routed to `public_research_contact_requests`.

**Survey intro (rendered above Q1):**

> **לפני שאת/ה מתחיל/ה — שתי שורות.**
> אנחנו בונים אפליקציה ישראלית לנתינה בחינם, בלי הבלגן של הקבוצות.
> 11 שאלות. אנונימי לגמרי. ~4 דקות.
> כל תשובה כאן משנה איך האפליקציה תיראה בפועל. תודה.

**Landing CTA (for FB/WhatsApp posts linking in):**

> בונים אפליקציית נתינה ישראלית. 11 שאלות, אנונימי, משנה הכל.

**Questions:**

| # | label | prompt | anchor 1 | anchor 7 | text placeholder |
|---|---|---|---|---|---|
| 1 | מסירה אחרונה | הפעם האחרונה שמסרת משהו בחינם (לא משנה איפה) — איך הייתה החוויה? | סיוט | חלק | תאר/י איך זה התגלגל — מההחלטה ועד שמישהו לקח |
| 2 | קבלה אחרונה | הפעם האחרונה שניסית לקבל משהו בחינם — איך הייתה החוויה? | ויתרתי באמצע | קיבלתי בקלות | ספר/י מה קרה |
| 3 | מקום ותדירות | כמה את/ה משתמש/ת בקבוצות ווטסאפ, פייסבוק או אגורה כדי לתת ולקבל בחינם? | כמעט אף פעם | כל יום | באילו פלטפורמות בעיקר, וכמה פעמים בשבוע? |
| 4 | תסכול בפעם האחרונה | בפעם האחרונה שהשתמשת בקבוצה כזו — עד כמה זה תסכל אותך? | בכלל לא | נשבעתי לעזוב | מה בדיוק קרה? |
| 5 | יכולת לסמוך | באיזו מידה את/ה מצליח/ה להעריך מראש אם הצד השני יבוא / יביא את מה שהבטיח? | בכלל לא יודע/ת | כמעט תמיד יודע/ת | ספר/י על אינטראקציה אחת — טובה או רעה — עם זר/ה בקבוצה |
| 6 | חוסר נעימות לבקש | כמה לא נעים לך לבקש משהו בפומבי בקבוצת השכונה? | מת/ה מבושה | לא מפריע לי בכלל | מה הופך את זה ללא נעים — או מה היה הופך אותו לקל? |
| 7 | מסחר חבוי | האם קרה לך פעם שמסרת משהו בחינם והפריט נמצא נמכר אחר כך באלפי/יד2? | לא קרה לי | קורה תדיר | תאר/י את המקרה — ואיך הרגשת |
| 8 | התאמה לעיצוב שלנו | אנחנו בונים אפליקציה: אנונימית, פיד גיאוגרפי של 1 ק"מ ממך, מאלצת סגירת פוסט כשמישהו לקח (לא חוזרים אליך אחר כך), אפס מסחר — רק בחינם. עד כמה זה מתחבר למה שאת/ה צריך/ה? | לא קשור אליי | זה בדיוק מה שחיפשתי | מה היה משכנע אותך — ומה היה אומר לך "לא בשבילי"? |
| 9 | סקרנות לאפליקציה | אם חבר/ה היה ממליץ/ה על אפליקציה חדשה לנתינה — כמה סביר שתבדוק/י? | לא אבדוק | אוריד מיד | מה היה צריך החבר/ה לומר לך כדי שתורידי? |
| 10 | מודעות לקארמה | שמעת על אפליקציה בשם "קארמה" לפני הסקר הזה? | לא שמעתי | אני כבר משתמש/ת | אם שמעת — מה ידוע לך עליה? |
| 11 | שיחה איתנו | יש לך 15 דקות לדבר איתנו ולעזור לעצב את האפליקציה? | לא עכשיו | בכיף | (separate field) מייל ושעה שנוחה |

**Thank-you page copy (`/research/thanks`):**

> **תודה. ברצינות.**
> קראנו כל מילה — וזה משנה את מה שאנחנו בונים עכשיו.
> רוצה לראות את האפליקציה ראשון/ה כשהיא יוצאת? [השאר/י מייל]

## 10. FR-IDs

**In `docs/SSOT/spec/11_settings.md`:**
- **FR-SETTINGS-015** — Surveys & feedback hub
- **FR-SETTINGS-016** — Server-driven survey runner (Survey A)
- **FR-SETTINGS-017** — Free feedback form (DB only, no support thread)

**In new file `docs/SSOT/spec/16_public_research.md`:**
- **FR-RESEARCH-001** — Public market research form (Survey B runner, web-only)
- **FR-RESEARCH-002** — Anti-abuse (honeypot + origin allowlist + IP-hash rate limit + circuit breaker)
- **FR-RESEARCH-003** — Contact-request opt-in (separate PII table)

`CLAUDE.md` §1 spec-files table must be updated to include row `16_public_research.md FR-RESEARCH-*`.

## 11. Selection-bias mitigations (Survey B distribution)

The council flagged a real risk: linking from FB giving-groups self-selects the heaviest, most-tolerant alt-platform users. To collect representative data:

1. Distribute to **adjacent** channels — secondhand-buying groups (יד2, אגורה consumers), generic neighborhood groups, parents' groups — not just giving-specific ones.
2. Per-source quota cap: max 100 responses per `source` to prevent one viral group dominating the dataset. (Enforced softly via PM monitoring; not RPC-blocked.)
3. Run a second cohort targeting **lapsed** giving-group members (paid Meta ads, "interested in decluttering / minimalism").
4. Each channel post gets a distinct `?src=` value for funnel-level analysis.

---

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1 | 2026-05-25 | Initial design from brainstorming + approved UI demo |
| 0.2 | 2026-05-26 | Added Survey B (public market research). Council review (4 agents: marketing, methodology, Hebrew copy, technical) integrated. Two migrations. PII isolation. Phrasebook output documented. Real client IP via Edge Function. Web-only `.web.tsx` routing. Per-question rating anchors. Spec-file split: FR-RESEARCH-* gets its own file `16_public_research.md`. |
