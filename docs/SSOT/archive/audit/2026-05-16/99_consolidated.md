# Audit 2026-05-16 — Consolidated master sheet

Companion to `01_*` through `07_*`. Each row maps a finding to its destination (TECH_DEBT id, BACKLOG entry, or spec amendment). Severity totals: **22 🔴 HIGH · 86 🟠 MED · 56 🟢 LOW** across 164 findings.

The HIGH list is what the loop should pick next. Mediums are queued in TECH_DEBT. Lows are mostly polish/docs.

## High-severity findings → routing decisions

| # | Source | Symptom | New home |
| -- | ------ | ------- | -------- |
| H1 | BSEC-1 (`01_backend_security.md`) | `messages_insert_user` (migration 0072) dropped the `chats.removed_at IS NULL` guard from 0028 — soft-removed chats become writable; NULL-IN form silently degrades. | BACKLOG **P2.12** (BE Security v2); TD-**67** |
| H2 | BSEC-2 | `is_active_member(uuid)` (0072) is `SECURITY DEFINER` + granted to `authenticated` → PostgREST enumeration of any uuid's ban/suspend status. Same class 0070 just closed. | BACKLOG **P2.12**; TD-**68** |
| H3 | AUTH-1 / NOTIF-1 (dup) | `handleSignOut` never calls `deactivateCurrentDevice` → Expo push token row stays `is_active=true` against the signed-out user. Next user on same device shares the row. | BACKLOG **P2.13** (Push hygiene); TD-**100** |
| H4 | AUTH-2 | `mapUserRow.privacyMode` blind-casts an untyped DB string to a 2-value union. After D-21 only `Public`/`Private` are valid; drift breaks lock-icon + follow-requests gates. | TD-**69** |
| H5 | POST-01 | `FR-POST-013` AC1 — the 300-day expiry transition is unimplemented. Only the day-293 *notification* cron exists; no job ever sets `posts.status='expired'`. Lifecycle FSM never advances. | BACKLOG **P2.17** (Post expiry); TD-**70** |
| H6 | POST-02 | `rpc_recipient_unmark_self` manually decrements owner counter AND subsequent `reopen_post_deleted_no_recipient` re-triggers `posts_after_change_counters` → owner counters drift to -1 of correct value until nightly recompute. | BACKLOG **P2.16** (Counter drift); TD-**71** |
| H7 | POST-03 | `getProfileClosedPostsHelper.ts:42-62` bypasses `applyPostActorIdentityProjectionBatch`. Closed posts on respondent profile leak Hidden identities. Violates D-26. | BACKLOG **P2.15**; TD-**72** |
| H8 | POST-04 | Same projection bypass in `searchQueryHelpers.ts` + `searchExploreHelpers.ts`. Search results leak Hidden identities. | BACKLOG **P2.15**; TD-**72** (same row) |
| H9 | NOTIF-2 | `follow_started` / `follow_approved` triggers pass `user_id` as `handle` but the route resolves `share_handle` → tapping either notification lands on "user not found". | BACKLOG **P2.13**; TD-**73** |
| H10 | NOTIF-3 | `messages_enqueue_notification` falls back to `participant_a` for system messages (`sender_id IS NULL`). Combined with self-suppression, ~50% of `post_closed` + every server-injected system push is silently dropped based on UUID order. | BACKLOG **P2.13**; TD-**74** |
| H11 | CHAT-1 | `messages_insert_user` lacks `has_blocked` check. A blocked counterpart can still INSERT messages + fire a push to the blocker. Violates FR-CHAT-009 AC3. | BACKLOG **P2.12**; TD-**75** |
| H12 | MOD-1 | Auto-suspend of a `target_type='user'` flips `account_status='suspended_admin'` but enqueues NO `auto_removed` notification (`posts_enqueue_auto_removed` only listens on `posts.status`). User locked out silently. | BACKLOG **P2.13**; TD-**76** |
| H13 | MOD-2 | Auto-removed chats vanish from both inboxes with no banner + no per-party system message → both parties think the chat broke. | BACKLOG **P2.13**; TD-**77** |
| H14 | MOD-3 | Follow-request / approval dedupe keys lack a cycle segment. After the 14-day cooldown (FR-FOLLOW-008) re-requests silently drop the notification. | BACKLOG **P2.13**; TD-**78** |
| H15 | DON-1 | `validate-donation-link` Edge Function has no SSRF protection — accepts any URL, follows redirects, no private-IP/port/host guards. Confused-deputy internal-network probe. | BACKLOG **P2.12**; TD-**79** |
| H16 | SET-1 | `FR-SETTINGS-010` AC1/AC2 — Terms/Privacy must be in-app web views with remote-config URLs + AC3 re-acknowledge. Ships as static inline Hebrew text instead. Legal-compliance gap. | BACKLOG **P2.18** (Legal compliance); TD-**80** |
| H17 | FE-3 | Supabase session (access + refresh token + PKCE verifier) persists to plaintext AsyncStorage on native. `expo-secure-store` is installed/configured but never imported. Promotes `AUDIT_2026-05-10 §4.7` from 🟡 to 🔴 (six commits later, unchanged). | BACKLOG **P2.14** (FE Security); TD-**101** |
| H18 | FE-4 | `useNotificationTapRouting` feeds `data.route` from push payload straight into `router.push` with no allow-list. Push-payload compromise becomes in-app navigation primitive. | BACKLOG **P2.14**; TD-**102** |
| H19 | FE-6 | AASA + assetlinks deep-link manifests still contain literal `REPLACE_WITH_APPLE_TEAM_ID` and `REPLACE_WITH_ANDROID_RELEASE_SHA256`. AASA covers only `/auth/verify*` (missing `/auth/callback`, `/post/[id]`, `/user/[handle]`, `/chat/[id]`). | BACKLOG **P2.14**; TD-**66 (already exists, escalate to 🔴)** |
| H20 | FE-8 | `filterStore` / `searchStore` / `lastAddressStore` use globally-scoped persist keys. User A's exact home street + number pre-fills user B's Create-Post form on the same device. | BACKLOG **P2.14**; TD-**103** |
| H21 | POST-10 | `post_actor_identity_select_post_visible` requires `auth.uid() IS NOT NULL` → guests querying the projection get empty map → see real names even when participant chose Hidden. | TD-**81** (BE, MED on closer reading — guest preview today caps at 3 Public posts and identity projection isn't called from guest path, but a future surface change would leak. Demote to 🟠 in TD.) |

(H21 is downgraded after verification — no current leak surface, so MED in TD; left in this table as a near-miss.)

## Medium-severity items going straight to TECH_DEBT (new TD assignments)

Listed by source file. Each item gets a new TD-* ID in the appropriate lane.

### BE lane (TD-67..99 — H1/H2/H5/H6/H7/H9/H10/H11/H12/H13/H14/H15/H16/H21 already consumed above)

| New TD | Sev | Source | Summary |
| ------ | --- | ------ | ------- |
| TD-82 | 🟠 | BSEC-4 | `validate-donation-link` SSRF (escalates DON-1 into TD form alongside the BACKLOG entry). |
| TD-83 | 🟠 | BSEC-5 | `find_or_create_support_chat` internal helper (0033) still race-prone — 0070 fixed only the public wrapper; 0074 + report triggers still hit racy path. |
| TD-84 | 🟠 | BSEC-6 | `post-images` storage bucket has no `file_size_limit` and no `allowed_mime_types`. Compare `avatars` (0009). Storage cost + stored-XSS vector. |
| TD-85 | 🟠 | BSEC-7 | `post_actor_identity.updated_at` client-writable + adapter passes `new Date().toISOString()`. Class identical to 0070-§5 fixes. |
| TD-86 | 🟠 | BSEC-8 | Stale `post_actor_identity` rows after `rpc_recipient_unmark_self` (no cascade) → ex-recipient keeps stale UPDATE-USING reach. |
| TD-87 | 🟠 | BSEC-9 | RPC sweep for `is_active_member(v_caller)` check missing across `rpc_recipient_unmark_self`, `rpc_chat_set_anchor`, `close_post_with_recipient`, `rpc_submit_support_issue`, `reopen_post_marked`, `reopen_post_deleted_no_recipient`. |
| TD-88 | 🟠 | BSEC-10 | `reports_insert_self` doesn't check `is_active_member` — banned users can still file retaliatory reports. Decide intent or close. |
| TD-89 | 🟢 | BSEC-11 | `users_biography_no_url_check` added `NOT VALID`, never validated; regex false-positives `e.g.`, `Dr.Smith`, `Node.js`. |
| TD-90 | 🟢 | BSEC-12 | 0084 dropped NOT NULL from `display_name`/`city`/`city_name`; column-level UPDATE grant + no CHECK allows self-griefing back to null post-onboarding. |
| TD-91 | 🟢 | BSEC-13 / BSEC-14 / NOTIF-14 | Convention sweep: audit-action `CHECK` rename dance silently drops actions; `create or replace function` without `drop function if exists` cycle (§1.10 family); push i18n key missing-fallback raises raw key. |
| TD-92 | 🟠 | NOTIF-5 / NOTIF-6 / NOTIF-7 / NOTIF-8 | Notification dispatcher hardening cluster — post-expiry cron catch-up window; per-minute dedupe key blocks coalescer; `last_seen_at` refresh on AppState=active; permanent dedupe table for `auto_removed` / `unmark_recipient` to survive outbox TTL. |
| TD-93 | 🟠 | MOD-4 | `getUniversalSearchUseCase` honors `users_select_active` → admin can't search banned/suspended users (the audit's primary use case). Need `is_admin` SECURITY DEFINER lookup. |
| TD-94 | 🟠 | MOD-6 / MOD-9 / MOD-12 / MOD-13 / MOD-14 / MOD-15 | Moderation RPC + admin sweep: `rpc_submit_support_issue` writes no `reports` row; `report_target_not_visible` masks "already moderated"; `is_post_visible_to` has no admin bypass; `admin_restore_target` double-bumps sanctions; audit `metadata` empty on restore; no freshness window on open reports counted toward auto-removal threshold. |
| TD-95 | 🟢 | MOD-16 / MOD-17 / MOD-18 / MOD-19 / MOD-22 / MOD-23 / MOD-24 | Follow / admin small-fixes cluster: cursor/sort key mismatch in followers list pagination; missing `not_found_or_resolved` from race; 42501 mis-mapping post-EXEC-9; audit metadata schema drift; auto_removed only injected into 3rd reporter's thread; missing unique partial index on single-admin invariant; `admin_restore_target` clobbers `pending_verification`. |
| TD-96 | 🟢 | CHAT-5 / CHAT-13 / NOTIF-14 | Chat surface cleanup: `post_closed` system bubble not registered in `SystemMessageBubble` → blank pill once TD-148 lands; three layered `rpc_get_or_create_support_thread` definitions; i18n missing-key warn for `dispatch-notification`. |
| TD-97 | 🟠 | DON-2 / DON-3 / DON-5 / DON-6 / DON-7 / DON-8 / DON-9 / DON-10 | Donations cluster: missing jgive CTA (FR-DONATE-003 AC2); grid layout vs vertical AC1 + missing divider (FR-DONATE-006); dead `softHide` method; spec-divergent reachability rule (`!= 404` instead of `200..399`); error-code parity gaps (`server_error` / `invalid_input`); rate-limit defense thin; HTTP 200 + body-code on errors; vestigial `is hidden_at null` filter. |
| TD-98 | 🟠 | STAT-2 / STAT-3 / STAT-4 / STAT-5 / STAT-6 / STAT-7 / STAT-8 | Statistics cluster — reactive update missing (refresh-on-focus only); deep-link existence guard; cached endpoint vs direct view read (already in TD-135 closing slice); FR-STATS-003 cap drift; clamp logging vs alerting; FR-STATS-006 AC2 says auth-only but view granted to anon (spec contradiction); section ordering vs spec. |
| TD-99 | 🟠 | SET-2 / SET-3 / SET-4 / SET-5 / SET-6 / SET-7 / SET-8 / SET-9 / SET-10 | Settings cluster — section order (Legal as its own group); Notifications inline vs sub-screen; Account section unbuilt (FR-SETTINGS-002); read-only contact-change modal missing (FR-SETTINGS-013); broken `support@karma.community` mailto (use `karmacommunity2.0@gmail.com` per memory); logout has no confirmation; delete-account-modal uses keyword not display_name (FR-SETTINGS-012 AC1); SET-8 TD-118 re-evaluation. |

