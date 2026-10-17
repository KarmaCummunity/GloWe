import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, typography } from '@kc/ui';
import { Screen } from '../../../../src/components/ui/Screen';
import { MarketplaceMapView } from '../../../../src/components/marketplace/MarketplaceMapView';

export default function MarketplaceMapScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Text style={{ ...typography.h2, padding: spacing.md }}>{t('marketplace.mapTitle')}</Text>
      <MarketplaceMapView />
    </Screen>
  );
}
