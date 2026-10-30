// Floating glass-pill bottom navigation — rendered once at the root layout
// (ShellWithTabBar). The visible bar lives here; expo-router's <Tabs> in
// (tabs)/_layout.tsx suppresses its built-in bar so there is exactly one
// implementation across iOS / Android / Web.
// Mapped to: SRS §6.1 — 5 tabs (RTL: Profile | Search | Plus | Donations | Home), per D-16.
import React from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, useTheme } from '@kc/ui';
import { TABS, resolveActiveTabKey, type IoniconName } from './shell/tabs.config';

// Glassmorphism on web — RN-Web forwards unknown style keys to CSS. RN's
// ViewStyle type doesn't include backdrop-filter, so cast through unknown.
const webGlass: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      } as unknown as ViewStyle)
    : ({} as ViewStyle);

export const TAB_BAR_HEIGHT = 60;

interface IconBtnProps {
  active: boolean;
  onPress: () => void;
  label: string;
  /** Stable E2E selector (`tab-<key>`), independent of the UI language (KC#1235). */
  testID: string;
  iconActive: IoniconName;
  iconInactive: IoniconName;
}

function IconBtn({ active, onPress, label, testID, iconActive, iconInactive }: IconBtnProps) {
  const styles = useTabBarStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabBtn, pressed && styles.tabBtnPressed]}
    >
      <View style={[styles.iconSlot, active && styles.iconSlotActive]}>
        <Ionicons
          key={active ? iconActive : iconInactive}
          name={active ? iconActive : iconInactive}
          size={active ? 28 : 24}
          color={active ? colors.tabActive : colors.tabInactive}
        />
      </View>
    </Pressable>
  );
}

interface PlusBtnProps {
  active: boolean;
  onPress: () => void;
  label: string;
  testID: string;
}

function PlusBtn({ active, onPress, label, testID }: PlusBtnProps) {
  const styles = useTabBarStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabBtn, pressed && styles.tabBtnPressed]}
    >
      <View style={[styles.plusCircle, active && styles.plusCircleActive]}>
        <Ionicons name="add" size={26} color={colors.textInverse} />
      </View>
    </Pressable>
  );
}

export function TabBar({ bottomInset = 0 }: Readonly<{ bottomInset?: number }> = {}) {
  const router = useRouter();
  const { t } = useTranslation();
  const segments = useSegments() as string[];
  const active = resolveActiveTabKey(segments);
  const styles = useTabBarStyles();

  return (
    <View
      testID="shell-tab-bar"
      style={[styles.tabBar, { height: TAB_BAR_HEIGHT + bottomInset, paddingBottom: bottomInset }]}
    >
      {/* RTL reading order: Profile (right) | Search | Plus (center) | Donations | Home (left).
          With dir=rtl on web and I18nManager.isRTL on native, default `row` lays them out
          right-to-left. `row-reverse` would double-flip on web → LTR visual.
          Tab definitions live in ./shell/tabs.config.ts so NavigationRail (Task 9) can reuse them. */}
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const label = t(tab.labelI18nKey);
        const onPress = () => router.push(tab.route);
        if (tab.isComposer) {
          return (
            <PlusBtn key={tab.key} active={isActive} onPress={onPress} label={label} testID={`tab-${tab.key}`} />
          );
        }
        return (
          <IconBtn
            key={tab.key}
            active={isActive}
            onPress={onPress}
            label={label}
            testID={`tab-${tab.key}`}
            iconActive={tab.iconActive}
            iconInactive={tab.iconInactive}
          />
        );
      })}
    </View>
  );
}

const useTabBarStyles = makeUseStyles(({ colors, isDark }) => ({
  tabBar: {
    flexDirection: 'row' as const,
    height: TAB_BAR_HEIGHT,
    // Docked flush with the screen bottom (#1213): only top corners rounded.
    borderTopStartRadius: radius.xl,
    borderTopEndRadius: radius.xl,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.tabBarGlass,
    alignItems: 'center' as const,
    width: '100%' as const,
    alignSelf: 'center' as const,
    overflow: 'hidden' as const,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.45 : 0.14,
    shadowRadius: 28,
    elevation: 12,
    // Subtle hairline so the pill reads as a distinct surface in dark mode
    // where the underlying background and the glass tint are both dark.
    borderWidth: 1,
    borderColor: colors.border,
    ...webGlass,
  },
  tabBtn: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  tabBtnPressed: { opacity: 0.6 },
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconSlotActive: {
    backgroundColor: colors.primarySurface,
  },
  plusCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  plusCircleActive: { backgroundColor: colors.primaryDark },
}));
