import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { ChatWithPreview } from '@kc/application';
import { chatInboxQueryKey, writeChatInboxSnapshot } from '../../lib/chatInboxQuery';

vi.mock('../authStore', () => ({
  useAuthStore: {
    getState: () => ({ session: { userId: 'u_me' } }),
  },
}));

const queryClient = new QueryClient();
vi.mock('../../lib/queryPersist', () => ({
  queryClient,
}));

const { useChatStore } = await import('../chatStore');

const CHAT: ChatWithPreview = {
  chatId: 'c1',
  lastMessageAt: '2026-05-16T12:00:00.000Z',
  unreadCount: 3,
} as ChatWithPreview;

describe('useChatStore — inbox React Query cache', () => {
  beforeEach(() => {
    queryClient.clear();
    useChatStore.setState({
      unreadTotal: 0,
      inboxSnapshotEpoch: 0,
      threads: {},
      inboxSub: null,
      threadSubs: {},
    });
    writeChatInboxSnapshot(queryClient, 'u_me', { chats: [CHAT], unreadTotal: 3 });
  });

  it('markChatLocallyRead patches cache and unreadTotal', () => {
    useChatStore.getState().markChatLocallyRead('c1');
    const snap = queryClient.getQueryData<{ unreadTotal: number }>(chatInboxQueryKey('u_me'));
    expect(snap?.unreadTotal).toBe(0);
    expect(useChatStore.getState().unreadTotal).toBe(0);
  });

  it('setThreadMessages sorts ascending by createdAt', () => {
    useChatStore.getState().setThreadMessages('c1', [
      { messageId: 'm2', createdAt: '2026-05-16T13:00:00.000Z' } as never,
      { messageId: 'm1', createdAt: '2026-05-16T12:00:00.000Z' } as never,
    ]);
    const list = useChatStore.getState().threads.c1 ?? [];
    expect(list[0]?.messageId).toBe('m1');
  });

  it('applyIncomingMessage dedupes by messageId', () => {
    useChatStore.getState().setThreadMessages('c1', [
      { messageId: 'm1', createdAt: '2026-05-16T12:00:00.000Z', senderId: 'u2', body: 'x' } as never,
    ]);
    useChatStore.getState().applyIncomingMessage('c1', {
      messageId: 'm1',
      createdAt: '2026-05-16T12:00:00.000Z',
      senderId: 'u2',
      body: 'x',
    } as never);
    expect(useChatStore.getState().threads.c1).toHaveLength(1);
  });
});
