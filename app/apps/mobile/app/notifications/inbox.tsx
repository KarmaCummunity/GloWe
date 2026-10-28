// KC#869 — in-app notification center (read/unread, deep links).

import React, { useCallback } from 'react';
import { Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { useDetailStackScreenOptions } from '../../src/navigation/detailStackScreenOptions';
import { useAuthStore } from '../../src/store/authStore';
import { container } from '../../src/lib/container';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';
import { KcFlashList } from '../../src/components/lists/KcFlashList';
import { SimpleRowListSkeleton } from '../../src/components/skeletons/SimpleRowListSkeleton';

function resolveDeepLink(data: Record<string, unknown>): { pathname: string; params?: Record<string, string> } | null {
  const route = data.route;
  if (typeof route !== 'string') return null;
  const params = data.params as Record<string, string> | undefined;
  return { pathname: route, params };
}

export default function NotificationInboxScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.userId);
  const qc = useQueryClient();
  const detailOptions = useDetailStackScreenOptions();

  const query = useQuery({
    queryKey: ['notification-inbox', userId],
    queryFn: () => container.notificationInbox.list({ limit: 40 }),
    enabled: Boolean(userId),
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['notification-inbox', userId] }),
      qc.invalidateQueries({ queryKey: ['notification-inbox-unread', userId] }),
    ]);
  }, [qc, userId]);

  const onMarkAll = useCallback(async () => {
    await container.notificationInbox.markAllRead();
    await refreshAll();
  }, [refreshAll]);

  const onOpen = useCallback(
    async (inboxId: string, data: Record<string, unknown>, readAt: string | null) => {
      if (!readAt) {
        await container.notificationInbox.markRead(inboxId);
        await refreshAll();
      }
      const link = resolveDeepLink(data);
      if (link) router.push(link as never);
    },
    [refreshAll, router],
  );

  return (
    <View style={styles.container} testID="notification-inbox-screen">
      <Stack.Screen
        options={{
          ...detailOptions,
          headerTitle: t('notifications.inboxTitle'),
          ...(Platform.OS === 'ios' ? { headerLargeTitle: true } : {}),
        }}
      />
      <KcFlashList
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={query.isRefetching}
        onRefresh={() => void refreshAll()}
        ListHeaderComponent={
          (query.data?.length ?? 0) > 0 ? (
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={() => void onMarkAll()} accessibilityRole="button">
                <Text style={styles.markAll}>{t('notifications.inboxMarkAll')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        data={query.data ?? []}
        keyExtractor={(item) => item.inboxId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const title = t(item.titleKey, item.bodyArgs as Record<string, string>);
          const body = t(item.bodyKey, item.bodyArgs as Record<string, string>);
          const unread = !item.readAt;
          return (
            <Pressable
              style={[styles.row, unread ? styles.rowUnread : null]}
              onPress={() => void onOpen(item.inboxId, item.data, item.readAt)}
            >
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowBody} numberOfLines={2}>
                {body}
              </Text>
              {item.groupCount > 1 ? (
                <Text style={styles.groupHint}>{t('notifications.inboxGrouped', { count: item.groupCount })}</Text>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          query.isLoading && !query.data ? (
            <SimpleRowListSkeleton rows={8} rowHeight={72} />
          ) : query.isError ? (
            <Pressable onPress={() => void query.refetch()} accessibilityRole="button">
              <Text style={styles.empty}>{t('notifications.inboxError')}</Text>
            </Pressable>
          ) : (
            <Text style={styles.empty}>{t('notifications.inboxEmpty')}</Text>
          )
        }
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  toolbar: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  markAll: { ...typography.body, color: colors.primary, fontWeight: '600' },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowUnread: { backgroundColor: colors.primaryLight },
  rowTitle: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  rowBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, textAlign: rtlTextAlignStart },
  groupHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: rtlTextAlignStart },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
}));