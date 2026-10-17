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

const useStyles = makeUseStyles(({ colors }) => ({
  ...worldHubBaseStyles(colors),
  urgent: { color: colors.error, fontWeight: '600' as const },
}));

type Props = {
  worldSlug: 'items' | 'food';
  icon: 'gift-outline' | 'restaurant-outline';
  introKey: 'givingHandoff.itemsHubIntro' | 'givingHandoff.foodHubIntro';
  handoffsPath: string;
  createPath: string;
};

export function WorldGivingHub({ worldSlug, icon, introKey, handoffsPath, createPath }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const listings = useQuery({
    queryKey: ['world-giving', worldSlug],
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
              <Pressable onPress={() => router.push(handoffsPath as never)}>
                <Text style={styles.link}>{t('givingHandoff.myHandoffs')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push(createPath as never)}>
                <Text style={styles.link}>{t('givingHandoff.createListing')}</Text>
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={{ padding: spacing.lg, textAlign: 'center' }}>
            {listings.isLoading ? '…' : t('marketplace.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}` as never)}
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>
              {worldSlug === 'food' && item.urgencyLevel >= 4
                ? `${t('givingHandoff.urgencyHigh')} · `
                : ''}
              {item.availabilityStatus} · {t(`marketplace.world.${worldSlug}`)}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
