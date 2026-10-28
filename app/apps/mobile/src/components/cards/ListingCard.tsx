// Unified card for marketplace listings (items, food, rides, knowledge, ...).
// Visual language matches PostCardGrid: icon area, type badge, title, meta row.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { MarketplaceBrowseRow } from '@kc/domain';
import { makeUseStyles, radius, shadow, spacing, typography, useTheme } from '@kc/ui';
import { cleanDisplayTitle } from '../../lib/displayTitle';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const WORLD_ICON: Record<string, IconName> = {
  rides: 'car-outline',
  food: 'restaurant-outline',
  items: 'gift-outline',
  knowledge: 'school-outline',
  time: 'time-outline',
  money: 'cash-outline',
};

export function listingWorldIcon(worldSlug: string): IconName {
  return WORLD_ICON[worldSlug] ?? 'pricetag-outline';
}

interface Props {
  item: MarketplaceBrowseRow;
  onPress: () => void;
  /** 'row' = full-width list card; 'tile' = fixed-width card for horizontal carousels. */
  variant?: 'row' | 'tile';
  /** Optional secondary line (defaults to summary). */
  meta?: string | null;
}

function ListingCardInner({ item, onPress, variant = 'row', meta }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const isRequest = item.direction === 'request';
  const accent = isRequest ? colors.secondary : colors.primary;
  const title = cleanDisplayTitle(item.title);
  const secondary = meta === undefined ? item.summary : meta;
  const worldLabel = t(`marketplace.world.${item.worldSlug}`, { defaultValue: item.worldSlug });
  const badge = isRequest ? t('feed.requestTypeShort') : t('feed.giveTypeShort');
  const isTile = variant === 'tile';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.card, isTile ? styles.tile : styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconArea, isTile && styles.iconAreaTile, { backgroundColor: `${accent}1A` }]}>
        <Ionicons name={listingWorldIcon(item.worldSlug)} size={isTile ? 30 : 26} color={accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
          <Text style={styles.world} numberOfLines={1}>{worldLabel}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {secondary ? <Text style={styles.meta} numberOfLines={isTile ? 1 : 2}>{cleanDisplayTitle(secondary)}</Text> : null}
        {item.distanceKm != null ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.metaSmall}>{t('marketplace.distanceKm', { km: item.distanceKm.toFixed(1), defaultValue: `${item.distanceKm.toFixed(1)} ק"מ` })}</Text>
          </View>
        ) : null}
      </View>
      {!isTile ? <Ionicons name="chevron-back" size={18} color={colors.textDisabled} /> : null}
    </Pressable>
  );
}

export const ListingCard = React.memo(ListingCardInner);

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tile: { width: 220, padding: spacing.md, gap: spacing.sm },
  pressed: { opacity: 0.85 },
  iconArea: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconAreaTile: { width: '100%' as const, height: 72 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  badgeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { ...typography.label, fontSize: 10, fontWeight: '700' as const, color: colors.textInverse },
  world: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  title: { ...typography.body, fontWeight: '700' as const, color: colors.textPrimary, textAlign: 'right' as const },
  meta: { ...typography.caption, color: colors.textSecondary, textAlign: 'right' as const },
  metaRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3 },
  metaSmall: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
}));
