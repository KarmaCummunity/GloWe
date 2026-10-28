import { Pressable, StyleSheet, Text } from 'react-native';
import { makeUseStyles } from '@kc/ui';

export interface AdminFilterChipProps {
  readonly label:   string;
  readonly active:  boolean;
  readonly onPress: () => void;
}

export function AdminFilterChip({ label, active, onPress }: AdminFilterChipProps) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  chip: {
    flexShrink: 0,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.secondaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
}));
