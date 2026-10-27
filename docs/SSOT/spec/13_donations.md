# 2.13 Donations Hub

> **Status:** ✅ Core Complete — Hub, 6 categories, donation links, Edge Function shipped. ⚠️ Audit 2026-05-16: 🔴 **`validate-donation-link` SSRF** — no host allow-list, no private-IP block, follows redirects (TD-79, BACKLOG P2.12). 🟠 FR-DONATE-003 AC2 missing jgive CTA; FR-DONATE-001/006 layout is 2-col grid instead of vertical stacked with divider; FR-DONATE-008 AC3 reachability rule diverged (`!= 404` instead of `200..399`); error-code parity gaps. TD-97. See `docs/SSOT/archive/audit/2026-05-16/06_donations_stats_settings.md`.
>
> **Behavior update (2026-05-12)** — Donation link **remove** is a hard **`DELETE`** on `donation_links` (authorized by RLS policy `donation_links_delete_own_or_admin`); the app no longer sets `hidden_at` / `hidden_by` on remove. **Edit** must always invoke `validate-donation-link` with body field **`link_id`** set to the UUID of the row being edited so the Edge Function performs an **UPDATE**, never a second INSERT. One-time DB cleanup: migration `0050_donation_links_purge_soft_deleted.sql` deletes rows that were previously soft-hidden (`hidden_at IS NOT NULL`). עברית: מחיקה = מחיקת שורה מהטבלה; עריכה = עדכון אותה שורה ב־UUID שנבחר, לא יצירת קישור חדש.

Prefix: `FR-DONATE-*`

---

## Scope

A bottom-bar tab that surfaces the three donation modalities of the platform — items, time, money — and routes the user to the right place per choice. In MVP, only **items** is fully native; **money** and **time** are coming-soon screens that route to external partners (`jgive`, `Lev Echad`), and **time** additionally offers a direct path to volunteer in our own org via the existing Super Admin chat (`FR-CHAT-007`).

Non-goals (out of scope):

- Server-side filtering, ranking, or recommendations on the Hub.
- Per-organization volunteer dispatch beyond a single admin thread.
- Native fundraising / donation flow (deferred — Money sub-screen is link-out only).
- Universal search across donation categories — that lives in `FR-FEED-016` (placeholder) and a future `FR-FEED-017+` (engine).

---

## FR-DONATE-001 — Donations Hub: 3 tiles

**Description.**
The Donations tab opens to a Hub screen showing three vertically stacked tiles for the three donation modalities.

**Source.**
- Design spec: [`docs/SSOT/archive/superpowers/specs/2026-05-09-donations-and-search-tabs-design.md`](../../archive/superpowers/specs/2026-05-09-donations-and-search-tabs-design.md).
- Decisions: `D-16`.

**Acceptance Criteria.**
- AC1. Tile order (visual top-to-bottom in RTL): **🎁 חפצים** → **⏰ זמן** → **💰 כסף**.
- AC2. Each tile shows an icon, a title, and a one-line subtitle. Tap target ≥ 44×44.
- AC3. Each tile is `accessibilityRole="button"` with `accessibilityLabel` = title + subtitle.
- AC4. The Hub screen is reachable from the bottom-tab `💝 תרומות` icon and from any screen that has a global TabBar.
- AC5. Hub layout is responsive: tiles stack vertically on all breakpoints; on Tablet/Desktop the container max-width is 480px and remains centered.

**Related.** Screens: 2.6 · `FR-DONATE-002`, `FR-DONATE-003`, `FR-DONATE-004`.

---

## FR-DONATE-002 — Items tile navigation

**Description.**
Tapping the Items tile navigates the user to the Home Feed unchanged.

**Source.**
- Design spec: §5.2.

**Acceptance Criteria.**
- AC1. Tap on the **🎁 חפצים** tile pushes `/(tabs)` (Home Feed).
- AC2. **No filter is pre-applied** to the feed; the user sees the feed in whatever filter state they last left it (per `FR-FEED-005`).
- AC3. Back navigation from the feed returns to the previous screen per OS / expo-router defaults.

**Related.** Screens: 2.1 · `FR-FEED-001`, `FR-FEED-005`.

---

## FR-DONATE-003 — Money sub-screen

