select p.*
  from public.posts p
 where p.post_id in (select s.post_id from public.search_posts_page(U&'\05E1\05E4\05E8', null, null, null, 21) s)
