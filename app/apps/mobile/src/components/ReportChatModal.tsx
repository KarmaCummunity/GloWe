import { useTranslation } from 'react-i18next';
// FR-CHAT-010 — Report modal opened from chat ⋮ menu.
import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';
import type { ReportReason } from '@kc/domain';
import { container } from '../lib/container';
import { useAuthStore } from '../store/authStore';
import { makeUseStyles, typography, spacing, radius, useTheme, Text, TextInput } from '@kc/ui';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';
import { NotifyModal } from './NotifyModal';
import { useReportForm, postNamespaceReportMessages } from './report/useReportForm';

const REASON_KEYS: Array<{ value: ReportReason; key: string }> = [
  { value: 'Spam', key: 'post.reportReasonSpam' },
  { value: 'Offensive', key: 'post.reportReasonOffensive' },
  { value: 'Misleading', key: 'post.reportReasonMisleading' },
  { value: 'Illegal', key: 'post.reportReasonIllegal' },
  { value: 'Other', key: 'post.reportReasonOther' },
];

interface Props {
  chatId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportChatModal({ chatId, visible, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.session?.userId);
  const { reason, setReason, note, setNote, submitting, notify, setNotify, runSubmit } =
    useReportForm(visible);

  const submit = () => {
    if (!userId) return;
    void runSubmit(
      (r, n) => container.reportChat.execute({ reporterId: userId, chatId, reason: r, note: n || undefined }),
      onClose,
      {
        ...postNamespaceReportMessages(t),
        duplicate: { title: t('post.reportDuplicateTitle'), message: t('chat.reportChatDuplicateBody') },
      },
    );
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('chat.reportChatTitle')}</Text>
          {REASON_KEYS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={styles.option}
              onPress={() => setReason(r.value)}
            >
              <View style={[styles.radio, reason === r.value && styles.radioActive]} />
              <Text style={styles.optionLabel}>{t(r.key)}</Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            placeholder={t('chat.reportChatNotePlaceholder')}
            placeholderTextColor={colors.textDisabled}
            multiline
            maxLength={500}
            textAlign={rtlTextAlignStart}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostText}>{t('general.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={submit}
              disabled={submitting}
            >
              <Text style={styles.btnPrimaryText}>{submitting ? t('chat.reportChatSubmitting') : t('post.reportSubmit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    <NotifyModal visible={notify !== null} title={notify?.title ?? ''} message={notify?.message ?? ''} onDismiss={() => setNotify(null)} />
    </>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,

    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionLabel: { ...typography.body, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  note: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { ...typography.body, color: colors.textInverse, fontWeight: '700' as const },
  btnGhost: { borderWidth: 1, borderColor: colors.border },
  btnGhostText: { ...typography.body, color: colors.textPrimary },
}));
