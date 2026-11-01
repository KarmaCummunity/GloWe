# 04 — Product structure: giving worlds × domains (D45)

## Two layers
- **Giving worlds** = the *type* of giving — what passes from hand to hand. Eight: `items`, `food`, `time`, `knowledge`, `money`, `rides`, `housing`, `experiences`. Each world has its own sub-screens, form, closing flow and functionality **on shared infrastructure**.
- **Domains** = internal tags: `medical`, `animals`, `environment`, `elderly`, `democracy`, `employment`, `sport`, `tech`, `heritage`, `culture`, `spirituality`.
- **Every post = exactly one world + exactly one domain.** A football given away = `items · sport`; a theater ticket = `experiences · culture`.
- The domain is **not displayed on the post card** (at most a tiny corner icon) so the image stays clean. It powers filters, recommendations, impact counting and domain hubs.
- The feed **is** the give-and-take marketplace between people and between people and organizations, filterable by world and by domain.
- Topic-based "worlds" decided earlier (D39–D41, D44) are now **domain hubs** (S37). Verification exceptions for medical and housing remain (D30).
- Religion is out; spirituality and philosophy are in (D45).
- All worlds and domains are always shown in full (D3, D60). A world is either **active** — full in-app flow (form, matching, chat, closing) — or a **portal** — links, knowledge and org blocks only. Launch flags switch a world between active and portal; they never hide it. Every world and every domain has its own screen tree under the Donations tab (D62).
- Challenges are a **layer**, not a world (D43). Emergency is a **mode**, not a world (D42).

## Giving worlds
| World | slug | Example | Phase |
|---|---|---|---|
| Food | food | Offer of cooked/fresh food | MVP, live |
| Items | items | Give away furniture | MVP, live |
| Rides | rides | Driver offers seats | MVP (flag off in code) |
| Time & volunteering | time | Offer/request help | MVP, live |
| Money | money | Donate to KC (Grow hosted page) | MVP → phase 2 (JGive-like) |
| Housing | housing | Community hosting / at-risk housing | Next to launch (D30) |
| Knowledge, rights & legal aid | knowledge | Lessons, mentoring, pro-bono consulting hour | Phase 2 |
| Experiences | experiences | Unused tickets, free class places, workshops | Phase 2 |

## Domains
medical/health · animals · environment · elderly & loneliness · democracy · philanthropic employment · sport · science & technology · history & heritage · culture & art · spirituality & philosophy — see [06](./06_domain_hubs.md).

## Registrar of Nonprofits fields → KC (D44)
| Registrar field | Active nonprofits | KC world / domain |
|---|---|---|
| Religion | 12,657 | Not included (neutrality); spirituality/philosophy as domain (D45) |
| Education & training | 8,195 | knowledge; training → employment |
| Welfare services | 7,755 | elderly, food, items, housing |
| Community & society | 2,802 | time + challenges (D43) |
| Sport | 2,396 | sport (D44) |
| Culture & art | 1,677 | culture (D45) |
| Health / lifesaving | 1,060 | medical |
| Heritage / commemoration | 908 | heritage (D44) |
| Research, science & tech | 527 | tech (D44) |
| Housing & urban development | 502 | housing |
| Environment & animals | 443 | environment + animals (separate) |
| Advocacy & social change | 417 | democracy (D40) |
| Trade unions | 393 | employment — nonprofit-sector roles only (S27) |
| Volunteering & funds | 214 | time + money |
| International relations | 189 | partnerships, not a world |

## World hub template (D36)
Every world is a deep hub, not just a feed. One infrastructure; each world defines itself via `WorldHubConfig` (accent color, icon, illustration, tagline, which blocks and in what order, form fields). Unique needs = **plug-in blocks** on the same template (e.g. animal water-stations map, heritage timeline, polls). In emergency, every hub shows an emergency block on top (D42). Content is written by the KC team; orgs propose updates for approval (S18).

| Block | Contents |
|---|---|
| 1. World feed | Same feed & controls as main (D5, D27). On top: search within the world and the **מחפש / מציע** toggle — *מחפש* lists the world's offers with a "publish request" button, *מציע* lists its requests with a "publish offer" button, each opening the create form preset to the world and direction ({{D:world-feed-seeker-offerer}}) |
| 2. Knowledge screens | Guides, professional content |
| 3. Org directory | Search/filter/sort; proper-management badge (S35); link approval (D9) |
| 4. Practical info | Points, phones, services |
| 5. Forms | One form per post type (D28) |
| 6. Operations | History, driver board, hours log |
| 7. World challenges | Active challenges + start a new giving challenge here (D43, D46) |
| + plug-in / emergency block | Unique need (D36) / active emergency (D42) |

**Domain hub (S38):** a light version — feed filtered by domain across all worlds, knowledge, orgs, resources, challenges, impact counter; no forms of its own ("publish" opens the world's form with the domain preset).
