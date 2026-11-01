// Mapped to spec: FR-FEED-020 AC2 · docs/spec/04 "World hub template" (D36). A giving world's
// screen: the world's intro and sub-screen links, then its feed — search, the seeker / offerer
// toggle with its publish button, and the open offers or requests of the world.
import React, { type ReactNode } from 'react';
import { RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, Text } from '@kc/ui';
import type { MarketplaceBrowseRow } from '@kc/domain';
import { Screen } from '../ui/Screen';
import { KcFlashList } from '../lists/KcFlashList';
import { ListingCard } from '../cards/ListingCard';
import { kcGridCell } from '../cards/KcCard.styles';
import { useShellTabBarScrollInset } from '../../navigation/useShellTabBarVisibility';
import { LIST_END_THRESHOLD } from '../../hooks/usePrefetchNextPage';
import { useWorldFeed } from '../../hooks/useWorldFeed';
import { WorldFeedControls } from './WorldFeedControls';

interface Props {
  readonly worldSlug: string;
  /** The world's intro, sub-screen links and curated links (WorldHubHeader). */
  readonly header: ReactNode;
  /** Items and food carry subcategories + distance refinements. */
  readonly withRefinements?: boolean;
  /** Secondary line per card; defaults to the listing summary. */
  readonly rowMeta?: (item: MarketplaceBrowseRow) => string | null;
}

export function WorldFeedScreen({ worldSlug, header, withRefinements = false, rowMeta }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const feed = useWorldFeed(worldSlug);

  const emptyKey = feed.isError
    ? 'donations.worldFeed.loadFailed'
    : feed.searching
      ? 'donations.worldFeed.emptySearch'
      : feed.mode === 'seeker'
        ? 'donations.worldFeed.emptyOffers'
        : 'donations.worldFeed.emptyRequests';

  return (
    <Screen blobs="content" testID={`world-feed-${worldSlug}`}>
      <KcFlashList
        data={feed.rows}
        keyExtractor={(item) => item.listingId}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: inset, paddingTop: spacing.sm }}
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={feed.refetch} />}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={LIST_END_THRESHOLD}
        ListHeaderComponent={
          <>
            {header}
            <WorldFeedControls worldSlug={worldSlug} feed={feed} withRefinements={withRefinements} />
          </>
        }
        renderItem={({ item }) => (
          <View style={kcGridCell}>
            <ListingCard
              item={item}
              meta={rowMeta ? rowMeta(item) : undefined}
              onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}
            />
          </View>
        )}
        ListEmptyComponent={
          feed.isLoading ? null : (
            <Text style={styles.empty} testID="world-feed-empty">
              {t(emptyKey)}
            </Text>
          )
        }
      />
    </Screen>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const, padding: spacing.lg },
}));
