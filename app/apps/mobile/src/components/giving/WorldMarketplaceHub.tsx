// Shared world hub: intro, quick links, optional extra header, and open "give" listings
// for one marketplace world (items, food, rides, knowledge).
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { KcFlashList } from '../lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing } from '@kc/ui';
import type { MarketplaceBrowseRow } from '@kc/domain';
import { Screen } from '../ui/Screen';
import { worldHubBaseStyles } from './worldHubStyles';
import { IconTile } from '../ui/IconTile';
import { marketplaceRepository } from '../../services/marketplaceComposition';
import { useShellTabBarScrollInset } from '../../navigation/useShellTabBarVisibility';
import { DonationLinksList } from '../DonationLinksList';
import { ListingCard } from '../cards/ListingCard';
import { kcGridCell } from '../cards/KcCard.styles';

const useStyles = makeUseStyles(({ colors }) => ({
  ...worldHubBaseStyles(colors),
  secondary: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  empty: { ...worldHubBaseStyles(colors).rowMeta, padding: spacing.lg, textAlign: 'center' as const },
}));

export type HubWorldSlug = 'rides' | 'knowledge' | 'items' | 'food';

export type WorldMarketplaceHubProps = {
  worldSlug: HubWorldSlug;
  icon: 'car-outline' | 'school-outline' | 'gift-outline' | 'restaurant-outline';
  introKey: string;
  createPath: string;
  /** i18n key for the create link (default `marketplace.createListing`). */
  createLabelKey?: string;
  linksCategory?: 'transport' | 'knowledge';
  handoffsPath?: string;
  /** Extra header content under the links (e.g. the rides route search). */
  headerExtra?: React.ReactNode;
  /** Secondary line per row; defaults to the listing summary. */
  rowMeta?: (item: MarketplaceBrowseRow) => string | null;
};

export function WorldMarketplaceHub({
  worldSlug, icon, introKey, createPath, createLabelKey, linksCategory, handoffsPath, headerExtra, rowMeta,
}: WorldMarketplaceHubProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const listings = useQuery({
    queryKey: ['world-hub', worldSlug],
    queryFn: () => marketplaceRepository().browse({ worldSlug, direction: 'give', limit: 40, offset: 0 }),
    staleTime: 30_000,
  });

  const header = (
    <>
      <View style={styles.hero}>
        <IconTile icon={icon} size="lg" />
        <Text style={styles.body}>{t(introKey)}</Text>
      </View>
      <View style={styles.links}>
        {handoffsPath ? (
          <Pressable onPress={() => router.push(handoffsPath as never)}>
            <Text style={styles.link}>{t('givingHandoff.myHandoffs')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push(createPath as never)}>
          <Text style={styles.link}>{t(createLabelKey ?? 'marketplace.createListing')}</Text>
        </Pressable>
      </View>
      {headerExtra}
      {linksCategory ? (
        <View style={styles.secondary}>
          <DonationLinksList categorySlug={linksCategory} />
        </View>
      ) : null}
    </>
  );

  return (
    <Screen blobs="content">
      <KcFlashList
        data={listings.data ?? []}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ paddingBottom: inset, paddingTop: spacing.sm }}
        ListHeaderComponent={header}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={kcGridCell}>
          <ListingCard
            item={item}
            meta={rowMeta ? rowMeta(item) : undefined}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}` as never)}
          />
          </View>
        )}
        ListEmptyComponent={
          listings.isLoading ? null : <Text style={styles.empty}>{t('marketplace.empty')}</Text>
        }
      />
    </Screen>
  );
}
