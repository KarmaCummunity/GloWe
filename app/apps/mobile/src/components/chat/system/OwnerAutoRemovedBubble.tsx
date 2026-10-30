// FR-MOD-010 — owner-facing notice when reports took their post off the feed.
// D33/D61: posts (0452) and listings (0463, KC#1298) are hidden for review rather than removed;
// the payload's `outcome` tells which notice applies. Read-only; no admin actions.
import React from 'react';
import { View } from 'react-native';
import { makeUseStyles, radius, spacing, typography, Text } from '@kc/ui';
import { useTranslation } from 'react-i18next';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import type { SystemMessageBubbleProps } from './SystemMessageBubble';

const useStyles = makeUseStyles(({ colors }) => ({
  bubble: {
    padding: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  body: { ...typography.bodySmall, color: colors.error, textAlign: rtlTextAlignStart },
}));

export function OwnerAutoRemovedBubble({ payload }: SystemMessageBubbleProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  // Notices sent before 0452 carry no outcome: those posts were removed outright.
  const hiddenForReview = payload?.outcome === 'hidden_pending_review';
  return (
    <View style={styles.bubble} testID="owner-auto-removed-bubble">
      <Text style={styles.body}>
        {t(hiddenForReview ? 'moderation.bubble.ownerAutoRemoved.hiddenForReview' : 'moderation.bubble.ownerAutoRemoved.body')}
      </Text>
    </View>
  );
}
