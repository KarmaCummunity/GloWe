# 03 — Users, personas, roles

## Personas (S31)
| Persona | Who | Needs from KC | Worlds/domains |
|---|---|---|---|
| Michal, occasional giver | 34, moving house | Give away fast and safely, no haggling | items, food |
| Danny, daily driver | Commutes TLV–Jerusalem | Fill seats without managing a group | rides |
| Ruth, quiet requester | Single mother | Ask without exposure | food, items, knowledge |
| Noam, young volunteer | 22, student | One-off volunteering, recognized hours | time; sport, tech |
| Sarah, volunteer coordinator | Mid-size nonprofit | Publish events, approve hours, recruit | orgs, events, jobs |
| Avraham, lonely elder | 81, lives alone (often via family) | Regular call, help with errands | elderly domain |
| Yossi, WhatsApp group admin | Runs 3 ride groups | Better tool without losing the community | rides, growth (D38) |
| KC admin | Team | Moderation, trust, emergencies | everything |

## Roles & permissions
| Role | Permissions | Phase |
|---|---|---|
| Guest | View only; "Join" on every screen | MVP |
| Community member | All post types, volunteering (D22), likes/comments (D25), event registration (D31), challenges (D43); sees only own karma (D29) | MVP |
| Suspended user | Sees everything, cannot act, can chat with support (D33) | MVP |
| Org-affiliated volunteer | Post on org's behalf, register to its events without verification (D22); logs hours approved by manager (D32) | MVP |
| Organization account | Separate entity with roles (S15); always verified (D53); events, volunteers, jobs, directory | MVP |
| Medical body | Only publisher in the medical domain (D30) | Later |
| Org manager / authorized security officer | Activates emergency mode **inside the org only** (D51) | Phase 2 |
| Verified official/state body | Declares emergency within its permissions (D56, S42) | Phase 2 |
| Hotline operator | Sensitive requests | Later |
| KC admin / main admin | Reports (D33), ratings (D24); main admin sees everything (D29) and alone declares a general emergency (D51) | MVP |

**Management hierarchy view (D65).** The admin portal presents every role holder above as a layered pyramid across all organizations — platform leadership, platform staff, org leadership, org teams, volunteers — standing on the community, which is shown as a count only, never as identities. Visibility follows D29: the main admin sees every org; anyone else sees the orgs their own roles belong to. Self-declared org affiliations are counted, never shown as granted roles. Tech: FR-ADMIN-028 (`docs/SSOT/spec/12_super_admin.md` §17), `admin_hierarchy_census` (migration `0453`).
