// Onboarding step 4 — FR-AUTH-012
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, typography, spacing, radius, useTheme, Text } from '@kc/ui';
import { OnboardingStepHeader } from '../../src/components/OnboardingStepHeader';
import { TourSlidePager, type TourSlide } from '../../src/components/animations/TourSlidePager';
import { PressableScale } from '../../src/components/animations/PressableScale';

export default function OnboardingTourScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const slides = useMemo<readonly TourSlide[]>(
    () => [
      {
        icon: 'gift-outline',
        title: t('onboarding.tourGiveAndAskTitle'),
        body: t('onboarding.tourGiveAndAskBody'),
      },
      {
        icon: 'chatbubbles-outline',
        title: t('onboarding.tourChatTitle'),
        body: t('onboarding.tourChatBody'),
      },
      {
        icon: 'checkmark-circle-outline',
        title: t('onboarding.tourMarkDeliveredTitle'),
        body: t('onboarding.tourMarkDeliveredBody'),
      },
    ],
    [t],
  );

  const isLast = index === slides.length - 1;

  const handleNext = () => {
    if (isLast) router.replace('/(tabs)');
    else setIndex(index + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerPad}>
        <OnboardingStepHeader
          step={4}
          onSkip={() => router.replace('/(tabs)')}
          onBack={() => router.replace('/(onboarding)/photo')}
        />
      </View>
      <TourSlidePager slides={slides} index={index} onIndexChange={setIndex} />
      <View style={styles.footer}>
        <PressableScale
          style={styles.cta}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('onboarding.tourLetsStartCta') : t('onboarding.tourNextCta')}
        >
          <Text style={styles.ctaText}>{isLast ? t('onboarding.tourLetsStartCta') : t('onboarding.tourNextCta')}</Text>
          <Ionicons name="arrow-back" size={20} color={colors.textInverse} />
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  headerPad: { paddingHorizontal: spacing.xl, paddingTop: spacing.base },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.base },
  cta: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaText: { ...typography.button, color: colors.textInverse, fontSize: 16 },
}));
