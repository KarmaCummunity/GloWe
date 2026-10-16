import React, { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { MyListingRow } from '@kc/domain';
import { Screen } from '../../../../src/components/ui/Screen';
import {
  useInvalidateMyListings,
  useMyMarketplaceListings,
} from '../../../../src/hooks/useMyMarketplaceListings';
import { marketplaceRepository } from '../../../../src/services/marketplaceComposition';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';

const useStyles = makeUseStyles(({ colors }) => ({
  header: { padding: spacing.md, gap: spacing.xs },
  title: { ...typography.h2, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary },
  row: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  rowTitle: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  btn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, backgroundColor: colors.surfaceRaised },
  btnDanger: { backgroundColor: colors.errorLight },
  btnText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' as const },
}));

function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
}

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const { data: rows = [], isLoading, refetch } = useMyMarketplaceListings();
  const invalidate = useInvalidateMyListings();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(listingId: string, fn: () => Promise<void>) {
    setBusyId(listingId);
    try {
      await fn();
      await invalidate();
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  const renderActions = (item: MyListingRow) => {
    const busy = busyId === item.listingId;
    const repo = marketplaceRepository();
    return (
      <View style={styles.actions}>
        {item.status === 'open' || item.status === 'cancelled' ? (
          <Pressable
            style={styles.btn}
            disabled={busy}
            onPress={() => router.push(`/(tabs)/donations/marketplace/my-listings/edit/${item.listingId}`)}
          >
            <Text style={styles.btnText}>{t('marketplace.myListingsEdit')}</Text>
          </Pressable>
        ) : null}
        {item.status === 'open' ? (
          <>
            <Pressable
              style={styles.btn}
              disabled={busy}
              onPress={() => {
                void act(item.listingId, () => repo.pauseMyListing(item.listingId));
              }}
            >
              <Text style={styles.btnText}>{t('marketplace.myListingsPause')}</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              disabled={busy}
              onPress={async () => {
                const ok = await confirmAsync(
                  t('marketplace.myListingsFulfillTitle'),
                  t('marketplace.myListingsFulfillHint'),
                );
                if (ok) await act(item.listingId, () => repo.fulfillMyListing(item.listingId));
              }}
            >
              <Text style={styles.btnText}>{t('marketplace.myListingsFulfill')}</Text>
            </Pressable>
          </>
        ) : null}
        {item.status === 'cancelled' ? (
          <Pressable
            style={styles.btn}
            disabled={busy}
            onPress={() => {
              void act(item.listingId, () => repo.resumeMyListing(item.listingId));
            }}
          >
            <Text style={styles.btnText}>{t('marketplace.myListingsResume')}</Text>
          </Pressable>
        ) : null}
        {['open', 'cancelled', 'closed'].includes(item.status) ? (
          <Pressable
            style={[styles.btn, styles.btnDanger]}
            disabled={busy}
            onPress={async () => {
              const ok = await confirmAsync(
                t('marketplace.myListingsDeleteTitle'),
                t('marketplace.myListingsDeleteHint'),
              );
              if (ok) await act(item.listingId, () => repo.deleteMyListing(item.listingId));
            }}
          >
            <Text style={styles.btnText}>{t('marketplace.myListingsDelete')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t('marketplace.myListingsTitle')}</Text>
        <Text style={styles.hint}>{t('marketplace.myListingsSubtitle')}</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ paddingBottom: inset }}
        ListEmptyComponent={
          <Text style={{ padding: spacing.lg, textAlign: 'center' }}>
            {isLoading ? t('marketplace.loading') : t('marketplace.myListingsEmpty')}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.worldSlug} · {item.status} · {t('marketplace.myListingsUpdated', {
                  date: new Date(item.updatedAt).toLocaleDateString(),
                })}
              </Text>
            </Pressable>
            {renderActions(item)}
          </View>
        )}
      />
    </Screen>
  );
}
