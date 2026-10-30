// Generic two-button confirmation modal used by post-detail ⋮ menu actions
// (delete-owner, admin-remove, block).
import { Modal, View, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme, Text } from '@kc/ui';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { useModalHardwareBack } from '../../hooks/useModalHardwareBack';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Secondary action label (defaults to `general.cancel`). */
  cancelLabel?: string;
  /** When true, the confirm button is rendered in destructive (red) style. */
  destructive?: boolean;
  isBusy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel: cancelLabelProp,
  destructive = false,
  isBusy = false,
  errorMessage = null,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const styles = useConfirmActionModalStyles();
  const { colors } = useTheme();
  const cancelLabel = cancelLabelProp ?? t('general.cancel');
  useModalHardwareBack(visible, onCancel);
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnSecondary, isBusy && styles.btnDisabled]}
              disabled={isBusy}
              onPress={onCancel}
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.btnSecondaryText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                destructive ? styles.btnDestructive : styles.btnPrimary,
                isBusy && styles.btnDisabled,
              ]}
              disabled={isBusy}
              onPress={onConfirm}
              accessibilityLabel={confirmLabel}
            >
              {isBusy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useConfirmActionModalStyles = makeUseStyles(({ colors }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: colors.surfaceRaised, borderRadius: 12, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: rtlTextAlignStart },
  message: { fontSize: 15, color: colors.textSecondary, textAlign: rtlTextAlignStart, lineHeight: 22 },
  error: { fontSize: 13, color: colors.error, textAlign: rtlTextAlignStart },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnDestructive: { backgroundColor: colors.error },
  btnSecondary: { backgroundColor: colors.skeleton },
  btnPrimaryText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
  btnSecondaryText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
}));
