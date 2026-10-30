// Floating toast for short feedback (e.g. publish result). Mounted in root shell.
// Mapped to: FR-POST-001 publish feedback (R-MVP-Core-4 Hebrew copy via i18n in callers).

import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { useFeedSessionStore } from '../store/feedSessionStore';

export function EphemeralToast() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useFeedSessionStore((s) => s.ephemeralToast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;

  const backgroundColor = toast.tone === 'success' ? colors.primary : colors.error;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
    >
      <View style={[styles.bubble, { backgroundColor }]}>
        <Text style={styles.text}>{toast.message}</Text>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  wrap: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    zIndex: 9999,
    alignItems: 'center',
  },
  bubble: {
    maxWidth: 420,
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    // RN-Web + native shadow
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
    textAlign: 'center',
  },
}));
