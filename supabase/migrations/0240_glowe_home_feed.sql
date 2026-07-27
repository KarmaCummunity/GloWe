-- 0240_glowe_home_feed — server-side ranked home discovery feed.
--
-- Before: GloWe home fired six unbounded select('*') catalog fetches and ranked
-- ~everything client-side to show 10 cards (FR-GLOWE-016 AC2). That collapses
-- once catalogs grow past a few hundred rows.
--
-- This RPC unions the public-readable content kinds, applies the same hot score
-- as js/glowe-home-feed.js (recency half-life ~60h + 2*log1p(comments) +
-- 1.5*log1p(saves)), and returns a paginated slice. Save counts stay 0 for
-- MVP (client previously passed an empty map; glowe_saved_items is owner-RLS).
--
-- Mapped to spec: FR-GLOWE-016 AC2; GLOWE.LAUNCH-2 Wave 2.1.

set search_path = public;

create or replace function public.glowe_home_feed(
  p_limit  int default 10,
  p_offset int default 0
)
returns table (
  kind               text,
  id                 text,
  title              text,
  snippet            text,
  created_at         timestamptz,
  author_label       text,
  author_name_en     text,
  author_id          text,
  author_avatar_url  text,
  comment_count      int,
  save_count         int,
  tag_key            text,
  category           text,
  group_id           text,
  hot_score          double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with
  comment_counts as (
    select c.post_id::text as post_id, count(*)::int as n
      from public.glowe_comments c
     group by c.post_id
  ),
  candidates as (
    select
      'post'::text as kind,
      p.id::text as id,
      coalesce(p.title, '') as title,
      left(coalesce(p.text, ''), 200) as snippet,
      p.created_at,
      coalesce(nullif(p.author_name, ''), 'Community Member') as author_label,
      coalesce(p.author_name_en, '') as author_name_en,
      coalesce(p.user_id::text, '') as author_id,
      coalesce(p.author_avatar_url, '') as author_avatar_url,
      coalesce(cc.n, 0) as comment_count,
      0 as save_count,
      'Post'::text as tag_key,
      coalesce(p.category, '') as category,
      ''::text as group_id
    from public.glowe_posts p
    left join comment_counts cc on cc.post_id = p.id::text
    where coalesce(p.status, '') is distinct from 'removed'
      and (
        p.post_type is null
        or p.post_type = ''
        or p.post_type = 'community'
      )

    union all

    select
      'wish',
      p.id::text,
      coalesce(p.title, ''),
      left(coalesce(p.text, ''), 200),
      p.created_at,
      coalesce(nullif(p.author_name, ''), 'GloWe Member'),
      coalesce(p.author_name_en, ''),
      coalesce(p.user_id::text, ''),
      coalesce(p.author_avatar_url, ''),
      coalesce(cc.n, 0),
      0,
      'Wish',
      coalesce(p.wish_type, ''),
      ''
    from public.glowe_posts p
    left join comment_counts cc on cc.post_id = p.id::text
    where p.post_type = 'wish'
      and coalesce(p.status, 'open') = 'open'

    union all

    select
      'volunteer_offer',
      p.id::text,
      coalesce(p.title, ''),
      left(coalesce(p.text, ''), 200),
      p.created_at,
      coalesce(nullif(p.author_name, ''), 'GloWe Member'),
      coalesce(p.author_name_en, ''),
      coalesce(p.user_id::text, ''),
      coalesce(p.author_avatar_url, ''),
      coalesce(cc.n, 0),
      0,
      'Volunteer Offer',
      coalesce(p.category, ''),
      ''
    from public.glowe_posts p
    left join comment_counts cc on cc.post_id = p.id::text
    where p.post_type = 'offer'
      and coalesce(p.status, 'open') = 'open'

    union all

    select
      case when o.start_at is not null then 'event' else 'opportunity' end,
      o.id::text,
      coalesce(o.title, ''),
      left(coalesce(o.description, ''), 200),
      o.created_at,
      coalesce(nullif(o.organization, ''), 'Organization'),
      coalesce(o.organization_en, ''),
      coalesce(o.user_id::text, ''),
      '',
      0,
      0,
      case when o.start_at is not null then 'Event' else 'Opportunity' end,
      coalesce(o.field, ''),
      ''
    from public.glowe_opportunities o
    where coalesce(o.status, 'active') is distinct from 'cancelled'
      and coalesce(o.status, 'active') is distinct from 'closed'

    union all

    select
      'forum_group',
      g.id::text,
      coalesce(g.title, ''),
      left(coalesce(g.description, ''), 200),
      g.created_at,
      'GloWe',
      '',
      '',
      '',
      coalesce((
        select count(*)::int from public.glowe_forum_threads t where t.group_id = g.id
      ), 0),
      0,
      'Forum',
      '',
      ''
    from public.glowe_forum_groups g

    union all

    select
      'forum_thread',
      t.id::text,
      coalesce(t.title, ''),
      left(coalesce(t.body, ''), 200),
      t.created_at,
      'GloWe Member',
      '',
      coalesce(t.user_id::text, ''),
      '',
      coalesce((
        select count(*)::int from public.glowe_forum_replies r where r.thread_id = t.id
      ), 0),
      0,
      'Discussion',
      '',
      coalesce(t.group_id, '')
    from public.glowe_forum_threads t
  ),
  scored as (
    select
      c.*,
      (
        exp(
          - greatest(
              0::double precision,
              extract(epoch from (now() - c.created_at)) * 1000.0
            ) / (60.0 * 60.0 * 1000.0 * 60.0)
        )
        + 2.0 * ln(1.0 + c.comment_count::double precision)
        + 1.5 * ln(1.0 + c.save_count::double precision)
      ) as hot_score
    from candidates c
  )
  select
    s.kind,
    s.id,
    s.title,
    s.snippet,
    s.created_at,
    s.author_label,
    s.author_name_en,
    s.author_id,
    s.author_avatar_url,
    s.comment_count,
    s.save_count,
    s.tag_key,
    s.category,
    s.group_id,
    s.hot_score
  from scored s
  order by s.hot_score desc, s.id asc
  limit greatest(1, least(coalesce(p_limit, 10), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.glowe_home_feed(int, int) is
  'Ranked GloWe home discovery feed with pagination. Mirrors client hot score in glowe-home-feed.js. FR-GLOWE-016 AC2 / Wave 2.1.';

grant execute on function public.glowe_home_feed(int, int) to anon, authenticated;
