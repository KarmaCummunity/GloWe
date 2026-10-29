// FR-CLOSURE-004 — one-time educational explainer with "don't show again".
import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, useTheme } from '@kc/ui';
import { useModalHardwareBack } from '../../hooks/useModalHardwareBack';
import { useClosureStore } from '../../store/closureStore';
import { useAuthStore } from '../../store/authStore';
import { getUserRepo } from '../../services/userComposition';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

export function ClosureExplainerSheet() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const step = useClosureStore((s) => s.step);
  const postType = useClosureStore((s) => s.postType);
  const dismiss = useClosureStore((s) => s.dismissExplainer);
  const completeWithoutExplainer = useClosureStore((s) => s.completeWithoutExplainer);
  const userId = useAuthStore((s) => s.session?.userId);
  const [stayDismissed, setStayDismissed] = useState(false);
  const [alreadyDismissed, setAlreadyDismissed] = useState<boolean | null>(null);

  // Reset local state whenever we leave 'explainer' so the next closure starts fresh.
  useEffect(() => {
    if (step !== 'explainer') {
      setStayDismissed(false);
      setAlreadyDismissed(null);
    }
  }, [step]);

  // Check the persistent flag once when the explainer step is reached.
  useEffect(() => {
    if (step !== 'explainer' || !userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const u = await getUserRepo().findById(userId);
        if (!cancelled) setAlreadyDismissed(u?.closureExplainerDismissed === true);
      } catch {
        if (!cancelled) setAlreadyDismissed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, userId]);

  // Already dismissed forever — fast-forward to step='done' so OwnerActionsBar
  // sees the success signal and notifies the parent. Using `reset()` here would
  // jump straight to 'idle' and skip the parent's onClosed callback. (B3)
  useEffect(() => {
    if (step === 'explainer' && alreadyDismissed === true) {
      completeWithoutExplainer();
    }
  }, [step, alreadyDismissed, completeWithoutExplainer]);

  const visible = step === 'explainer' && alreadyDismissed === false;
  useModalHardwareBack(visible, completeWithoutExplainer);

  if (!userId) return null;

  // Tapping the backdrop or hardware back during the explainer is treated as
  // "got it, no persist" — the closure already succeeded, so we still want
  // OwnerActionsBar to fire onClosed (step='done', not 'idle').
  // Direction flips by post.type. The "give" copy is what was originally
  // shipped; the "request" copy mirrors it for the recipient-side flow.
  const give = postType !== 'Request';
  const titleText = give ? t('closure.explainerGiveTitle') : t('closure.explainerRequestTitle');
  const markedBullet = give
    ? t('closure.explainerGiveMarkedBullet')
    : t('closure.explainerRequestMarkedBullet');
  const counterBullet = give
    ? t('closure.explainerGiveCounterBullet')
    : t('closure.explainerRequestCounterBullet');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={completeWithoutExplainer}>
      <Pressable style={styles.backdrop} onPress={completeWithoutExplainer}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.body}>{t('closure.explainerLead')}</Text>
          <Text style={styles.bullet}>{markedBullet}</Text>
          <Text style={styles.bullet}>{t('closure.explainerMiddleBullet')}</Text>
          <Text style={styles.bullet}>{counterBullet}</Text>

          <Pressable
            onPress={() => setStayDismissed((v) => !v)}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, stayDismissed && styles.checkboxChecked]}>
              {stayDismissed ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.checkboxLabel}>{t('closure.explainerDontShowAgain')}</Text>
          </Pressable>

          <Pressable
            onPress={() => dismiss(stayDismissed, userId)}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>{t('general.gotIt')}</Text>
          </Pressable>
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
  body: { fontSize: 15, color: colors.textSecondary, textAlign: rtlTextAlignStart, marginBottom: 8 },
  bullet: {
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    marginBottom: 8,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: colors.textInverse, fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 14, color: colors.textPrimary },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
}));
