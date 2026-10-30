// FR-RIDE-026..029, FR-RIDE-044 — compact chips summarizing a ride's
// advanced settings. Rendered on RideCard + RideDetailScreen so users can
// scan capacity / payment / requirements at a glance.
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { RideListingRow } from '@kc/application';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';

import { rowDirectionStart } from '../../../lib/rtlLayout';

interface Props {
  readonly ride: RideListingRow;
  /** Display style: `compact` for card (icon + short label), `full` for detail. */
  readonly variant?: 'compact' | 'full';
}

export function RideAdvancedChips({ ride, variant = 'compact' }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();

  const chips: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap; label: string; tint?: string }> = [];

  // FR-RIDE-026 — cargo.
  if (ride.cargoEnabled) {
    chips.push({
      key: 'cargo',
      icon: 'cube-outline',
      label:
        variant === 'compact'
          ? t('donations.rides.chips.cargo')
          : t('donations.rides.chips.cargoFull', {
              volume: ride.cargoMaxVolumeL ?? 0,
              weight: ride.cargoMaxWeightKg ?? 0,
            }),
    });
  }

  // FR-RIDE-027 — food shipping.
  if (ride.foodShippingEnabled) {
    chips.push({
      key: 'food',
      icon: ride.foodChilled ? 'snow-outline' : 'restaurant-outline',
      label:
        variant === 'compact'
          ? t('donations.rides.chips.food')
          : t('donations.rides.chips.foodFull', {
              kg: ride.foodMaxKg ?? 0,
              chilled: ride.foodChilled ? t('donations.rides.chips.foodChilled') : '',
            }),
    });
  }

  // FR-RIDE-028 — payment.
  if (ride.paymentModel === 'expense_share' && ride.paymentAmountIls != null) {
    chips.push({
      key: 'payment',
      icon: 'cash-outline',
      label: t('donations.rides.chips.payment', { amount: ride.paymentAmountIls }),
      tint: colors.warning,
    });
  }

  // FR-RIDE-029 — passenger requirements.
  if (ride.reqGender === 'women_only') {
    chips.push({ key: 'gender-w', icon: 'female-outline', label: t('donations.rides.chips.womenOnly') });
  } else if (ride.reqGender === 'men_only') {
    chips.push({ key: 'gender-m', icon: 'male-outline', label: t('donations.rides.chips.menOnly') });
  }
  if (!ride.reqSmokingAllowed && variant === 'full') {
    chips.push({ key: 'no-smoke', icon: 'ban-outline', label: t('donations.rides.chips.noSmoking') });
  }
  if (ride.reqPetsAllowed && variant === 'full') {
    chips.push({ key: 'pets', icon: 'paw-outline', label: t('donations.rides.chips.petsOk') });
  }
  if (ride.reqVerifiedOnly) {
    chips.push({ key: 'verified', icon: 'shield-checkmark-outline', label: t('donations.rides.chips.verifiedOnly') });
  }

  // FR-RIDE-044 — cross-world link.
  if (ride.linkedPostId) {
    chips.push({
      key: 'linked',
      icon: 'link-outline',
      label: t('donations.rides.chips.linkedItem'),
      tint: colors.primary,
    });
  }

  if (chips.length === 0) return null;

  return (
    <View style={styles.row}>
      {chips.map((c) => (
        <View key={c.key} style={styles.chip}>
          <Ionicons name={c.icon} size={12} color={c.tint ?? colors.textSecondary} />
          <Text
            style={[styles.chipText, c.tint ? { color: c.tint } : null]}
            numberOfLines={1}
          >
            {c.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row: {
    flexDirection: rowDirectionStart,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 4,
  },
  chip: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.skeleton,
    borderRadius: radius.full,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
}));
