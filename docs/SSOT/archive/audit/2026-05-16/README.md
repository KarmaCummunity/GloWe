# Audit 2026-05-16 — Full-stack review

Companion to `docs/SSOT/archive/AUDIT_2026-05-10_full_codebase_review.md` and `docs/SSOT/archive/AUDIT_2026-05-10_FOLLOWUP.md`.

This audit was run six days after the prior one, after P2.7–P2.11 landed (privacy-mode reframe, BE security hardening, About refresh, post actor identity). Goals:

1. Re-verify items still ⏳ / 🟡 in the 2026-05-10 followup.
2. Surface NEW bugs / security holes introduced since 2026-05-10.
3. Find spec ↔ code divergences across all 13 domain specs.
4. Track every gap with proposed home: TECH_DEBT row, BACKLOG entry, spec amendment, or follow-up audit row.

## Layout

| File | Owner area |
| ---- | ---------- |
| `01_backend_security.md` | Supabase: RLS, RPC, edge functions, storage, migrations |
| `02_auth_profile.md` | FR-AUTH-*, FR-PROFILE-* (specs 01, 02) |
| `03_posts_closure_feed.md` | FR-POST-*, FR-CLOSURE-*, FR-FEED-* (specs 04, 05, 06) |
| `04_chat_notifications.md` | FR-CHAT-*, FR-NOTIF-* (specs 07, 09) |
| `05_following_moderation_admin.md` | FR-FOLLOW-*, FR-MOD-*, FR-ADMIN-* (specs 03, 08, 12) |
| `06_donations_stats_settings.md` | FR-DONATE-*, FR-STATS-*, FR-SETTINGS-* (specs 13, 10, 11) |
| `07_mobile_frontend.md` | Cross-cutting FE: routing, RTL, state mgmt, error handling, perf |
| `99_consolidated.md` | Master sheet, severity-sorted; lands in TECH_DEBT/BACKLOG |

## Severity scale

- 🔴 **HIGH** — security-critical, data loss, RLS bypass, privacy violation, or breaks a P0 user flow.
- 🟠 **MEDIUM** — spec/code divergence on a shipped FR, race condition, missing validation, mis-handled error.
- 🟢 **LOW** — code-smell, cosmetic, docs drift, post-launch hardening.

## Output format per row

```
| ID | Sev | FR / Area | File:Line | Symptom | Why it matters | Proposed home |
```

`ID` is local within the audit (e.g., `A1`, `A2`). The consolidated sheet maps these to new TD-* IDs at the end.
