// Onboarding step 2 — FR-AUTH-010
import React from 'react';
import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, radius, useTheme, Text, TextInput } from '@kc/ui';
import { CityPicker } from '../../src/components/CityPicker';
import { StreetPicker } from '../../src/components/StreetPicker';
import { OnboardingStepHeader } from '../../src/components/OnboardingStepHeader';
import { useOnboardingBasicInfoFlow } from '../../src/hooks/useOnboardingBasicInfoFlow';
import { AnimatedEntry } from '../../src/components/animations/AnimatedEntry';
import { PressableScale } from '../../src/components/animations/PressableScale';
import { staggerDelay } from '../../src/lib/animations/motion';
import { rtlTextAlignStart } from '../../src/lib/rtlTextAlignStart';

export default function OnboardingBasicInfoScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const {
    displayName, setDisplayName, city, setCity, street, setStreet, streetNumber, setStreetNumber,
    contactPhone, setContactPhone,
    loading, hasRequiredFields, canSubmit, handleBack, handleContinue, handleSkip,
  } = useOnboardingBasicInfoFlow();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <OnboardingStepHeader
              step={2}
              onSkip={handleSkip}
              onBack={handleBack}
              skipDisabled={loading}
              backDisabled={loading}
            />

            <AnimatedEntry delay={staggerDelay(0)} style={styles.iconWrap}>
              <View style={styles.iconHalo}>
                <Ionicons name="person-outline" size={32} color={colors.primary} />
              </View>
            </AnimatedEntry>

            <AnimatedEntry delay={staggerDelay(1)}>
              <Text style={styles.title}>{t('onboarding.stepBasic')}</Text>
            </AnimatedEntry>

            <AnimatedEntry delay={staggerDelay(2)}>
              <Text style={styles.subtitle}>{t('onboarding.basicInfoSubtitle')}</Text>
            </AnimatedEntry>

            <AnimatedEntry delay={staggerDelay(3)}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('onboarding.displayName')}</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder={t('onboarding.fullNamePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={50}
                  textAlign={rtlTextAlignStart}
                  editable={!loading}
                />
              </View>
            </AnimatedEntry>

            <AnimatedEntry delay={staggerDelay(4)}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('profile.addressLabel')}</Text>
                <CityPicker value={city} onChange={setCity} disabled={loading} />
              </View>
            </AnimatedEntry>

            {city ? (
              <AnimatedEntry delay={0}>
                <View style={styles.field}>
                  <View style={styles.streetRow}>
                    <View style={styles.streetCol}>
                      <StreetPicker
                        cityId={city.id}
                        value={street ? { id: '', name: street } : null}
                        onChange={(sel) => setStreet(sel.name)}
                        disabled={loading}
                      />
                    </View>
                    <TextInput
                      style={[styles.input, styles.streetInputHouse]}
                      value={streetNumber}
                      onChangeText={setStreetNumber}
                      placeholder={t('profile.streetNumberShort')}
                      placeholderTextColor={colors.textDisabled}
                      textAlign={rtlTextAlignStart}
                      editable={!loading}
                      maxLength={10}
                    />
                  </View>
                </View>
              </AnimatedEntry>
            ) : null}

            <AnimatedEntry delay={staggerDelay(5)}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('onboarding.contactPhoneLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  placeholder={t('onboarding.contactPhonePlaceholder')}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={20}
                  keyboardType="phone-pad"
                  textAlign={rtlTextAlignStart}
                  editable={!loading}
                />
              </View>
            </AnimatedEntry>
          </ScrollView>

          <AnimatedEntry delay={staggerDelay(6)}>
            <PressableScale
              style={[
                styles.cta,
                !hasRequiredFields && { opacity: 0.4 },
                hasRequiredFields && !canSubmit && { opacity: 0.85 },
              ]}
              disabled={!hasRequiredFields || loading}
              onPress={handleContinue}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.continueA11y')}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Text style={styles.ctaText}>{t('onboarding.continue')}</Text>
                  <Ionicons name="arrow-back" size={20} color={colors.textInverse} />
                </>
              )}
            </PressableScale>
          </AnimatedEntry>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
  },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing.base, paddingBottom: spacing.lg },
  iconWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  iconHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  field: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: spacing.xs,
  },
  label: { ...typography.label, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  streetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    width: '100%',
  },
  streetCol: { flex: 2, minWidth: 0 },
  streetInputHouse: { flex: 1, minWidth: 0, maxWidth: 120, height: 50 },
  input: {
    height: 54,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  cta: {
    height: 56,
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaText: { ...typography.button, color: colors.textInverse, fontSize: 16 },
}));
