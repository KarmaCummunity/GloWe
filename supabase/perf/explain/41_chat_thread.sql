select m.*
  from public.messages m
 where m.chat_id = (
   select c.chat_id from public.chats c
    where c.participant_a = auth.uid() or c.participant_b = auth.uid()
    order by c.last_message_at desc nulls last limit 1)
 order by m.created_at desc
 limit 50
