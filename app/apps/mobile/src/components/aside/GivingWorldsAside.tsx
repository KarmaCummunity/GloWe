// Home-feed aside — quick links into the giving worlds (FR-RESP-003).
// Curated subset of the Donations Hub tiles; reuses the hub's i18n keys.
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { AsideCard } from './AsideCard';

type WorldLink = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  href: string;
};

const WORLDS: WorldLink[] = [
  { key: 'time', icon: 'time-outline', titleKey: 'donations.time.title', href: '/(tabs)/donations/time' },
  { key: 'money', icon: 'cash-outline', titleKey: 'donations.money.title', href: '/(tabs)/donations/money' },
  { key: 'food', icon: 'restaurant-outline', titleKey: 'donations.categories.food.title', href: '/(tabs)/donations/category/food' },
  { key: 'medical', icon: 'medical-outline', titleKey: 'donations.categories.medical.title', href: '/(tabs)/donations/category/medical' },
];

export function GivingWorldsAside() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <AsideCard title={t('aside.givingWorldsTitle')}>
      {WORLDS.map((world) => (
        <TouchableOpacity
          key={world.key}
          style={styles.row}
          accessibilityRole="button"
          testID={`aside-world-${world.key}`}
          onPress={() => router.push(world.href)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={world.icon} size={16} color={colors.primary} />
          </View>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {t(world.titleKey)}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.row}
        accessibilityRole="button"
        testID="aside-follow-suggestions"
        onPress={() => router.push('/follow/suggestions')}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="person-add-outline" size={16} color={colors.primary} />
        </View>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {t('follow.suggestionsTitle')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        testID="aside-world-all"
        onPress={() => router.push('/(tabs)/donations')}
      >
        <Text style={styles.allLink}>{t('aside.givingWorldsAll')}</Text>
      </TouchableOpacity>
    </AsideCard>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: rtlTextAlignStart,
  },
  allLink: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: rtlTextAlignStart,
  },
}));
