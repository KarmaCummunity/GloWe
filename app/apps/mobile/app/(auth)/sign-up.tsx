// Sign-up with email/password — FR-AUTH-006
import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
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
import { makeUseStyles, typography, spacing, radius, useTheme, Text } from '@kc/ui';
import { isAuthError } from '@kc/application';
import { getSignUpUseCase, AUTH_VERIFY_URL } from '../../src/services/authComposition';
import { useAuthStore } from '../../src/store/authStore';
import { mapAuthErrorToHebrew } from '../../src/services/authMessages';
import { VerificationPendingPanel } from '../../src/components/auth/VerificationPendingPanel';
import { NotifyModal } from '../../src/components/NotifyModal';
import { AuthBackground } from '../../src/components/auth/AuthBackground';
import { AnimatedAuthInput } from '../../src/components/auth/AnimatedAuthInput';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';
import { AuthSocialSignInBlock } from '../../src/components/auth/AuthSocialSignInBlock';
import { trackCoreLoop } from '../../src/lib/analyticsCoreLoop';

export default function SignUpScreen() {
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

  const handleSignUp = async () => {
    if (!email || !password) {
      setNotify({ title: t('auth.genericErrorTitle'), message: t('auth.fillAllFields') });
      return;
    }
    setLoading(true);
    try {
      const { session, pendingVerification } = await getSignUpUseCase().execute({
        email, password, emailRedirectTo: AUTH_VERIFY_URL,
      });
      trackCoreLoop('signup', { method: 'email' });
      if (session) { setSession(session); return; }
      if (pendingVerification) setPendingEmail(email.trim().toLowerCase());
    } catch (err) {
      const message = isAuthError(err) ? mapAuthErrorToHebrew(err.code) : t('auth.networkError');
      setNotify({ title: t('auth.signUpFailedTitle'), message });
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
              <Text style={styles.title}>{t('auth.signUp')}</Text>
              <Text style={styles.subtitle}>{t('auth.signUpSubtitle')}</Text>

              {!pendingEmail ? <AuthSocialSignInBlock /> : null}

              {pendingEmail ? (
                <VerificationPendingPanel email={pendingEmail} onChangeEmail={() => setPendingEmail(null)} />
              ) : null}

              <View style={[styles.form, pendingEmail ? styles.hidden : null]}>
                <AnimatedAuthInput
                  label={t('auth.email')}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <AnimatedAuthInput
                  label={t('auth.passwordRuleLabel')}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordPlaceholderNew')}
                  secureTextEntry
                  editable={!loading}
                />
                <SubmitButton label={t('auth.signUp')} loading={loading} onPress={handleSignUp} />
              </View>

              {!pendingEmail ? (
                <>
                  <Text style={styles.legal}>{t('auth.bySigningUp')}</Text>
                  <TouchableOpacity
                    style={styles.switchMode}
                    onPress={() => router.replace('/(auth)/sign-in')}
                    disabled={loading}
                  >
                    <Text style={styles.switchModeText}>{t('auth.hasAccountSwitchCta')}</Text>
                  </TouchableOpacity>
                </>
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
  title: { ...typography.h1, color: colors.textPrimary, textAlign: rtlTextAlignStart, marginBottom: 4 },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart, marginBottom: spacing.xl },
  form: { gap: spacing.base },
  hidden: { display: 'none' },
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
  legal: { ...typography.caption, color: colors.textDisabled, textAlign: 'center', marginTop: spacing.xl },
  switchMode: { marginTop: spacing.md, alignItems: 'center' },
  switchModeText: { ...typography.body, color: colors.primary },
}));
