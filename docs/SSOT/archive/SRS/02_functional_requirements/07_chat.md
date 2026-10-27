# 2.7 Direct Messaging

[← back to Part II index](./README.md)

Prefix: `FR-CHAT-*`

---

## Scope

1-on-1 text-only chat between two users:

- Inbox list and search.
- Conversation screen with text composition.
- Read receipts.
- Three entry points (post detail, user profile, support from Settings).
- Auto-message templating for post-anchored conversations.
- Block/report integration.
- Special handling for the Super Admin chat (anchored support thread).

Out of scope:

- Group chat, image / voice / video / location / file attachments, reactions, post sharing — all explicitly excluded by `R-MVP-Chat-1` and `R-MVP-Chat-2`.

---

## FR-CHAT-001 — Inbox list

**Description.**
The list of all of my conversations, sorted by latest activity.

**Source.**
- PRD: `03_Core_Features.md` §3.4.2, `05_Screen_UI_Mapping.md` §4.1.

**Acceptance Criteria.**
- AC1. Each row: counterpart avatar + name, latest message preview (1 line), relative timestamp, unread indicator.
- AC2. Sort by `last_message_at DESC`. Pinning is **not** in MVP.
- AC3. Search by counterpart name (case-insensitive prefix match) is provided in the top bar.
- AC4. Pagination: 30 conversations per page; infinite scroll.
- AC5. The Super Admin support thread (when present) is **not** pinned; it appears in the same chronological list as any other thread.

**Edge Cases.**
- A counterpart deleted their account: the row shows a "Deleted user" placeholder; the thread remains accessible (`D-14`).
- A counterpart is now blocked by me: the row is filtered out unless I open the blocked-users management screen (`FR-SETTINGS-005`).

**Related.** Screens: 4.1 · Domain: `Chat`.

---

## FR-CHAT-002 — Conversation screen

**Description.**
1-on-1 conversation thread with composition controls.

**Source.**
- PRD: `03_Core_Features.md` §3.4.3, `05_Screen_UI_Mapping.md` §4.2.

**Acceptance Criteria.**
- AC1. Header: back button, counterpart avatar + name, `⋮` menu (`View profile`, `Block`, `Report conversation`).
- AC2. Body: message bubbles (mine right-aligned in LTR, left-aligned in RTL; opposite for counterpart). Each bubble shows timestamp on tap.
- AC3. Composer: single-line auto-growing text input + send button. **No** attachment buttons (`R-MVP-Chat-2`).
- AC4. Read receipt: a `✓✓` indicator is shown next to a sent message once the counterpart's client confirms reading. Read receipts cannot be turned off in MVP (`R-MVP-Chat-5`).
- AC5. Maximum message length: 2,000 characters. Inputs longer are blocked with an inline counter.

**Related.** Screens: 4.2 · Domain: `Chat`, `Message`.

---

## FR-CHAT-003 — Send message

**Description.**
Submitting the composer creates a `Message` and pushes it to the recipient.

**Source.**
- PRD: `03_Core_Features.md` §3.4.3.

**Acceptance Criteria.**
- AC1. The message is appended optimistically to the local thread; on server ack, it transitions from `pending` to `delivered`; on read it transitions to `read`.
- AC2. End-to-end delivery latency target ≤500 ms at p95 (`NFR-PERF-006`); the indicator transitions accordingly.
- AC3. On network failure, the bubble shows a retry icon; tapping retries.
- AC4. The recipient receives a notification (`FR-NOTIF-001`) — Critical category — unless their notification preferences disable it.

**Edge Cases.**
- Sending to a blocked-by-counterpart user fails silently from my side (the message ack returns success; the counterpart never sees it). This intentional opacity is part of `R-MVP-Privacy-3`.
- Sending to a deleted user fails with a friendly error: *"This user is no longer available."*

**Related.** Domain: `Message`, `Notification`.

---

## FR-CHAT-004 — Conversation context anchoring

**Description.**
Conversations may be anchored to a specific post for purposes of recipient-picker logic and the auto-message.

**Source.**
- PRD: `03_Core_Features.md` §3.4.4, `04_User_Flows.md` Flow 6.
- Constraints: `R-MVP-Chat-3`.

