# Migration range registry

**Rule:** before writing a migration, claim a range here, in your PR or a small docs PR to `dev`. Use only numbers inside your range. Files are `supabase/migrations/NNNN_snake_case.sql`. Gaps are fine; collisions are not.

Last applied on kc-dev when this was written: `0239`.

| Range | Owner / issue | Status |
|---|---|---|
| 0238–0239 | #852 (GloWe removal, translation) | merged |
| 0240–0247 | #860 (unified schema) | open PR |
| 0248–0249 | — | free |
| 0250–0259 | social (#885, #887) | open PR |
| 0260–0262 | #886 (matching) | open PR |
| 0263–0270 | #889 (PRD roles / payments) | open PR |
| 0271–0279 | — | free |
| 0280–0285 | social3 (#892) | open PR |
| 0286–0299 | — | free |
| 0300–0304 | WhatsApp bot (#902) | open PR |
| 0305–0319 | — | free |
| 0320–0339 | marketplace (#912) | open PR |
| 0340–0349 | perf (#910, #911) | open PR |
| 0350 | world-rules trigger: enforce on insert / rule-field change only (#952) | merged |
| 0351 | items image rule: photo or details image, deferred check (follow-up to #952) | in progress |
| 0352–0359 | — | free |
| 0360–0369 | money world (#913) | open PR |
| 0370–0379 | time world (volunteering, #915) | open PR |
| 0380–0389 | items & food worlds (handoffs, #916) | open PR |
| 0390+ | — | free |

## Next free ranges

`0248–0249`, `0271–0279`, `0286–0299`, `0305–0319`, `0352–0359`, `0390+`.

## How to claim

1. Take the lowest free block that fits, usually 5–10 numbers.
2. Add a row with your issue number and `in progress`, then commit it in your PR.
3. When the PR merges, set the status to `merged`. Return unused numbers by adding a `free` row.
