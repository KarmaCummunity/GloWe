// V2-ADMIN-MONEY-9 — single ledger entry card.
import { StyleSheet, View } from 'react-native';
import type { FinanceEntry } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { AdminCardActions } from '../AdminCardActions';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface FinanceEntryCardProps {
  readonly entry: FinanceEntry;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fmtAmount(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

export function FinanceEntryCard({ entry, onEdit, onDelete }: FinanceEntryCardProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.money;
  const sign = entry.direction === 'in' ? '+' : '-';
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={[styles.amount, entry.direction === 'in' ? styles.amountIn : styles.amountOut]}>
            {sign}{fmtAmount(entry.amountCents, entry.currency)}
          </Text>
          <Text style={styles.meta}>{t.row.occurredAt(fmtDate(entry.occurredAt))}</Text>
        </View>
        <View style={styles.headRight}>
          <View style={styles.chip}><Text style={styles.chipText}>{t.kind[entry.kind]}</Text></View>
          <View style={[styles.chip, styles[`status_${entry.status}` as const]]}>
            <Text style={styles.chipText}>{t.status[entry.status]}</Text>
          </View>
        </View>
      </View>
      {entry.counterparty && (
        <Text style={styles.metaText}>{t.row.counterpartyPrefix} {entry.counterparty}</Text>
      )}
      {entry.category && (
        <Text style={styles.metaText}>{t.row.categoryPrefix} {entry.category}</Text>
      )}
      {entry.description && (
        <Text style={styles.description} numberOfLines={3}>{entry.description}</Text>
      )}
      <AdminCardActions
        editLabel={t.row.edit}
        deleteLabel={t.row.delete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    margin: 12, padding: 14, gap: 6,
    borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  head:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headLeft:    { gap: 2 },
  headRight:   { gap: 4, alignItems: 'flex-end' },
  amount:      { fontSize: 16, fontWeight: '700' },
  amountIn:    { color: colors.success },
  amountOut:   { color: colors.error },
  meta:        { fontSize: 11, opacity: 0.65 },
  chip:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.secondaryLight },
  chipText:    { fontSize: 11, fontWeight: '700' },
  status_pending:  { backgroundColor: colors.warningLight },
  status_cleared:  { backgroundColor: colors.successLight },
  status_canceled: { backgroundColor: colors.border },
  metaText:    { fontSize: 12, opacity: 0.7 },
  description: { fontSize: 12, marginTop: 4 },
}));
