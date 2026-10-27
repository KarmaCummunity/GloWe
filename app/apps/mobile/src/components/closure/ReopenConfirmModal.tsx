// FR-CLOSURE-005 AC2 — confirmation modal for reopening a closed post.
// Copy varies on TWO axes:
//   1. status:  closed_delivered (with consequences) vs deleted_no_recipient (cancel cleanup)
//   2. type:    Give (owner gave / marked received) vs Request (owner received / marked gave)
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme } from '@kc/ui';
import type { PostType } from '@kc/domain';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { useModalHardwareBack } from '../../hooks/useModalHardwareBack';

interface Props {
  visible: boolean;
  variant: 'closed_delivered' | 'deleted_no_recipient';
  postType: PostType;
  isBusy: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReopenConfirmModal({
  visible,
  variant,
  postType,
  isBusy,
  errorMessage,
  onCancel,
  onConfirm,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const give = postType === 'Give';
  // Marked-user direction depends on post type (see RecipientCallout for the
  // same convention). The DB columns lag this naming for Request posts.
  const markedSideLabel = give ? t('closure.markedSideGive') : t('closure.markedSideRequest');
  const ownerCounter = give ? t('closure.counterDonated') : t('closure.counterReceived');
  const markedCounter = give ? t('closure.counterReceived') : t('closure.counterDonated');

  useModalHardwareBack(visible && !isBusy, onCancel);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('closure.itemNotDeliveredModalTitle')}</Text>
          {variant === 'closed_delivered' ? (
            <View>
              <Text style={styles.body}>{t('closure.reopenBodyClosedDelivered')}</Text>
              <Text style={styles.bullet}>{t('closure.reopenBulletMarkedRemoved', { markedSide: markedSideLabel })}</Text>
              <Text style={styles.bullet}>{t('closure.reopenBulletMarkedCounter', { counter: markedCounter })}</Text>
              <Text style={styles.bullet}>{t('closure.reopenBulletOwnerCounter', { counter: ownerCounter })}</Text>
            </View>
          ) : (
            <Text style={styles.body}>{t('closure.reopenBodyDeletedNoRecipient')}</Text>
          )}

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={isBusy} style={[styles.btn, styles.btnSecondary]}>
              <Text style={styles.btnSecondaryText}>{t('general.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={isBusy}
              style={[styles.btn, styles.btnPrimary, isBusy && styles.btnDisabled]}
            >
              {isBusy ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.btnPrimaryText}>{t('closure.reopenConfirmCta')}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.surface,

    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 440,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: rtlTextAlignStart, marginBottom: 12, color: colors.textPrimary },
  body: { fontSize: 15, color: colors.textPrimary, textAlign: rtlTextAlignStart, marginBottom: 8 },
  bullet: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    marginBottom: 8,
    lineHeight: 22,
  },
  error: {
    fontSize: 14,
    color: colors.error,
    textAlign: rtlTextAlignStart,
    marginTop: 8,
  },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 16 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
  btnSecondary: { backgroundColor: colors.skeleton },
  btnSecondaryText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
}));
