# Karma Points (FR-KARMA) — Continuation Handoff

> **Purpose:** This conversation got too long. A fresh chat should read this + the design + the plan, then finish **Phase 3 (mobile)** and **Phase 4 (SSOT)** and open the PR. Phases 0–2 are done, committed, and verified on the dev database.

## Read first
- Design: `docs/SSOT/archive/superpowers/specs/2026-05-29-karma-points-design.md`
- Plan (20 tasks, council-corrected): `docs/SSOT/archive/superpowers/plans/2026-05-29-karma-points.md`
- Process rules: `CLAUDE.md` (Hebrew in chat, English in code/docs; PM = user, you decide engineering).

## TL;DR of where we are
- **Branch:** `feat/FR-KARMA-001-karma-points` (off an older `origin/dev`; 7 commits + uncommitted WIP). Worktree: `/Users/navesarussi/KC/MVP-2/.claude/worktrees/romantic-mcclintock-77f8b6`.
- **Phase 0 (domain) ✅** committed — `packages/domain/src/karma.ts` (`computeValueBonus`, `KarmaEventType`, `KARMA_VALUE_BONUS_DIVISOR=50`, `KARMA_VALUE_BONUS_CAP_VALUE=1000`); `User.karmaPoints`, `Post.estimatedValue`; barrel exports `./karma`. 195 domain tests pass.
- **Phase 1 (DB) ✅** migrations `0187`–`0190` **already applied + recorded on dev** (`supabase_migrations.schema_migrations`) and committed:
  - `0187_post_estimated_value.sql` — `posts.estimated_value` int 0..1000 + grant.
  - `0188_karma_schema.sql` — `users.karma_points` + `replica identity full`; `karma_ledger` (+ partial-unique once-index, RLS select-self); `karma_value_bonus()`; `karma_grant_once()` (race-safe `ON CONFLICT`); `karma_apply()`.
  - `0189_karma_triggers.sql` — single-anchor award triggers: registration (users insert), post-create/admin-remove/**closure anchored to `posts.status` transition** (Give+Request economic roles + value bonus; reversal zeroes the post's closure ledger balance), follow ins/del, outreach (once-per-post + soft daily cap 10).
  - `0190_karma_recompute_and_backfill.sql` — drift tables, `karma_recompute_nightly()` (pre-aggregated), pg_cron `30 4 * * *`, one-time backfill (`1 + given*20 + received*15 + followers*1`). **27 dev users backfilled** (min 1, max 177, avg 12.3, 0 drift).
  - **Comprehensive SQL tests committed + green on dev** (run wrapped in `BEGIN…ROLLBACK`): `supabase/tests/0189_karma_economy.sql` (12 scenarios: registration, Give+Request closure, reopen/unmark reversal, follow churn, outreach once+owner-exempt+daily-cap, admin-remove, floor-at-zero, ledger integrity) and `supabase/tests/0190_karma_recompute.sql`.
- **Phase 2 (infra) ✅** committed — `IUserRealtime` port + `SupabaseUserRealtime` adapter (filters `user_id=eq.<me>`, `onError`); `mapUserRow`→`karmaPoints`; `mapPostRow`→`estimatedValue`; `CreatePostInput.estimatedValue?`; `SupabasePostRepository` insert writes `estimated_value`; `database.types.ts` regenerated (karma tables/functions + 2 columns). 935 infra + 663 app tests pass.
- **Docker build hotfix — DONE, separate PR #493 MERGED to dev** (`npm ci`→`npm install` in the Dockerfile web-server stage). Not part of this branch.
- **Phase 3 (mobile) 🟡 partial** — uncommitted WIP: `@react-native-community/slider` dep added; Hebrew i18n `karma.*` module created (`app/apps/mobile/src/i18n/locales/he/modules/karma.ts`) + wired into `he/index.ts`. **Nothing visible yet** — that's why the profile shows no karma badge.

## Resume environment (critical gotchas)
- Run pnpm from `app/`: `cd app`.
- **Node 20.17 needs a flag for vitest 4:** prefix every test run with `NODE_OPTIONS=--experimental-require-module` (CI's Node 20.19+ has it by default). e.g. `NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/mobile test`.
- Deps: run `pnpm install` from `app/` if node_modules is stale.
- **Dev DB (playground — PM authorized full read/write/migrate; NEVER prod):** ref `roeefqpdbftlndzsvhfj`. Secrets in `~/.kc-dev-secrets.env` (`SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`). psql:
  ```bash
  set -a; source ~/.kc-dev-secrets.env; set +a
  export PGPASSWORD="$SUPABASE_DB_PASSWORD"
  CONN="host=db.${SUPABASE_PROJECT_REF}.supabase.co port=5432 user=postgres dbname=postgres sslmode=require"
  psql "$CONN" -c "select user_id, karma_points from public.users order by karma_points desc limit 5;"
  ```
  Migrations 0187–0190 are already applied; do NOT re-apply. The Supabase MCP is also available (`mcp__supabase__*`, project ref above).
- **The app uses a runtime theme, not static colors.** Style new components with the house idiom:
  ```tsx
  import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
  const useStyles = makeUseStyles((colors) => ({ box: { backgroundColor: colors.surface, borderRadius: radius.lg, ...typography.h4 } }));
  function C() { const { colors } = useTheme(); const styles = useStyles(); /* colors for inline tints */ }
  ```
  Confirmed tokens: `colors.primary` `#F97316`, `colors.primaryLight`, `colors.primarySurface` `#FFF7ED`, `colors.surfaceCream` `#FFFBF7`, plus `surface/border/textPrimary/textSecondary`. `spacing/radius/typography` are static imports. **Do NOT** use `import { colors } from '@kc/ui'` (the stale plan does — adapt it).

