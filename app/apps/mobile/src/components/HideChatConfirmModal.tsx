// FR-CHAT-016 — confirm before removing a thread from the viewer's inbox only.
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, typography, spacing, radius, useTheme } from '@kc/ui';
import { useModalHardwareBack } from '../hooks/useModalHardwareBack';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';

interface Props {
  readonly visible: boolean;
  readonly loading: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function HideChatConfirmModal({ visible, loading, onCancel, onConfirm }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  useModalHardwareBack(visible && !loading, onCancel);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('chat.hideFromInboxTitle')}</Text>
          <Text style={styles.body}>{t('chat.hideFromInboxBody')}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelTxt}>{t('chat.hideFromInboxCancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.confirmTxt}>{t('chat.hideFromInboxConfirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,

    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  body: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelTxt: { ...typography.body, color: colors.textSecondary },
  confirmBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmTxt: { ...typography.semiBold, color: colors.textInverse },
}));