### FE lane (TD-100..149 — H3/H17/H18/H20 already consumed)

| New TD | Sev | Source | Summary |
| ------ | --- | ------ | ------- |
| TD-104 | 🟠 | AUTH-3 / AUTH-9 / AUTH-11 / AUTH-15 / AUTH-19 | Auth/Profile UX cluster — welcome screen missing email entry; forgot-password dead button; edit-profile no read-only email/phone block; `FR-AUTH-016` cooldown unimplemented; Share Profile no-op (TD-106 closure). |
| TD-105 | 🟠 | AUTH-4 / AUTH-5 / AUTH-6 / AUTH-7 / AUTH-8 / AUTH-10 / AUTH-12 / AUTH-13 / AUTH-14 / AUTH-20 | Auth/Profile small-fixes cluster — soft-gate wired only to post-create; OnboardingStepHeader no Back on step 1; avatar resize 512 vs 1024; SSO avatar never copied to our bucket; followers list non-paginated; SignInWithEmail `invalid_email` distinct code; biography regex over-matches; OnLockPress tappable on other-user profile; AuthGate offline cold-start `isLoading` stuck; profile counters not Realtime-subscribed. |
| TD-106 | 🟢 | AUTH-16 / AUTH-17 / AUTH-18 | Application-layer error-class hygiene — `CompleteBasicInfoUseCase` mixes raw `Error` + `OnboardingError`; `ResendVerificationEmail` enforces no cooldown; `editableProfileSupabase` throws raw `Error`. |
| TD-107 | 🟠 | POST-06 / POST-07 / POST-09 / POST-11 / POST-12 / POST-13 / POST-14 | Posts/Feed FE cluster — missing OnlyMe interstitial (FR-POST-006 AC3); missing owner-mode banners (FR-POST-015 AC2/3); Home Feed `onEndReached` not wired (§3.11 still open); `SearchFilters` lacks shared post-shape dimensions (TD-136 expansion); distance-fallback invisible (FR-FEED-007); image-upload cleanup on cancel; `applyPostActorIdentityProjection` sets `shareHandle=''` instead of `null`. |
| TD-108 | 🟠 | POST-05 | `FR-POST-007` local draft autosave **entirely unimplemented** — spec status header lies. Either spec downgrade or new feature backlog. |
| TD-109 | 🟠 | POST-08 | Edit-post emits no `audit_event` (FR-POST-008 AC4). |
| TD-110 | 🟠 | CHAT-2 / CHAT-3 / CHAT-4 / CHAT-6 / CHAT-7 / CHAT-8 / NOTIF-4 / NOTIF-9 / NOTIF-10 | Chat/Notifications FE cluster — RTL bubble alignment on web; deleted-user inbox over-dedupe; unread badge flicker on incoming-while-reading; `subscribeToInbox` no status handler; optimistic-message dedupe brittle on repeated body; system-message inbox preview; foreground suppression gap for `support_message` + `system_message`; web tap-handler dormant; client-side race on toggle-then-notification. |
| TD-111 | 🟢 | CHAT-9..16 / NOTIF-11..16 | Chat/Notif polish cluster — counter visibility threshold; auto-message dedupe by post (FR-CHAT-005 AC4); FR-CHAT-016 entry-point reuse; tie-break docs; chat search niqqud normalize; anchored card gating; admin long-press flicker; quiet-hours absent (compliant); FR-NOTIF-012 deletion email; web register fallthrough log; push title/body fallback; quick-actions deferred. |
| TD-112 | 🟠 | MOD-5 / MOD-7 / MOD-8 / MOD-10 / MOD-11 / MOD-20 / MOD-21 | Following/Mod FE cluster — unfollow confirm copy missing name interpolation; FollowState `UserUnavailable` not surfaced; followers list inner-button propagation bug; `ReportUserModal` uses `Alert.alert` (no-op on web); `ReportChatModal` missing reset-on-close `useEffect`; auto-removed bubble inline-ban hardcodes reason/note; remove-follower query-invalidation incomplete. |
| TD-113 | 🟢 | MOD-25 | EXEC-9 stale i18n strings (`block_user`/`unblock_user`) — delete after block-restoration decision lands. |
| TD-114 | 🟢 | STAT-5 / DON-7 / DON-9 | App-layer + edge-fn contract consistency cluster (cross-references several others). |
| TD-115 | 🟠 | SET-11 / SET-12 / SET-13 / SET-14 | About / Settings FE polish — Instagram embed web-vs-native AC clarification; absent language picker (intentional); broken WhatsApp group invite (single-chat `wa.me` URL); contact CTA double-entry. |
| TD-116 | 🟠 | FE-1 | `(tabs)/create.tsx` 450 LOC vs allowlist 393 → `pnpm lint` red on `dev`. Folds into TD-29. |
| TD-117 | 🟠 | FE-2 | `i18n/locales/he/modules/post.ts` 216 LOC → split into sub-modules. |
| TD-119 | 🟠 | FE-5 | TD-3 (cold-start deep-link race) — concrete reproducer captured (cold-start tap on chat notification while signed out drops the link). Downgrade TD-3 from "no reproducer" to actionable. |
| TD-120 | 🟠 | FE-7 | Home Feed perpetual spinner — `hasMore=true` but no `onEndReached` callback. Closes §3.11 alongside POST-09. |
| TD-121 | 🟠 | FE-9 | `app.json` missing `extra.eas.projectId` → push registration silently skipped on local builds. |
| TD-122 | 🟠 | FE-10 | `.turbo/cache/*` accidentally committed in `5035c36` (21 files). `gitignore` needs `.turbo/`. |
| TD-124 | 🟠 | FE-11 / FE-12 | Hebrew literal sweep extension (TD-154 amplification) — `aboutExternalLinks.ts` mail subject + WhatsApp prefills; `app.json` `expo.name` + iOS usage descriptions. |
| TD-125 | 🟠 | FE-15 | No Sentry / Crashlytics anywhere — `ErrorBoundary.componentDidCatch` only logs in `__DEV__`. P0 launch readiness gap. |
| TD-126 | 🟠 | FE-16 / FE-17 / FE-18 / FE-25 | Performance cluster — list-item cards not `React.memo`'d + inline `renderItem`; bare `<Image>` everywhere (need `expo-image` with disk cache); `useFeedRealtime` stale-closure on `onResume`; `useFilterStore()` full-store subscribe on Home Feed. |
| TD-127 | 🟠 | FE-19 / FE-20 | Routing/cold-start cluster — eleven typed-route escapes (`as never` / `as any`); auth-state race on cold-start with parallel restore + subscribe. |
| TD-129 | 🟢 | FE-13 / FE-14 / FE-21 / FE-24 / FE-26 / FE-27 / FE-28 / FE-29 / FE-30 | FE hygiene cluster — i18next `compatibilityJSON: 'v3'`; dead `+html.tsx`; duplicated `pickStorage()` (6 copies); `chatStore` realtime onError silent; CI lint check absent on `dev`; PKCE verifier storage trust (folds into TD-101); dual-bar tab navigator needs DECISIONS entry; no English-locale fallback testing; raw `throw new Error` in screens. |

