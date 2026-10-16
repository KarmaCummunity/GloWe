import { useQuery } from '@tanstack/react-query';
import { container } from '../lib/container';
import { chatInboxQueryKey, fetchChatInboxSnapshot } from '../lib/chatInboxQuery';

export function useChatInboxQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: chatInboxQueryKey(userId ?? ''),
    queryFn: () => fetchChatInboxSnapshot(userId!, container.chatRepo),
    enabled: Boolean(userId),
  });
}
