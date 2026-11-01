// V2-ADMIN-TIME-10 — single timesheet entry row.
import { Pressable, StyleSheet, View } from 'react-native';
import type { TimesheetEntry } from '@kc/domain';
import { makeUseStyles, radius, spacing, Text, typography } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TimesheetEntryCardProps {
  readonly entry: TimesheetEntry;
  readonly isMine: boolean;
  readonly canApprove: boolean;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
  readonly onSubmit?: () => void;
  readonly onApprove?: () => void;
  readonly onReject?: () => void;
}

function fmtIso(s: string): string { return s.slice(0, 10); }

export function TimesheetEntryCard(props: TimesheetEntryCardProps) {
  const { entry, isMine, canApprove } = props;
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.time;
  const hours = entry.hoursX100 / 100;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.workDate}>{fmtIso(entry.workDate)}</Text>
        <View style={styles.headRight}>
          <View style={styles.hoursChip}><Text style={styles.hoursChipText}>{t.row.hoursLabel(hours)}</Text></View>
          <View style={[styles.statusChip, styles[`status_${entry.status}` as const]]}>
            <Text style={styles.statusChipText}>{t.status[entry.status]}</Text>
          </View>
        </View>
      </View>
      {!isMine && entry.userName && (
        <Text style={styles.meta}>{t.row.reportedBy(entry.userName)}</Text>
      )}
      {entry.project && <Text style={styles.meta}>{t.row.project} {entry.project}</Text>}
      {entry.description && <Text style={styles.description} numberOfLines={3}>{entry.description}</Text>}
      {entry.submittedAt && (
        <Text style={styles.metaSubtle}>{t.row.submittedAt(entry.submittedAt.toLocaleDateString('he-IL'))}</Text>
      )}
      {entry.approvedAt && entry.approverName && (
        <Text style={styles.metaSubtle}>
          {entry.status === 'approved'
            ? t.row.approvedBy(entry.approverName)
            : t.row.rejectedBy(entry.approverName)}
          {entry.approvalNote ? ` · ${entry.approvalNote}` : ''}
        </Text>
      )}

      <View style={styles.actions}>
        {isMine && entry.status === 'draft' && (
          <>
            {props.onEdit && (
              <Pressable onPress={props.onEdit} style={[styles.btn, styles.btnMuted]}>
                <Text style={styles.btnText}>{t.row.edit}</Text>
              </Pressable>
            )}
            {props.onSubmit && (
              <Pressable onPress={props.onSubmit} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>{t.row.submit}</Text>
              </Pressable>
            )}
            {props.onDelete && (
              <Pressable onPress={props.onDelete} style={[styles.btn, styles.btnDanger]}>
                <Text style={styles.btnDangerText}>{t.row.delete}</Text>
              </Pressable>
            )}
          </>
        )}
        {isMine && entry.status === 'rejected' && props.onEdit && (
          <Pressable onPress={props.onEdit} style={[styles.btn, styles.btnPrimary]}>
            <Text style={styles.btnPrimaryText}>{t.row.edit}</Text>
          </Pressable>
        )}
        {canApprove && entry.status === 'submitted' && (
          <>
            {props.onReject && (
              <Pressable onPress={props.onReject} style={[styles.btn, styles.btnDanger]}>
                <Text style={styles.btnDangerText}>{t.row.reject}</Text>
              </Pressable>
            )}
            {props.onApprove && (
              <Pressable onPress={props.onApprove} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>{t.row.approve}</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    margin: spacing.md, padding: spacing.md, gap: spacing.xs,
    borderRadius: radius.sm, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  head:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workDate:    { fontSize: typography.body.fontSize, ...typography.bold },
  headRight:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hoursChip:   { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.xs, backgroundColor: colors.primarySurface },
  hoursChipText: { fontSize: typography.caption.fontSize, ...typography.bold, color: colors.primary },
  statusChip:  { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.xs },
  status_draft:     { backgroundColor: colors.secondaryLight },
  status_submitted: { backgroundColor: colors.warningLight },
  status_approved:  { backgroundColor: colors.successLight },
  status_rejected:  { backgroundColor: colors.errorLight },
  statusChipText:   { fontSize: typography.caption.fontSize, ...typography.bold },
  meta:        { fontSize: typography.bodySmall.fontSize, opacity: 0.7 },
  metaSubtle:  { fontSize: typography.caption.fontSize, opacity: 0.6, marginTop: spacing.xs },
  description: { fontSize: typography.bodySmall.fontSize, marginTop: spacing.xs, opacity: 0.85 },
  actions:     { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, justifyContent: 'flex-end' },
  btn:         { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.xs },
  btnMuted:    { backgroundColor: colors.secondaryLight },
  btnText:     { fontSize: typography.bodySmall.fontSize, ...typography.semiBold },
  btnPrimary:  { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: typography.bodySmall.fontSize, ...typography.bold, color: colors.textInverse },
  btnDanger:   { backgroundColor: colors.errorLight },
  btnDangerText: { fontSize: typography.bodySmall.fontSize, ...typography.bold, color: colors.error },
}));
