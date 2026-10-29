import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MARKETPLACE_CREATE_WORLD_SLUGS, isMarketplaceWorldLaunchEnabled } from '@kc/domain';
import { useRemoteAppFlags } from '../../../../../src/hooks/useLaunchWorldFlags';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  row: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.bodyLarge, color: colors.textPrimary },
}));

export default function MarketplaceCreateHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const remoteFlags = useRemoteAppFlags();
  const createWorlds = MARKETPLACE_CREATE_WORLD_SLUGS.filter((slug) =>
    isMarketplaceWorldLaunchEnabled(slug, remoteFlags),
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={typography.h2}>{t('marketplace.createHubTitle')}</Text>
        {createWorlds.map((slug) => (
          <Pressable
            key={slug}
            style={styles.row}
            onPress={() => router.push(`/(tabs)/donations/marketplace/create/${slug}`)}
          >
            <Text style={styles.title}>{t(`marketplace.world.${slug}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