**Acceptance Criteria.**
- AC1. A `Chat` between two users may have an `anchor_post_id`. Multiple anchors per user pair are not allowed in MVP — the same conversation is reused regardless of which post was the entry trigger; the first anchor wins, but newer anchors are tracked as `Chat.anchor_history` for analytics.
- AC2. The conversation can also be opened directly from the counterpart's profile (`FR-CHAT-006`); in that case `anchor_post_id` is null.
- AC3. The Super Admin support thread (`FR-CHAT-007`) sets `is_support_thread = true` to mark it for special UI treatment in the future, even if it does not differ functionally in MVP.

**Edge Cases.**
- The anchored post is later deleted, closed, removed, or expired: the anchored-post card (FR-CHAT-014) is hidden. Existing messages remain — including the system message emitted by the closure trigger (FR-CHAT-015 AC4-AC6) when the transition was a delivery-related close.

**Related.** Domain: `Chat`, `Post`.

---

## FR-CHAT-005 — Auto-message for post-anchored chats

**Description.**
When a conversation is opened via a post's "Send Message" CTA, the composer is pre-filled with a templated message.

**Source.**
- PRD: `03_Core_Features.md` §3.4.5, `04_User_Flows.md` Flow 6.
- Constraints: `R-MVP-Chat-4`.

**Acceptance Criteria.**
- AC1. Template (Hebrew baseline, localized via i18n): *"Hi! I saw your post about [post title]. I'd like to know more."*
- AC2. The template is editable before sending; sending unchanged is allowed.
- AC3. Sending the auto-message creates a real `Message` row (no special "auto" type) and emits the analytics event `chat_first_message` with `from_post = true`.
- AC4. If the counterpart has already received this exact auto-message before for the same post (within the same `Chat`), opening the post and tapping "Send Message" deep-links to the existing thread without re-prefilling.

**Related.** Screens: 4.2 · Domain: `Chat`, `Message`.

---

## FR-CHAT-006 — Open chat from a profile

**Description.**
The "Send Message" CTA on Other Profile opens or resumes a conversation with that user.

**Source.**
- PRD: `03_Core_Features.md` §3.4.4.
- Constraints: `R-MVP-Chat-3`.

**Acceptance Criteria.**
- AC1. Available regardless of the target's privacy mode (DMs are not gated by follow approval).
- AC2. If a `Chat` already exists with this user, the existing thread is opened; otherwise a new `Chat` is created with `anchor_post_id = null`.
- AC3. The composer is empty (no auto-message).

**Related.** Screens: 3.3.

---

## FR-CHAT-007 — Open support thread from Settings

**Description.**
The "Report an issue" CTA in Settings opens or resumes the user's chat thread with the Super Admin.

**Source.**
- PRD: `03_Core_Features.md` §3.4.4 (3rd entry point), §3.5.
- Constraints: `R-MVP-Chat-3`.

**Acceptance Criteria.**
- AC1. Resolves the Super Admin's `User` record by the canonical email `karmacommunity2.0@gmail.com`.
- AC2. If a `Chat` between me and the Super Admin already exists, that thread is reused; otherwise a new one is created with `is_support_thread = true`.
- AC3. The Settings flow that triggers this also injects a system-message into the thread summarizing the report (`FR-MOD-002`); after injection, the user is dropped onto the conversation screen to continue freely.

**Related.** Screens: 5.1, 4.2.

---

## FR-CHAT-008 — Restricted entry-points policy

**Description.**
A chat cannot be opened "out of the blue" from arbitrary surfaces.

**Source.**
- PRD: `03_Core_Features.md` §3.4.4.
- Constraints: `R-MVP-Chat-3`.

**Acceptance Criteria.**
- AC1. The only valid entry points to a new chat are: (a) Post Detail (`FR-CHAT-005`), (b) Other Profile (`FR-CHAT-006`), (c) Settings → Report an Issue (`FR-CHAT-007`), **(d) Donations · Time → Volunteer Message Composer (`FR-DONATE-004`)** — this entry-point routes to the same Super Admin support thread as (c) (`is_support_thread = true`); it does not create a duplicate thread. **MVP-core deferral:** until P0.5 chat ships, the Donations · Time composer stores intent locally (see `FR-DONATE-004` AC3 / TD-114) and shows a success alert; it does not navigate to chat.
- AC2. There is no "Compose new chat" button anywhere in the app.
- AC3. Resuming an existing chat is allowed from the Inbox (`FR-CHAT-001`).

