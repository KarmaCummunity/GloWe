# 2.12 Super Admin (in-chat moderation)

[← back to Part II index](./README.md)

Prefix: `FR-ADMIN-*`

---

## Scope

The Super Admin is a single privileged account (`karmacommunity2.0@gmail.com`) that performs all moderation operations through the existing chat surface — there is no dedicated admin UI in MVP. This section defines:

- The "system message" payloads injected into the Super Admin's inbox.
- The inline actions on those messages (restore, dismiss, escalate).
- Manual moderation actions performed by the Super Admin from regular UI surfaces while signed in to that account.
- Authorization checks that gate admin-only behavior.

---

## FR-ADMIN-001 — Receiving content reports as system messages

**Description.**
Every `Report` (except `target_type = none` which becomes a support thread directly) results in a system message in the Super Admin's inbox.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2, `04_User_Flows.md` Flow 9 (תהליך פנימי).
- Constraints: `R-MVP-Privacy-4`, `R-MVP-Privacy-5`.

**Acceptance Criteria.**
- AC1. The system message is delivered into a dedicated `Chat` between the reporter and the Super Admin (the report itself does not open a thread; this is the channel where the admin sees moderation operations).
- AC2. Payload contains: target type, target ID, reporter `display_name`, reason, optional note, deep-link to the target's surface, and the current report count toward the auto-removal threshold.
- AC3. Each new report on the same target appends a new message to the same channel; the messages are sequenced by `created_at`.
- AC4. The system messages render in the chat UI with a distinct visual style (icon, light-shaded background) and inline action buttons (`FR-ADMIN-002`, `FR-ADMIN-003`).

**Related.** Domain: `Message.kind = system`, `Report`.

---

## FR-ADMIN-002 — Auto-removal alert with restore action

**Description.**
When a target reaches the 3-report threshold and is auto-removed, a system message is appended with a "↩ Restore" inline action.

**Source.**
- PRD: `04_User_Flows.md` Flow 9.A.
- Constraints: `R-MVP-Privacy-5`.

**Acceptance Criteria.**
- AC1. The message is appended within the same Super Admin channel that received the underlying reports.
- AC2. Tapping "↩ Restore" reverses the auto-removal:
   - For `target_type = post`: status returns to `open`; the post is re-listed in feeds and the owner notified.
   - For `target_type = user`: `account_status = active`; the user can sign in again.
   - For `target_type = chat`: the chat is unhidden for both parties.
- AC3. Restore actions are idempotent and audit-logged.
- AC4. After restore, the corresponding `Report` rows are stamped `dismissed_no_violation`, which feeds into `FR-MOD-010`.

**Related.** Domain: `Post`, `User`, `Chat`, `Report`.

---

## FR-ADMIN-003 — Dismiss / escalate action on a system message

**Description.**
A system message can be dismissed or escalated by the Super Admin.

**Source.**
- PRD: `04_User_Flows.md` Flow 9.A.

**Acceptance Criteria.**
- AC1. "✓ Confirm removal" stamps the linked `Report` rows as `confirmed_violation` (no further action needed; the auto-removal stands).
- AC2. "🗑 Dismiss" stamps the `Report` rows as `dismissed_no_violation` and reverts an auto-removal if one was applied.
- AC3. "Permanent ban" (only on `target_type = user`) sets `account_status = banned` and prevents the user from re-registering for 90 days.
- AC4. Each action emits an audit event.

**Related.** Domain: `Report`, `User`, `AuditEvent`.

---

## FR-ADMIN-004 — Manual ban from user profile

**Description.**
While signed in as the Super Admin, the user-profile screen exposes a "Ban user" action.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. The action is hidden for non-admin sessions (`User.is_super_admin = false`).
- AC2. Tapping it shows a modal asking for a reason (`spam`, `harassment`, `policy_violation`, `other` + free text); on confirm the target's `account_status = banned`.
- AC3. Ban is **permanent** in MVP (no scheduled unban). The user can appeal via the support thread; the admin manually flips status if accepted.
- AC4. Audit event recorded.

**Related.** Domain: `User`, `AuditEvent`.

---

## FR-ADMIN-005 — Manual delete from chat thread

**Description.**
While signed in as the Super Admin, an extra `⋮` action allows manual deletion of a specific post or message referenced in the system thread.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. The action appears as an inline button on system messages that link to a post.
- AC2. Confirms with a modal; on confirm sets the target's status to `removed_admin` (post) or hard-deletes the chat message (message).
- AC3. Audit event recorded.

---

## FR-ADMIN-006 — Authorization checks

**Description.**
Admin actions are gated by a server-side check that verifies `User.is_super_admin = true`.

**Source.**
- (Internal: required for `NFR-SEC-002` — RLS-level enforcement.)
- Constraints: `R-MVP-Safety-3`.

**Acceptance Criteria.**
- AC1. The flag is **not** trusted from the client; every admin endpoint and every RLS policy revalidates it.
- AC2. The flag is set by direct database operation (no UI to grant admin) and only one row may carry it at any time in MVP.
- AC3. Attempts to perform admin actions without the flag fail with `FORBIDDEN`.

---

## FR-ADMIN-007 — Audit visibility for the admin

**Description.**
The Super Admin can read the audit log for any user via a Settings sub-page accessible only when `is_super_admin = true`.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. The sub-page is hidden for non-admins.
- AC2. It shows the last 200 audit events of any user (lookup by ID or display name).
- AC3. Audit lines are read-only and the screen has no edit controls.

**Related.** Domain: `AuditEvent`.

---

## FR-ADMIN-008 — Database-level statistics access

**Description.**
The Super Admin retrieves global statistics directly via the database for product analytics.

**Source.**
- PRD: `02_Personas_Roles.md` §2.2.

**Acceptance Criteria.**
- AC1. No in-app UI for global statistics in MVP; queries are run via the backend admin SQL console (Supabase Studio or psql).
- AC2. Read-only queries are allowed against all tables; mutating queries require an explicit confirmation procedure documented in `CODE_QUALITY.md`.

---

## FR-ADMIN-009 — Manual delete from post screen

**Description.**
While signed in as the Super Admin, the post detail screen exposes an "Remove as admin" action inside the `⋮` overflow menu, separate from the report-channel flow in `FR-ADMIN-005`.

**Source.**
- This document, §10 of `docs/SSOT/archive/superpowers/specs/2026-05-10-admin-delete-post-and-post-menu-design.md`.

**Acceptance Criteria.**
- AC1. The action is hidden for non-admin sessions and for posts the admin owns (the admin sees their owner-mode menu instead).
- AC2. Confirms with a modal, then sets `Post.status = 'removed_admin'`. Hard delete is **not** performed.
- AC3. Authorization is re-checked server-side via `is_admin(auth.uid())` inside a `SECURITY DEFINER` RPC; client gating is convenience only.
- AC4. An `audit_events` row is written with `action = 'manual_remove_target'`, `actor_id`, `target_type = 'post'`, `target_id = postId`.
- AC5. The action is idempotent: re-issuing it on an already-removed post is a quiet no-op and does not write a second audit row.

**Related.** Domain: `Post.status`, `AuditEvent`.

---

## Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1 | 2026-05-05 | Initial draft from PRD §2.2 and Flow 9. |
| 0.2 | 2026-05-10 | Added FR-ADMIN-009 (manual delete from post screen). |
