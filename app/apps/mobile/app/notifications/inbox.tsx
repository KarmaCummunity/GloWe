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

  const onMarkAll = useCallback(async () => {
    await container.notificationInbox.markAllRead();
    await qc.invalidateQueries({ queryKey: ['notification-inbox', userId] });
  }, [qc, userId]);

  const onOpen = useCallback(
    async (inboxId: string, data: Record<string, unknown>, readAt: string | null) => {
      if (!readAt) {
        await container.notificationInbox.markRead(inboxId);
        await qc.invalidateQueries({ queryKey: ['notification-inbox', userId] });
      }
      const link = resolveDeepLink(data);
      if (link) router.push(link as never);
    },
    [qc, router, userId],
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...detailOptions,
          headerTitle: t('notifications.inboxTitle'),
          ...(Platform.OS === 'ios' ? { headerLargeTitle: true } : {}),
        }}
      />
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => void onMarkAll()} accessibilityRole="button">
          <Text style={styles.markAll}>{t('notifications.inboxMarkAll')}</Text>
        </TouchableOpacity>
      </View>
      <KcFlashList
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
          ) : (
            <Text style={styles.empty}>{t('notifications.inboxEmpty')}</Text>
          )
        }
      />
    </>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
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