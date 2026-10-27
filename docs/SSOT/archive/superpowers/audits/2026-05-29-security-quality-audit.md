# Security & Quality Audit — Consolidated Findings

| Field | Value |
| ----- | ----- |
| **Date** | 2026-05-29 |
| **Scope** | Full-stack read-only audit (8 parallel reviewers) |
| **Areas** | Supabase/RLS, Edge Functions, domain/application, mobile, auth, profile/privacy, social features, CI/CD, perf/maintainability |
| **Method** | Static code + migration review; no live exploitation |
| **Prior audits** | Cross-checked `docs/SSOT/archive/audit/2026-05-16/`, open `TECH_DEBT.md` rows |

---

## Executive summary

**Posture:** Authorization and abuse controls are strongest in **Postgres RLS + SECURITY DEFINER triggers**. The largest gaps are **missing NFR rate limits**, **over-broad `users` SELECT**, **direct PostgREST RPC enumeration**, **incomplete sign-out paths**, and **application-layer IDOR defense missing** on several mutating use cases.

**Counts (deduplicated across reviewers):**

| Severity | Security | Perf / maintainability |
| -------- | -------- | ---------------------- |
| Critical | 4 | 1 |
| High | 28 | 4 |
| Medium | 35 | 6 |
| Low / Info | 40+ | 8 |

**Remediation plan:** [`../plans/2026-05-29-security-remediation.md`](../plans/2026-05-29-security-remediation.md)

---

## Critical (fix before next production release)

| ID | Area | Location | Issue | Impact |
| -- | ---- | -------- | ----- | ------ |
| C-01 | Research / RPC | `0131_public_research_responses.sql`; `submit_public_research_response` | `GRANT EXECUTE TO anon`; client supplies `p_ip_hash` | Rate limits bypassed via direct PostgREST; spam / cost abuse |
| C-02 | Legal / auth | `LegalConsentScreen.tsx:54-57` | Exit calls local `signOut()` only — no server sign-out, no push deactivate, no persisted-store clear | Session + refresh token remain valid (**FR-AUTH-002 AC5**, **FR-AUTH-017**) |
| C-03 | Rate limits | NFR-SEC-009; no DB triggers on `messages` / `reports` | No server-side rate limits for posts/chat/reports (except donations + research edge paths) | Message/report/push storms; brigading at scale |
| C-04 | Feed / UX | `app/(tabs)/index.tsx` + `PostFeedList.tsx` | `hasMore` set but `onEndReached` never wired | Users cannot paginate feed (functional + perceived outage at scale) |

---

## High — backend & data

| ID | Area | Location | Issue | Maps to |
| -- | ---- | -------- | ----- | ------- |
| H-BE-01 | RBAC | `0113_admin_role_functions.sql:61` | `has_admin_role(uuid, text)` executable by **anon** | Admin enumeration |
| H-BE-02 | Predicates | `0098`, `0099` | `is_admin`, `is_blocked`, `is_following`, `has_blocked`, `active_posts_count_for_viewer` callable via PostgREST | Relationship/admin probing (**TD-68**) |
| H-BE-03 | PII | `0069` + `users_select_active` | Full `users` row (phone, street, prefs, `is_super_admin`) readable by anon/authenticated | Mass PII harvest via REST |
| H-BE-04 | Storage | `post-images` public bucket | Public read on all objects; URL secrecy for non-public posts (**TD-11**) | Leaked media URLs |
| H-BE-05 | Secrets | `0058_notifications_dispatcher_glue.sql` | Service role key in DB GUC for pg_net | SQL/backup leak → project takeover |
| H-BE-06 | Edge auth | `rotate-research-salt`, `dispatch-notification`, `strip-exif`, `reconcile-storage-orphans` | Bearer = raw service role or JWT payload role without signature verify | Privileged function abuse if gateway misconfigured |
| H-BE-07 | Edge CORS | `delete-account`, `validate-donation-link` | `Access-Control-Allow-Origin: *` on authenticated mutations | CSRF-style cross-origin calls with user JWT |
| H-BE-08 | Research | `0131` + `public-research-submit` | Forged/spoofed IP headers + client `p_ip_hash` | Weak anti-abuse when combined with C-01 |
| H-BE-09 | Research | `0131` `p_answers` jsonb | No size/shape validation | Storage/CPU DoS |
| H-BE-10 | Privacy RPC | `profile_closed_posts` + `0085` | `anon` grant; closed post metadata for NULL viewer | Enumeration of closed deliveries |
| H-BE-11 | RBAC drift | `is_admin()` vs `admin_role_grants` | Moderators may not match RLS expectations | Authorization inconsistency |
| H-BE-12 | Infra errors | `mapInsertError.ts`, multiple adapters | Raw `pg.message` / PostgREST text forwarded | Internal detail in UI |