**Description.**
A coming-soon screen for the Money modality that links out to the partner platform `jgive`.

**Source.**
- Design spec: §5.3.
- Decisions: `D-16`.

**Acceptance Criteria.**
- AC1. Body copy (Hebrew, verbatim): *"קטגוריית הכסף תפתח בקרוב. ועד אז מזמינים אתכם להיכנס ולתרום / לחפש תורמים דרך עמותת jgive."*
- AC2. A primary button labeled *"פתח את jgive.com ↗"* invokes `Linking.openURL('https://jgive.com')`.
- AC3. The link opens in the platform's external browser (no in-app WebView).
- AC4. If `Linking.canOpenURL` returns false, an inline error is shown: *"לא הצלחנו לפתוח את הקישור. נסו דפדפן אחר."*
- AC5. The screen is auth-required in MVP-core (`FR-DONATE-005`); see TD-112 for future guest-scope mirror.
- AC6. **(FR-DONATE-007 augmentation, 2026-05-10)** Below the existing CTA, the screen renders a `<DonationLinksList categorySlug="money" />` section — same component as the new category screens — listing community-curated links and exposing the *"+"* add-link button.

**Related.** Screens: 2.7 · External link target: `jgive.com`.

> **Implementation note (2026-05-12):** As of migration `0048_donation_link_report_message.sql`, the message is an actual `kind='donation_link_reported'` system message (not a plain user message). The admin sees a `DonationLinkReportedBubble` with a tap-to-open card. The Hebrew body in the original AC text describes the previous shape — the new payload structure is `{kind, link_id, url, display_name, category_slug}`.

---

## FR-DONATE-004 — Time sub-screen

**Description.**
A coming-soon screen for the Time modality that links out to `Lev Echad / we-me` and offers a direct volunteer-message path to our Super Admin via inline composer.

**Source.**
- Design spec: §5.4.
- Decisions: `D-16`.

**Acceptance Criteria.**
- AC1. Body copy (Hebrew, verbatim): *"קטגוריית הזמן תפתח בקרוב. ועד אז מזמינים אתכם להיכנס ולמצוא הזדמנויות התנדבות בפלטפורמה של ׳לב אחד׳."*
- AC2. A primary button labeled *"פתח את לב אחד ↗"* invokes `Linking.openURL('https://www.we-me.app/')`.
- AC3. Below a section divider, secondary copy: *"ניתן גם להתנדב ישירות בארגון שלנו, במקצוע שלך. השאירו הודעה ונחזור אליכם."*
- AC4. A multiline `<TextInput>` placeholder: *"הקלידו את ההודעה שלכם — מקצוע, תחום עניין, וזמינות..."*; max length 2,000 characters (consistent with `FR-CHAT-002 AC5`).
- AC5. A primary button labeled *"שלח הודעה"*:
   - Disabled when the trimmed text is empty.
   - On press (authed user, non-empty text): the message is appended to a local `volunteer_intent_log` in `AsyncStorage` (FIFO, capped to 50 entries). An alert is shown: *"תודה! ההודעה התקבלה. ניצור איתך קשר בקרוב דרך הצ'אט."* The textbox is cleared.
   - The screen is auth-required in MVP-core (`FR-DONATE-005`); guest interaction is N/A.
- AC6. ✅ **TD-114 closed (2026-05-16).** Composer uses `GetSupportThreadUseCase` + `SendMessageUseCase` with body prefixed `"התנדבות בארגון: "`; navigates to `/chat/[chatId]` on success. AsyncStorage local log removed.
- AC7. AsyncStorage write failure is silent; the alert is still shown so the user gets feedback.
- AC6. The use-case **resolves** the Super Admin user record by canonical email `karmacommunity2.0@gmail.com` (identical to `FR-CHAT-007 AC1`) and **finds-or-creates** the support `Chat` (`is_support_thread = true`). It **does not** create a second support thread when one already exists.
- AC7. The first message body is the user's text **prefixed** with the literal string *"התנדבות בארגון: "*. The prefix is contractual and is not localized in MVP.
- AC8. Network failure: the textbox content is preserved and an inline retry control is shown: *"לא נשלח. נסו שוב."*
- AC9. **(FR-DONATE-007 augmentation, 2026-05-10)** Below the volunteer composer, the screen renders a `<DonationLinksList categorySlug="time" />` section — same component as the new category screens — listing community-curated links and exposing the *"+"* add-link button.

