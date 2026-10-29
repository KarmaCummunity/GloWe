# Core loop analytics events (#1055)

Product analytics uses PostHog when `EXPO_PUBLIC_POSTHOG_KEY` is set. The mobile facade lives in `app/apps/mobile/src/lib/analytics.ts`; core-loop helpers add required dimensions in `analyticsCoreLoop.ts`.

## Event catalog

| Event | When | Required properties |
| --- | --- | --- |
| `signup` | Account created | `city` (`lod` \| `other`), optional `method` |
| `activation` | First listing published (once per install) | `city`, `world` |
| `listing_created` | Marketplace listing saved | `city`, `world` |
| `match_shown` | Matches list rendered with ≥1 open suggestion | `city`, optional `count` |
| `match_feedback` | User accepts or declines a match (#1121) | `city`, `world`, `response` (`accept` \| `decline`) |
| `chat_started` | Chat opened from a listing | `city`, `world` |
| `handover_completed` | Giver/receiver marks handoff complete | `city`, `world` |
| `return_visit` | Authenticated user reopens the app after first open | `city` |

## City dimension

`city` is derived from the viewer or listing `city_id`: `7000` (Lod) → `lod`, anything else (including unknown) → `other`. See `LOD_CITY_ID` in `@kc/domain` (`launch/launchWorlds.ts`).

## World dimension

`world` is the marketplace world slug (`items`, `food`, …) when the event is world-scoped.

## Legacy events

`match_made` and `donation` remain for older dashboards; new work should prefer `match_feedback` / `handover_completed` and the table above.
