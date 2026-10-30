# Target architecture (implied by `docs/spec/`)

Principle: **one infrastructure, configured per world** (D36); one entity per concept; values in config, not code (D29). Each item cites the spec and the gap (`G#`) to close.

## 1. One Post model (D2, D19, D45) — G1, G24
```
posts                     id, author_id | org_id, world_slug (8), domain_slug (11), direction (offer|request),
                          post_type, status, visibility, anonymity, location_display, expires_at, source (native|imported) …
ride_post_details         1:1 extension (origin, destination, departure_at, estimated_end_at, seats)
event_post_details        1:1 (capacity, waitlist, registration_policy)          — G18
housing_post_details      1:1 (nights, house_rules, exact address after approval) — G21
nonprofit_job_post_details 1:1 (scope, field, apply_link)                         — G28
post_handoffs             closing stage for every type (recipient, closed_at)
post_ratings              one generic two-sided rating, admin-only RLS (D24)      — G4
```
### Migration plan (listings → posts)
1. Add missing columns (`domain_slug`, `direction`, `expires_at`, `source`) to `posts`; backfill from `listings`.
2. Move ride fields from `ride_listings` into `ride_post_details`; `giving_handoffs` → `post_handoffs`.
3. Switch reads in `infrastructure-supabase` adapters behind ports (no UI change); then writes.
4. Single state machine (S1) enforced in DB + domain; drop sync triggers; drop `listings` last.
Each step = its own migration + contract tests + regression tests; no data loss; dry-run on kc-dev first.

## 2. World & domain registry — G2, G23, G24
- `DONATION_WORLD_SLUGS` (8) and `POST_DOMAIN_SLUGS` (11) defined **once** in `packages/domain`, mirrored by DB enums/check constraints.
- `WorldHubConfig` / `DomainHubConfig`: color, icon, tagline, ordered `WorldHubBlock`s, `PostTypeFormSchema` per post type, closing flow, expiry rule. Generic `WorldHubScreen` renders any config; plug-in blocks register by key.

## 3. Cross-cutting services
| Service | Shape | Gap |
|---|---|---|
| Karma | `KARMA_POINT_VALUES` config + ledger; caps; reversal on undo | G16 |
| Feed | `FeedRecommendationEngine` (S33 weights) behind a port; sort/filter by user; audience toggle | G15 |
| Expiry | scheduled job closes per-type expiry, sends reminders (S3, S4) | G11 |
| Notifications | `NotificationType` × `NotificationPreference` × groups important/social/emergency; quiet hours | G17 |
| Trust | `VerificationLevel` (phone/ID/blue check), `TrustEngine` (internal), ID provider adapter | G10, G13 |
| Moderation | thresholds 3/5 (D33), `UserSuspension` | G20 |
| Volunteering | `OrgVolunteerMembership`, `VolunteerHoursEntry` with manager approval | G19 |
| Emergency | `EmergencyDeclaration` (level, region, world, declarer role, expires 24h, audit log) | G25 |
| Challenges | one engine: `Challenge`, `ChallengeScope`, `ChallengeParticipation`, reports per cadence | G26 |
| Orgs | single org entity with roles, `OrgVerificationLevel`, registrar import | G5, G30, G31 |
| Money | `DonationPaymentProvider` adapter; Grow hosted page now, JGive-like later | G8 |
| WhatsApp import | `ExternalGroupImport` → `ImportedPostCandidate` (classifier + review queue) → claim; `GroupBridge` | G27 |
| Governance | `CommunityPoll`, `GovernanceProposal` (phase 3) | G29 |

## 4. Quality gates (D58)
- Every task: spec section + code + automated test; bug → regression test.
- Ports/adapters keep Supabase replaceable; domain stays pure.
- Contract tests for every port change; migration drift check; perf budgets.
- Feature flags per world/phase (D3) instead of branches.
