# 91 — KC fills S1–S42 (pending PM approval)

Gaps filled by context. **Status of every row: pending approval.** Use as the working assumption; flag in the PR when implementing behavior that rests only on an `S#`. When approved, it becomes a `D#`.

| # | Fill | Section |
|---|---|---|
| S1 | Post state machine: open → (hidden_pending_review ↔ open) → closed_delivered / expired / deleted_no_recipient / removed_admin; reopen from closed_delivered and expired, by owner. | 07.1 |
| S2 | Edit/delete: owner & super-admin; hide: KC admin; suspended user cannot create, edit, comment. | 07.1 |
| S3 | Relevance reminder 14 days after publish then every 30 days; bump updates sort time, not created_at. | 07.1 |
| S4 | Food expiry: alert 24h before and at expiry; close at midnight of the expiry date. | 07.1 |
| S5 | Boost inside chosen sort: ≤1 promoted item per 5, labeled 'Recommended'. | 07.3 |
| S6 | 'Friends' = people I follow; default 'Everyone'. | 07.3 |
| S7 | Sort choice remembered per session; new session returns to 'Recommended'. | 07.3 |
| S8 | Comment on anonymous post shows commenter's name; anonymous poster replies as 'the poster'; one thread level. | 07.9 |
| S9 | Comment deletion: author, post owner, admin; 3 reports hide a comment. | 07.9 |
| S10 | Default: push for 'important', in-app only for 'social'; group per post per hour. | 07.11 |
| S11 | Suspended: open posts hidden; '5' = 5 distinct reporters in 30 days. | 07.15 |
| S12 | Report review within 48h; malicious reports count against the reporter. | 07.15 |
| S13 | Event: org picks world; optional capacity & waitlist; karma only for marked attendance. | 08 |
| S14 | Unaffiliated volunteering: karma at closing by declared duration, ≤8h per post. | 07.10 |
| S15 | Org account = separate entity with roles (org manager, volunteer manager, volunteer); no 20-post limit. | 08 |
| S16 | Housing: before hosting both see verification level, completed stays, seniority; at-risk youth & minors only via an org; at-risk track offered only by orgs and hosts they approved. | 05.6 |
| S17 | Medical: regular users don't publish; blood calls only from a medical body. | 06 |
| S18 | Hub content written by KC team; orgs propose updates for approval. | 04 |
| S19 | Photo on item offer: recommended, not required (per D28; old FR-POST-002 superseded). | 07.2 |
| S20 | All karma values in 07.6; undoing closing/removal reverses points; daily caps. | 07.6 |
| S21 | WhatsApp import consent: only with admin approval and announcement; no phones/names/private chats; imported post anonymous 'from group X' until claimed via phone verification; unclaimed deleted after 72h; removal on request. | 13 |
| S22 | Import channels: manual paste (MVP), chat-export by admin (next), live bot added by admin (phase 2, permitted interface only). Auto-classify type/world/city; low confidence → review queue. | 13 |
| S23 | Group migration: parallel community; bot posts summaries during transition; admin locks group when activity moved. | 13 |
| S24 | Elderly actions: home visit, phone buddy, errands, tech help, escort to doctor, shared meal, small repairs (home-visit ID verification approved as D48). | 06 |
| S25 | Democracy: party neutrality; civic knowledge from official sources; non-binding polls in phase 3. | 06 |
| S26 | Governance path in 4 stages; constitution core proposal is discussion material only (D50). | 11 |
| S27 | Job board: any registered (verified) org; free; paid jobs and long volunteering; no karma on paid jobs. | 06 |
| S28 | Emergency levels national/regional/local/targeted; declarers per D51/D56; 24h validity, renewable; bypass quiet hours only in affected region, user can disable. | 09 |
| S29 | Challenges: personal/group/community; karma per D52; streaks & caps; group chat locked at end. | 10 |
| S30 | Partnership tiers: directory → verified → routing → integration. | 12 |
| S31 | Eight personas. | 03 |
| S32 | North star: successful closings per week; KPI set per layer. | 16 |
| S33 | Recommendation engine phase 1: distance, freshness, worlds user is active in, urgency & near expiry, reliability (hidden), posts without responses; region weight in emergency. | 07.3 |
| S34 | Location & limits by type: offer = address at display level, request = city; 20 open posts total per private user, not orgs. | 07.2 |
| S35 | Org data from Registrar open data (data.gov.il) with source and proper-management badge; do not scrape GuideStar. | 08 |
| S36 | Professional 'consulting hour' post type in knowledge; 'event leftovers' block in food. | 05 |
| S37 | Former topic worlds → domains with domain hubs (medical, elderly, democracy, employment, animals, environment); D30 medical exceptions remain; 'rights' stays in knowledge. | 04 |
| S38 | Domain hub = light hub: domain-filtered feed across worlds, knowledge, orgs, resources, challenges, impact counter; no own forms — publish opens world form with domain preset. | 04 |
| S39 | Domain selection in form: auto-suggested from text & image, editable, exactly one required; no 'general', there is 'other'. | 07.2 |
| S40 | Org levels 4–5 criteria: transparency from published reports & registrar data; effectiveness combines Midot rating & KC impact data. | 08 |
| S41 | Private person / social venture registering as org: level 1 = ID + declared social goal + admin approval; marked 'private venture'. | 08 |
| S42 | Official body: approved by main admin with defined permission for region, world and emergency level; every declaration logged. | 09 |