**Related.** Screens: 2.8 · `FR-CHAT-007` · External link target: `we-me.app`.

---

## FR-DONATE-005 — Guest behavior on Donations

**Description.**
In MVP-core, the Donations tab and its sub-screens are **auth-required**. Guests live in the route-isolated `(guest)/feed` and do not see the bottom bar. A guest who deep-links to any `/donations/*` or `/search` route is redirected to `1.2 Auth`, consistent with PRD §6.8.1.

A future enhancement (`TD-112`) may mirror the Money and Time sub-screens into a `(guest)/donations/...` group so guests can engage with the external partner links (`jgive`, `we-me`) without authenticating; that is out of scope here.

**Source.**
- Design spec: §4.4.
- Constraints: `R-MVP-Core-2`, PRD §6.8.1.

**Acceptance Criteria.**
- AC1. The 5-tab bottom bar (with Donations + Search) is rendered only post-auth (consistent with the existing `_layout.tsx` `showTabBar` condition).
- AC2. A guest who attempts deep-link navigation to `/donations`, `/donations/money`, `/donations/time`, or `/search` is redirected to `1.2 Auth` per PRD §6.8.1.
- AC3. After authentication, the user lands on the home feed (`/(tabs)`) per existing post-auth flow; the originally requested route is **not** preserved in MVP-core (TD-111).

**Related.** Screens: 1.7, 2.5, 2.6, 2.7, 2.8 · `FR-AUTH-014`, `FR-FEED-012`, PRD §6.8.1.

---

## FR-DONATE-006 — Donations Hub: 6 new category tiles

**Description.**
The Donations Hub is extended with 6 community-driven category tiles below the existing items/time/money tiles, separated by a thin divider.

**Source.**
- Design spec: [`docs/SSOT/archive/superpowers/specs/2026-05-10-donation-categories-and-links-design.md`](../../archive/superpowers/specs/2026-05-10-donation-categories-and-links-design.md).

**Acceptance Criteria.**
- AC1. Tile order (visual top-to-bottom in RTL): existing **חפצים → זמן → כסף** group, then divider, then new group **אוכל → דיור → תחבורה → ידע → חיות → רפואה**.
- AC2. Each new tile uses the same `<DonationTile>` component (same height, icon, title, subtitle styling) as the existing tiles.
- AC3. Tap routes to `/(tabs)/donations/category/<slug>` where `<slug>` is one of `food`, `housing`, `transport`, `knowledge`, `animals`, `medical`. The route renders a hero (icon + title + subtitle) and the `<DonationLinksList>` for that slug.
- AC4. The category list (`donation_categories`) and per-category links (`donation_links`) are persisted in Postgres and shared across all users; categories are seeded by migration `0014_donation_categories_and_links.sql`.

---

## FR-DONATE-007 — DonationLinksList component

**Description.**
A reusable component renders the community-curated NGO link list for any category slug in `('time','money','food','housing','transport','knowledge','animals','medical')`. Used both on the new dynamic category screen and embedded below the existing Time and Money screens.

**Acceptance Criteria.**
- AC1. Lists rows for the slug where the row still exists and is visible: `donation_links.category_slug = slug AND hidden_at IS NULL`, newest first. (Hard-deleted rows are gone from the table; `hidden_at` remains in the schema only for legacy rows until purged.)
- AC2. Header row shows the section title (*"עמותות וקישורים"*) and a small *"+"* icon button (32×32, primary color) on the leading RTL edge.
- AC3. Each row shows: site favicon (with `link-outline` Ionicon fallback on image error), display name (h3), description (body, 2-line clamp), and tiny domain chip. Tap → `Linking.openURL(url)`.
- AC4. Empty state shows a friendly message + centered *"הוספת קישור ראשון"* CTA that opens the add-link modal.
- AC5. Loading state shows an `ActivityIndicator`; transient load failure shows an inline error + *"נסה שוב"* retry button.
- AC6. Rows render in a non-scrolling block (`View`); the **host screen** must wrap the hub section in a vertical `ScrollView` (or equivalent) so long category lists scroll reliably on web and native. Virtualized `FlatList` for this block alone is deferred (nested scroll + unbounded height issues on RN Web).
- AC7. After a successful **add**, **edit**, or **remove** for this category, the component **re-fetches** the list from Postgres (silent refresh: no full-screen loading swap) so the UI matches the database without manual navigation or pull-to-refresh.

