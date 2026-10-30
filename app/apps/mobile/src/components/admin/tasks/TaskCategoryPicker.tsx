// app/apps/mobile/src/components/admin/tasks/TaskCategoryPicker.tsx
// V2-ADMIN-TASKS-2 — single-select radio strip for picking a task category.
import { Pressable, StyleSheet, View } from 'react-native';
import { ADMIN_TASK_CATEGORIES, type AdminTaskCategory } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TaskCategoryPickerProps {
  readonly value: AdminTaskCategory;
  readonly onChange: (next: AdminTaskCategory) => void;
  readonly disabled?: boolean;
}

export function TaskCategoryPicker({ value, onChange, disabled = false }: TaskCategoryPickerProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {ADMIN_TASK_CATEGORIES.map((c) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            disabled={disabled}
            onPress={() => onChange(c)}
            style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {L.admin.tasks.category[c]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.secondaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.5 },
  chipText:       { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
}));
