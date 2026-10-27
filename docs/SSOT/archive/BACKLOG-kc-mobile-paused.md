# KC mobile backlog — paused

> **Paused.** KC mobile UI (`app/apps/mobile/**`) is out of scope per [`AGENTS.md`](../../../AGENTS.md).
> Do not implement these rows unless a PM message explicitly re-opens KC frontend work.
> Active queue: [`../BACKLOG.md`](../BACKLOG.md).

Status values below were rewritten to `⏸️ Paused (KC mobile out of scope per AGENTS.md)` on 2026-07-22.

## P2 — Stats, Admin & Polish

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| P2.23 | **Main-screen visual unification (no logic changes)** — apply the redesigned welcome-screen idiom (cream backdrop `#FFFBF7`, ambient orange blobs, white cards with soft shadow, IconTile pattern, staggered Reanimated entry) across Profile, Home Feed, Search, Create Post, Donations. Introduces shared primitives at `apps/mobile/src/components/ui/`: `Screen`, `Card`, `IconTile`, `Buttons`, `AmbientBlobs`, `MotionEntry`, `SectionHeading`. New token `colors.surfaceCream`. | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | (visual-only — no FR adjustment) |
| P2.24 | **Web Google sign-in — same-tab redirect (FR-AUTH-002)** — replace the `WebBrowser.openAuthSessionAsync` popup (blocked by mobile Safari) with a top-level same-tab navigation to `accounts.google.com`. Existing `/auth/callback` handler completes the exchange. Native flow unchanged. | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/01_auth_and_onboarding.md` FR-AUTH-002 (impl note 2026-05-17); `DECISIONS.md` D-33 |
| P2.25 | **Native Google sign-in via Google Sign-In SDK (FR-AUTH-002 follow-up)** — install `@react-native-google-signin/google-signin`; on iOS/Android, replace `WebBrowser.openAuthSessionAsync` with `GoogleSignin.signIn()` so the OS-native account-picker bottom sheet appears inside the app (no browser at all). Receives `idToken` → `supabase.auth.signInWithIdToken({ provider, token })`. Requires iOS + Android OAuth Client IDs in Google Cloud (PM action) and a dev-client rebuild. | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/01_auth_and_onboarding.md` FR-AUTH-002 (impl note 2026-05-17); `DECISIONS.md` D-33 |
| P2.26 | **Optional contact phone — onboarding + edit profile + chat banner** — adds `users.contact_phone` (1–20 chars, non-verified, distinct from `auth.users.phone`) wired through onboarding Basic Info (`FR-AUTH-010 AC2.c`), soft-gate modal (`FR-AUTH-015 AC1`), Edit Profile (`FR-PROFILE-007 AC1+AC2`), and the chat anchored-post card as a `tel:` quick-call link (`FR-CHAT-014 AC7`). Migration `0096`. | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/01_auth_and_onboarding.md` FR-AUTH-010/015; `spec/02_profile_and_privacy.md` FR-PROFILE-007; `spec/07_chat.md` FR-CHAT-014 |
| P2.30 | **Cities truncation fix + city-dependent street picker** — PR 1: `.limit(2000)` on `SupabaseCityRepository.listAll()` to bypass Supabase JS client's 1000-row default that silently dropped ~306 settlements past letter ע (incl. Tel Aviv, Petah Tikva, Rishon LeZion). PR 2: `public.streets` table + `SupabaseStreetRepository` + new `SearchablePicker` shell reused by city + street pickers; progressive disclosure of street + number on onboarding; disabled-state UX + reset-on-city-change on edit profile, create post, edit post. Seeded from data.gov.il package 321 (63 565 rows including 9000-sentinels — zero filtering per PM). | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/01_auth_and_onboarding.md` FR-AUTH-010 AC2.b; `spec/02_profile_and_privacy.md` FR-PROFILE-007 AC1; `DECISIONS.md` D-36; `docs/SSOT/archive/superpowers/specs/2026-05-18-cities-streets-picker-design.md` |
| P2.34 | **Surveys & feedback — in-app Survey A + free feedback (FR-SETTINGS-015..017)** — server-driven survey hub in Settings, survey runner (1–7 rating + optional text per question, non-linear navigation, snooze banner), free feedback form, migrations `0118_surveys` + `0119_user_feedback`. | agent-be + agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/11_settings.md` FR-SETTINGS-015..017 |
| RESP-001 | **Responsive desktop — shell primitives** — `useBreakpoint`, `AppShell`, `NavigationRail`, `AsidePanel`, `SplitAuthLayout`, `SHELL_V2_ENABLED` flag, mobile invariant snapshot (FR-RESP-001) | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/14_responsive_desktop.md` FR-RESP-001 |
| RESP-004 | **Chat inbox layout** — two-pane inbox + thread at ≥768 (FR-RESP-004) | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/14_responsive_desktop.md` FR-RESP-004 |
| RESP-005 | **Split-screen auth & onboarding** — `SplitAuthLayout` across sign-in / sign-up / onboarding steps (FR-RESP-005) | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/14_responsive_desktop.md` FR-RESP-005 |
| RESP-006 | **Mobile platform polish & bottom-bar safety** — extend `Screen` primitive with tab-bar inset; sweep all screens that crop; platform helpers for back-icon + keyboard offset; clamp Dynamic Type in tight rows; Hebrew typography + content polish (FR-RESP-006) | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/14_responsive_desktop.md` FR-RESP-006 |

## V3.0 — Rides Carpooling for Good (FR-RIDE-019 + FR-RIDE-023..045)

> Full-scope rides world per `PRD_V2_NOT_FOR_MVP/donation_worlds/06_Rides.md`. Reverses D-51's UI-only hide (D-55) and adds the safety overlay (active-ride + emergency button), ratings, business rules, and the first cross-world hook (items ↔ rides). Shipped as multiple PRs against `dev`.

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| V3.0.0 | **Spec + decision** — extend `spec/15_rides.md` with FR-RIDE-019 + FR-RIDE-023..045; add `DECISIONS.md` `D-55` (supersedes `D-51`); register V3.0 umbrella in BACKLOG | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md`; `DECISIONS.md` D-55 |
| V3.0.1 | **Restore rides hub UI (FR-RIDE-023)** — un-hide `RidesHubScreen`; wire live feed + `RideCreateSheet` FAB + `RideFilterSheet` + realtime banner + collapsed NGO links | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-023 |
| V3.0.2 | **Approved-participant cascade on ride leaving open (FR-RIDE-019)** — DB trigger auto-cancels every still-approved participant when a ride goes closed/cancelled/expired; fires `ride_participant_cancelled_by_owner` (FR-RIDE-013 AC4 variant) | agent-be | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-019 |
| V3.0.3 | **Driver dashboard (FR-RIDE-024)** — `/donations/rides/my-rides` grouped (upcoming/active/past) with inline approve/reject of pending requests; realtime per-row participant subscription | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-024 |
| V3.0.4 | **Passenger requests screen (FR-RIDE-025)** — `/donations/rides/my-requests` grouped (pending/approved/history); cancel with late-cancel rating-impact confirm | agent-fe | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-025 |
| V3.0.5 | **Advanced publish: cargo + food + payment + requirements + stops (FR-RIDE-026..030)** — extends `ride_listings` schema; mutually-exclusive cargo/food gate; client + server payment-cap enforcement; `ride_stops` table + multi-stop route render | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-026..030 |
| V3.0.6 | **Active ride lifecycle (FR-RIDE-031..033)** — extends status enum to `in_transit` / `completed_pending_rating`; RPCs `rpc_ride_start` / `rpc_ride_arrive`; participant snapshot frozen on start; owner check-in CTA window | agent-be | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-031..033 |
| V3.0.7 | **Active ride screen + emergency button (FR-RIDE-034..035)** — `/donations/rides/[id]/active`; visible to snapshot only; 🚨 button → `rpc_ride_emergency_trigger`; rate-limit + admin notify + chat system message + persistent banner | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-034..035 |
| V3.0.8 | **Ratings system (FR-RIDE-037..039)** — `ride_ratings` table + `rpc_ride_rate`; ratings screen route; rating-summary view + profile/detail rendering; forced 1-star late-cancel penalty path | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-037..039 |
| V3.0.9 | **Business rules — declaration + cancellation + minor consent (FR-RIDE-040..043)** — `driver_declarations` table + first-publish gate; `minor_consent_tokens` table + Edge Function for parent SMS/email; payment cap third-layer enforcement; super-admin ban-driver action | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-040..043 |
| V3.0.10 | **Cross-world: items post ↔ ride request (FR-RIDE-044)** — `linked_post_id` FK on rides; "**🚗 בקש שינוע**" CTA on give posts; post-card 🚗 chip when ride request exists; auto-close ride on post-close trigger | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-044 |
| V3.0.11 | **Edge cases catalog (FR-RIDE-045)** — no-show auto-cancel + penalty; food spoilage handover trigger; international ban guard; breakdown flow via early-arrive with reason | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-045 |
| V3.0.12 | **E2E test sweep + quality gates** — comprehensive unit + integration tests across all layers; RLS test sweep; vitest mobile component tests for hub, dashboard, active, ratings; `pnpm typecheck && pnpm test && pnpm lint` all green | agent-fullstack | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/15_rides.md` FR-RIDE-045 |

## P3 — Post-MVP (Deferred)

| ID | Task | Status | Spec |
|----|------|--------|------|
| P3.2 | Apple SSO (iOS only) | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/01_auth_and_onboarding.md` FR-AUTH-004 |
| P3.A-Tree | **Admin Portal — management hierarchy redesign (umbrella).** Rebuild `/admin/admins` around a per-user card + admin-detail screen + org hierarchy tree, per `docs/SSOT/archive/superpowers/plans/2026-06-16-admin-management-tree-redesign.md`. Delivered in three phases (`.1`/`.2`/`.3`). | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/12_super_admin.md` FR-ADMIN-022..026; plan `docs/SSOT/archive/superpowers/plans/2026-06-16-admin-management-tree-redesign.md` |
| P3.A-Tree.3 | **Phase 3 — public About tree + field-level privacy.** Public `/about/team` full multi-org tree (logged-out allowed); sensitive fields (address/contact) gated server-side by management chain (`is_ancestor`/super_admin). | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | `spec/12_super_admin.md` FR-ADMIN-026; plan §7 |

## INFRA — Tooling & Environment

| ID | Task | Owner | Status | Spec |
|----|------|-------|--------|------|
| INFRA-QA-W6 | Maestro native smoke | infra | ⏸️ Paused (KC mobile out of scope per AGENTS.md) | Wave 6 |
