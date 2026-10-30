// Sign-in with email/password — FR-AUTH-007 (email path)
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { makeUseStyles, typography, spacing, radius, useTheme } from '@kc/ui';
import { isAuthError } from '@kc/application';
import { mapAuthErrorToHebrew } from '../../src/services/authMessages';
import { getSignInUseCase } from '../../src/services/authComposition';
import { useAuthStore } from '../../src/store/authStore';
import { VerificationPendingPanel } from '../../src/components/auth/VerificationPendingPanel';
import { NotifyModal } from '../../src/components/NotifyModal';
import { AuthBackground } from '../../src/components/auth/AuthBackground';
import { AnimatedAuthInput } from '../../src/components/auth/AnimatedAuthInput';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';
import { AuthSocialSignInBlock } from '../../src/components/auth/AuthSocialSignInBlock';

export default function SignInScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [notify, setNotify] = useState<{ title: string; message: string } | null>(null);

  // ── Entry animation ───────────────────────────────────────────────────
  const screenOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);
  const formOpacity = useSharedValue(0);
  const formTranslate = useSharedValue(30);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerTranslate.value = withSpring(0, { damping: 20, stiffness: 120 });
    formOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    formTranslate.value = withDelay(150, withSpring(0, { damping: 18, stiffness: 100 }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: headerTranslate.value }] }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslate.value }],
  }));

  const handleSignIn = async () => {
    if (!email || !password) {
      setNotify({ title: t('auth.genericErrorTitle'), message: t('auth.fillEmailAndPassword') });
      return;
    }
    setLoading(true);
    try {
      const { session } = await getSignInUseCase().execute({ email, password });
      setSession(session);
    } catch (err) {
      if (isAuthError(err) && err.code === 'email_not_verified') {
        setPendingEmail(email.trim().toLowerCase());
        return;
      }
      const message = isAuthError(err) ? mapAuthErrorToHebrew(err.code) : t('auth.networkError');
      setNotify({ title: t('auth.signInFailedTitle'), message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AuthBackground />
      <Animated.View style={[{ flex: 1 }, screenStyle]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.content}>

            {/* Header */}
            <Animated.View style={[styles.header, headerStyle]}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-forward" size={22} color="#F97316" />
              </TouchableOpacity>
              <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            {/* Form card */}
            <Animated.View style={[styles.card, formStyle]}>
              <Text style={styles.title}>{t('auth.signInScreenTitle')}</Text>

              {!pendingEmail ? <AuthSocialSignInBlock /> : null}

              {pendingEmail ? (
                <VerificationPendingPanel email={pendingEmail} onChangeEmail={() => setPendingEmail(null)} />
              ) : null}

              <View style={[styles.form, pendingEmail ? styles.hidden : null]}>
                <AnimatedAuthInput
                  testID="auth-email"
                  label={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <AnimatedAuthInput
                  testID="auth-password"
                  label={t('auth.password')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordPlaceholder')}
                  secureTextEntry
                  editable={!loading}
                />
                <TouchableOpacity
                  testID="auth-forgot-password"
                  disabled={loading}
                  onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email } })}
                >
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
                <SubmitButton label={t('auth.signIn')} loading={loading} onPress={handleSignIn} />
              </View>

              {!pendingEmail ? (
                <TouchableOpacity
                  style={styles.switchMode}
                  onPress={() => router.replace('/(auth)/sign-up')}
                  disabled={loading}
                >
                  <Text style={styles.switchModeText}>{t('auth.noAccountSwitchCta')}</Text>
                </TouchableOpacity>
              ) : null}
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
      <NotifyModal
        visible={notify !== null}
        title={notify?.title ?? ''}
        message={notify?.message ?? ''}
        onDismiss={() => setNotify(null)}
      />
    </SafeAreaView>
  );
}

function SubmitButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[pressStyle, { marginTop: spacing.sm }]}>
      <TouchableOpacity
        testID="auth-submit"
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        activeOpacity={1}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitBtnText}>{label}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  container: { flex: 1, backgroundColor: colors.surfaceCream },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: { padding: spacing.sm },
  logo: { width: 48, height: 48, borderRadius: 12 },
  card: {
    backgroundColor: colors.surface,

    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? colors.border : 'transparent',
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.08,
    shadowRadius: 16,
    elevation: isDark ? 0 : 4,
  },
  title: { ...typography.h1, color: colors.textPrimary, textAlign: rtlTextAlignStart, marginBottom: spacing.xl },
  form: { gap: spacing.base },
  hidden: { display: 'none' },
  forgotText: { ...typography.body, color: colors.primary, textAlign: rtlTextAlignStart },
  submitBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.65, shadowOpacity: 0 },
  submitBtnText: { ...typography.button, fontSize: 16, color: colors.textInverse },
  switchMode: { marginTop: spacing.xl, alignItems: 'center' },
  switchModeText: { ...typography.body, color: colors.primary },
}));
