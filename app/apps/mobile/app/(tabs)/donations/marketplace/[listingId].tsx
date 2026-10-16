import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { spacing } from '@kc/ui';
import { Screen } from '../../../../src/components/ui/Screen';
import { useMarketplaceListingDetail } from '../../../../src/hooks/useMarketplaceListingDetail';
import { MarketplaceListingDetailView } from '../../../../src/components/marketplace/MarketplaceListingDetailView';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';

export default function MarketplaceListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useTranslation();
  const inset = useShellTabBarScrollInset();
  const { data: detail, isLoading } = useMarketplaceListingDetail(listingId);

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('marketplace.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <MarketplaceListingDetailView detail={detail} bottomInset={inset} />
    </Screen>
  );
}
