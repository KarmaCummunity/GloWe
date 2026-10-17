select p.*, u.user_id as owner_user_id, u.display_name, u.avatar_url
  from public.feed_visible_posts p
  join public.users u on u.user_id = p.owner_id
 where p.status = 'open'
 order by p.created_at desc, p.post_id desc
 limit 21
