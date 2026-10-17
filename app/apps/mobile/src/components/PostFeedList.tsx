import { useTranslation } from 'react-i18next';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import type { ViewToken } from 'react-native';
import { makeUseStyles, spacing, typography, useTheme } from '@kc/ui';
import type { PostWithOwner } from '@kc/application';
import type { useTranslatedPosts } from '../hooks/useTranslatedPosts';
import { HOME_FEED_GRID_COLUMNS } from '../hooks/useShellContentWidth';
import { useShellTabBarScrollInset } from '../navigation/useShellTabBarVisibility';
import { PostCardGrid } from './PostCardGrid';
import { EmptyState } from './EmptyState';
import { PostGridSkeleton } from './skeletons/PostGridSkeleton';
import { finishMark } from '../lib/observability/perfMarks';
import { KcFlashList, type KcFlashListRef } from './lists/KcFlashList';

interface Props {
  data: PostWithOwner[] | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  /** Override card-tap handler (used by guest feed for the join modal). */
  onCardPress?: (post: PostWithOwner) => void;
  /** Optional override for the empty state — Home Feed passes the warm empty state. */
  emptyComponent?: React.ReactNode;
  /** Optional sticky/scrollable banner rendered above the list. */
  ListHeaderComponent?: React.ReactNode;
  /** Forwarded to the underlying KcFlashList — used by the feed for scroll-to-top. */
  listRef?: React.Ref<KcFlashListRef<PostWithOwner>>;
  /** FR-TRANSLATE-003 — viewport tracking for viewport-gated translation. */
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  viewabilityConfig?: { itemVisiblePercentThreshold?: number; minimumViewTime?: number };
  /** FR-TRANSLATE-003 — translated fields/status accessor for visible posts. */
  translations?: ReturnType<typeof useTranslatedPosts>;
}

export function PostFeedList({
  data,
  isLoading,
  isRefetching,
  isError,
  onRefresh,
  onRetry,
  onEndReached,
  hasMore,
  onCardPress,
  emptyComponent,
  ListHeaderComponent,
  listRef,
  onViewableItemsChanged,
  viewabilityConfig,
  translations,
}: Props) {
  const styles = usePostFeedListStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const tabBarPad = useShellTabBarScrollInset();
  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingBottom: tabBarPad }] as const,
    [styles.listContent, tabBarPad],
  );

  const renderItem = useCallback(
    ({ item }: { item: PostWithOwner }) => (
      <PostCardGrid
        post={item}
        onCardPress={onCardPress}
        translatedFields={translations?.getTranslatedFields(item.postId)}
        titleStatus={translations?.getStatus(item.postId, 'title')}
        descriptionStatus={translations?.getStatus(item.postId, 'description')}
      />
    ),
    [onCardPress, translations],
  );

  const keyExtractor = useCallback((p: PostWithOwner) => p.postId, []);

  React.useEffect(() => {
    if ((data ?? []).length > 0) finishMark('feed.first_render');
  }, [data]);

  if (isLoading && !data) {
    return <PostGridSkeleton columns={HOME_FEED_GRID_COLUMNS} count={HOME_FEED_GRID_COLUMNS * 3} />;
  }
  if (isError && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{t('feed.loadErrorTitle')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>{t('general.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <KcFlashList
      ref={listRef}
      estimatedItemSize={280}
      style={styles.list}
      data={data ?? []}
      keyExtractor={keyExtractor}
      numColumns={HOME_FEED_GRID_COLUMNS}
      renderItem={renderItem}
      contentContainerStyle={listContentStyle as unknown as object}
      ListHeaderComponent={ListHeaderComponent as React.ComponentType | null | undefined}
      ListEmptyComponent={
        (emptyComponent as React.ReactElement) ?? (
          <EmptyState
            icon="search-outline"
            title={t('feed.noResults')}
            subtitle={t('feed.noResultsDesc')}
          />
        )
      }
      ListFooterComponent={
        hasMore && data && data.length > 0 ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
    />
  );
}

const usePostFeedListStyles = makeUseStyles(({ colors }) => ({
  list: { flex: 1, width: '100%', minWidth: 0, alignSelf: 'stretch' as const },
  center: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: spacing.xl,
    gap: spacing.base,
  },
  errorTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' as const },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  retryText: { ...typography.button, color: colors.textInverse },
  row: { paddingHorizontal: spacing.base, gap: spacing.sm, marginBottom: spacing.sm },
  listContent: { paddingTop: spacing.base },
  footer: { paddingVertical: spacing.base, alignItems: 'center' as const },
}));