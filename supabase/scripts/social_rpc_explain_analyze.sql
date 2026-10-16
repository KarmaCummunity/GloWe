-- KC#878 — EXPLAIN (ANALYZE, BUFFERS) templates for high-traffic RPCs.
-- Run manually on dev/staging with realistic row counts. Do not commit secrets.

\set ON_ERROR_STOP on

\echo '=== rpc_get_post_engagement_stats ==='
explain (analyze, buffers, format text)
select * from public.rpc_get_post_engagement_stats(
  (select post_id from public.posts where status = 'open' limit 1)
);

\echo '=== feed_ranked_ids (sample) ==='
explain (analyze, buffers, format text)
select * from public.feed_ranked_ids(
  p_viewer_id := (select user_id from public.users where account_status = 'active' limit 1),
  p_limit := 20,
  p_cursor_created_at := null,
  p_cursor_post_id := null,
  p_search_query := null
);

\echo '=== rpc_unread_counts_for_chats (sample) ==='
explain (analyze, buffers, format text)
select * from public.rpc_unread_counts_for_chats(
  (select user_id from public.users where account_status = 'active' limit 1),
  (select coalesce(array_agg(chat_id), '{}'::uuid[]) from public.chats limit 5)
);
