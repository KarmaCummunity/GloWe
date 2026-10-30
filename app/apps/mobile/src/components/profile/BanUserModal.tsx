// FR-ADMIN-004 — Ban modal opened from a user profile by a super admin.
// KeyboardAvoidingView + ScrollView keep the inputs visible while typing.
// Defence-in-depth: self-ban / admin-ban are also rejected by the use case + DB.
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { container } from '../../lib/container';
import { useAuthStore } from '../../store/authStore';
import { confirmAndRun, showAdminToast } from '../chat/system/adminActions';
import { makeUseStyles, useTheme, Text, TextInput } from '@kc/ui';
import { useTranslation } from 'react-i18next';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

type BanReason = 'spam' | 'harassment' | 'policy_violation' | 'other';

const REASONS: Array<{ value: BanReason; labelKey: string }> = [
  { value: 'spam', labelKey: 'moderation.ban.reasons.spam' },
  { value: 'harassment', labelKey: 'moderation.ban.reasons.harassment' },
  { value: 'policy_violation', labelKey: 'moderation.ban.reasons.policy_violation' },
  { value: 'other', labelKey: 'moderation.ban.reasons.other' },
];

interface Props {
  targetUserId: string;
  visible: boolean;
  onClose: () => void;
}

export function BanUserModal({ targetUserId, visible, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const adminId = useAuthStore((s) => s.session?.userId);
  const [reason, setReason] = useState<BanReason>('spam');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReason('spam');
      setNote('');
      setSubmitting(false);
    }
  }, [visible]);

  const submit = () => {
    if (!adminId || submitting) return;
    setSubmitting(true);
    confirmAndRun({
      action: 'ban',
      onConfirm: async () => {
        await container.banUser.execute({
          adminId,
          targetUserId,
          reason,
          note: note.trim(),
        });
      },
      onSuccess: () => {
        setSubmitting(false);
        onClose();
        showAdminToast(t('moderation.actions.success.ban'));
      },
      onError: (msg) => {
        setSubmitting(false);
        showAdminToast(msg);
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>{t('moderation.ban.title')}</Text>
              <Text style={styles.label}>{t('moderation.ban.reasonLabel')}</Text>
              {REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  style={[styles.reasonRow, reason === r.value && styles.reasonRowActive]}
                  onPress={() => setReason(r.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: reason === r.value }}
                >
                  <Text style={styles.reasonText}>{t(r.labelKey)}</Text>
                </Pressable>
              ))}
              <Text style={styles.label}>{t('moderation.ban.noteLabel')}</Text>
              <TextInput
                style={styles.note}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={500}
                textAlign="right"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.actions}>
                <Pressable
                  style={[styles.btn, styles.btnGhost]}
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text style={styles.btnGhostText}>{t('moderation.actions.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnDanger, submitting && styles.btnDisabled]}
                  onPress={submit}
                  disabled={submitting}
                  accessibilityState={{ disabled: submitting }}
                >
                  <Text style={styles.btnDangerText}>
                    {submitting ? '...' : t('moderation.ban.submit')}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,

    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  scrollContent: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, textAlign: rtlTextAlignStart, marginBottom: 4 },
  label: { fontSize: 13, color: colors.textSecondary, textAlign: rtlTextAlignStart, marginTop: 4 },
  reasonRow: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  reasonRowActive: { borderColor: colors.error, backgroundColor: colors.primarySurface },
  reasonText: { fontSize: 15, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  note: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, minHeight: 80, fontSize: 15, color: colors.textPrimary,
  },
  actions: { flexDirection: rowDirectionStart, gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnDanger: { backgroundColor: colors.error },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  btnDangerText: { color: colors.textInverse, fontSize: 15, fontWeight: '600' },
  btnGhostText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
}));
