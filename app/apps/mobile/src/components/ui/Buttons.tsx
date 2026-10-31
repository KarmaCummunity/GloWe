// Button primitives matching the welcome screen idiom.
//   PrimaryButton   — solid orange.
//   SecondaryButton — white card with light border + soft shadow (Google-style).
//   GhostButton     — text-only, no fill.
//
// All three:
//   - height 56, radius.xl
//   - scale press 1 → 0.97 (timing 100ms in, spring back)
//   - light haptic on press
//   - optional leading icon (rendered on the trailing edge so RTL puts it on the
//     left like the welcome buttons do).
import React from 'react';
import { ActivityIndicator, Platform, TouchableOpacity, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { isLayoutRtl } from '../../lib/rtlLayout';

/**
 * Trailing-edge inset for the absolutely-positioned icon.
 * Native auto-mirrors `end`; RN-Web ignores `start`/`end` for absolute
 * positioning, so on web we resolve RTL live and emit a physical key.
 */
function iconSlotCornerEnd(): Pick<ViewStyle, 'left' | 'right' | 'end'> {
  if (Platform.OS !== 'web') return { end: spacing.lg };
  return isLayoutRtl() ? { left: spacing.lg } : { right: spacing.lg };
}

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly icon?: keyof typeof Ionicons.glyphMap;
  readonly iconNode?: React.ReactNode;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly haptic?: boolean;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  readonly fullWidth?: boolean;
}

function useButtonPress(reduced: boolean) {
  const scale = useSharedValue(1);
  const onIn = () => {
    scale.value = reduced ? 1 : withTiming(0.97, { duration: 100 });
  };
  const onOut = () => {
    scale.value = reduced ? 1 : withSpring(1, { damping: 15 });
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { onIn, onOut, style };
}

function Button({
  variant,
  label,
  onPress,
  icon,
  iconNode,
  loading,
  disabled,
  haptic = true,
  testID,
  accessibilityLabel,
  fullWidth,
}: ButtonProps & { variant: Variant }) {
  const reduced = useReducedMotion();
  const press = useButtonPress(reduced);
  const styles = useButtonStyles();
  const { colors } = useTheme();

  const handle = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const containerStyle = [
    styles.base,
    fullWidth && styles.fullWidth,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    (loading || disabled) && styles.disabled,
  ];

  const textStyle = [
    styles.text,
    variant === 'primary' && styles.textOnPrimary,
    variant === 'secondary' && styles.textOnSurface,
    variant === 'ghost' && styles.textOnGhost,
  ];

  const fg =
    variant === 'primary'
      ? colors.textInverse
      : variant === 'ghost'
        ? colors.primary
        : colors.textPrimary;

  return (
    <Animated.View style={[press.style, fullWidth && styles.fullWidth]}>
      <TouchableOpacity
        style={containerStyle}
        onPress={handle}
        onPressIn={press.onIn}
        onPressOut={press.onOut}
        activeOpacity={1}
        disabled={loading || disabled}
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            <Text style={textStyle}>{label}</Text>
            {iconNode ? (
              <View style={styles.iconSlot}>{iconNode}</View>
            ) : icon ? (
              <View style={styles.iconSlot}>
                <Ionicons name={icon} size={20} color={fg} />
              </View>
            ) : null}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function PrimaryButton(p: ButtonProps) {
  return <Button {...p} variant="primary" />;
}
export function SecondaryButton(p: ButtonProps) {
  return <Button {...p} variant="secondary" />;
}
export function GhostButton(p: ButtonProps) {
  return <Button {...p} variant="ghost" />;
}

const useButtonStyles = makeUseStyles(({ colors, isDark }) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  fullWidth: { width: '100%' },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0 : 0.06,
    shadowRadius: 6,
    elevation: isDark ? 0 : 2,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.6 },
  text: { ...typography.button, fontSize: 16, textAlign: 'center' },
  textOnPrimary: { color: colors.textInverse },
  textOnSurface: { color: colors.textPrimary },
  textOnGhost: { color: colors.primary },
  iconSlot: {
    position: 'absolute',
    ...iconSlotCornerEnd(),
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
