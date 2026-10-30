// Password reset landing route — FR-AUTH-008.
// Receives `?token_hash=...&type=recovery` from the reset email (or `?code=`
// from the default PKCE template, same browser only). The single-use token is
// consumed only when the user submits a valid new password; afterwards every
// session is revoked and the user signs in again on every device (AC2, AC3).
// Reachable while signed out (AuthGate). Sibling of auth/verify.tsx.
// docs/SSOT/spec/01_auth_and_onboarding.md
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Text } from '@kc/ui';
import { isAuthError } from '@kc/application';
import { getResetPasswordUseCase } from '../../src/services/authComposition';
import { mapAuthErrorToHebrew } from '../../src/services/authMessages';
import { AnimatedAuthInput } from '../../src/components/auth/AnimatedAuthInput';
import { usePasswordResetStyles } from '../../src/components/auth/passwordResetScreen.styles';

type Phase = 'form' | 'done' | 'invalid';

/** Errors meaning the link itself is unusable (expired, used, or malformed). */
const INVALID_LINK_CODES = new Set(['session_expired', 'authentication_failed', 'invalid_credentials']);

export default function ResetPasswordScreen() {
  const styles = usePasswordResetStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token_hash?: string; code?: string }>();
  const tokenHash = typeof params.token_hash === 'string' && params.token_hash ? params.token_hash : undefined;
  const code = typeof params.code === 'string' && params.code ? params.code : undefined;

  const [phase, setPhase] = useState<Phase>(tokenHash || code ? 'form' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (password !== confirm) {
      setError(t('auth.resetPasswordMismatch'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await getResetPasswordUseCase().execute({ tokenHash, code, newPassword: password });
      setPhase('done');
    } catch (err) {
      if (isAuthError(err) && INVALID_LINK_CODES.has(err.code)) setPhase('invalid');
      else setError(isAuthError(err) ? mapAuthErrorToHebrew(err.code) : t('auth.callbackGenericError'));
    } finally {
      setLoading(false);
    }
  };

  if (phase !== 'form') {
    const done = phase === 'done';
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t(done ? 'auth.resetPasswordDoneTitle' : 'auth.verifyFailedTitle')}</Text>
          <Text style={styles.body}>{t(done ? 'auth.resetPasswordDoneBody' : 'auth.resetPasswordInvalidLink')}</Text>
          <TouchableOpacity
            testID="reset-password-next"
            style={styles.primaryBtn}
            onPress={() => router.replace(done ? '/(auth)/sign-in' : '/(auth)/forgot-password')}
          >
            <Text style={styles.primaryBtnText}>{t(done ? 'auth.backToSignInCta' : 'auth.requestNewResetLinkCta')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('auth.resetPasswordTitle')}</Text>
          <AnimatedAuthInput
            testID="reset-password-new"
            label={t('auth.passwordRuleLabel')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholderNew')}
            secureTextEntry
            autoComplete="new-password"
            editable={!loading}
          />
          <AnimatedAuthInput
            testID="reset-password-confirm"
            label={t('auth.resetPasswordConfirmLabel')}
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('auth.passwordPlaceholderNew')}
            secureTextEntry
            autoComplete="new-password"
            editable={!loading}
            onSubmitEditing={onSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            testID="reset-password-submit"
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>{t('auth.resetPasswordSubmitCta')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
