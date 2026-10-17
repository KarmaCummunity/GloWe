// Chat list (Inbox) — FR-CHAT-001, FR-CHAT-016.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, RefreshControl, TextInput, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ListRenderItem } from '@shopify/flash-list';
import { ChatError, type ChatWithPreview } from '@kc/application';
import { makeUseStyles, typography, spacing, radius, useTheme } from '@kc/ui';
import { useAuthStore } from '../../src/store/authStore';
import { container } from '../../src/lib/container';
import { markNeedFreshThreadWith } from '../../src/lib/chatNavigationPrefs';
import { EmptyState } from '../../src/components/EmptyState';
import { HideChatConfirmModal } from '../../src/components/HideChatConfirmModal';
import { InboxChatRow, InboxChatRowSeparator } from '../../src/components/chat/InboxChatRow';
import { InboxListSkeleton } from '../../src/components/skeletons/InboxListSkeleton';
import { NotifyModal } from '../../src/components/NotifyModal';
import { KcFlashList } from '../../src/components/lists/KcFlashList';
import { useChatInboxQuery } from '../../src/hooks/useChatInboxQuery';
import { useChatStore } from '../../src/store/chatStore';
import { useDetailStackScreenOptions } from '../../src/navigation/detailStackScreenOptions';
import { queryClient } from '../../src/lib/queryPersist';
import { chatInboxQueryKey } from '../../src/lib/chatInboxQuery';

const PAGE = 30;

export default function ChatListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useChatListStyles();
  const { colors } = useTheme();
  const detailOptions = useDetailStackScreenOptions();
  const userId = useAuthStore((s) => s.session?.userId);
  const inboxQuery = useChatInboxQuery(userId);
  const inbox = inboxQuery.data?.chats;
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(PAGE);
  const [hideTarget, setHideTarget] = useState<{ chatId: string; otherUserId: string | null } | null>(
    null,
  );
  const [hideBusy, setHideBusy] = useState(false);
  const [hideErrorMsg, setHideErrorMsg] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    await inboxQuery.refetch();
  }, [userId, inboxQuery]);

  const filtered = useMemo(() => {
    if (!inbox) return [];
    const needle = q.trim().toLowerCase();
    const list = needle
      ? inbox.filter((c) => (c.otherParticipant.displayName ?? '').toLowerCase().startsWith(needle))
      : inbox;
    return list.slice(0, visible);
  }, [inbox, q, visible]);

  const handleOpen = useCallback(
    (chatId: string) => router.push(`/chat/${chatId}`),
    [router],
  );
  const handleRequestHide = useCallback(
    (chatId: string, otherUserId: string | null) => setHideTarget({ chatId, otherUserId }),
    [],
  );
  const renderItem = useCallback<ListRenderItem<ChatWithPreview>>(
    ({ item }) => (
      <InboxChatRow item={item} onOpen={handleOpen} onRequestHide={handleRequestHide} />
    ),
    [handleOpen, handleRequestHide],
  );
  const handleEndReached = useCallback(() => setVisible((v) => v + PAGE), []);

  const showSkeleton = inboxQuery.isLoading && !inbox;

  return (
    <View style={styles.container} testID="chat-inbox-screen">
      <Stack.Screen
        options={{
          ...detailOptions,
          headerTitle: t('chat.title'),
          ...(Platform.OS === 'ios' ? { headerLargeTitle: true } : {}),
        }}
      />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder={t('chat.searchPlaceholder')}
          placeholderTextColor={colors.textDisabled}
          textAlign="right"
        />
      </View>

      {showSkeleton ? (
        <InboxListSkeleton />
      ) : (
        <KcFlashList
          data={filtered}
          keyExtractor={(c) => c.chatId}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          estimatedItemSize={76}
          refreshControl={
            <RefreshControl
              refreshing={inboxQuery.isRefetching}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={renderItem}
          ItemSeparatorComponent={InboxChatRowSeparator}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title={t('chat.noChats')}
              subtitle={t('chat.noChatsDesc')}
            />
          }
        />
      )}

      <HideChatConfirmModal
        visible={hideTarget != null}
        loading={hideBusy}
        onCancel={() => setHideTarget(null)}
        onConfirm={async () => {
          const target = hideTarget;
          if (!target || !userId) return;
          setHideBusy(true);
          try {
            await container.hideChatFromInbox.execute({ chatId: target.chatId });
            if (target.otherUserId) markNeedFreshThreadWith(target.otherUserId);
            await useChatStore.getState().refreshInbox(userId, container.chatRepo);
            void queryClient.invalidateQueries({ queryKey: chatInboxQueryKey(userId) });
            setHideTarget(null);
          } catch (err) {
            const msg =
              err instanceof ChatError && err.code === 'support_thread_not_hideable'
                ? t('chat.hideErrorSupport')
                : t('chat.hideErrorGeneric');
            setHideErrorMsg(msg);
          } finally {
            setHideBusy(false);
          }
        }}
      />
      <NotifyModal visible={hideErrorMsg !== null} title={t('chat.errorTitle')} message={hideErrorMsg ?? ''} onDismiss={() => setHideErrorMsg(null)} />
    </View>
  );
}

const useChatListStyles = makeUseStyles(({ colors }) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  searchWrap: { padding: spacing.sm, backgroundColor: colors.surface },
  search: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
}));
