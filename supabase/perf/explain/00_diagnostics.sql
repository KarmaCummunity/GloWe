select 'rows' as kind, relname as name, n_live_tup::text as detail
  from pg_stat_user_tables
 where schemaname = 'public'
   and relname in ('posts','listings','users','messages','chats','follow_edges','post_reactions','post_comments','feed_mute_filters','blocks')
union all
select 'index', tablename || '.' || indexname, indexdef
  from pg_indexes
 where schemaname = 'public' and tablename in ('posts','listings','messages','chats')
union all
select 'publication', pubname, schemaname || '.' || tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime'
union all
select 'realtime_policy', policyname, cmd || ' ' || coalesce(qual, '') || coalesce(' WITH CHECK ' || with_check, '')
  from pg_policies
 where schemaname = 'realtime' and tablename = 'messages'
union all
select 'extension', extname, extversion from pg_extension where extname in ('pg_trgm','postgis','hypopg','pg_stat_statements')
order by 1, 2