---

## FR-DONATE-008 — Add / edit link flow + Edge Function validation

**Description.**
Any signed-in user can submit a new donation link via a modal sheet, or **edit their own** link (same modal; FR-DONATE-009). The submission is validated server-side by the `validate-donation-link` Edge Function which performs a URL reachability check and inserts or updates the row using the service-role key. Direct `donation_links` INSERT from client roles is blocked by RLS.

**Acceptance Criteria.**
- AC1. The modal collects: URL, display name (2..80 chars), description (optional, ≤280 chars).
- AC2. The *"הוסף"* / *"שמור"* primary action is disabled until URL matches `^https?://` and display name length is in range.
- AC3. On submit (add), the client calls the `validate-donation-link` Edge Function without `link_id`. The function:
  - Validates inputs and confirms `category_slug` is one of the 8 allowed slugs.
  - Enforces a soft rate-limit of 10 inserts per user per hour; over-limit returns `rate_limited`.
  - Performs `fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) })`. On 4xx/5xx or `405`, retries once with `GET`. Treats status `200..399` as reachable.
  - On reachability success, inserts a row with `validated_at = now()` using the service-role client and returns the inserted row.
- AC3b. On submit (**edit**), the client calls the same Edge Function with `link_id` set to the row UUID and the same field payload; the function verifies the caller is `submitted_by` **or** `users.is_super_admin = true` for that session user, the row is visible (`hidden_at IS NULL`), `category_slug` matches the stored row, then re-checks reachability (same `checkReachable` rules as insert) and **updates** `url`, `display_name`, `description`, `validated_at` (no insert rate-limit).
- AC3c. **Client contract (edit vs add).** While the modal is bound to an existing list row (edit mode), every successful save **must** use the update path (non-empty `link_id` in the Edge Function body). The client **must not** call the insert-only path in that mode; doing so would create a duplicate row. Implementation: submit handler derives `link_id` from the bound row’s primary key (`editingLink.id`), not from auxiliary state that can lag behind `visible`.
- AC4. UI feedback during submit: button shows a spinner with the label *"מאמת קישור..."*; on success the modal closes and the list reflects the change; on failure an inline localized error message is shown keyed off the returned `code` (`invalid_url`, `unreachable`, `rate_limited`, `unauthorized`, `forbidden`, `network`, `unknown`).
- AC5. Auto-publish: a successfully inserted or updated row is visible to all signed-in users immediately (no admin approval queue).

---

## FR-DONATE-009 — Reporting, edit, and removal

**Description.**
Each row's overflow (`…`) menu opens an action sheet with: *"פתח"*, *"דווח על קישור"*, *"ערוך"* (submitter **or** super-admin), and *"מחק"* (submitter **or** super-admin).

**Persistence.** *"מחק"* removes the row from Postgres via **`DELETE`** (see AC4–AC5). The authenticated app uses the Supabase client `delete` on `donation_links.id`; the Edge Function is **not** involved in remove. *"ערוך"* continues to use the Edge Function update path per `FR-DONATE-008`.

**Acceptance Criteria.**
- AC1. *"פתח"* → `Linking.openURL(url)`.
- AC2. *"דווח על קישור"* → reuses the existing get-or-create support thread (`FR-CHAT-007`) and sends a system-style message: `דיווח על קישור (donation_link:<id>) — <url>`. A success alert is shown.
- AC3. *"ערוך"* is shown when `donation_links.submitted_by = auth.uid()` **or** the session user is super-admin (`users.is_super_admin = true`). It opens the same modal as add with fields prefilled; saving calls the Edge Function update path (`link_id`) per `FR-DONATE-008 AC3b` and the client contract `FR-DONATE-008 AC3c`. On success the row updates in the list in place (no duplicate row).
- AC4. *"מחק"* is shown when `donation_links.submitted_by = auth.uid()` **or** the session user is super-admin (`users.is_super_admin = true`). On confirm, **permanently deletes** the row (`DELETE`); the row is removed from the local list immediately. Legacy soft-hidden rows (`hidden_at IS NOT NULL`) are purged by migration `0050_donation_links_purge_soft_deleted.sql` so the table stays aligned with the UI.
- AC5. Delete authorization is enforced by the `donation_links_delete_own_or_admin` RLS policy (own row OR `users.is_super_admin = true`). Columns `hidden_at` / `hidden_by` remain on the table for backward compatibility but are no longer written by the app remove path.

