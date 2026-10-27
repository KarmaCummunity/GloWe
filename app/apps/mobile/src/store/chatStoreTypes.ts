// Shared chat store types — keeps `chatStore.ts` under architecture LOC cap (TD-118).
import type { Chat, Message, MessageStatus } from '@kc/domain';
import type { IChatRepository, IChatRealtime, Unsubscribe } from '@kc/application';

export interface OptimisticMessage extends Message {
  clientId: string;
  failed?: boolean;
}

export interface ChatState {
  unreadTotal: number;
  /** Bumps when local read clears row unread; stale network snapshots must not overwrite. */
  inboxSnapshotEpoch: number;
  threads: Record<string, OptimisticMessage[]>;
  inboxSub: Unsubscribe | null;
  threadSubs: Record<string, Unsubscribe>;

  upsertChatPreview(chat: Chat): void;
  setUnreadTotal(n: number): void;
  markChatLocallyRead(chatId: string): void;
  bumpInboxForIncomingInsert(viewerId: string, message: Message): void;

  setThreadMessages(chatId: string, msgs: Message[]): void;
  appendOptimistic(chatId: string, msg: OptimisticMessage): void;
  reconcileSent(chatId: string, clientId: string, server: Message): void;
  markFailed(chatId: string, clientId: string): void;
  applyIncomingMessage(chatId: string, msg: Message): void;
  applyStatusChange(
    chatId: string,
    patch: {
      messageId: string;
      status: MessageStatus;
      deliveredAt: string | null;
      readAt: string | null;
    },
  ): void;

  startInboxSub(userId: string, repo: IChatRepository, realtime: IChatRealtime): Promise<void>;
  startThreadSub(
    chatId: string,
    repo: IChatRepository,
    realtime: IChatRealtime,
    onChatChanged?: (chat: Chat) => void,
  ): Promise<void>;
  stopThreadSub(chatId: string): void;
  refreshInbox: (userId: string, repo: IChatRepository) => Promise<void>;
  resetOnSignOut(): void;
}
