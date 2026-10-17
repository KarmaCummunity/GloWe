select u.user_id, u.display_name, u.share_handle, u.avatar_url, u.followers_count,
       (select count(*) from public.users u2
         where u2.display_name ilike '%כה%' or u2.biography ilike '%כה%' or u2.share_handle ilike '%כה%') as total
  from public.users u
 where u.display_name ilike '%כה%' or u.biography ilike '%כה%' or u.share_handle ilike '%כה%'
 order by u.followers_count desc
 limit 20
