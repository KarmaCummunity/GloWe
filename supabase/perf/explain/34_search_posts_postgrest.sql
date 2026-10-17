select p.*, (select count(*) from public.posts p2
              where p2.status = 'open'
                and (p2.title ilike '%ספר%' or p2.description ilike '%ספר%' or p2.category ilike '%ספר%')) as total
  from public.posts p
 where p.status = 'open'
   and (p.title ilike '%ספר%' or p.description ilike '%ספר%' or p.category ilike '%ספר%')
 order by p.created_at desc
 limit 20