---

## High — application layer

| ID | Area | Location | Issue | Maps to |
| -- | ---- | -------- | ----- | ------- |
| H-APP-01 | Closure | `closureMethods.ts:144-155` | Closure candidates = **all** owner chats, not post-scoped | **FR-CLOSURE-003 AC1** privacy leak |
| H-APP-02 | Posts | `UpdatePostUseCase`, `DeletePostUseCase` | No owner/admin check at app layer | IDOR if RLS regresses |
| H-APP-03 | Posts | `UnmarkRecipientSelfUseCase`, `GetClosureCandidatesUseCase` | `userId`/`ownerId` accepted but not enforced | Misleading API contract |
| H-APP-04 | Admin | `AdminPermission.ts` `hasPermission` | **Never called** in application use cases | **FR-ADMIN-006** RLS-only |
| H-APP-05 | Moderation | `BanUserUseCase` | `adminId` not verified as admin | Privilege gap |
| H-APP-06 | Rides | `DeleteRideTemplate`, `SetRideTemplateStatus`, etc. | No owner checks at app layer | **FR-RIDE-*** defense gap |
| H-APP-07 | Profile | `UpdateProfile`, `SetAvatar`, `CompleteBasicInfo`, follow use cases | `userId` not bound to session | Classic IDOR |
| H-APP-08 | Follow | `RemoveFollower`, `AcceptFollowRequest` | Spec vs RLS mismatch on who may delete/accept | **FR-FOLLOW-009** |

---

## High — mobile & auth

| ID | Area | Location | Issue | Maps to |
| -- | ---- | -------- | ----- | ------- |
| H-FE-01 | Web session | `authComposition.ts` | Supabase session in `localStorage` | XSS → token theft |
| H-FE-02 | Legal gate | `LegalConsentGate.tsx:63-70` | Consent check failure → gate **falls open** | Use app without legal acceptance |
| H-FE-03 | Onboarding | `AuthGate.tsx:108-114` | Bootstrap error → `onboardingState = 'completed'` | Skip onboarding (**FR-AUTH-010/015**) |
| H-FE-04 | Sign-out | `useEnforceAccountGate`, legal exit, restore expiry | Incomplete teardown vs settings path | Push tokens, stale storage (**FR-AUTH-017**, **FR-NOTIF-015**) |
| H-FE-05 | Session restore | `RestoreSession.ts` | No `getUser()`; expired session not cleared from storage | Revoked users / zombie refresh (**TD-127**) |
| H-FE-06 | Soft gate | `OnboardingSoftGate` | Only wired on create; not follow/chat | **FR-AUTH-015** bypass |
| H-FE-07 | Auth surface | Welcome screen | Forgot password dead; Apple stub; no email entry | **FR-AUTH-001/004/008** |
| H-FE-08 | URLs | `legalMarkdownRules.tsx`, `openExternalUrl.ts` | No scheme allowlist before `openURL` | `javascript:` / phishing |
| H-FE-09 | WebView | `AboutInstagramEmbed.tsx` | No navigation lockdown | Hijack risk |
| H-FE-10 | Deep links | `app.json` Android vs AASA | Android intent filters narrower than iOS | Weak App Links (**TD-66**) |
| H-FE-11 | AuthGate | `AuthGate.tsx` | Children mount before redirect; queries may run | Flash of protected UI / null viewer queries |
| H-FE-12 | PII fetch | `fetchUserBy`, `followMethods`, `searchUsers` | Full `users` row over-fetched | Phone/address in network payloads |
| H-FE-13 | Account gate | `useEnforceAccountGate` | Ban path skips `deactivateCurrentDevice` | Shared-device push leak |

