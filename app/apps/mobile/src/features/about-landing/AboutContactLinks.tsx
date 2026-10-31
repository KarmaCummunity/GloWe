import React, { useCallback, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, radius, useTheme, Text } from '@kc/ui';
import {
  ABOUT_DONATION_PHONE_DISPLAY,
  ABOUT_EMAIL_NAVE,
  ABOUT_INSTAGRAM_PROFILE_URL,
  ABOUT_WHATSAPP_GROUP_URL,
  ABOUT_WHATSAPP_PERSONAL_WA_ME_BASE,
} from './aboutExternalLinks';
import { aboutOpenExternalUrl } from './aboutOpenExternalUrl';
import { aboutRtlText, aboutRtlRow } from './aboutWebRtlStyle';

type Row = {
  readonly key: string;
  readonly label: string;
  readonly url: string;
  readonly icon: React.ComponentProps<typeof Ionicons>['name'];
};

export function AboutContactLinks() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useAboutContactLinksStyles();
  const { colors } = useTheme();

  const open = useCallback(
    async (url: string) => {
      await aboutOpenExternalUrl(url, t('aboutContent.contactLinkError'));
    },
    [t],
  );

  const rows: Row[] = useMemo(() => {
    const mailSubject = encodeURIComponent(t('aboutContent.contactMailSubjectDefault'));
    const mailtoNave = `mailto:${ABOUT_EMAIL_NAVE}?subject=${mailSubject}`;
    const waPersonal = `${ABOUT_WHATSAPP_PERSONAL_WA_ME_BASE}?text=${encodeURIComponent(
      t('aboutContent.contactWhatsappPersonalPrefill'),
    )}`;
    return [
      {
        key: 'waG',
        label: t('aboutContent.contactWhatsappGroupLabel'),
        url: ABOUT_WHATSAPP_GROUP_URL,
        icon: 'logo-whatsapp',
      },
      {
        key: 'waP',
        label: t('aboutContent.contactWhatsappPersonalLabel'),
        url: waPersonal,
        icon: 'chatbubble-ellipses-outline',
      },
      { key: 'm1', label: t('aboutContent.contactEmailNaveLabel'), url: mailtoNave, icon: 'mail-outline' },
      { key: 'ig', label: t('aboutContent.instagramOpen'), url: ABOUT_INSTAGRAM_PROFILE_URL, icon: 'logo-instagram' },
    ];
  }, [t]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>{t('aboutContent.contactChannelsTitle')}</Text>
      {rows.map((r) => (
        <Pressable
          key={r.key}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => void open(r.url)}
          accessibilityRole="link"
          accessibilityLabel={r.label}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textDisabled} />
          <Text style={styles.label}>{r.label}</Text>
          <Ionicons name={r.icon} size={22} color={colors.primary} />
        </Pressable>
      ))}

      <View style={styles.donation}>
        <Text style={styles.donationH}>{t('aboutContent.contactDonationTitle')}</Text>
        <Text style={styles.donationP}>{t('aboutContent.contactDonationNote')}</Text>
        <Text style={styles.mono}>{ABOUT_DONATION_PHONE_DISPLAY}</Text>
      </View>

      <Text style={styles.support}>{t('aboutContent.contactSupportRow')}</Text>

      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={() => router.push('/settings/report-issue')}
        accessibilityRole="button"
      >
        <Ionicons name="chatbubbles-outline" size={20} color={colors.textInverse} />
        <Text style={styles.ctaText}>{t('aboutContent.contactCta')}</Text>
      </Pressable>
    </View>
  );
}

const useAboutContactLinksStyles = makeUseStyles(({ colors }) => ({
  wrap: { gap: spacing.sm },
  h: { ...typography.h4, color: colors.textPrimary, ...aboutRtlText, marginBottom: spacing.sm },
  row: {
    flexDirection: aboutRtlRow,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  rowPressed: { opacity: 0.92, backgroundColor: colors.primarySurface },
  label: { flex: 1, ...typography.body, color: colors.textPrimary, ...aboutRtlText, fontWeight: '600' },
  donation: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.xs,
  },
  donationH: { ...typography.label, color: colors.textPrimary, ...aboutRtlText, fontWeight: '800' },
  donationP: { ...typography.body, color: colors.textSecondary, ...aboutRtlText, lineHeight: 22 },
  mono: { ...typography.h4, color: colors.textPrimary, ...aboutRtlText, fontWeight: '800', letterSpacing: 1 },
  support: {
    ...typography.caption,
    color: colors.textSecondary,
    ...aboutRtlText,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  cta: {
    flexDirection: aboutRtlRow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: { ...typography.button, color: colors.textInverse, ...aboutRtlText },
}));
