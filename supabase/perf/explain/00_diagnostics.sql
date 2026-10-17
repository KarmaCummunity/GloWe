with rides as (
  select l.* from public.listings l
   where l.world_slug = 'rides' and l.status = 'open' and l.moderation_status = 'published'
),
pairs as (
  select o.listing_id oid, q.listing_id qid, s.*
    from rides o join rides q on o.direction = 'give' and q.direction = 'request'
    cross join lateral public.match_score_pair(o, q) s
),
u1 as (select id from auth.users where email = 'user1@seed.kc.test')
select * from (
select 'r1_sample' kind, l.direction || ' ' || left(l.title, 40) name,
       'city=' || coalesce(l.city_id, '-') || ' geo=' || (l.geo is not null) || ' tw=' || coalesce(l.time_window::text, '-')
       || ' exp=' || coalesce(to_char(l.expires_at, 'MM-DD HH24'), '-') || ' cat=' || coalesce(l.category_id::text, '-')
       || ' details=' || left(l.details::text, 300) detail
  from (select * from rides order by direction, created_at desc limit 6) l
union all
select 'r2_counts', direction, count(*) || ' open; future_dep=' ||
       count(*) filter (where (details ->> 'departs_at')::timestamptz > now()) ||
       ' has_dep=' || count(*) filter (where details ? 'departs_at') ||
       ' has_dest_city=' || count(*) filter (where details ? 'dest_city_id') ||
       ' has_origin_ll=' || count(*) filter (where details ? 'origin_lat') ||
       ' has_tw=' || count(*) filter (where time_window is not null) ||
       ' cities=' || count(distinct city_id)
  from rides group by direction
union all
select 'r3_reasons', coalesce(reason, 'ELIGIBLE'), count(*)::text from pairs group by 1, 2
union all
select 'r4_best', left(o.title, 35) || ' <-> ' || left(q.title, 35), p.score || ' km=' || coalesce(p.distance_km::text, '-') || ' ' || p.components - 'weights'
  from (select * from pairs where eligible order by score desc limit 10) p
  join public.listings o on o.listing_id = p.oid join public.listings q on q.listing_id = p.qid
union all
select 'r5_route_overlap', 'same origin city + same dest', count(*)::text || ' pairs; within6h=' ||
       count(*) filter (where abs(extract(epoch from ((o.details->>'departs_at')::timestamptz - (q.details->>'departs_at')::timestamptz)))/3600 <= 6)
  from rides o join rides q on o.direction = 'give' and q.direction = 'request'
   and o.city_id = q.city_id and o.details ->> 'dest_city_id' = q.details ->> 'dest_city_id'
union all
select 'w_status', world_slug || ' ' || status, count(*)::text from public.match_candidates group by 1, 2
union all
select 'i_top50', lpad(rn::text, 2, '0') || ' ' || score, left(ot, 40) || ' <-> ' || left(qt, 40) || ' | ' || comp
  from (select row_number() over (order by m.score desc, m.candidate_id) rn, m.score, o.title ot, q.title qt,
               (m.components - 'weights')::text comp
          from public.match_candidates m
          join public.listings o on o.listing_id = m.offer_listing_id
          join public.listings q on q.listing_id = m.request_listing_id
         where m.world_slug = 'items' and m.status = 'suggested'
           and o.title not like '[e2e%' and q.title not like '%[e2e%'
         order by m.score desc, m.candidate_id limit 50) t
union all
select 'i_distinct_pairs', 'distinct title pairs (non-e2e)', count(distinct (o.title, q.title))::text || ' of ' || count(*) ||
       '; same_title_core=' || count(*) filter (where q.title = U&'\05DE\05D7\05E4\05E9/\05EA: ' || o.title)
  from public.match_candidates m
  join public.listings o on o.listing_id = m.offer_listing_id
  join public.listings q on q.listing_id = m.request_listing_id
 where m.world_slug = 'items' and m.status = 'suggested'
union all
select 'i_score_hist', width_bucket(m.score, 0.45, 0.90, 9)::text,
       count(*) || ' cross_title=' || count(*) filter (where q.title <> U&'\05DE\05D7\05E4\05E9/\05EA: ' || o.title)
  from public.match_candidates m
  join public.listings o on o.listing_id = m.offer_listing_id
  join public.listings q on q.listing_id = m.request_listing_id
 where m.world_slug = 'items' and m.status = 'suggested'
 group by 2
union all
select 'u1_matches', lpad(rn::text, 2, '0') || ' ' || score, left(ot, 40) || ' <-> ' || left(qt, 50) || ' | ' || comp
  from (select row_number() over (order by m.score desc, m.candidate_id) rn, m.score, o.title ot, q.title qt,
               (m.components - 'weights')::text comp
          from public.match_candidates m
          join public.listings o on o.listing_id = m.offer_listing_id
          join public.listings q on q.listing_id = m.request_listing_id
         where m.status = 'suggested' and (m.offer_owner_id in (select id from u1) or m.request_owner_id in (select id from u1))
         order by m.score desc, m.candidate_id limit 30) t
union all
select 'u1_listings', l.world_slug || ' ' || l.direction || ' ' || l.status, count(*)::text || ' e2e=' || count(*) filter (where l.title like '%[e2e%')
  from public.listings l where l.owner_id in (select id from u1) group by 2
union all
select 'e2e_listings_all', coalesce(a.email, '?'), count(*)::text || ' open=' || count(*) filter (where l.status = 'open')
  from public.listings l left join auth.users a on a.id = l.owner_id
 where l.title like '%[e2e %' group by 2
union all
select 'z_sweep', 'stale/total', count(*) filter (where computed_at = '-infinity')::text || '/' || count(*) || ' errors=' || count(*) filter (where last_error is not null) from public.match_listing_state
union all
select 'r6_demo', coalesce(reason, 'ELIGIBLE'), count(*)::text || ' best=' || coalesce(max(score)::text, '-') from pairs p join public.listings q on q.listing_id = p.qid where q.title like '[DEMO]%' group by 2
union all
select 'i_notifiable', world_slug || ' ' || status, count(*) filter (where coalesce((components ->> 'text')::numeric, 0) >= 0.5)::text || ' of ' || count(*) from public.match_candidates where world_slug <> 'rides' group by 2
union all
select 'cat_tree', coalesce(p.slug, '-') || '/' || c.slug, c.category_id::text || ' legacy=' || coalesce(c.legacy_post_category, '-')
  from public.categories c left join public.categories p on p.category_id = c.parent_id
 where c.slug like 'items%' or p.slug = 'items' or c.slug = 'rides' or p.slug = 'rides'
) x
order by 1, 2
