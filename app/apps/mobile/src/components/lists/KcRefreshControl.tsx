// Themed pull-to-refresh: brand tint on iOS and Android, light haptic when a pull
// starts a refresh, and an offset so the spinner clears sticky headers.
import React, { useCallback } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useTheme } from '@kc/ui';
import { hapticLightTap } from '../../lib/haptics';

type Props = Omit<RefreshControlProps, 'onRefresh' | 'tintColor' | 'colors'> & {
  onRefresh: () => void | Promise<unknown>;
};

export function KcRefreshControl({ onRefresh, refreshing, ...rest }: Props) {
  const { colors } = useTheme();
  const handle = useCallback(() => {
    hapticLightTap();
    void onRefresh();
  }, [onRefresh]);
  return (
    <RefreshControl
      {...rest}
      refreshing={refreshing}
      onRefresh={handle}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
    />
  );
}
