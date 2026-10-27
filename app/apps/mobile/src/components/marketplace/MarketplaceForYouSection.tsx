import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { useMarketplaceRecommendations } from '../../hooks/useMarketplaceBrowse';

const useStyles = makeUseStyles(({ colors }) => ({
  wrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },
  row: { paddingVertical: spacing.xs },
  link: { ...typography.body, color: colors.primary },
}));

export function MarketplaceForYouSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const { data: rows = [] } = useMarketplaceRecommendations(6);

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('marketplace.forYouTitle')}</Text>
      {rows.map((item) => (
        <Pressable
          key={item.listingId}
          style={styles.row}
          onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}
        >
          <Text style={styles.link}>{item.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}
