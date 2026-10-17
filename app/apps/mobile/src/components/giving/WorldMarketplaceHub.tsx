import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { KcFlashList } from '../lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing } from '@kc/ui';
import { Screen } from '../ui/Screen';
import { worldHubBaseStyles } from './worldHubStyles';
import { IconTile } from '../ui/IconTile';
import { marketplaceRepository } from '../../services/marketplaceComposition';
import { useShellTabBarScrollInset } from '../../navigation/useShellTabBarVisibility';
import { DonationLinksList } from '../DonationLinksList';

const useStyles = makeUseStyles(({ colors }) => ({
  ...worldHubBaseStyles(colors),
  secondary: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  empty: { ...worldHubBaseStyles(colors).rowMeta, padding: spacing.lg, textAlign: 'center' as const },
}));

type WorldSlug = 'rides' | 'knowledge' | 'items' | 'food';

type Props = {
  worldSlug: WorldSlug;
  icon: 'car-outline' | 'school-outline' | 'gift-outline' | 'restaurant-outline';
  introKey: string;
  createPath: string;
  linksCategory?: 'transport' | 'knowledge';
  handoffsPath?: string;
  /** Extra header content under the links (e.g. the rides route search). */
  headerExtra?: React.ReactNode;
};

export function WorldMarketplaceHub({
  worldSlug, icon, introKey, createPath, linksCategory, handoffsPath, headerExtra,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const listings = useQuery({
    queryKey: ['world-hub', worldSlug],
    queryFn: () =>
      marketplaceRepository().browse({
        worldSlug,
        direction: 'give',
        limit: 40,
        offset: 0,
      }),
    staleTime: 30_000,
  });

  return (
    <Screen blobs="content">
      <KcFlashList
        data={listings.data ?? []}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ paddingBottom: inset }}
        ListHeaderComponent={
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
                <Text style={styles.link}>{t('marketplace.createListing')}</Text>
              </Pressable>
            </View>
            {headerExtra}
            {linksCategory ? (
              <View style={styles.secondary}>
                <DonationLinksList categorySlug={linksCategory} />
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/donations/marketplace/[listingId]',
                params: { listingId: item.listingId },
              } as never)
            }
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.summary ? <Text style={styles.rowMeta}>{item.summary}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          listings.isLoading ? null : (
            <Text style={styles.empty}>{t('marketplace.empty', { defaultValue: 'No open listings yet.' })}</Text>
          )
        }
      />
    </Screen>
  );
}
