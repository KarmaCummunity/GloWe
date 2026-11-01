// Emergency call during an active ride (docs/spec/05_giving_worlds.md §5.3 step 6, D70; gap G44).
// Shown to the driver and approved passengers only while the ride is under way; a second tap
// confirms, so a pocket tap never sends it. Everyone else on the ride and KC's admins are alerted.
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, Text } from '@kc/ui';
import { isRideEmergencyWindow } from '@kc/domain';
import { raiseRideEmergency } from '../../../services/rideSafetyComposition';
import { handoffErrorKey } from '../../../lib/marketplaceCreateErrors';

interface Props {
  readonly listingId: string;
  readonly details: Record<string, unknown>;
}

export function RideEmergencyButton({ listingId, details }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isRideEmergencyWindow(details, new Date())) return null;

  const send = async () => {
    setBusy(true);
    try {
      await raiseRideEmergency(listingId);
      setConfirming(false);
      alert(t('rideSafety.emergencySent'));
    } catch (err) {
      alert(t(handoffErrorKey(err) ?? 'givingHandoff.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  if (!confirming) {
    return (
      <Pressable accessibilityRole="button" testID="ride-emergency" style={styles.btn} onPress={() => setConfirming(true)}>
        <Text style={styles.btnText}>{t('rideSafety.emergency')}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.confirm} testID="ride-emergency-confirm">
      <Text style={styles.question}>{t('rideSafety.emergencyConfirm')}</Text>
      <Pressable accessibilityRole="button" testID="ride-emergency-send" style={styles.btn} disabled={busy} onPress={() => void send()}>
        <Text style={styles.btnText}>{t('rideSafety.emergencySend')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" testID="ride-emergency-cancel" disabled={busy} onPress={() => setConfirming(false)}>
        <Text style={styles.cancel}>{t('rideSafety.emergencyCancel')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  btn: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.error, alignItems: 'center' as const },
  btnText: { ...typography.button, color: colors.textInverse },
  confirm: { gap: spacing.sm },
  question: { ...typography.body, color: colors.textPrimary },
  cancel: { ...typography.button, color: colors.textSecondary, textAlign: 'center' as const, padding: spacing.sm },
}));
