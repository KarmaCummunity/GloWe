import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ReportReason } from '@kc/domain';
import { makeUseStyles, spacing, typography, Text, TextInput } from '@kc/ui';
import { container } from '../../lib/container';
import { useAuthStore } from '../../store/authStore';
import { useReportForm, postNamespaceReportMessages } from '../report/useReportForm';
import { NotifyModal } from '../NotifyModal';

const REASON_KEYS: Array<{ value: ReportReason; key: string }> = [
  { value: 'Spam', key: 'post.reportReasonSpam' },
  { value: 'Offensive', key: 'post.reportReasonOffensive' },
  { value: 'Misleading', key: 'post.reportReasonMisleading' },
  { value: 'Illegal', key: 'post.reportReasonIllegal' },
  { value: 'Other', key: 'post.reportReasonOther' },
];

interface Props {
  listingId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportListingModal({ listingId, visible, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useReportListingModalStyles();
  const userId = useAuthStore((s) => s.session?.userId);
  const { reason, setReason, note, setNote, submitting, notify, setNotify, runSubmit } =
    useReportForm(visible);

  const submit = () => {
    if (!userId) return;
    void runSubmit(
      (r, n) =>
        container.reportListing.execute({
          reporterId: userId,
          listingId,
          reason: r,
          note: n || undefined,
        }),
      onClose,
      postNamespaceReportMessages(t),
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t('marketplace.reportTitle')}</Text>
            {REASON_KEYS.map(({ value, key }) => (
              <TouchableOpacity key={value} style={styles.reasonRow} onPress={() => setReason(value)}>
                <Text style={styles.reasonText}>{t(key)}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.note}
              placeholder={t('post.reportNotePlaceholder')}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting || !reason}>
              <Text style={styles.submitText}>{t('post.reportSubmit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <NotifyModal
        visible={notify !== null}
        title={notify?.title ?? ''}
        message={notify?.message ?? ''}
        onDismiss={() => setNotify(null)}
      />
    </>
  );
}

const useReportListingModalStyles = makeUseStyles(({ colors }) => ({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' as const },
  sheet: { backgroundColor: colors.surfaceRaised, padding: spacing.lg, gap: spacing.sm, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { ...typography.h3, color: colors.textPrimary },
  reasonRow: { paddingVertical: spacing.sm },
  reasonText: { ...typography.body, color: colors.textPrimary },
  note: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 80,
    color: colors.textPrimary,
  },
  submit: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: 12, alignItems: 'center' as const },
  submitText: { ...typography.body, color: colors.textInverse },
  cancel: { ...typography.body, color: colors.textSecondary, textAlign: 'center' as const, marginTop: spacing.sm },
}));
