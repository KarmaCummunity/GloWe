# Feed performance evidence — KC#899

After `supabase db reset`, run on local stack:

```sql
select jsonb_pretty(public.feed_newest_explain_analyze_ms(
  '00000000-0000-0000-0000-000000899001'::uuid  -- created by pgTAP seed test user when tests run
));
```

Or rely on CI output from `supabase/tests/0340_feed_performance_pgtap.sql` (`test.feed_explain_json`).

**Target:** `elapsed_ms` < 50 on ~900 seeded open posts; plan should reference `feed_open_posts_mv` and `feed_open_posts_mv_open_newest_idx`.
