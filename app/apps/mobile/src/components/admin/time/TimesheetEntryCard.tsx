// V2-ADMIN-TIME-10 — single timesheet entry row.
import { Pressable, StyleSheet, View } from 'react-native';
import type { TimesheetEntry } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
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
    margin: 12, padding: 14, gap: 4,
    borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  head:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workDate:    { fontSize: 14, fontWeight: '700' },
  headRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hoursChip:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.primarySurface },
  hoursChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  statusChip:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  status_draft:     { backgroundColor: colors.secondaryLight },
  status_submitted: { backgroundColor: colors.warningLight },
  status_approved:  { backgroundColor: colors.successLight },
  status_rejected:  { backgroundColor: colors.errorLight },
  statusChipText:   { fontSize: 11, fontWeight: '700' },
  meta:        { fontSize: 12, opacity: 0.7 },
  metaSubtle:  { fontSize: 11, opacity: 0.6, marginTop: 2 },
  description: { fontSize: 12, marginTop: 4, opacity: 0.85 },
  actions:     { flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'flex-end' },
  btn:         { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  btnMuted:    { backgroundColor: colors.secondaryLight },
  btnText:     { fontSize: 12, fontWeight: '600' },
  btnPrimary:  { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: 12, fontWeight: '700', color: colors.textInverse },
  btnDanger:   { backgroundColor: colors.errorLight },
  btnDangerText: { fontSize: 12, fontWeight: '700', color: colors.error },
}));
