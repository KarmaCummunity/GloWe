import React from 'react';
import { Platform, Pressable, type PressableProps } from 'react-native';
import { useTheme } from '@kc/ui';

type Props = PressableProps & {
  readonly children: React.ReactNode;
};

/** Pressable with Material ripple on Android; opacity fade elsewhere. */
export function KcPressable({ children, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      android_ripple={
        Platform.OS === 'android'
          ? { color: `${colors.primary}33`, borderless: false }
          : undefined
      }
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
        Platform.OS !== 'android' && pressed ? { opacity: 0.72 } : null,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
