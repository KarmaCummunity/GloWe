select c.*
  from public.chats c
 where c.participant_a = auth.uid() or c.participant_b = auth.uid()
 order by c.last_message_at desc nulls last
 limit 30
