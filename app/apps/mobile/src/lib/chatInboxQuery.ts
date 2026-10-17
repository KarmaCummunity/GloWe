// FR-CHAT-001 / #894 — React Query cache for chat inbox (persisted offline-first).
import type { QueryClient } from '@tanstack/react-query';
import type { Chat } from '@kc/domain';
import type { ChatWithPreview, IChatRepository } from '@kc/application';
export type ChatInboxSnapshot = {
  chats: ChatWithPreview[];
  unreadTotal: number;
};

export function chatInboxQueryKey(userId: string) {
  return ['chat-inbox', userId] as const;
}

export async function fetchChatInboxSnapshot(
  userId: string,
  repo: IChatRepository,
): Promise<ChatInboxSnapshot> {
  const [chats, unreadTotal] = await Promise.all([
    repo.getMyChats(userId),
    repo.getUnreadTotal(userId),
  ]);
  return { chats, unreadTotal };
}

export function readChatInboxSnapshot(
  qc: QueryClient,
  userId: string,
): ChatInboxSnapshot | undefined {
  return qc.getQueryData<ChatInboxSnapshot>(chatInboxQueryKey(userId));
}

export function writeChatInboxSnapshot(
  qc: QueryClient,
  userId: string,
  snapshot: ChatInboxSnapshot,
): void {
  qc.setQueryData(chatInboxQueryKey(userId), snapshot);
}

const lastAtMs = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

export function upsertChatPreviewInSnapshot(
  snapshot: ChatInboxSnapshot,
  chat: Chat,
): ChatInboxSnapshot {
  const inbox = snapshot.chats;
  const idx = inbox.findIndex((c) => c.chatId === chat.chatId);
  const next =
    idx >= 0
      ? inbox.map((c, i) => (i === idx ? { ...c, ...chat } : c))
      : [...inbox, chat as ChatWithPreview];
  next.sort((a, b) => lastAtMs(b.lastMessageAt) - lastAtMs(a.lastMessageAt));
  return { ...snapshot, chats: next };
}

export function markChatReadInSnapshot(
  snapshot: ChatInboxSnapshot,
  chatId: string,
): { snapshot: ChatInboxSnapshot; deltaUnread: number } | null {
  const row = snapshot.chats.find((c) => c.chatId === chatId);
  if (!row || row.unreadCount === 0) return null;
  const deltaUnread = row.unreadCount;
  const chats = snapshot.chats.map((c) =>
    c.chatId === chatId ? { ...c, unreadCount: 0 } : c,
  );
  return {
    snapshot: {
      chats,
      unreadTotal: Math.max(0, snapshot.unreadTotal - deltaUnread),
    },
    deltaUnread,
  };
}
