# 08 — Organizations, verification, events, money

## Organizations
An org account is a separate entity managed by users in roles: org manager, volunteer manager, volunteer (S15); no 20-post limit. Each world/domain hub has an org directory with search/filter/sort (D36), fed from the Registrar of Nonprofits open data (data.gov.il) with source attribution and a proper-management badge — we do **not** scrape GuideStar (S35). Any user may suggest a link; it goes live after admin approval (D9). Orgs affiliate volunteers (D22), publish events (D31), post jobs and recruit employees and volunteers (D41, D53), and approve hours (D32). **Every org registered in KC is verified** (D53). **For now everything is free for orgs**: KC gives them a tool parallel to the community's — posts, events, volunteers, hours, jobs (D55). A social venture is an org; a private person may register as an org (D57).
Tech: D9,D22,D31,D32,D36,D41 · FR-DONATE-007/009 kept; FR-DONATE-008 superseded · `donation_links`, two org entities · G5

## Org verification levels (D53)
Level 1 is the registration condition; higher levels are tags on the org profile and directory, filterable and sortable. Criteria details are KC fills (S40, S41).

| Level | `OrgVerificationLevel` | Checked | Source |
|---|---|---|---|
| 1 Basic | `basic` | Active nonprofit/PBC/company number, verified signatory & contact; private person/venture: ID + declared social goal + admin approval, marked "private venture" (D57, S41) | Registrar, data.gov.il |
| 2 Proper management | `proper_management` | Valid proper-management certificate | Registrar |
| 3 Midot rated | `midot_rated` | Rated by Midot | Midot |
| 4 Transparency | `transparency` | Public financial & narrative reports, visible leadership | GuideStar / Registrar (S40) |
| 5 Effectiveness | `effectiveness` | Reported and measured impact, incl. closings via KC | Midot + KC data (S40) |

Tech: · – · `donation_links` · G31

## Events
An event is a post type of an org, or of an affiliated volunteer on its behalf (D22, D31). Users register; the org chooses approval policy: manual, automatic, or rules such as "verified only". Org chooses the world; capacity and waitlist optional; org marks attendance — only attendance earns karma (S13). Closes at its date (D21). May kick off a group challenge (D43).
Tech: · not previously defined · none · G18

## Jobs
See domain `employment` in [06](./06_domain_hubs.md). Any registered org may post (D53, D57); free; paid jobs and long-term volunteering; no karma on paid jobs (S27).

## Org finance and transparency (D70–D76)
Every org — KC included, as the platform org — keeps its own books in a **finance sub-tree of its Admin Portal** (D70): single-entry ledger with financial accounts, a two-level category tree, calendar fiscal year, budgets and bank reconciliation (D72); entries come from manual input, CSV imports (bank, Bit, Paybox) and automatic mirroring of in-app payments (D73). New org-scoped roles: **org treasurer** (writes the books) and **org accountant** (reads and exports only); moderators keep read-only access to KC's books (D70). **Section 46(a)** is recorded, not decided: approval number, validity, certificate and expiry reminders per org, and a receipt record per donation (number, date, 46(a)-eligible flag, attached file); KC never generates official receipts, and KC itself holds no 46(a) approval today, so no tax-credit wording is shown until the status is active (D71). Smart tracking means computed reminders and queues plus counterparty-based auto-categorization, with a daily digest to treasurers (D74). Transparency is optional per org and published as frozen yearly snapshots — totals, program vs overhead share, public documents, 46(a) badge — never live books, and donor identities are never public (D75). The org profile that hosts the public transparency section is an extended user profile with its own email identity, posts and followers, plus the org Admin Portal (D76*, to be specified as its own domain).
Tech: D70–D76, S44, S45 · `SSOT/spec/19_org_finance.md` FR-FIN-001..021 (three phases) · extends `finance_ledger_entries` (0170), reads `payments` / `standing_orders` / `donation_receipts` (0267–0270), `organizations.sec46_*`, migrations 0470–0489 · not built yet

## Money and donations
Phase 1: donation to KC, one-time or standing order, via Grow hosted page — provider swappable without code (D20). Bit / PayBox links are interim and withdrawn once one-time clearing exists (D64). Phase 2: JGive-style platform for every approved org; section-46 receipts after KC's nonprofit registration. **No money between users** (D4). Everything free for orgs now (D55).
Tech: D4,D20,D29,D37,D64 · FR-DONATE-003/010/011 · `kc_support_channels` (0447) — Bit/PayBox + Grow hosted pages, swappable without code · sandbox org flow behind `money_in_app_org_payments` · G8