---

## FR-DONATE-010 — Platform-support donation card

**Description.**
A reusable presentational card prompting the viewer (guest or signed-in — see AC5) to back the platform itself by tapping through to **Bit** or **Paybox**. The destination URLs are stable, app-wide constants — not a community-curated list. Embedded in the About screen (twice — directly after the hero, and after the Vision section) and at the very top of the Settings screen.

**Source.**
- Product request 2026-05-18 (PM).

**Acceptance Criteria.**
- AC1. Component `DonationSupportCard` renders a single warm-tinted card (background = `colors.primarySurface`, border = `colors.primaryLight`) with: a centered heart icon badge, an h3 title, a body tagline, and two side-by-side CTA buttons.
- AC2. Buttons map to:
  - Primary (filled, `colors.primary`): label `donations.supportUs.ctaBit` → opens `https://www.bitpay.co.il/app/share-info?i=192485429007_19nlt4Un`.
  - Secondary (white + 1.5 px primary border): label `donations.supportUs.ctaPaybox` → opens `https://links.payboxapp.com/XR2JbQRxMUb`.
  - Each button shows an `open-outline` Ionicon as a trailing affordance.
- AC3. Tapping a button invokes `Linking.canOpenURL` → `Linking.openURL`. On failure, an `Alert` shows `donations.supportUs.linkError{Title,Body}`.
- AC4. All visible strings come from `donations.supportUs.*` (Hebrew bundle); no inline strings in component.
- AC5. Card is auth-agnostic — it renders identically for guest and signed-in users (Settings is auth-required today; About is reachable by guests through the existing route).
- AC6. Placement:
  - `AboutLandingScreen` — between `AboutHero` and `AboutSectionBlocksTop`, wrapped in `<AnimatedEntry delay={240}>` so it appears after the hero stagger completes.
  - `AboutSectionBlocksTop` — between the Vision section card and the Problems section card, wrapped in the same `AnimatedEntry` stagger as adjacent sections.
  - `settings.tsx` — first element inside the outer `ScrollView`, padded with `spacing.base` on both axes (`supportCardWrap`).
- AC7. Touch targets ≥ 44 × 44 px. Accessibility labels distinguish Bit vs Paybox (`ctaBitA11y`, `ctaPayboxA11y`).
- AC8. No network or storage side-effects — the component is fully presentational + `Linking`.

**Related.** None — independent of `FR-DONATE-001..009` (which target community-curated NGO links). The two systems coexist without coupling.

---

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1 | 2026-05-09 | Initial draft. Reintroduces Donations tab into MVP per `D-16`. Defines `FR-DONATE-001..005`. |
| 0.4 | 2026-05-12 | `FR-DONATE-007 AC6` — list rows are always a non-virtualized block; host screens use outer `ScrollView`. `FR-DONATE-008/009` — super-admin may **edit** any donation link via Edge Function + overflow menu. |
| 0.5 | 2026-05-12 | `FR-DONATE-009 AC4` — super-admin **remove** in row menu (native + web); matches existing `donation_links_delete_own_or_admin` RLS. |
| 0.6 | 2026-05-12 | `FR-DONATE-009 AC4–AC5` — remove path uses hard `DELETE` (not soft-hide); migration purges historical soft-hidden rows. |
| 0.7 | 2026-05-12 | Status banner + `FR-DONATE-008 AC3c` (client edit vs add contract); `FR-DONATE-007 AC1` + `FR-DONATE-009` description clarify DELETE vs Edge update; Hebrew summary in status. |
| 0.8 | 2026-05-12 | `FR-DONATE-007 AC7` — silent server refetch after add/edit/remove so the list re-renders without manual reload. |
| 0.9 | 2026-05-18 | Adds `FR-DONATE-010` — platform-support card (Bit + Paybox) embedded on About + Settings. |
