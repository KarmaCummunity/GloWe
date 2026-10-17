select p.post_id
  from public.posts p
 where p.status = 'open'
   and (p.created_at, p.post_id) < (
     select created_at, post_id from public.posts where status = 'open'
      order by created_at desc, post_id desc offset 20 limit 1)
 order by p.created_at desc, p.post_id desc
 limit 21
