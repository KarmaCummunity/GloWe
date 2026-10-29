// FR-AUTH-011 AC1 — bottom-sheet action picker for profile photo source.
// Camera button auto-hidden on web (no native camera).
import React from 'react';
import {
  Modal, Text, TouchableOpacity, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, typography, spacing, radius, shadow } from '@kc/ui';
import { useModalHardwareBack } from '../hooks/useModalHardwareBack';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';
import { isCameraAvailable, type AvatarSource } from '../services/avatarUpload';

interface Props {
  readonly visible: boolean;
  readonly canRemove: boolean;
  readonly onPick: (source: AvatarSource) => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}

export function PhotoSourceSheet({ visible, canRemove, onPick, onRemove, onClose }: Props) {
  const { t } = useTranslation();
  const styles = usePhotoSourceSheetStyles();
  useModalHardwareBack(visible, onClose);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('profile.photoSourceTitle')}</Text>

          {isCameraAvailable && (
            <TouchableOpacity
              style={styles.option}
              onPress={() => onPick('camera')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.photoSourceCameraA11y')}
            >
              <Text style={styles.optionText}>{t('profile.photoSourceCameraOption')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.option}
            onPress={() => onPick('gallery')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.photoSourceGalleryA11y')}
          >
            <Text style={styles.optionText}>{t('profile.photoSourceGalleryOption')}</Text>
          </TouchableOpacity>

          {canRemove && (
            <TouchableOpacity
              style={styles.option}
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={t('profile.photoSourceRemoveA11y')}
            >
              <Text style={[styles.optionText, styles.removeText]}>{t('profile.photoSourceRemoveOption')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.option, styles.cancel]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={[styles.optionText, styles.cancelText]}>{t('general.cancel')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const usePhotoSourceSheetStyles = makeUseStyles(({ colors }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
    ...shadow.card,
  },
  title: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  optionText: { ...typography.body, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  removeText: { color: colors.error },
  cancel: { backgroundColor: 'transparent', marginTop: spacing.xs },
  cancelText: { color: colors.textSecondary, textAlign: 'center' },
}));
