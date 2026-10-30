// Donation support card — warm CTA prompting the user to back the platform via
// Bit / Paybox. Embedded on About + Settings. Maps to FR-DONATE-010.
import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { warmPromptCardBase } from './warmPromptCardStyles';
import { KC_BIT_URL, KC_PAYBOX_URL } from '../config/kcSupportChannels';

export interface DonationSupportCardProps {
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

const useStyles = makeUseStyles((theme) => {
  const base = warmPromptCardBase(theme);
  const { colors, isDark } = theme;
  return {
  card: base.card,
  iconBadge: base.iconBadge,
  title: base.title,
  tagline: base.bodyLine,
  row: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: isDark ? 0 : 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: isDark ? 0 : 3,
  },
  btnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  btnText: {
    ...typography.button,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  btnTextPrimary: {
    color: colors.textInverse,
  },
  btnTextSecondary: {
    color: colors.primary,
  },
  };
});

export function DonationSupportCard({ style, testID }: DonationSupportCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();

  const openUrl = useCallback(
    async (url: string) => {
      const showError = () =>
        Alert.alert(
          t('donations.supportUs.linkErrorTitle'),
          t('donations.supportUs.linkErrorBody'),
        );
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          showError();
          return;
        }
        await Linking.openURL(url);
      } catch (err) {
        console.warn('[DonationSupportCard] failed to open url', url, err);
        showError();
      }
    },
    [t],
  );

  return (
    <View style={[styles.card, style]} testID={testID ?? 'donation-support-card'}>
      <View style={styles.iconBadge}>
        <Ionicons name="heart" size={26} color={colors.textInverse} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {t('donations.supportUs.title')}
      </Text>
      <Text style={styles.tagline}>{t('donations.supportUs.tagline')}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => openUrl(KC_BIT_URL)}
          accessibilityRole="button"
          accessibilityLabel={t('donations.supportUs.ctaBitA11y')}
          activeOpacity={0.85}
          testID="donation-support-card-bit"
        >
          <Text style={[styles.btnText, styles.btnTextPrimary]}>
            {t('donations.supportUs.ctaBit')}
          </Text>
          <Ionicons name="open-outline" size={16} color={colors.textInverse} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => openUrl(KC_PAYBOX_URL)}
          accessibilityRole="button"
          accessibilityLabel={t('donations.supportUs.ctaPayboxA11y')}
          activeOpacity={0.85}
          testID="donation-support-card-paybox"
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>
            {t('donations.supportUs.ctaPaybox')}
          </Text>
          <Ionicons name="open-outline" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
