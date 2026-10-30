// FR-MOD-001 — Report modal opened from post-detail ⋮ menu. Mirror of ReportChatModal.
import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ReportReason } from '@kc/domain';
import { container } from '../../lib/container';
import { useAuthStore } from '../../store/authStore';
import { makeUseStyles, useTheme, Text, TextInput } from '@kc/ui';
import { NotifyModal } from '../NotifyModal';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { useReportForm, postNamespaceReportMessages } from '../report/useReportForm';

const REASON_KEYS: Array<{ value: ReportReason; key: string }> = [
  { value: 'Spam', key: 'post.reportReasonSpam' },
  { value: 'Offensive', key: 'post.reportReasonOffensive' },
  { value: 'Misleading', key: 'post.reportReasonMisleading' },
  { value: 'Illegal', key: 'post.reportReasonIllegal' },
  { value: 'Other', key: 'post.reportReasonOther' },
];

interface Props {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportPostModal({ postId, visible, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useReportPostModalStyles();
  const { colors } = useTheme();
  const userId = useAuthStore((s) => s.session?.userId);
  const { reason, setReason, note, setNote, submitting, notify, setNotify, runSubmit } =
    useReportForm(visible);

  const submit = () => {
    if (!userId) return;
    void runSubmit(
      (r, n) => container.reportPost.execute({ reporterId: userId, postId, reason: r, note: n || undefined }),
      onClose,
      postNamespaceReportMessages(t),
    );
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('post.reportTitle')}</Text>
          {REASON_KEYS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.reasonRow, reason === r.value && styles.reasonRowActive]}
              onPress={() => setReason(r.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === r.value }}
            >
              <Text style={styles.reasonText}>{t(r.key)}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.note}
            placeholder={t('post.reportNotePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={500}
            textAlign="right"
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.btnGhostText}>{t('general.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, submitting && styles.btnDisabled]}
              onPress={submit}
              disabled={submitting}
              accessibilityState={{ disabled: submitting }}
            >
              <Text style={styles.btnPrimaryText}>{submitting ? t('post.reportSubmitting') : t('post.reportSubmit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    <NotifyModal visible={notify !== null} title={notify?.title ?? ''} message={notify?.message ?? ''} onDismiss={() => setNotify(null)} />
    </>
  );
}

const useReportPostModalStyles = makeUseStyles(({ colors }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, padding: 16, gap: 8,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: rtlTextAlignStart, marginBottom: 4 },
  reasonRow: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  reasonRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  reasonText: { fontSize: 15, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  note: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, minHeight: 80, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnPrimaryText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
  btnGhostText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
}));