---

## High — social / moderation / notifications

| ID | Area | Location | Issue | Maps to |
| -- | ---- | -------- | ----- | ------- |
| H-SOC-01 | Reports | `0005` + `0125` auto-removal | 3-reporter threshold without velocity caps | Brigading suspension/removal |
| H-SOC-02 | Chat | `messages` + `0057` trigger | No message rate limit → push per insert | Harassment + notification DoS |
| H-SOC-03 | Chat anchor | `rpc_chat_set_anchor` | No visibility check on `anchor_post_id` | Post ID probing / wrong anchors |
| H-SOC-04 | Identity | Profile closed + universal search | `applyPostActorIdentityProjectionBatch` skipped | **FR-POST-021** leak |
| H-SOC-05 | Guest | `post_actor_identity` RLS | Guests get empty map → Public defaults | **TD-81**, **FR-FEED-012** |

---

## High — CI/CD & supply chain

| ID | Area | Location | Issue |
| -- | ---- | -------- | ----- |
| H-CI-01 | Deploy | Long-lived Supabase account PAT; no OIDC |
| H-CI-02 | Docker | `Dockerfile` runner `npm install` without lockfile |
| H-CI-03 | Prod deploy | `workflow_dispatch` + auto-apply to `supabase-prod` without human reviewers (**D-53**) |
| H-CI-04 | CI | No `pnpm audit` / CodeQL / OSV in workflows |
| H-CI-05 | CI build | Hardcoded **production** Supabase URL in `ci-frontend.yml` |

---

## Medium (selected — full list in source reviews)

### Backend
- `profile_closed_posts` / research honeypot / survey version `using (true)` over-reads
- `is_admin()` legacy vs RBAC moderators on `reports` policies
- `reporter_hides` open INSERT
- Edge: `esm.sh` / `deno.land` floating imports; function-deploy lacks token preflight
- Notification dedupe/TTL edge cases; foreground suppression incomplete for support/system messages
- Realtime: `posts` not in publication (latent risk); inbox channel no error handler

### Application / mobile
- Raw `Error` throws in use cases; `RestoreSession` keeps session on gate RPC failure
- OAuth `code` / `token_hash` in URL history
- Email enumeration on client validation vs **D-22**
- Dev `EXPO_PUBLIC_DEV_TEST_PASSWORD` in preview builds
- `PERMISSION_MATRIX` unused; closure TOCTOU on grace window
- React Query key fragmentation; broad `['post']` invalidation; follow mutation over-invalidation
- Profile/search/feed perf: 6 parallel calls on profile view; inbox refresh 50+500 rows

### Profile / privacy
- `contact_phone` / address should be RPC-scoped, not global SELECT
- `active_posts_count_internal` bypass via PostgREST/Realtime
- Predictable `share_handle`; public avatars bucket; SSO CDN URLs in `avatar_url`
- Column-level UPDATE grants may omit `contact_phone` / address columns

---

## Low / informational (patterns)

- Honeypot returns random UUID (analytics noise)
- Domain entities partially mutable; duplicate `BIO_MAX_CHARS` constants
- Positive controls to preserve: PKCE OAuth, SecureStore native sessions, push route allowlist, message INSERT policy (0090), outbox not client-writable, `escapeIlike` on search, OG `escapeHtml`, 20-post cap trigger, donation-link SSRF guards (Edge), ride_participants DML revoked

