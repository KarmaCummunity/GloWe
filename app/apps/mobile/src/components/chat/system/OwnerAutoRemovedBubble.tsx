// FR-MOD-010 — owner-facing notice when their post was auto-removed or hidden for review (D61).
// Read-only; no admin actions.
import React from 'react';
import { View, Text } from 'react-native';
import { makeUseStyles, radius, typography } from '@kc/ui';
import { useTranslation } from 'react-i18next';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import type { SystemMessageBubbleProps } from './SystemMessageBubble';
import { ownerModerationBubbleKey } from '../../../lib/moderation/postModeration';

const useStyles = makeUseStyles(({ colors }) => ({
  bubble: {
    padding: 8,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    marginVertical: 4,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  body: { ...typography.bodySmall, color: colors.error, textAlign: rtlTextAlignStart },
}));

export function OwnerAutoRemovedBubble({ payload }: SystemMessageBubbleProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.bubble}>
      <Text style={styles.body}>{t(ownerModerationBubbleKey(payload))}</Text>
    </View>
  );
}
