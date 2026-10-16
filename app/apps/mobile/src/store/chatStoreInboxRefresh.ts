// Full inbox snapshot fetch with FR-CHAT-012 epoch guard (stale load vs mark-read).
import type { QueryClient } from '@tanstack/react-query';
import type { IChatRepository } from '@kc/application';
import type { ChatState } from './chatStoreTypes';
import { fetchChatInboxSnapshot, writeChatInboxSnapshot } from '../lib/chatInboxQuery';

type StoreApi = {
  getState: () => ChatState;
  setState: (partial: Partial<ChatState>) => void;
};

export async function runRefreshInbox(
  api: StoreApi,
  userId: string,
  repo: IChatRepository,
  qc: QueryClient,
): Promise<void> {
  const epoch0 = api.getState().inboxSnapshotEpoch;
  const snapshot = await fetchChatInboxSnapshot(userId, repo);
  if (api.getState().inboxSnapshotEpoch !== epoch0) return;
  writeChatInboxSnapshot(qc, userId, snapshot);
  api.setState({ unreadTotal: snapshot.unreadTotal });
}