---

## Performance & maintainability (non-security)

| Priority | Issue | Primary files |
| -------- | ----- | ------------- |
| P0 | Home feed pagination not wired | `(tabs)/index.tsx`, `PostFeedList.tsx` |
| P1 | Profile open posts / followers / following — cursor ignored | `profile/index.tsx`, `followers.tsx`, `following.tsx` |
| P1 | Duplicate React Query keys `['user']` vs `['user-profile']` | `RideCard.tsx`, `AnchoredPostCard.tsx`, etc. |
| P2 | Infra imports in UI components | `PostResultCard.tsx`, `edit-post/[id].tsx`, upload hooks |
| P2 | Oversized screens (search 398 LOC, edit-post 340 LOC) | **TD-130**, **TD-133** |
| P2 | Chat inbox full snapshot on every refresh | `chatStoreInboxRefresh.ts`, `getMyChats.ts` |
| P3 | `useAdminRoles` per message bubble; `PostCardGrid` not memoized | `MessageBubble.tsx`, `PostCardGrid.tsx` |

---

## Spec alignment gaps (security-relevant)

| FR | Gap |
| -- | --- |
| FR-CLOSURE-003 AC1 | Closure candidates not post-scoped |
| FR-AUTH-015 | Soft gate missing on follow + first chat |
| FR-AUTH-016 | Re-registration cooldown not implemented |
| FR-AUTH-017 AC3 | Push deactivate not on all sign-out paths |
| FR-POST-021 / FR-FEED-012 | Actor identity projection incomplete for guest/search/profile |
| FR-ADMIN-006 | Permission matrix not enforced in application |
| FR-PROFILE-007 | Phone/address exposed via API despite UI hiding |
| NFR-SEC-009 | Rate limits not implemented |

---

## Existing tech debt overlap

| TD | Audit confirmation |
| -- | ------------------- |
| TD-68 | Predicate RPC enumeration — still open |
| TD-81 | Guest actor identity — still open |
| TD-11 | Public storage URLs — still open (narrowed in some buckets) |
| TD-2 | Breached passwords — still open |
| TD-24 / TD-151 | Apple SSO / phone OTP — still open |
| TD-127 | Auth restore race / expiry — still open |
| TD-39 | `activePostsCountInternal` partial scrub — still open |
| TD-66 | Android App Links fingerprints — partial |

---

## Reviewer provenance

| Reviewer focus | Key artifact |
| -------------- | ------------ |
| Supabase / RLS | 22 security findings + 5 efficiency notes |
| Auth & onboarding | 20+ findings + perf table |
| Mobile FE | 15 security + 8 inefficiency |
| Domain / application | 25+ findings + test gap matrix |
| Profile / privacy | 20+ findings |
| Social features | 30-row findings table |
| CI / infra | 20+ findings |
| Arch / perf | 12 prioritized items |

---

## Recommended remediation waves

See implementation plan (linked at top). Order:

1. **Wave 1 — Stop the bleeding:** RPC grants (research, `has_admin_role`), rate limits (messages/reports), unified full sign-out
2. **Wave 2 — Data minimization:** `users` public projection, follow/search column pruning, storage URL strategy
3. **Wave 3 — App defense-in-depth:** Session binding, closure candidates fix, owner checks on mutators, `hasPermission` wiring
4. **Wave 4 — Client hardening:** Legal/onboarding fail-closed, URL allowlists, WebView, Android App Links, feed pagination
5. **Wave 5 — CI/supply chain:** Lockfiles, audit gate, dev Supabase URL in CI, action SHA pins
6. **Wave 6 — Perf debt:** Query keys, profile/chat pagination, memoization

---

*This document is audit-only. Implementation tracking: `docs/SSOT/archive/superpowers/plans/2026-05-29-security-remediation.md` and `docs/SSOT/TECH_DEBT.md`.*