## Spec amendments to apply in the same change-set

Sub-set of the per-area files — each row is a spec edit, not code work. Bundled under TD-130 (FE) and TD-50 (BE) tracking rows.

| Spec | Edit |
| ---- | ---- |
| `04_posts.md` FR-POST-007 status | Downgrade ✅→⏳ (autosave not implemented). |
| `04_posts.md` FR-POST-013 AC1 | Either ship the expire-status cron or change AC to "notify-only at day 293". |
| `04_posts.md` FR-POST-021 AC1 | Tighten SELECT-policy text re: guest read of `Public + visible`. |
| `05_closure_and_reopen.md` FR-CLOSURE-007 Edge Cases | Specify whether `closed_delivered → deleted_no_recipient` from unmark should emit a system message in anchored chats. |
| `06_feed_and_search.md` FR-FEED-016 AC6 + FR-FEED-018 AC1 | Clarify that `SearchFilters` domain type must carry the shared post-shape dimensions, not just the UI store. |
| `07_chat.md` FR-CHAT-013 AC1 | Define dedupe behavior for inbox rows with multiple deleted counterparts (CHAT-3). |
| `07_chat.md` FR-CHAT-016 AC4 | Define tie-break order (CHAT-12). |
| `09_notifications.md` FR-NOTIF-003 | Add an AC2 foreground-suppression analogue mirroring FR-NOTIF-001 AC2 (NOTIF-4). |
| `10_statistics.md` FR-STATS-001 AC2 | Either relax "reactive" to "refresh on focus" or BACKLOG a `users`-row subscription (STAT-2). |
| `10_statistics.md` FR-STATS-006 AC2 | Add explicit guest-read exception per FR-FEED-014 (STAT-7). |
| `11_settings.md` FR-SETTINGS-006 AC1 | Allow sub-screen (current implementation) or move toggles inline (SET-3). |
| `13_donations.md` FR-DONATE-008 AC3 | Reachability rule: spec says 200..399; code accepts `!= 404`. Align one side (DON-6). |
| `13_donations.md` FR-DONATE-001/003/006 | Vertical vs grid layout, jgive CTA, divider between modalities + categories (DON-2/3). |
| `12_super_admin.md` FR-ADMIN-006 AC2 | Acknowledge the missing unique partial index on `is_super_admin = true` (MOD-23). |

## Sign-off

- Audit-followup `AUDIT_2026-05-10_FOLLOWUP.md` should be amended after this audit:
  - §5.6 (EXIF strip) — close (verified done).
  - §3.11 (onEndReached) — promoted to TD-120 + POST-09 — leave the followup row open but cross-link.
  - §4.7 (AsyncStorage plaintext) — promoted to TD-101 (🔴).
  - §5.11 (verification gate) — re-asserted by FE-26.
- Loop log next iteration starts here: `BACKLOG.md` will list P2.12 through P2.18 as new ⏳ items in priority order.
