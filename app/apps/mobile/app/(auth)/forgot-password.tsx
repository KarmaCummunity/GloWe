// Forgot password — FR-AUTH-008 (email accounts).
// Sends a reset link and always shows the same confirmation, whether or not
// the address is registered (AC1, anti-enumeration). The link lands on
// `/auth/reset-password`.
// docs/SSOT/spec/01_auth_and_onboarding.md
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Text } from '@kc/ui';
import { isAuthError } from '@kc/application';
import { AUTH_RESET_PASSWORD_URL, getRequestPasswordResetUseCase } from '../../src/services/authComposition';
import { mapAuthErrorToHebrew } from '../../src/services/authMessages';
import { AnimatedAuthInput } from '../../src/components/auth/AnimatedAuthInput';
import { usePasswordResetStyles } from '../../src/components/auth/passwordResetScreen.styles';

export default function ForgotPasswordScreen() {
  const styles = usePasswordResetStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  // Prefilled when opened from the sign-in screen.
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim()) {
      setError(t('auth.forgotPasswordEmailRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await getRequestPasswordResetUseCase().execute({ email, redirectTo: AUTH_RESET_PASSWORD_URL });
      setSent(true);
    } catch (err) {
      setError(isAuthError(err) ? mapAuthErrorToHebrew(err.code) : t('auth.callbackGenericError'));
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = () => router.replace('/(auth)/sign-in');

  if (sent) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('auth.forgotPasswordSentTitle')}</Text>
          <Text style={styles.body}>{t('auth.forgotPasswordSentBody')}</Text>
          <TouchableOpacity testID="forgot-password-back" style={styles.primaryBtn} onPress={backToSignIn}>
            <Text style={styles.primaryBtnText}>{t('auth.backToSignInCta')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={styles.body}>{t('auth.forgotPasswordBody')}</Text>
          <AnimatedAuthInput
            testID="forgot-password-email"
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
            onSubmitEditing={onSubmit}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            testID="forgot-password-submit"
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>{t('auth.forgotPasswordSubmitCta')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={backToSignIn} disabled={loading}>
            <Text style={styles.linkBtnText}>{t('auth.backToSignInCta')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
