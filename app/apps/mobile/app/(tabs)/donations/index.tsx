// Donations Hub — featured "items" tile + 8 categorized tiles in a 2-column grid.
// Mapped to: FR-DONATE-001 / FR-DONATE-006 / D-16.
//
// Visual hierarchy (mobile-first):
//   1. Hero with title + tagline ("Give. Take. Donate what you have.")
//   2. Featured row card for "items" — the MVP's primary action (FR-DONATE-001).
//   3. Section heading + 2-column grid for the eight category tiles.
//
// Each tile uses the shared Card + IconTile primitives so it stays in lock-step
// with the rest of the redesigned main-screen idiom (welcome-style cream
// backdrop, soft shadow, orange-tinted icon tiles, staggered spring entries).
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';
import { TopBar } from '../../../src/components/TopBar';
import { PressableScale } from '../../../src/components/animations/PressableScale';
import { Screen } from '../../../src/components/ui/Screen';
import { Card } from '../../../src/components/ui/Card';
import { IconTile } from '../../../src/components/ui/IconTile';
import { MotionEntry, ENTRY_DELAY } from '../../../src/components/ui/MotionEntry';
import { useShellTabBarScrollInset } from '../../../src/navigation/useShellTabBarVisibility';
import { useScreenAside } from '../../../src/components/aside/useScreenAside';
import { CommunityStatsAside } from '../../../src/components/aside/CommunityStatsAside';
import { rtlTextAlignStart } from '../../../src/lib/rtlTextAlignStart';

interface CategoryTile {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
  href: string;
  testID: string;
}

// `items` is rendered as a featured row above the grid — it leads the MVP flow.
const FEATURED: CategoryTile = {
  key: 'items',
  icon: 'gift',
  titleKey: 'donations.hubItemsFeaturedTitle',
  subtitleKey: 'donations.hubItemsFeaturedSubtitle',
  href: '/(tabs)',
  testID: 'donation-tile-items',
};

const TILES: CategoryTile[] = [
  { key: 'time',      icon: 'time-outline',       titleKey: 'donations.time.title',                 subtitleKey: 'donations.time.subtitle',                  href: '/(tabs)/donations/time',               testID: 'donation-tile-time' },
  { key: 'money',     icon: 'cash-outline',       titleKey: 'donations.money.title',                subtitleKey: 'donations.money.subtitle',                 href: '/(tabs)/donations/money',              testID: 'donation-tile-money' },
  { key: 'food',      icon: 'restaurant-outline', titleKey: 'donations.categories.food.title',      subtitleKey: 'donations.categories.food.subtitle',       href: '/(tabs)/donations/category/food',      testID: 'donation-tile-food' },
  { key: 'housing',   icon: 'home-outline',       titleKey: 'donations.categories.housing.title',   subtitleKey: 'donations.categories.housing.subtitle',    href: '/(tabs)/donations/category/housing',   testID: 'donation-tile-housing' },
  { key: 'transport', icon: 'car-outline',        titleKey: 'donations.rides.hubTitle', subtitleKey: 'donations.rides.hubSubtitle',  href: '/(tabs)/donations/rides', testID: 'donation-tile-rides' },
  { key: 'knowledge', icon: 'school-outline',     titleKey: 'donations.categories.knowledge.title', subtitleKey: 'donations.categories.knowledge.subtitle',  href: '/(tabs)/donations/category/knowledge', testID: 'donation-tile-knowledge' },
  { key: 'animals',   icon: 'paw-outline',        titleKey: 'donations.categories.animals.title',   subtitleKey: 'donations.categories.animals.subtitle',    href: '/(tabs)/donations/category/animals',   testID: 'donation-tile-animals' },
  { key: 'medical',   icon: 'medical-outline',    titleKey: 'donations.categories.medical.title',   subtitleKey: 'donations.categories.medical.subtitle',    href: '/(tabs)/donations/category/medical',   testID: 'donation-tile-medical' },
];

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  scrollView: { flex: 1, width: '100%', alignSelf: 'stretch' as const },
  // `paddingBottom` is supplied dynamically by `useShellTabBarScrollInset()`
  // so the last row clears the floating tab-bar pill (FR-RESP-006).
  scroll: {
    flexGrow: 1,
    alignSelf: 'stretch' as const,
    minWidth: '100%',
    paddingHorizontal: spacing.lg,
    width: '100%',
  },

  // Hero — large title + subtitle, mirrors the welcome screen scale.
  // `width: '100%'` + `rtlTextAlignStart` keeps Hebrew flush to visual right on web + native.
  heroBlock: {
    width: '100%',
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    textAlign: rtlTextAlignStart,
    lineHeight: 34,
    width: '100%',
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    marginTop: spacing.xs,
    width: '100%',
  },

  // Featured items row — IconTile on the start edge, chevron on the end edge.
  // `flexDirection: 'row'` lets RTL flip the order natively, matching the
  // SettingsScreenRow / DonationLinkRow conventions used elsewhere.
  featuredCard: {
    minHeight: 88,
    width: '100%',
    alignSelf: 'stretch' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.base,
    borderRadius: radius.xl,
    borderWidth: isDark ? 1 : 1.5,
    borderColor: isDark ? colors.border : colors.primarySurface,
    marginBottom: spacing.lg,
  },
  featuredText: { flex: 1 },
  featuredTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    marginBottom: 2,
  },
  featuredSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
  },

  // Grid — section heading then 2-col cards.
  gridHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  // RN-Web + RTL: nested blocks can shrink-wrap to inline-start without explicit stretch.
  blockStretch: { width: '100%', alignSelf: 'stretch' as const },

  // Fills leftover viewport below hero + featured so category rows share height.
  categoriesSection: { flex: 1, width: '100%', alignSelf: 'stretch' as const },
  grid: { flex: 1, gap: spacing.base, width: '100%', alignSelf: 'stretch' as const },
  gridRowMotion: { flex: 1, minHeight: 0 },
  row: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    gap: spacing.base,
    minHeight: 112,
    width: '100%',
    alignSelf: 'stretch' as const,
  },
  gridPressable: { flex: 1, alignSelf: 'stretch' as const },
  gridCard: {
    flex: 1,
    minHeight: 112,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    alignSelf: 'stretch' as const,
  },
  gridTitle: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    textAlign: 'center' as const,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  gridSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
  spacer: { flex: 1 },
}));

