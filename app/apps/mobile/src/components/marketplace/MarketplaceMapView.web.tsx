import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { marketplaceRepository } from '../../services/marketplaceComposition';

const useStyles = makeUseStyles(({ colors }) => ({
  wrap: { flex: 1, padding: spacing.md },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  row: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
}));

/** Web fallback when react-native-maps is unavailable. */
export function MarketplaceMapView() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const [clusters, setClusters] = useState<
    Awaited<ReturnType<typeof marketplaceRepository.prototype.mapClusters>>
  >([]);

  useEffect(() => {
    void marketplaceRepository()
      .mapClusters({ swLat: 31.7, swLng: 34.5, neLat: 32.2, neLng: 35.0 })
      .then(setClusters);
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.note}>{t('marketplace.mapWebFallback')}</Text>
      <FlatList
        data={clusters}
        keyExtractor={(c) => c.clusterKey}
        ListEmptyComponent={<Text style={{ padding: spacing.lg }}>{t('marketplace.mapEmpty')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (item.sampleListingId) {
                router.push(`/(tabs)/donations/marketplace/${item.sampleListingId}`);
              }
            }}
          >
            <Text style={styles.title}>{t('marketplace.clusterLabel', { count: item.listingCount })}</Text>
            <Text style={styles.meta}>
              {item.centerLat.toFixed(2)}, {item.centerLng.toFixed(2)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
