// FR-KARMA-007 — self-only karma number + "how to earn" explainer.
import React, { useState } from 'react';
import { Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { rowDirectionStart, selfAlignStart } from '../../lib/rtlLayout';

export function KarmaBadge({ points }: { readonly points: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useKarmaBadgeStyles();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <TouchableOpacity
        style={styles.badge}
        onPress={() => router.push('/karma-history' as never)}
        accessibilityRole="button"
        accessibilityHint={t('karma.historyOpen')}
      >
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.points}>{points}</Text>
        <Text style={styles.label}>{t('karma.badgeLabel')}</Text>
        <TouchableOpacity onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('karma.howToEarnTitle')}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('karma.howToEarnTitle')}</Text>
            <Text style={styles.sheetIntro}>{t('karma.howToEarnIntro')}</Text>
            {(['earnRegistration', 'earnPost', 'earnOutreach', 'earnFollower', 'earnClosure'] as const).map((k) => (
              <Text key={k} style={styles.rule}>• {t(`karma.${k}`)}</Text>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>{t('karma.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useKarmaBadgeStyles = makeUseStyles(({ colors }) => ({
  badge: {
    // Lay the row from the reading-start edge so the number reads before the
    // label in both Hebrew (RTL) and English (LTR). rowDirectionStart avoids the
    // native forceRTL double-flip a raw 'row-reverse' triggers (see lib/rtlLayout.ts).
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: spacing.xs,
    // Hug the reading-start edge: right in Hebrew (RTL), left in English (LTR).
    alignSelf: selfAlignStart,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  points: { ...typography.h4, color: colors.primary },
  label: { ...typography.caption, color: colors.textPrimary },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center' as const,
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'right' as const },
  sheetIntro: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'right' as const,
    marginBottom: spacing.xs,
  },
  rule: { ...typography.body, color: colors.textPrimary, textAlign: 'right' as const },
  closeBtn: {
    marginTop: spacing.base,
    alignSelf: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  closeText: { ...typography.button, color: colors.primary },
}));