export default function DonationsHubScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const tabBarPad = useShellTabBarScrollInset();

  // Desktop (>=1024) aside — live community snapshot (FR-RESP-003).
  useScreenAside(() => <CommunityStatsAside />, []);

  // Pair grid tiles into rows of 2 — single row when count is odd.
  const rows: CategoryTile[][] = [];
  for (let i = 0; i < TILES.length; i += 2) {
    rows.push(TILES.slice(i, i + 2));
  }

  return (
    <Screen blobs="content">
      <TopBar />
      <ScrollView
        style={styles.scrollView}
        // RN-Web + `dir=rtl`: content can shrink-wrap and hug the inline-start
        // edge (visual right), leaving empty space on the left — stretch to viewport.
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────── */}
        <MotionEntry variant="hero" delay={ENTRY_DELAY.hero} style={styles.heroBlock}>
          <Text style={styles.heroTitle}>{t('donations.hubHeroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('donations.hubHeroSubtitle')}</Text>
        </MotionEntry>

        {/* ── Featured: items ──────────────── */}
        <MotionEntry variant="bottom" delay={ENTRY_DELAY.section} style={styles.blockStretch}>
          <PressableScale
            onPress={() => router.push(FEATURED.href as Parameters<typeof router.push>[0])}
            accessibilityRole="button"
            accessibilityLabel={`${t(FEATURED.titleKey)} — ${t(FEATURED.subtitleKey)}`}
            style={styles.blockStretch}
          >
            <Card padding="base" style={styles.featuredCard} testID={FEATURED.testID}>
              <IconTile icon={FEATURED.icon} size="lg" />
              <View style={styles.featuredText}>
                <Text style={styles.featuredTitle} numberOfLines={1}>
                  {t(FEATURED.titleKey)}
                </Text>
                <Text style={styles.featuredSubtitle} numberOfLines={2}>
                  {t(FEATURED.subtitleKey)}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </Card>
          </PressableScale>
        </MotionEntry>

        {/* ── Category grid ────────────────── */}
        <View style={styles.categoriesSection}>
          <MotionEntry variant="bottom" delay={ENTRY_DELAY.section + 80} style={styles.blockStretch}>
            <Text style={styles.gridHeading}>{t('donations.hubCategoriesSectionTitle')}</Text>
          </MotionEntry>

          <View style={styles.grid}>
            {rows.map((pair, rowIdx) => (
              <MotionEntry
                key={pair.map((c) => c.key).join('-')}
                variant="bottom"
                delay={ENTRY_DELAY.buttons + rowIdx * 80}
                style={[styles.gridRowMotion, styles.blockStretch]}
              >
                <View style={styles.row}>
                  {pair.map((cat) => (
                    <PressableScale
                      key={cat.key}
                      onPress={() => router.push(cat.href as Parameters<typeof router.push>[0])}
                      accessibilityRole="button"
                      accessibilityLabel={`${t(cat.titleKey)} — ${t(cat.subtitleKey)}`}
                      style={styles.gridPressable}
                    >
                      <Card padding="md" style={styles.gridCard} testID={cat.testID}>
                        <IconTile icon={cat.icon} size="lg" />
                        <Text style={styles.gridTitle} numberOfLines={1}>
                          {t(cat.titleKey)}
                        </Text>
                        <Text style={styles.gridSubtitle} numberOfLines={2}>
                          {t(cat.subtitleKey)}
                        </Text>
                      </Card>
                    </PressableScale>
                  ))}
                  {pair.length === 1 ? <View style={styles.spacer} /> : null}
                </View>
              </MotionEntry>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
