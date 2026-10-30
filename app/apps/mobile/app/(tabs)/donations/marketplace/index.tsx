import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ListingCard } from '../../../../src/components/cards/ListingCard';
import { kcGridCell } from '../../../../src/components/cards/KcCard.styles';
import { KcFlashList } from '../../../../src/components/lists/KcFlashList';
import { useRouter } from 'expo-router';
import { createRouteFor } from '../../../../src/lib/unifiedCreate/createCategories';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, Text, TextInput } from '@kc/ui';
import { MARKETPLACE_WORLD_SLUGS, isMarketplaceWorldLaunchEnabled } from '@kc/domain';
import { useRemoteAppFlags } from '../../../../src/hooks/useLaunchWorldFlags';
import { Screen } from '../../../../src/components/ui/Screen';
import { EmptyState, EmptyStateActions } from '../../../../src/components/EmptyState';
import { KcRefreshControl } from '../../../../src/components/lists/KcRefreshControl';
import {
  BrowseRefineChips,
  DEFAULT_BROWSE_RADIUS_KM,
} from '../../../../src/components/marketplace/BrowseRefineChips';
import {
  flattenPages,
  useMarketplaceBrowse,
  useMarketplaceSearchResults,
} from '../../../../src/hooks/useMarketplaceBrowse';
import { useDebouncedValue } from '../../../../src/hooks/useDebouncedValue';
import { LIST_END_THRESHOLD, usePrefetchNextPage } from '../../../../src/hooks/usePrefetchNextPage';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';

const useStyles = makeUseStyles(({ colors }) => ({
  filters: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm, padding: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
  },
  chipActive: { backgroundColor: colors.giveTagBg },
  chipText: { ...typography.caption, color: colors.textPrimary },
  search: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
  },
  row: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  refine: { gap: spacing.sm, paddingHorizontal: spacing.md },
  actions: { flexDirection: 'row' as const, gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.md },
  link: { ...typography.body, color: colors.primary },
}));

export default function MarketplaceBrowseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const remoteFlags = useRemoteAppFlags();
  const launchWorldSlugs = MARKETPLACE_WORLD_SLUGS.filter((slug) =>
    isMarketplaceWorldLaunchEnabled(slug, remoteFlags),
  );
  const [world, setWorld] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // KC#1102: world subcategory (items / food) and distance from home refine the browse list.
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_BROWSE_RADIUS_KM);
  const filters = useMemo(() => ({ worldSlug: world, categoryId, radiusKm }), [world, categoryId, radiusKm]);
  const selectWorld = (slug: string | null) => {
    setWorld(slug);
    setCategoryId(null); // a subcategory belongs to one world
  };
  const refined = categoryId !== null || radiusKm !== DEFAULT_BROWSE_RADIUS_KM;
  // Debounced so typing doesn't fire one hybrid search per keystroke.
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();
  const useSearch = trimmedQuery.length >= 2;
  const browse = useMarketplaceBrowse(filters);
  const search = useMarketplaceSearchResults(debouncedQuery, world);
  const active = useSearch ? search : browse;
  const rows = useMemo(() => flattenPages(active.data), [active.data]);
  const isLoading = active.isLoading;
  usePrefetchNextPage(active);
  const loadMore = () => {
    if (active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
  };
  const clearAll = () => {
    setQuery('');
    selectWorld(null);
    setRadiusKm(DEFAULT_BROWSE_RADIUS_KM);
  };

  return (
    <Screen>
      <Text style={{ ...typography.h2, padding: spacing.md, color: styles.title.color }}>
        {t('marketplace.browseTitle')}
      </Text>
      <TextInput
        style={styles.search}
        placeholder={t('marketplace.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel={t('marketplace.searchPlaceholder')}
      />
      <View style={styles.filters}>
        <Pressable style={[styles.chip, world === null && styles.chipActive]} onPress={() => selectWorld(null)}>
          <Text style={styles.chipText}>{t('marketplace.allWorlds')}</Text>
        </Pressable>
        {launchWorldSlugs.map((slug) => (
          <Pressable
            key={slug}
            style={[styles.chip, world === slug && styles.chipActive]}
            onPress={() => selectWorld(slug)}
          >
            <Text style={styles.chipText}>{t(`marketplace.world.${slug}`, { defaultValue: slug })}</Text>
          </Pressable>
        ))}
      </View>
      {/* Text search spans every subcategory and distance, so the refinements apply to browse only. */}
      {!useSearch ? (
        <View style={styles.refine}>
          <BrowseRefineChips
            worldSlug={world}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
          />
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/(tabs)/donations/marketplace/map')}>
          <Text style={styles.link}>{t('marketplace.openMap')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push(createRouteFor(world))}>
          <Text style={styles.link}>{t('marketplace.createListing')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/donations/marketplace/my-listings')}>
          <Text style={styles.link}>{t('marketplace.myListingsNav')}</Text>
        </Pressable>
      </View>
      <KcFlashList
        data={rows}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ paddingBottom: inset }}
        estimatedItemSize={72}
        onEndReached={loadMore}
        onEndReachedThreshold={LIST_END_THRESHOLD}
        refreshControl={
          <KcRefreshControl
            refreshing={active.isRefetching && !active.isFetchingNextPage}
            onRefresh={() => active.refetch()}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <Text style={{ padding: spacing.lg, textAlign: 'center' }}>{t('marketplace.loading')}</Text>
          ) : (
            <EmptyState
              icon={useSearch ? 'search-outline' : 'storefront-outline'}
              title={
                useSearch
                  ? t('emptyStates.marketplaceSearchTitle', { query: trimmedQuery })
                  : t('emptyStates.marketplaceTitle')
              }
              subtitle={t('emptyStates.marketplaceBody')}
              action={
                <EmptyStateActions
                  primary={{
                    label: t('emptyStates.marketplaceCreate'),
                    onPress: () => router.push(createRouteFor(world)),
                    testID: 'marketplace-empty-create',
                  }}
                  secondary={
                    useSearch || world || refined
                      ? { label: t('emptyStates.marketplaceClear'), onPress: clearAll, testID: 'marketplace-empty-clear' }
                      : undefined
                  }
                />
              }
            />
          )
        }
        numColumns={2}
        renderItem={({ item }) => (
          <View style={kcGridCell}>
          <ListingCard
            item={item}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}
          />
          </View>
        )}
      />
    </Screen>
  );
}
