// Inbox row bump on Realtime message INSERT (FR-CHAT-012 implementation note).
import type { Message } from '@kc/domain';
import type { ChatInboxSnapshot } from '../lib/chatInboxQuery';

const lastAtMs = (iso: string | null | undefined) => (iso ? Date.parse(iso) : 0);

export function reduceBumpInboxForIncomingInsert(
  snapshot: ChatInboxSnapshot,
  viewerId: string,
  msg: Message,
  isActiveChat = false,
): ChatInboxSnapshot | null {
  const inbox = snapshot.chats;
  const idx = inbox.findIndex((c) => c.chatId === msg.chatId);
  if (idx < 0) return null;

  const row = inbox[idx];
  if (row.lastMessage?.messageId === msg.messageId) return null;

  const fromSelf = msg.senderId === viewerId;
  const deltaUnread = fromSelf || isActiveChat ? 0 : 1;

  const msgMs = lastAtMs(msg.createdAt);
  const rowMs = lastAtMs(row.lastMessageAt);
  const nextLastAt = msgMs >= rowMs ? msg.createdAt : row.lastMessageAt;

  const updatedRow = {
    ...row,
    lastMessage: msg,
    lastMessageAt: nextLastAt,
    unreadCount: row.unreadCount + deltaUnread,
  };

  const nextInbox = inbox.map((c, i) => (i === idx ? updatedRow : c));
  nextInbox.sort((a, b) => lastAtMs(b.lastMessageAt) - lastAtMs(a.lastMessageAt));

  return {
    chats: nextInbox,
    unreadTotal: Math.max(0, snapshot.unreadTotal + deltaUnread),
  };
}
