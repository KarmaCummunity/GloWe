# Closed Post Dual-Surface Privacy — Product Design

**Date:** 2026-05-24  
**Status:** Approved (PM)  
**Maps to:** `FR-POST-021`, `FR-PROFILE-001` AC4, `FR-PROFILE-002` AC2  
**Refines:** `D-28`, `D-31` (product semantics; implementation follows in plan)

---

## Problem

Users who close a post together (publisher + marked respondent) experience privacy controls as if there is **one shared post**. In reality the product must treat the relationship as **two independent surfaces**:

- What I show on **my** profile / closed-post context.
- What appears on **my partner’s** profile / closed-post context.

Today, actions like “hide from everyone (only me)” are confused with “hide my identity on my partner’s surface,” or one action unintentionally affects the partner’s listing.

---

## Product metaphor

> **One physical post, two billboards.**

Each participant owns their billboard (who may discover the post **through them**). Each participant separately chooses whether strangers see **their name and face** on the **partner’s** billboard.

---

## Actors

| Actor | Role |
|-------|------|
| **Publisher (A)** | Created the post; closed with a marked respondent |
| **Respondent (B)** | Marked as closure partner |
| **Third party (C)** | Any signed-in viewer who is neither A nor B |
| **Guest** | Out of scope for closed-post tabs; post detail rules per `FR-POST-014` |

---

## Two controls (orthogonal)

### 1. Audience on *my* surface (“מי רואה דרך המשטף שלי”)

Hebrew UI: the existing three-level control (🌍 ציבורי / 👥 עוקבים / 🔒 רק אני) on **closed** posts applies to **this participant’s** closed-post surface only.

| Value | On **my** “פוסטים סגורים” tab (third parties) | On **partner’s** tab |
|-------|-----------------------------------------------|----------------------|
| **Public** | Row visible | Unaffected by my choice |
| **Followers only** | Row visible only to my followers | Unaffected |
| **Only me** | Row **hidden** from everyone except me (and partner always has read access to the post itself) | Row **still visible** per **partner’s** audience setting |

**Invariant:** Changing my audience **never** removes or hides the post row from the partner’s profile tab.

### 2. Identity on *partner’s* surface (“הסתר את הזהות שלי ב״פוסטים סגורים״ של מצופים אחרים”)

Applies only when a marked partner exists.

| Toggle | Who sees anonymous chrome for this actor |
|--------|------------------------------------------|
| **Off** | Third parties see full name + avatar on post surfaces when they reach the post via the **partner’s** context |
| **On** | Third parties see **“אנונימי”** (no profile link) for this actor on those surfaces |

**Invariant:** The **partner always** sees the actor’s real identity on post chrome (chat remains the mutual-recognition surface).

**Invariant:** This toggle does **not** control whether the post card exists on the partner’s tab — only **how the actor is labeled**.

---

## Coupling rule (PM-approved, revised 2026-05-24)

When a participant sets audience to **"רק אני"**:

1. The system **automatically turns on** "הסתר זהות בפוסטים סגורים של מצופים אחרים."
2. The participant **may toggle identity hide independently** while audience is Public / FollowersOnly. Under `OnlyMe` the third-party identity mask is **unconditional** — flipping `hide_from_counterparty` off does not expose the actor's name on the partner's surface, because a user picking "רק אני" expects privacy from third parties on either surface (PM decision 2026-05-24, recorded as `D-39`).

**Intended outcome:**

| A's settings | A's tab (third party C) | B's tab (third party C) | B (counterparty) viewing the post |
|--------------|-------------------------|-------------------------|------------------------------------|
| Only me (identity hide auto-on; toggle has no effect on third-party mask) | No row | Row visible; A shown as **אנונימי** | A shown **בשם מלא** (counterparty is the mutual-recognition surface) |
| Public + identity hide on | Row visible; A full | Row visible; A **אנונימי** on B's context | A shown **בשם מלא** |
| Public + identity hide off | Row visible; A full | Row visible; A full | A shown **בשם מלא** |

---

