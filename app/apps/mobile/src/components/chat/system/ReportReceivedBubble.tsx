// FR-ADMIN-003 / FR-MOD-001 AC4 — admin-facing system bubble for newly-filed
// reports. Shows a rich preview card (admin-only) when the payload contains
// link_target + target_preview, and dismiss / confirm action buttons to
// super admins. Dimmed once a later mod_action_taken bubble references this
// message.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { makeUseStyles, useTheme } from '@kc/ui';
import { hasPermission, type AdminRole } from '@kc/domain';
import { useAdminRoles } from '../../../hooks/useAdminRoles';
import { useAdminPortalReportsFlag } from '../../../hooks/useAdminPortalReportsFlag';
import { container } from '../../../lib/container';
import { useTranslation } from 'react-i18next';
import { confirmAndRun, showAdminToast } from './adminActions';
import { readLinkTarget, readPreview, TargetPreviewCard } from './targetPreviewCard';
import type { SystemMessageBubbleProps } from './SystemMessageBubble';
import { rowDirectionStart } from '../../../lib/rtlLayout';

export function ReportReceivedBubble({
  payload,
  body,
  handledByLaterAction,
}: SystemMessageBubbleProps) {
  const { roles } = useAdminRoles();
  const canViewReports = hasPermission(roles as readonly AdminRole[], 'reports.view');
  const portalActive = useAdminPortalReportsFlag();
  const styles = useReportReceivedBubbleStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const reportId = payload?.report_id as string | undefined;
  const targetType = payload?.target_type as string | undefined;
  const targetId = payload?.target_id as string | undefined;
  const reason = payload?.reason as string | undefined;
  const caseId =
    (targetType === 'post' || targetType === 'user' || targetType === 'chat') && targetId
      ? encodeURIComponent(`${targetType}:${targetId}`)
      : null;
  // The trigger writes the raw `Report.reason` enum (PascalCase). The Hebrew
  // mapping is keyed by lowercase — case-fold then look up, with the original
  // enum as a safe fallback for unknown values (e.g. a future-added reason
  // not yet translated).
  const reasonLabel = reason
    ? t(`moderation.reasons.${reason.toLowerCase()}`, { defaultValue: reason })
    : undefined;
  const showActions = canViewReports && !handledByLaterAction && !!reportId;

  const linkTarget = readLinkTarget(payload);
  const preview = readPreview(payload);
  const showRichPreview = canViewReports && !!linkTarget && !!preview;
  const showChatNote = showRichPreview && targetType === 'chat';

  return (
    <View style={[styles.bubble, handledByLaterAction && styles.dimmed]}>
      <Text style={styles.title}>{t('moderation.bubble.reportReceived.title')}</Text>
      {showChatNote ? <Text style={styles.note}>{t('moderation.bubble.targetPreview.chatNote')}</Text> : null}
      {reasonLabel ? <Text style={styles.body}>{reasonLabel}</Text> : null}

      {showRichPreview && linkTarget && preview ? (
        <TargetPreviewCard linkTarget={linkTarget} preview={preview} borderColor={colors.borderStrong} />
      ) : null}

      {showRichPreview ? <Text style={styles.evidence}>{t('moderation.bubble.targetPreview.evidenceLabel')}</Text> : null}

      {body.length > 0 ? (
        <Text style={styles.body}>
          <Text style={styles.noteLabel}>{`${t('moderation.bubble.targetPreview.reporterNoteLabel')} `}</Text>
          {body}
        </Text>
      ) : null}

      {showActions ? (
        portalActive ? (
          <View style={styles.portalRow}>
            <Text style={styles.portalNote}>{t('admin.coexistence.bubbleReadOnly')}</Text>
            {caseId ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(admin)/reports/[caseId]',
                    params: { caseId },
                  })
                }
                style={styles.portalLink}
                accessibilityRole="link"
              >
                <Text style={styles.portalLinkText}>
                  {t('admin.coexistence.bubbleOpenInPortal')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.row}>
            <Pressable
              onPress={() =>
                confirmAndRun({
                  action: 'dismiss',
                  onConfirm: () => container.dismissReport.execute({ reportId: reportId! }),
                  onSuccess: () => showAdminToast(t('moderation.actions.success.dismiss')),
                  onError: showAdminToast,
                })
              }
            >
              <Text style={styles.btn}>{t('moderation.actions.dismiss')}</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                confirmAndRun({
                  action: 'confirm',
                  onConfirm: () => container.confirmReport.execute({ reportId: reportId! }),
                  onSuccess: () => showAdminToast(t('moderation.actions.success.confirm')),
                  onError: showAdminToast,
                })
              }
            >
              <Text style={styles.btn}>{t('moderation.actions.confirm')}</Text>
            </Pressable>
          </View>
        )
      ) : null}
    </View>
  );
}

const useReportReceivedBubbleStyles = makeUseStyles(({ colors }) => ({
  bubble: {
    padding: 8,
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    marginVertical: 4,
    alignSelf: 'center' as const,
    maxWidth: '90%',
  },
  dimmed: { opacity: 0.5 },
  title: { fontWeight: '600' as const, color: colors.textPrimary },
  body: { marginTop: 2, fontSize: 13, color: colors.textPrimary },
  noteLabel: { fontWeight: '600' as const },
  note: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' as const, marginTop: 2 },
  evidence: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' as const, marginTop: 4 },
  row: { flexDirection: rowDirectionStart, gap: 16, marginTop: 8 },
  btn: { color: colors.secondary, fontWeight: '600' as const },
  portalRow: {
    flexDirection: rowDirectionStart,
    gap: 12,
    marginTop: 8,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
  },
  portalNote: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' as const },
  portalLink: { paddingVertical: 2 },
  portalLinkText: { color: colors.secondary, fontWeight: '600' as const, fontSize: 13 },
}));
