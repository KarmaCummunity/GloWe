import React from 'react';
import { Pressable } from 'react-native';
import { makeUseStyles, radius, spacing, typography, Text } from '@kc/ui';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function Chip({ label, active, onPress }: ChipProps) {
  const styles = useChipStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const useChipStyles = makeUseStyles(({ colors }) => ({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  text: { ...typography.caption, fontWeight: '600' as const, color: colors.textPrimary },
  textActive: { color: colors.textInverse },
}));
