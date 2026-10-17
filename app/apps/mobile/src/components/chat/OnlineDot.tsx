// Green "online now" dot overlaid on an avatar corner (or inline next to a name).
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@kc/ui';
import { useIsOnline } from '../../hooks/useOnlinePresence';

interface Props {
  readonly userId: string | null | undefined;
  readonly size?: number;
  /** Absolute bottom-end corner overlay (avatar) vs inline (header title). */
  readonly overlay?: boolean;
}

export function OnlineDot({ userId, size = 12, overlay = true }: Props) {
  const online = useIsOnline(userId);
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (!online) return null;
  return (
    <View
      testID="online-dot"
      accessibilityLabel={t('chat.onlineNow')}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.success,
          borderWidth: 2,
          borderColor: colors.surface,
        },
        overlay ? { position: 'absolute', bottom: 0, end: 0 } : null,
      ]}
    />
  );
}