## Phase 3 — remaining (ordered). The visible fix is steps 4–5.

All mobile files are under `app/apps/mobile`. The create-post form hooks exist: `src/hooks/useCreatePostFormState.ts`, `src/hooks/usePostDraftAutosave.ts`, `src/lib/postDraftFormState.ts` (`POST_DRAFT_DEFAULTS`, `PostDraftFormState`, `isFormStateAtDefaults`, `buildDraftPayload`), `src/store/postDraftStore.ts` (`PostDraftPayload`), `src/hooks/useCreatePostPublish.ts`, `app/(tabs)/create.tsx`, `src/components/CreatePostForm/CreatePostFormScrollContent.tsx`. Read each before editing — confirm exact anchors.

1. **`EstimatedValueSlider`** — `src/components/CreatePostForm/EstimatedValueSlider.tsx`. Give-only. Centered title `t('karma.estimatedValueTitle')` (="שווי מוערך של החפץ"), `@react-native-community/slider` 0–1000 step 50, top shows `t('karma.estimatedValueMax')` ("1000+") else `t('karma.estimatedValueAmount', { value })`, hint `t('karma.estimatedValueHint')`. Use the `makeUseStyles`/`useTheme` idiom above; `minimumTrackTintColor={colors.primary}`.
2. **Thread `estimatedValue`** (number, default 0):
   - `lib/postDraftFormState.ts`: add to `PostDraftFormState`, `POST_DRAFT_DEFAULTS` (=0), `isFormStateAtDefaults` (compare), `buildDraftPayload` (include).
   - `store/postDraftStore.ts`: add `estimatedValue: number` to `PostDraftPayload`.
   - `hooks/useCreatePostFormState.ts`: add `estimatedValue` state + setter + apply-draft.
   - `hooks/usePostDraftAutosave.ts`: add to input type, persisted payload, AND the effect dependency array.
   - `hooks/useCreatePostPublish.ts`: add to args, pass `estimatedValue: args.isGive ? args.estimatedValue : null` into `create(...)` (`CreatePostInput.estimatedValue` is already optional in the port).
   - `app/(tabs)/create.tsx`: pass `estimatedValue: form.estimatedValue` into `usePostDraftAutosave({...})` and `useCreatePostPublish({...})`; pass `estimatedValue`/`onEstimatedValueChange={form.setEstimatedValue}` to `<CreatePostFormScrollContent/>`.
   - `CreatePostFormScrollContent.tsx`: add the two props; render `<EstimatedValueSlider value={estimatedValue} onChange={onEstimatedValueChange}/>` inside the existing `{isGive && ( ... )}` block (the item-condition section). Import it.