## Post detail (all entry points)

For `closed_delivered` with a marked partner:

1. **Closing partner row** (“נמסר ל־…” / “ניתן על־ידי …”) — **everyone** who may open the post sees **who the partner is**, unless **that partner** enabled identity hide for **their** appearance on the **other’s** surface (edge case: partner hid themselves on publisher’s surface when viewed from publisher’s profile — see matrix below).

2. **Publisher row** (“פורסם על־ידי”) — follows identity rules for the publisher on the **viewing context** (neutral detail vs opened from a profile’s closed grid).

3. **Partner (counterparty)** always sees the other side’s real identity on both rows.

### Simplified rule for post detail (neutral link / feed)

| Viewer | Publisher line | Partner line |
|--------|----------------|--------------|
| A (self) | Self, full | Partner, full |
| B (partner) | A, full or אנונימי per A’s identity toggle | Self, full |
| C (third party) | Per A’s identity toggle | **Always full** (partner did not hide from own surface) |

---

## Partner visibility of the closure (recap from prior bugfix)

Third parties **must** see **who closed the loop with whom** on post detail (partner callout), except when the **partner** has chosen to hide **their own** identity on the **viewing host’s** surface (niche; default is visible).

---

## “מוסתרים” (Hidden) screen

Owner’s posts at **“רק אני”** on their surface appear under **מוסתרים**, not under the main **פוסטים סגורים** tab, for the owner. Partner’s tab is unchanged.

---

## Out of scope

- Changing profile privacy mode (`Public` / `Private`).
- Anonymity in chat headers.
- Hiding the post from the **partner’s** tab via audience (partners always retain read access; row visibility on partner tab = **partner’s** audience only).
- Feed ranking / search cards (no participant chrome today; follow-up if cards show names).

---

## Acceptance criteria (product-level)

- **AC-DSP-1.** Participant A sets "רק אני" → third parties no longer see the row on **A's** closed tab; row remains on **B's** closed tab per B's audience.
- **AC-DSP-2.** When A sets "רק אני," identity hide turns **on** automatically. The toggle stays user-visible but, under OnlyMe, third-party masking is unconditional (per PM 2026-05-24 / `D-39`).
- **AC-DSP-3.** With **Public + identity hide on**, third parties on **B's** tab see **אנונימי** for A; with **Public + identity hide off**, third parties on **B's** tab see **A's full identity**. (Under OnlyMe the toggle has no effect on third-party mask — see AC-DSP-2.)
- **AC-DSP-4.** **B (the counterparty) always sees A's full identity on post chrome**, regardless of A's audience or identity-hide setting. Chat remains the mutual-recognition surface; post chrome on the counterparty seat mirrors it. (`D-39` — supersedes the legacy `D-26` owner-OnlyMe counterparty mask.)
- **AC-DSP-5.** Third party opening post detail sees the **closure partner** callout with partner identity (unless partner hid on that surface).
- **AC-DSP-6.** B changing audience or identity hide does not remove or alter A's row on A's tab except through **A's** own settings.

---

## Decision log

| ID | Decision |
|----|----------|
| DSP-1 | Closed delivered = dual-surface model (D-28 intent, made explicit for PM/UX). |
| DSP-2 | Only me → identity hide unconditional on partner surface; the toggle is only effective when audience is Public / FollowersOnly (revised 2026-05-24, `D-39`). |
| DSP-3 | Audience and identity hide are independent for Public / FollowersOnly; under OnlyMe the third-party mask is implied by audience. |
| DSP-4 | Counterparty always sees actor's real identity on post chrome — `D-26` owner-OnlyMe counterparty mask removed (`D-39`). |

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-05-24 | Initial PM-approved product spec |
| 1.1 | 2026-05-24 | PM revision: OnlyMe → third-party identity mask is **unconditional** (no opt-out via identity toggle). Counterparty always sees actor's real identity (`D-26` owner-OnlyMe mask removed). `D-34` `posts.visibility` fan-out removed; Hidden routing keys on effective `surface_visibility` (migration `0107`). |
