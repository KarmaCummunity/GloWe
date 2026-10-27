import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, radius, useTheme } from '@kc/ui';
import { aboutRtlText, aboutRtlRow } from './aboutWebRtlStyle';

export function AboutVisionSection() {
  const { t } = useTranslation();
  const styles = useAboutVisionSectionStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const purpose = t('aboutContent.visionPurposeItems', { returnObjects: true }) as string[];

  const toggle = useCallback(() => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  }, []);

  return (
    <View>
      <Text style={styles.h}>{t('aboutContent.visionTitle')}</Text>
      <Text style={styles.lead}>{t('aboutContent.visionLead')}</Text>

      <Text style={styles.subh}>{t('aboutContent.visionPurposeTitle')}</Text>
      <View style={styles.ol}>
        {purpose.map((line, i) => (
          <View key={line} style={styles.olRow}>
            <View style={styles.olBadge}>
              <Text style={styles.olNum}>{i + 1}</Text>
            </View>
            <Text style={styles.olText}>{line}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.subh}>{t('aboutContent.visionBusinessTitle')}</Text>
      <Text style={styles.p}>{t('aboutContent.visionBusinessBody')}</Text>

      <Text style={styles.subh}>{t('aboutContent.visionBridgeTitle')}</Text>
      <Text style={styles.p}>{t('aboutContent.visionBridgeBody')}</Text>

      <Pressable
        style={styles.expandHead}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.secondary} />
        <Text style={styles.expandTitle}>{t('aboutContent.visionExpandTitle')}</Text>
      </Pressable>
      {open ? <Text style={styles.expandBody}>{t('aboutContent.visionExpandBody')}</Text> : null}
    </View>
  );
}

const BADGE = 24;
const useAboutVisionSectionStyles = makeUseStyles(({ colors }) => ({
  h: { ...typography.h4, color: colors.textPrimary, ...aboutRtlText, marginBottom: spacing.sm },
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    ...aboutRtlText,
    lineHeight: 24,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  subh: {
    ...typography.label,
    color: colors.secondary,
    ...aboutRtlText,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    fontWeight: '800',
  },
  p: { ...typography.body, color: colors.textSecondary, ...aboutRtlText, lineHeight: 24 },
  ol: { gap: spacing.sm, marginTop: spacing.xs },
  olRow: { flexDirection: aboutRtlRow, alignItems: 'flex-start', gap: spacing.sm },
  olBadge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  olNum: { ...typography.caption, color: colors.primary, fontWeight: '800' },
  olText: { flex: 1, ...typography.body, color: colors.textPrimary, ...aboutRtlText, lineHeight: 22 },
  expandHead: {
    flexDirection: aboutRtlRow,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.secondaryLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandTitle: {
    ...typography.body,
    flex: 1,
    ...aboutRtlText,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  expandBody: {
    ...typography.body,
    color: colors.textSecondary,
    ...aboutRtlText,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
}));
