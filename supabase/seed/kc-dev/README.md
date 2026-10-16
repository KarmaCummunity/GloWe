# KC dev seed (Hebrew fake data)

DEV ONLY (kc-dev, ref `enbqriuxvvuontiwslun`). Never run against prod.

- `seed.sql` – wipes previous seed, then creates ~200 users (`userN@seed.kc.test`, password `SeedKC-2026`, fake), ~600 item posts (give/request, incl. delivered with recipients), 120 rides, ~1.5k follows, saved posts, 150 chats with 900 messages; notifications are produced by existing triggers.
- `wipe.sql` – deletes everything created by the seed (all rows hang off `@seed.kc.test` auth users).
- Both refuse to run unless `kc.seed_target = 'dev'` is set in the session.

Run: GitHub Actions → **Seed KC dev** (action: seed | wipe), or
`psql "$KC_DEV_DB_URL" -c "set kc.seed_target='dev'" -f supabase/seed/kc-dev/seed.sql` (same session).

Not seeded yet (no tables in schema): comments/reactions on KC posts, other giving worlds – see issues #867, #824.
