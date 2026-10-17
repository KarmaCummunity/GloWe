select u.user_id, u.display_name, u.share_handle, u.avatar_url, u.followers_count,
       (select count(*) from public.users u2
         where u2.display_name ilike U&'%\05DB\05D4%' or u2.biography ilike U&'%\05DB\05D4%' or u2.share_handle ilike U&'%\05DB\05D4%') as total
  from public.users u
 where u.display_name ilike U&'%\05DB\05D4%' or u.biography ilike U&'%\05DB\05D4%' or u.share_handle ilike U&'%\05DB\05D4%'
 order by u.followers_count desc
 limit 20