3. **Realtime** (live counters/karma) — `src/services/userRealtimeComposition.ts`: `getUserRealtime()` = `new SupabaseUserRealtime(getSupabaseClient({ storage: pickStorage() }))` (mirror `userComposition.ts`; `pickStorage` is defined there — reuse the same import). Then `src/hooks/useMeRealtime.ts`: on a signed-in `userId`, `getUserRealtime().subscribeToSelf(userId, (user) => queryClient.setQueryData(['user-profile', userId], user), (err)=>{ if(__DEV__) console.warn('[karma]', err.message); })`. Mount once **inside** the `QueryClientProvider` in `app/_layout.tsx` via a tiny `function MeRealtimeMount(){ useMeRealtime(); return null; }` rendered above `<Stack/>` (a hook in `RootLayout`'s body is ABOVE the provider → would throw "No QueryClient set").
4. **`KarmaBadge`** — `src/components/profile/KarmaBadge.tsx`. Self-only number + a "how to earn" modal (`t('karma.howToEarnTitle')`, intro, the `earn*` bullets, `t('karma.close')`). `useTheme`/`makeUseStyles` idiom. Props: `{ points: number }`.
5. **Mount the badge (THE VISIBLE FIX)** — in `src/components/profile/MyProfileChrome.tsx`: it already reads `const user = userQuery.data ?? null;` from `['user-profile', userId]` (which now includes `karmaPoints` via the mapper). Render `{user ? <KarmaBadge points={user.karmaPoints}/> : null}` near `<ProfileStatsRow/>` (~line 111). **The number appears from this query even without realtime** — realtime (step 3) only makes it live. Do NOT mount it on the other-user profile (`app/user/[handle]/index.tsx`, key `['profile-other', handle]`) — FR-KARMA-008 self-only.
6. **Stats screen** — `app/stats.tsx` already reads `u` from `['user-profile', userId]`. Call `useMeRealtime()` there and render `<KarmaBadge points={u?.karmaPoints ?? 0}/>` (or a card) above the `PersonalStatsStrip`.
7. **Verify:** `cd app && NODE_OPTIONS=--experimental-require-module pnpm --filter @kc/mobile typecheck && pnpm --filter @kc/mobile test && pnpm --filter @kc/mobile lint`. Then browser-verify: a preview server config exists at `.claude/launch.json` (name `mobile-web`, port 8083) — start it (`mcp__Claude_Preview__preview_start` name `mobile-web`) and load My Profile → the karma badge shows the number; tap → "how to earn" sheet; create a Give post → slider appears (hidden for Request). The user reported the badge missing on web — confirm it now shows.

## Phase 4 — SSOT (ship in the same PR)
- Create `docs/SSOT/spec/14_karma.md` — FR-KARMA-001..009 with ACs from the design's "Goals" + "Points schedule", plus a **Mechanism notes** section (status-anchored closure; single-anchor append-and-sum + partial-unique once-events only; realtime `user_id` filter + `replica identity full`; outreach daily cap shipped; client live-update via react-query cache). Status header ✅ on merge. English only.
- `docs/SSOT/BACKLOG.md`: add a P2 row for FR-KARMA → ✅ Done.
- `docs/SSOT/DECISIONS.md`: add **D-155** (self-only-for-now visibility, public-ready model, points economy + retunable single-source, +1 registration floor, server-authoritative status-anchored awards, own-row realtime) and **D-156** (anti-collusion = reciprocity/velocity caps are a HARD precondition of the future public flip, FR-KARMA-008; + in-app heads-up before a months-old private number becomes visible). Confirm next free D-id (was 154 when planned).
- `docs/SSOT/TECH_DEBT.md`: close `TD-98` (per-user counters now realtime, not focus-only). Add watch items: anti-collusion before public flip (D-156); realtime upgrade path Broadcast-from-DB if fan-out grows.
- `docs/SSOT/spec/10_statistics.md`: note FR-STATS-001 AC2 reactivity now satisfied via own-row Realtime (FR-KARMA-009).

## Council corrections already baked in — DO NOT revert
Status-anchored closure (not recipients-row); `karma_grant_once` uses `ON CONFLICT` (not `NOT EXISTS`); `replica identity full` on users; realtime filters `user_id` (not `id`); recompute pre-aggregated; `Unsubscribe` reused from `IChatRealtime` (no redeclare); realtime `onError` sink; **no `KARMA_POINTS` object** (only divisor/cap on the client); `CreatePostInput.estimatedValue` optional; `mapPostRow` test uses the real fixture; outreach soft daily cap shipped.

## Final
From `app/`: `pnpm typecheck && NODE_OPTIONS=--experimental-require-module pnpm test && pnpm lint && pnpm lint:arch` (≤300-line file cap, dep direction). Commit Phase 3 + Phase 4. Then: `git fetch origin dev`, `gh pr create --base dev` (title conventional-commits, **lowercase subject** — PR-hygiene check enforces `^(?![A-Z]).+$`; body MUST contain a "Mapped to spec" line — CI enforces it), `gh pr update-branch <n>` if behind, `gh pr merge <n> --auto --squash --delete-branch`. The dev CI merge gate path-filters required checks (app/** + supabase/** present here, so they run). Sonar quality gate lags ~2min then auto-merge fires.
