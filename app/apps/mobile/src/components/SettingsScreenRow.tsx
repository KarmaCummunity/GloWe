// Shared row for settings list — use `View` when there is no `onPress` so nested
// controls (e.g. `Switch`) receive touches; `TouchableOpacity` would steal them.
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, useTheme, Text } from '@kc/ui';
import { rtlTextAlignStart } from '../lib/rtlTextAlignStart';
import { webTextRtl, webViewRtl } from '../lib/webRtlStyle';

export interface SettingsScreenRowProps {
  readonly label: string;
  readonly icon: string;
  readonly onPress?: () => void;
  readonly rightElement?: React.ReactNode;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
}

export function SettingsScreenRow({
  label,
  icon,
  onPress,
  rightElement,
  destructive,
  disabled,
}: SettingsScreenRowProps) {
  const styles = useRowStyles();
  const { colors } = useTheme();
  const iconColor = destructive ? colors.error : colors.textSecondary;
  const labelStyle = [styles.rowLabel, destructive && { color: colors.error }];
  const trailing = rightElement ?? (
    <Ionicons name="chevron-back" size={18} color={colors.textDisabled} />
  );

  const inner = (
    <>
      <Ionicons name={icon as never} size={20} style={styles.rowIcon} color={iconColor} />
      <Text style={labelStyle}>{label}</Text>
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{inner}</View>;
}

const useRowStyles = makeUseStyles(({ colors }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    ...webViewRtl,
  },
  rowIcon: { width: 24 },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
}));
