// app/apps/mobile/src/components/admin/admins/ChoiceChips.tsx
// FR-ADMIN-030 — single-choice chip group used by the grant and change-role
// modals (the grant scope and the role).
import { Pressable, View } from 'react-native';
import { makeUseStyles, radius, spacing, Text, typography } from '@kc/ui';
import { rowDirectionStart } from '../../../lib/rtlLayout';

export interface ChoiceOption<K> {
  readonly key: K;
  readonly label: string;
}

export interface ChoiceChipsProps<K> {
  readonly options: readonly ChoiceOption<K>[];
  readonly selected: K | undefined;
  readonly onSelect: (key: K) => void;
}

/** Keys may be `null` (the platform scope), so React keys are derived. */
function keyOf<K>(key: K): string {
  return key === null ? '__null__' : String(key);
}

export function ChoiceChips<K>({ options, selected, onSelect }: ChoiceChipsProps<K>) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = selected !== undefined && keyOf(selected) === keyOf(o.key);
        return (
          <Pressable
            key={keyOf(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(o.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row:  { flexDirection: rowDirectionStart, flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.secondaryLight,
  },
  chipActive:     { backgroundColor: colors.primary },
  chipText:       { ...typography.bodySmall, ...typography.semiBold, color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
}));
