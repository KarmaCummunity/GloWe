// Contributions grid — 2-col icon tiles with availability badges.
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, radius, useTheme, Text } from '@kc/ui';
import { aboutRtlText } from './aboutWebRtlStyle';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Item {
  readonly icon: IoniconName;
  readonly label: string;
  readonly available: boolean;
}

export function AboutContributionsGrid() {
  const { t } = useTranslation();
  const styles = useAboutContributionsGridStyles();
  const { colors } = useTheme();
  const items: Item[] = t('aboutContent.contributionsList', { returnObjects: true }) as Item[];

  return (
    <View style={styles.grid}>
      {items.map((it) => {
        const tileStyle = [styles.tile, it.available ? styles.tileActive : styles.tileSoon];
        const labelStyle = [
          styles.label,
          it.available ? styles.labelActive : styles.labelSoon,
        ];
        const badgeStyle = [styles.badge, it.available ? styles.badgeActive : styles.badgeSoon];
        const badgeTextStyle = [
          styles.badgeText,
          it.available ? styles.badgeTextActive : styles.badgeTextSoon,
        ];
        return (
          <View key={it.label} style={tileStyle}>
            <Ionicons
              name={it.icon}
              size={26}
              color={it.available ? colors.primary : colors.textDisabled}
            />
            <Text style={labelStyle} numberOfLines={2}>
              {it.label}
            </Text>
            <View style={badgeStyle}>
              <Text style={badgeTextStyle}>
                {it.available ? t('aboutContent.contributionsAvailableBadge') : t('aboutContent.contributionsComingSoonBadge')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useAboutContributionsGridStyles = makeUseStyles(({ colors }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '47.5%',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  tileActive: { backgroundColor: colors.primarySurface, borderColor: colors.primaryLight },
  tileSoon: { backgroundColor: colors.background, borderColor: colors.border },
  label: {
    ...typography.caption,
    ...aboutRtlText,
    fontWeight: '600',
    lineHeight: 16,
    width: '100%',
  },
  labelActive: { color: colors.textPrimary },
  labelSoon: { color: colors.textDisabled },
  badge: { borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeActive: { backgroundColor: colors.primary },
  badgeSoon: { backgroundColor: colors.border },
  badgeText: { fontSize: 10, fontWeight: '700', ...aboutRtlText },
  badgeTextActive: { color: colors.textInverse },
  badgeTextSoon: { color: colors.textDisabled },
}));
