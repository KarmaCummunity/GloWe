import React from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { spacing } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { MarketplaceCreateForm } from '../../../../../src/components/marketplace/MarketplaceCreateForm';
import { WorldLaunchGateBySlug } from '../../../../../src/components/worlds/WorldLaunchGate';

export default function MarketplaceCreateScreen() {
  const { worldSlug } = useLocalSearchParams<{ worldSlug: string }>();
  const router = useRouter();

  if (!worldSlug) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>—</Text>
      </Screen>
    );
  }

  return (
    <WorldLaunchGateBySlug worldSlug={worldSlug}>
      <Screen>
        <MarketplaceCreateForm
          worldSlug={worldSlug}
          onPublished={(id) => router.replace(`/(tabs)/donations/marketplace/${id}`)}
        />
      </Screen>
    </WorldLaunchGateBySlug>
  );
}
