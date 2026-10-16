import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { MarketplaceBrowseRow } from '@kc/domain';
import { Screen } from '../../../../src/components/ui/Screen';
import { marketplaceRepository } from '../../../../src/services/marketplaceComposition';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary },
  summary: { ...typography.body, color: colors.textSecondary },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  btn: { padding: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceRaised },
  btnText: { ...typography.body, color: colors.textPrimary, textAlign: 'center' as const },
}));

export default function MarketplaceListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const [row, setRow] = useState<MarketplaceBrowseRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listingId) return;
    void marketplaceRepository()
      .getListingCard(listingId)
      .then((r) => {
        setRow(r);
        if (r) void marketplaceRepository().recordSignal(r.listingId, 'view');
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  if (!row) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('marketplace.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: inset }]}>
        <Text style={styles.title}>{row.title}</Text>
        {row.summary ? <Text style={styles.summary}>{row.summary}</Text> : null}
        <Text style={styles.summary}>
          {row.worldSlug} · {row.kindSlug} · {row.direction}
        </Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.btn}
            onPress={async () => {
              const chatId = await marketplaceRepository().startChat(row.listingId, t('marketplace.chatOpener'));
              router.push(`/chat/${chatId}`);
            }}
          >
            <Text style={styles.btnText}>{t('marketplace.startChat')}</Text>
          </Pressable>
          <Pressable
            style={styles.btn}
            onPress={async () => {
              const postId = await marketplaceRepository().shareToFeed(row.listingId);
              router.push(`/post/${postId}`);
            }}
          >
            <Text style={styles.btnText}>{t('marketplace.shareFeed')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