---

## FR-CHAT-009 — Block / unblock effects on chat

**Description.**
Blocking a counterpart filters and gates chat behavior.

**Source.**
- PRD: `03_Core_Features.md` §3.5.
- Constraints: `R-MVP-Privacy-3`.

**Acceptance Criteria.**
- AC1. When I block a user, our existing `Chat` (if any) is hidden from my Inbox; the counterpart still sees the thread but cannot send messages to me.
- AC2. When I unblock the user (per `D-11`), the thread reappears in my Inbox; the counterpart's send capability is restored.
- AC3. The counterpart never receives an explicit notification that I blocked them; their send attempts succeed-locally and remain undelivered.

**Related.** Domain: `Block`, `Chat`.

---

## FR-CHAT-010 — Reporting a conversation

**Description.**
Reporting from the conversation `⋮` menu treats the entire thread as the report target.

**Source.**
- PRD: `04_User_Flows.md` Flow 9.A.

**Acceptance Criteria.**
- AC1. The Report modal (`FR-MOD-001`) opens with `target_type = chat` and `target_id = chat.id`.
- AC2. The Super Admin's chat receives a system message linking to the conversation snapshot and reason (`FR-ADMIN-001`).

**Related.** Domain: `Report`.

---

## FR-CHAT-011 — Read receipts

**Description.**
A message is marked `read` when the recipient's conversation screen renders it for the first time.

**Source.**
- PRD: `03_Core_Features.md` §3.4.3.
- Constraints: `R-MVP-Chat-5`.

**Acceptance Criteria.**
- AC1. The read transition is performed server-side on a "viewed" event from the recipient's client; client-side rendering alone is not sufficient.
- AC2. Bulk-read API: opening a thread with N unread messages emits a single batch event to mark them all read.
- AC3. Read receipts cannot be disabled in MVP.

**Related.** Domain: `Message.status`.

---

## FR-CHAT-012 — Unread badge on top bar

**Description.**
The chat icon in the top bar carries a badge with the unread-message count.

**Source.**
- PRD: `06_Navigation_Structure.md` §6.2.

**Acceptance Criteria.**
- AC1. The badge shows the total unread message count across all conversations, capped visually at "9+".
- AC2. The count updates within `NFR-PERF-005` of new messages arriving via Realtime.
- AC3. Opening a thread updates the count immediately on the local client (optimistic) and reconciles with server upon ack.

**Related.** Domain: `Chat`, `Message`.

---

## FR-CHAT-013 — Conversation retention after account deletion

**Description.**
When one party deletes their account, the other party retains the thread with a placeholder.

**Source.**
- Decisions: `D-14`.
- Constraints: `R-MVP-Privacy-6`.

**Acceptance Criteria.**
- AC1. When a `User` is hard-deleted, the messages they sent are kept in the thread for the counterpart but their identity is replaced with a `Deleted user` placeholder (with a generic avatar).
- AC2. The deleted user's own messages cannot be edited, replied to, or quoted; the thread is read-only from the counterpart's side **except** that they can still send messages — those messages are accepted and persisted but never delivered (no recipient).
- AC3. After 90 days of read-only state, the thread is auto-archived (hidden from Inbox unless the user opens the Archived view in V1.5+; not part of MVP, so the thread stays visible but stale).

**Edge Cases.**
- The counterpart re-registers with the same identifier after the 30-day cooldown (`FR-AUTH-016`): they get a fresh account; the old thread does not link to them.

**Related.** Domain: `Chat`, `Message`, `User`.

---

## FR-CHAT-014 — Anchored-post card in chat

**Description.**
A sticky card at the top of the conversation surfaces the anchored post for both participants while the post is still `open`.

