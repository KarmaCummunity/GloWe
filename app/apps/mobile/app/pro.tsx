// Pro paywall — stub behind feature flag `pro_paywall` (default off). Products attach once pricing is decided.
import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@kc/ui';
import { useTranslation } from 'react-i18next';
import { useFeatureFlag } from '../src/hooks/useFeatureFlag';

export default function ProPaywallScreen() {
  const { t } = useTranslation();
  const enabled = useFeatureFlag('pro_paywall');
  if (!enabled) return <Redirect href="/" />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 8 }}>{t('karma.proTitle')}</Text>
      <Text style={{ textAlign: 'center' }}>{t('karma.proComingSoon')}</Text>
    </View>
  );
}
