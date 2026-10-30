// app/apps/mobile/src/components/admin/tasks/TaskDueRangeFilter.tsx
// V2-ADMIN-TASKS-3 — due-date range filter inputs (from / to) as plain text
// fields formatted YYYY-MM-DD. The list screen owns parsing; this component
// just renders + validates the format.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { makeUseStyles, Text, TextInput } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TaskDueRangeFilterProps {
  readonly fromValue: string;
  readonly toValue: string;
  readonly onChange: (next: { from: string; to: string }) => void;
  readonly onClear: () => void;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (value.length === 0) return true; // empty = unset
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function TaskDueRangeFilter({ fromValue, toValue, onChange, onClear }: TaskDueRangeFilterProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const [from, setFrom] = useState(fromValue);
  const [to, setTo]     = useState(toValue);

  const fromOk = useMemo(() => isValidIsoDate(from), [from]);
  const toOk   = useMemo(() => isValidIsoDate(to),   [to]);
  const dirty  = from !== fromValue || to !== toValue;

  return (
    <View style={styles.row}>
      <View style={styles.fieldCol}>
        <Text style={styles.label}>{L.admin.tasks.dueRange.fromLabel}</Text>
        <TextInput
          style={[styles.input, !fromOk && styles.invalid]}
          value={from}
          onChangeText={setFrom}
          placeholder={L.admin.tasks.dueRange.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
      </View>
      <View style={styles.fieldCol}>
        <Text style={styles.label}>{L.admin.tasks.dueRange.toLabel}</Text>
        <TextInput
          style={[styles.input, !toOk && styles.invalid]}
          value={to}
          onChangeText={setTo}
          placeholder={L.admin.tasks.dueRange.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
      </View>
      <View style={styles.actionsCol}>
        <Pressable
          disabled={!dirty || !fromOk || !toOk}
          onPress={() => onChange({ from, to })}
          style={[styles.applyBtn, (!dirty || !fromOk || !toOk) && styles.disabledBtn]}
        >
          <Text style={styles.applyText}>{L.admin.tasks.dueRange.apply}</Text>
        </Pressable>
        {(fromValue.length > 0 || toValue.length > 0) && (
          <Pressable
            onPress={() => { setFrom(''); setTo(''); onClear(); }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>{L.admin.tasks.dueRange.clear}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row:       { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-end' },
  fieldCol:  { flex: 1, gap: 4 },
  actionsCol:{ gap: 4 },
  label:     { fontSize: 11, opacity: 0.7 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    padding: 8, fontSize: 13, textAlign: 'left', backgroundColor: colors.surface, minWidth: 110,
  },
  invalid:   { borderColor: colors.error },
  applyBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  applyText: { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
  disabledBtn: { opacity: 0.4 },
  clearBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.secondaryLight },
  clearText: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
}));
