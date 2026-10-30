// Thank-you modal — FR-RESEARCH-001 (public research finish), FR-SETTINGS-016 (in-app).
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, spacing, typography, useTheme, Text } from '@kc/ui';
import { webTextRtl, webViewRtl } from '../../lib/webRtlStyle';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

export type SurveyThankYouVariant = 'inApp' | 'publicResearch';

type Props = Readonly<{
  visible: boolean;
  variant: SurveyThankYouVariant;
  onDismiss: () => void;
  onShare?: () => void;
}>;

export function SurveyThankYouModal({
  visible,
  variant,
  onDismiss,
  onShare,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();

  const isPublic = variant === 'publicResearch';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, webViewRtl]}>
          <View style={styles.iconWrap}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>
            {isPublic ? t('research.thankYouModal.title') : t('survey.thankYouModal.title')}
          </Text>
          <Text style={styles.message}>
            {isPublic ? t('research.thankYouModal.message') : t('survey.thankYouModal.message')}
          </Text>

          {isPublic && onShare ? (
            <Pressable
              style={styles.primaryBtn}
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={t('research.share.endSurveyCta')}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.textInverse} />
              <Text style={styles.primaryBtnText}>{t('research.share.endSurveyCta')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={isPublic ? styles.secondaryBtn : styles.primaryBtn}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={
              isPublic ? t('research.thankYouModal.dismiss') : t('survey.thankYouModal.dismiss')
            }
          >
            <Text style={isPublic ? styles.secondaryBtnText : styles.primaryBtnText}>
              {isPublic ? t('research.thankYouModal.dismiss') : t('survey.thankYouModal.dismiss')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    lineHeight: 24,
    ...webTextRtl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.textInverse,
    fontWeight: '700',
    ...webTextRtl,
  },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    ...webTextRtl,
  },
}));
