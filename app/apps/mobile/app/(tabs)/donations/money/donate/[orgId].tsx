import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import { ExternalDonationNotice } from '../../../../../src/components/money/ExternalDonationNotice';
import { useExternalDonations } from '../../../../../src/hooks/useExternalDonations';
import { newIdempotencyKey, paymentsUseCases } from '../../../../../src/services/paymentsComposition';
import { track } from '../../../../../src/lib/analytics';

const PRESETS = [36, 72, 180, 360] as const;

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
  presets: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999, backgroundColor: colors.surfaceRaised },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.body, color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
  btn: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' as const },
  btnText: { ...typography.button, color: colors.textInverse },
  hint: { ...typography.caption, color: colors.textSecondary },
}));

export default function DonateNowScreen() {
  const { orgId, listingId } = useLocalSearchParams<{ orgId: string; listingId?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const { external } = useExternalDonations();
  const [amount, setAmount] = useState('72');
  const [busy, setBusy] = useState(false);

  const parsed = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed >= 5;

  if (external && orgId) {
    return (
      <Screen>
        <ExternalDonationNotice kind="donate" orgId={orgId} listingId={listingId ?? null} />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.label}>{t('moneyPayments.amountLabel')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            accessibilityLabel={t('moneyPayments.amountLabel')}
          />
          <View style={styles.presets}>
            {PRESETS.map((n) => {
              const active = parsed === n;
              return (
                <Pressable
                  key={n}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setAmount(String(n))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>₪{n}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('moneyPayments.sandboxBanner')}</Text>
          <Pressable
            style={[styles.btn, (!valid || busy) && { opacity: 0.5 }]}
            disabled={!valid || busy || !orgId}
            onPress={async () => {
              setBusy(true);
              try {
                const checkout = await paymentsUseCases.donateNow().execute({
                  orgId: orgId,
                  amountIls: parsed,
                  idempotencyKey: newIdempotencyKey('donate'),
                  listingId: listingId ?? null,
                });
                const done = await paymentsUseCases.confirmDonation().execute(checkout.intentId);
                track('donation', { channel: 'money' });
                router.replace({
                  pathname: '/(tabs)/donations/money/receipt/[paymentId]',
                  params: { paymentId: done.paymentId },
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t('moneyPayments.confirmDonate')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
