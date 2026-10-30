// Ride detail hero: origin → destination timeline, departure, seats, cost.
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, shadow, spacing, typography, useTheme, Text } from '@kc/ui';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { formatRideTime } from '../cards/ListingCard';

interface Props {
  details: Record<string, unknown>;
  direction: 'give' | 'request';
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function RideRouteCard({ details, direction }: Readonly<Props>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const origin = str(details['origin_label']) ?? t('cards.unknownPlace');
  const dest = str(details['dest_label']) ?? t('cards.unknownPlace');
  const when = formatRideTime(str(details['departs_at']));
  const seats = num(details['seats_available']) ?? num(details['passengers']);
  const cost = num(details['cost_share_ils']);
  const isFree = details['reward_model'] === 'free' || (direction === 'give' && cost == null);

  const chips: Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; text: string }> = [];
  if (when) chips.push({ icon: 'time-outline', text: when });
  if (seats != null) chips.push({ icon: 'people-outline', text: t(direction === 'request' ? 'cards.passengers' : 'cards.seats', { count: seats }) });
  if (direction === 'give') chips.push({ icon: 'wallet-outline', text: cost != null && cost > 0 ? t('cards.costShare', { amount: cost }) : t('cards.free') });
  if (isFree && direction !== 'give') chips.push({ icon: 'wallet-outline', text: t('cards.free') });

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Ionicons name="car" size={18} color={colors.primary} />
        <Text style={styles.badge}>{t(direction === 'request' ? 'cards.rideRequest' : 'cards.rideOffer')}</Text>
      </View>
      <View style={styles.timeline}>
        <View style={styles.rail}>
          <View style={[styles.dot, { borderColor: colors.primary }]} />
          <View style={[styles.line, { backgroundColor: colors.primaryLight }]} />
          <Ionicons name="location" size={18} color={colors.primary} />
        </View>
        <View style={styles.places}>
          <View>
            <Text style={styles.label}>{t('cards.from')}</Text>
            <Text style={styles.place} numberOfLines={2}>{origin}</Text>
          </View>
          <View>
            <Text style={styles.label}>{t('cards.to')}</Text>
            <Text style={styles.place} numberOfLines={2}>{dest}</Text>
          </View>
        </View>
      </View>
      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c.text} style={styles.chip}>
              <Ionicons name={c.icon} size={14} color={colors.textSecondary} />
              <Text style={styles.chipText}>{c.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
    ...shadow.card,
  },
  badgeRow: { flexDirection: rowDirectionStart, alignItems: 'center' as const, gap: spacing.xs },
  badge: { ...typography.label, fontWeight: '700' as const, color: colors.primary },
  timeline: { flexDirection: rowDirectionStart, gap: spacing.md },
  rail: { alignItems: 'center' as const, paddingVertical: 4, width: 20 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: colors.surface },
  line: { width: 2, flex: 1, minHeight: 28, marginVertical: 4 },
  places: { flex: 1, justifyContent: 'space-between' as const, gap: spacing.lg },
  label: { ...typography.caption, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  place: { ...typography.h4, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  chips: { flexDirection: rowDirectionStart, flexWrap: 'wrap' as const, gap: spacing.sm },
  chip: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
  },
  chipText: { ...typography.caption, color: colors.textPrimary },
}));
