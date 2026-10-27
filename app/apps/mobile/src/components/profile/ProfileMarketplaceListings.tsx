import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { ProfileListingRow } from '@kc/domain';
import { useProfileMarketplaceListings } from '../../hooks/useMyMarketplaceListings';

const useStyles = makeUseStyles(({ colors }) => ({
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },
  row: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    marginBottom: spacing.sm,
  },
  rowTitle: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  empty: { ...typography.body, color: colors.textSecondary },
}));

export function ProfileMarketplaceListings({ ownerId }: { readonly ownerId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const { data: listings = [], isLoading } = useProfileMarketplaceListings(ownerId);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('marketplace.profileListingsTitle')}</Text>
      {isLoading ? (
        <Text style={styles.empty}>{t('marketplace.loading')}</Text>
      ) : listings.length === 0 ? (
        <Text style={styles.empty}>{t('marketplace.profileListingsEmpty')}</Text>
      ) : (
        listings.map((item: ProfileListingRow) => (
          <Pressable
            key={item.listingId}
            style={styles.row}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {t(`marketplace.world.${item.worldSlug}`, { defaultValue: item.worldSlug })} ·{' '}
              {item.direction === 'request' ? t('search.request') : t('search.give')}
              {item.status === 'closed' ? ` · ${t('marketplace.statusClosed')}` : ''}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}
