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

## Money and donations
Phase 1: donation to KC, one-time or standing order, via Grow hosted page — provider swappable without code (D20). Bit / PayBox links are interim and withdrawn once one-time clearing exists (D59). Phase 2: JGive-style platform for every approved org; section-46 receipts after KC's nonprofit registration. **No money between users** (D4). Everything free for orgs now (D55).
Tech: D4,D20,D29,D37,D59 · FR-DONATE-003/010/011 · `kc_support_channels` (0447) — Bit/PayBox + Grow hosted pages, swappable without code · sandbox org flow behind `money_in_app_org_payments` · G8