**Source.**
- PRD: `03_Core_Features.md` §3.4.4.
- Spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-close-post-from-chat-design.md`.

**Acceptance Criteria.**
- AC1. When `Chat.anchor_post_id` is set and the referenced `Post` is in status `open`, a sticky card is shown beneath the chat header with: post-type tag, single-line title, and a right-aligned action area.
- AC2. The owner sees a "סמן כנמסר ✓" / "סמן שקיבלתי ✓" CTA in the action area (label flips by `post.type`, matching `OwnerActionsBar`). The counterpart sees the whole card as a tap-to-open-post surface routing to `/post/[id]`.
- AC3. The card is hidden entirely when the post is in any non-`open` status (`closed_delivered`, `deleted_no_recipient`, `removed_admin`, `expired`) — replacing the prior "banner when deleted" behaviour from FR-CHAT-004.
- AC4. The card is hidden when `anchor_post_id` is null (chat opened from Other Profile, support thread, etc.).
- AC5. Status changes propagate to the card without a manual refresh: when a `post_closed` system message (FR-CHAT-015) lands in the thread, the post query is invalidated and the card hides immediately.
- AC6. (P1.2.x) Re-anchor on entry from a different post: when a user opens an existing chat through "💬 שלח הודעה למפרסם" from a post `Y` whose ID differs from the chat's current `anchor_post_id`, `chats.anchor_post_id` is updated to `Y` and the card reflects `Y` on the next render. When the call carries no anchor (inbox/profile flow), the existing `anchor_post_id` is left unchanged. When the anchored post is closed, `chats.anchor_post_id` is cleared by the closure trigger (see FR-CLOSURE-001 AC-NEW) so the next entry from a different post re-anchors cleanly. Realtime propagates the new row to both participants — the card swaps without a screen reload.

**Related.** Screens: 4.2 · Domain: `Chat`, `Post` · Spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-chat-post-anchor-lifecycle-design.md`.

---

## FR-CHAT-015 — Close post from chat

**Description.**
The post owner can mark the anchored post as delivered (or close without a recipient) directly from the chat, without navigating back to post detail. The chat counterpart is pre-filled as the recipient.

**Source.**
- PRD: `03_Core_Features.md` §3.4.4.
- Spec: `docs/SSOT/archive/superpowers/specs/2026-05-11-close-post-from-chat-design.md`.

**Acceptance Criteria.**
- AC1. Tapping the CTA on the anchored-post card (FR-CHAT-014 AC2) opens the existing closure sheet (`ClosureSheet`) directly on step 2 (recipient picker) with the chat counterpart pre-selected.
- AC2. The owner can confirm with one tap ("סמן וסגור ✓"), pick a different recipient from the candidates list, or take the no-recipient branch via "סגור בלי לסמן" — same UI as the post-screen entry point.
- AC3. On successful close, the post transitions to `closed_delivered` (with recipient) or `deleted_no_recipient` (without); the card hides in every anchored chat; a system message is emitted to every anchored chat (AC4-AC6).
- AC4. In the chat used for the close, delivered path: system message body is "הפוסט סומן כנמסר ✓ · תודה!".
- AC5. In sibling chats (anchored to the same post), delivered path: system message body is "הפוסט נמסר למשתמש אחר".
- AC6. In all anchored chats, no-recipient path: system message body is "המפרסם סגר את הפוסט — הפריט לא נמסר".
- AC7. The fan-out in AC4-AC6 fires regardless of where the close was triggered (post detail screen, chat, or any future entry point) — implemented by an `AFTER UPDATE OF status ON posts` trigger.

**Edge Cases.**
- The owner's chat list contains chats with users who never messaged about THIS post (per the 0017 RPC relaxation). The pre-fill picks the counterpart of THIS chat, not the post's recipient-candidate list.
- The owner reopens the post later: the card reappears (it only depends on `post.status === 'open'`). Past system messages are preserved.

**Related.** Screens: 4.2 · Domain: `Chat`, `Message`, `Post`.

---

## Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 0.1 | 2026-05-05 | Initial draft from PRD §3.4 and Decisions D-11, D-14. |
| 0.2 | 2026-05-09 | Extended `FR-CHAT-008 AC1` with 4th entry-point (Donations · Time) per `D-16` / `FR-DONATE-004`. |
