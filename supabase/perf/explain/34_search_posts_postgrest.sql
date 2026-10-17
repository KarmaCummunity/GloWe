select p.*, (select count(*) from public.posts p2
              where p2.status = 'open'
                and (p2.title ilike U&'%\05E1\05E4\05E8%' or p2.description ilike U&'%\05E1\05E4\05E8%' or p2.category ilike U&'%\05E1\05E4\05E8%')) as total
  from public.posts p
 where p.status = 'open'
   and (p.title ilike U&'%\05E1\05E4\05E8%' or p.description ilike U&'%\05E1\05E4\05E8%' or p.category ilike U&'%\05E1\05E4\05E8%')
 order by p.created_at desc
 limit 20
