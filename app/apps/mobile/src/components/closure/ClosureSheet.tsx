// FR-CLOSURE-002 + FR-CLOSURE-003 — hybrid Step 1 + Step 2 bottom sheet.
// Step 1 (confirm) and Step 2 (recipient picker) live inside the same modal
// because they're a single transactional flow; Step 3 (the one-time educational
// note) is a separate sheet. Step 2 is now extracted to ClosureStep2.tsx —
// it owns the chats/search mode tabs and is the bigger of the two panes.
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme } from '@kc/ui';
import type { PostType } from '@kc/domain';
import { useModalHardwareBack } from '../../hooks/useModalHardwareBack';
import { useClosureStore } from '../../store/closureStore';
import { useAuthStore } from '../../store/authStore';
import { ClosureStep2 } from './ClosureStep2';
import { ClosureErrorPane } from './ClosureErrorPane';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

export function ClosureSheet() {
  const styles = useStyles();
  const { colors } = useTheme();
  const step = useClosureStore((s) => s.step);
  const postType = useClosureStore((s) => s.postType);
  const isBusy = useClosureStore((s) => s.isBusy);
  const errorMessage = useClosureStore((s) => s.errorMessage);
  const selectedId = useClosureStore((s) => s.selectedRecipientId);
  const confirmStep1 = useClosureStore((s) => s.confirmStep1);
  const closeWith = useClosureStore((s) => s.closeWith);
  const reset = useClosureStore((s) => s.reset);
  const ownerId = useAuthStore((s) => s.session?.userId);

  // step='error' is shown so the user sees feedback instead of a faded button
  // with nothing happening (the original bug report).
  const visible = step === 'confirm' || step === 'pick' || step === 'error';
  useModalHardwareBack(visible, reset);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={reset}>
      <Pressable style={styles.backdrop} onPress={reset}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {step === 'confirm' && postType ? (
            <Step1 onConfirm={confirmStep1} onCancel={reset} isBusy={isBusy} postType={postType} />
          ) : null}
          {step === 'pick' && ownerId && postType ? (
            <ClosureStep2
              ownerId={ownerId}
              postType={postType}
              isBusy={isBusy}
              errorMessage={errorMessage}
              onMarkAndClose={() => selectedId && closeWith(selectedId, ownerId)}
              onCloseWithoutMarking={() => closeWith(null, ownerId)}
              onCancel={reset}
            />
          ) : null}
          {step === 'error' ? (
            <ClosureErrorPane errorMessage={errorMessage} onClose={reset} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Step1({
  onConfirm,
  onCancel,
  isBusy,
  postType,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isBusy: boolean;
  postType: PostType;
}) {
  // Direction flips by post.type. The "physical handoff" wording matters either
  // way — both sides need to be reminded that closure is for AFTER pickup, not
  // after scheduling it.
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const give = postType === 'Give';
  const title = give ? t('closure.step1GiveTitle') : t('closure.step1RequestTitle');
  const body = give ? t('closure.step1GiveBody') : t('closure.step1RequestBody');
  const cta = give ? t('closure.step1GiveCta') : t('closure.step1RequestCta');
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={[styles.btn, styles.btnSecondary]}>
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
            <Text style={styles.btnPrimaryText}>{cta}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  title: { fontSize: 18, fontWeight: '700', textAlign: rtlTextAlignStart, marginBottom: 8, color: colors.textPrimary },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: rtlTextAlignStart, marginBottom: 16, lineHeight: 22 },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
  btnSecondary: { backgroundColor: colors.skeleton },
  btnSecondaryText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
}));
