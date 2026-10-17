import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { KcFlashList } from '../../../../src/components/lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { MARKETPLACE_WORLD_SLUGS } from '@kc/domain';
import { Screen } from '../../../../src/components/ui/Screen';
import {
  useMarketplaceBrowse,
  useMarketplaceSearchResults,
} from '../../../../src/hooks/useMarketplaceBrowse';
import { useShellTabBarScrollInset } from '../../../../src/navigation/useShellTabBarVisibility';

const useStyles = makeUseStyles(({ colors }) => ({
  filters: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm, padding: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  chipActive: { backgroundColor: colors.giveTagBg },
  chipText: { ...typography.caption, color: colors.textPrimary },
  search: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
  },
  row: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row' as const, gap: spacing.md, marginTop: spacing.md, paddingHorizontal: spacing.md },
  link: { ...typography.body, color: colors.primary },
}));

export default function MarketplaceBrowseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const inset = useShellTabBarScrollInset();
  const [world, setWorld] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const filters = useMemo(
    () => ({ worldSlug: world, limit: 30, offset: 0 }),
    [world],
  );
  const trimmedQuery = query.trim();
  const useSearch = trimmedQuery.length >= 2;
  const browse = useMarketplaceBrowse(filters);
  const search = useMarketplaceSearchResults(query, world);
  const rows = useSearch ? (search.data ?? []) : (browse.data ?? []);
  const isLoading = useSearch ? search.isLoading : browse.isLoading;

  return (
    <Screen>
      <Text style={{ ...typography.h2, padding: spacing.md, color: styles.title.color }}>
        {t('marketplace.browseTitle')}
      </Text>
      <TextInput
        style={styles.search}
        placeholder={t('marketplace.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel={t('marketplace.searchPlaceholder')}
      />
      <View style={styles.filters}>
        <Pressable style={[styles.chip, world === null && styles.chipActive]} onPress={() => setWorld(null)}>
          <Text style={styles.chipText}>{t('marketplace.allWorlds')}</Text>
        </Pressable>
        {MARKETPLACE_WORLD_SLUGS.map((slug) => (
          <Pressable
            key={slug}
            style={[styles.chip, world === slug && styles.chipActive]}
            onPress={() => setWorld(slug)}
          >
            <Text style={styles.chipText}>{t(`marketplace.world.${slug}`, { defaultValue: slug })}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/(tabs)/donations/marketplace/map')}>
          <Text style={styles.link}>{t('marketplace.openMap')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/donations/marketplace/create')}>
          <Text style={styles.link}>{t('marketplace.createListing')}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/donations/marketplace/my-listings')}>
          <Text style={styles.link}>{t('marketplace.myListingsNav')}</Text>
        </Pressable>
      </View>
      <KcFlashList
        data={rows}
        keyExtractor={(item) => item.listingId}
        contentContainerStyle={{ paddingBottom: inset }}
        ListEmptyComponent={
          <Text style={{ padding: spacing.lg, textAlign: 'center' }}>
            {isLoading ? t('marketplace.loading') : t('marketplace.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {t(`marketplace.world.${item.worldSlug}`, { defaultValue: item.worldSlug })} ·{' '}
              {item.direction === 'request' ? t('search.request') : t('search.give')}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
