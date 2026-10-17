import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, radius, useTheme } from '@kc/ui';
import { hapticLightTap } from '../lib/haptics';
import { rowDirectionStart } from '../lib/rtlLayout';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.textDisabled} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  testID?: string;
}

/** Primary (filled) + optional secondary (outlined) CTA buttons for empty states. */
export function EmptyStateActions({ primary, secondary }: { primary: EmptyStateAction; secondary?: EmptyStateAction }) {
  const styles = useStyles();
  const press = (a: EmptyStateAction) => () => {
    hapticLightTap();
    a.onPress();
  };
  return (
    <View style={styles.actions}>
      {secondary ? (
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={press(secondary)}
          accessibilityRole="button"
          testID={secondary.testID}
        >
          <Text style={styles.btnTextSecondary}>{secondary.label}</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.btn, styles.btnPrimary]}
        onPress={press(primary)}
        accessibilityRole="button"
        testID={primary.testID}
      >
        <Text style={styles.btnTextPrimary}>{primary.label}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  icon: {
    marginBottom: spacing.base,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: {
    marginTop: spacing.xl,
  },
  actions: { flexDirection: rowDirectionStart, flexWrap: 'wrap' as const, justifyContent: 'center' as const, gap: spacing.sm },
  btn: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  btnTextPrimary: { ...typography.body, color: colors.textInverse, fontWeight: '700' as const },
  btnTextSecondary: { ...typography.body, color: colors.textPrimary, fontWeight: '700' as const },
}));
