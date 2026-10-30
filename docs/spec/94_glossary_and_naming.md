# 94 — Glossary and naming conventions

## Glossary
| Term (HE) | Term (EN) | Definition |
|---|---|---|
| מקור האמת | Source of truth | The Hebrew project-book page (D35); this folder is its English derivation |
| פוסט | Post | The only publishing entity (D2, D19) |
| סוג פוסט | Post type | World + direction, or event/job; drives form, expiry and closing |
| עולם נתינה | Giving world | Type of giving; one of 8 (D45) |
| תחום | Domain | One internal tag per post; not shown on card; drives filters, recommendations, impact, domain hub (D45) |
| מרכז עולם / מרכז תחום | World hub / domain hub | World screen built from config (D36); light domain version (S38) |
| שכבה רוחבית | Cross-cutting layer | Applies to all worlds: challenges, emergency, karma |
| בלוק מתוסף | Plug-in block | World-specific component on the shared template (D36) |
| תת-קטגוריה של חפצים | Item subcategory | Kind of item (D18) |
| מסירה | Handoff | Closing stage of every post (D19) |
| תפוגה / תזכורת רלוונטיות | Expiry / relevance reminder | Auto-close per type; "still relevant?" (D21) |
| מנוע המלצות | Recommendation engine | "Recommended" sort (D27, S33) |
| נקודות קארמה | Karma points | Visible to owner and main admin (D29) |
| רמת אימות | Verification level | Phone / ID / blue check (D23) |
| רמת אימות ארגון | Org verification level | basic → effectiveness (D53) |
| דירוג / מנוע אמון | Rating / trust engine | Internal only (D15, D24) |
| אירוע | Event | Org post type with registration (D31) |
| מתנדב משויך | Affiliated volunteer | Gets org permissions, logs hours (D22, D32) |
| מצב חירום | Emergency mode | App mode by region & world, 4 levels (D42) |
| אתגר | Challenge | Personal, group or community (D43) |
| פוסט מיובא / תביעה | Imported post / claim | From WhatsApp; ownership confirmed by phone verification (D38, S21) |
| גשר קבוצה | Group bridge | Parallel community + summaries during migration (S23) |
| חוקת ברזל | Iron constitution | Rules core not changeable by vote (D40) |
| listings | listings (code term) | Legacy table to become `posts` (D19); **not** a product term |

## Naming rules
1. Always the precise name: "giving world", "item subcategory", "post type" — **never a bare "categories"**.
2. One concept = one Hebrew name = one code identifier; new concepts enter this glossary first.
3. No "market" / marketplace / listing as a product concept (D2, D14).
4. World-hub components `World*` are generic; uniqueness only via `WorldHubConfig` / `WorldHubBlock` (D36).
5. Cross-cutting layers get no world slug (`Challenge`, `EmergencyMode`).

## Proposed identifiers (no code change implied)
| Concept | Proposed identifier | In code today |
|---|---|---|
| Post | `Post` / `public.posts` (D19) | `posts` + `listings` |
| Giving world | `DonationWorld`, `DONATION_WORLD_SLUGS`: items, food, time, knowledge, money, rides, housing, experiences | `world_slug`, `MARKETPLACE_WORLD_SLUGS` |
| Domain | `PostDomain`, `POST_DOMAIN_SLUGS`: medical, animals, environment, elderly, democracy, employment, sport, tech, heritage, culture, spirituality; `Post.domain_slug`; `DomainHubConfig` | none |
| Hub | `WorldHubScreen`, `WorldHubConfig`, `WorldHubBlock` | `WorldMarketplaceHub` |
| Orgs / knowledge / resource | `WorldOrgDirectory`, `WorldKnowledgeArticle`, `WorldResource` | `donation_links` |
| Post type / direction | `PostType`; `PostDirection: offer \| request` | `listing_kinds`; give/request |
| Form per type | `PostTypeFormSchema` | `createCategories.ts` |
| Subcategories | `ItemSubcategory` / `WorldSubcategory` | `Category` / `public.categories` |
| Extensions | `PostHandoff`, `RidePostDetails`, `EventPostDetails`, `HousingPostDetails`, `NonprofitJobPostDetails` | `giving_handoffs`, `ride_listings` |
| Rating / match | `PostRating`, `PostMatch` | `ride_ratings`, `match_candidates` |
| Expiry | `Post.expires_at`, `PostRelevanceReminder` | none |
| Feed | `FeedRecommendationEngine`, `FeedSortMode`, `FeedAudience` | `PostFilterSheet` |
| Notifications | `NotificationType`, `NotificationPreference`, `NotificationGroup: important \| social \| emergency` | `inbox.tsx` |
| Karma | `KARMA_POINT_VALUES` | hard-coded in migration 0099 |
| Volunteering | `VolunteerHoursEntry`, `OrgVolunteerMembership` | none |
| Moderation | `PostReport`, `UserReport`, `UserSuspension` | `reports` |
| Trust | `VerificationLevel`, `TrustEngine`, `OrgVerificationLevel` | phone |
| Engagement | `PostLike`, `PostComment`, `PostCommentLike` | migration 0250 |
| Emergency | `EmergencyDeclaration`, `EmergencyLevel` | none |
| Challenges | `Challenge`, `ChallengeScope`, `ChallengeParticipation` | none |
| WhatsApp import | `ExternalGroupImport`, `ImportedPostCandidate`, `GroupBridge` | none |
| Partners | `PartnerOrg`, `PartnershipTier` | `donation_links` |
| Governance | `CommunityPoll`, `GovernanceProposal`, `ConstitutionClause` | none |
| Heritage | `HeritageTimelineEntry` | none |
| Donation to KC | `KcDonation`, `KcRecurringDonation`, `DonationPaymentProvider` | Bit/Paybox |
