import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, Text, TextInput } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { ExternalDonationNotice } from '../../../../../src/components/money/ExternalDonationNotice';
import { useExternalDonations } from '../../../../../src/hooks/useExternalDonations';
import { newIdempotencyKey, paymentsUseCases } from '../../../../../src/services/paymentsComposition';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md, flex: 1 },
  label: { ...typography.caption, color: colors.textSecondary },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '600' as const,
  },
  btn: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' as const },
  btnText: { ...typography.button, color: colors.textInverse },
  hint: { ...typography.body, color: colors.textSecondary },
}));

export default function StandingOrderScreen() {
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const { external } = useExternalDonations();
  const [amount, setAmount] = useState('36');
  const [busy, setBusy] = useState(false);
  const parsed = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed >= 5;

  if (external && orgId) {
    return (
      <Screen>
        <ExternalDonationNotice kind="standing-order" orgId={orgId} />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={styles.hint}>{t('moneyPayments.standingIntro')}</Text>
          <Text style={styles.label}>{t('moneyPayments.monthlyAmount')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <Pressable
            style={[styles.btn, (!valid || busy) && { opacity: 0.5 }]}
            disabled={!valid || busy || !orgId}
            onPress={async () => {
              setBusy(true);
              try {
                await paymentsUseCases.createStandingOrder().execute({
                  orgId: orgId!,
                  amountIls: parsed,
                  idempotencyKey: newIdempotencyKey('standing'),
                });
                router.replace('/(tabs)/donations/money/standing-orders');
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('moneyPayments.createStanding')}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
