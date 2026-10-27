-- Remove all KC dev seed data (cascades from auth.users → public.users → posts, rides, chats, follows…). DEV ONLY.
do $$ begin
  if coalesce(current_setting('kc.seed_target', true), '') <> 'dev' then
    raise exception 'refusing to wipe: set kc.seed_target=dev';
  end if;
end $$;
delete from public.chats where participant_a in (select id from auth.users where email like '%@seed.kc.test') or participant_b in (select id from auth.users where email like '%@seed.kc.test');
delete from auth.users where email like '%@seed.kc.test';
