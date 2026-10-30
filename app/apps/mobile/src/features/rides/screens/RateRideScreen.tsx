// FR-RIDE-037 — post-ride ratings screen.
// Shows the list of counterpart users to rate (driver-rates-rider or
// rider-rates-driver, never rider-to-rider).
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, spacing, typography, useTheme, Text } from '@kc/ui';

import { TopBar } from '../../../components/TopBar';
import { Screen } from '../../../components/ui/Screen';
import { useShellTabBarScrollInset } from '../../../navigation/useShellTabBarVisibility';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { useAuthStore } from '../../../store/authStore';
import {
  getListRideParticipantsUseCase,
  getListRideRatingsUseCase,
  getRideListingUseCase,
} from '../composition/ridesComposition';
import { RateeCard, type RateeTarget } from '../components/RateeCard';

export function RateRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = typeof id === 'string' ? id : null;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const tabBarPad = useShellTabBarScrollInset();
  const viewerId = useAuthStore((s) => s.session?.userId ?? null);

  const rideQuery = useQuery({
    queryKey: ['rides', 'detail', rideId],
    queryFn: () =>
      rideId ? getRideListingUseCase().execute({ rideId, viewerId: viewerId ?? '' }) : null,
    enabled: Boolean(rideId),
  });

  const participantsQuery = useQuery({
    queryKey: ['rides', 'participants', rideId],
    queryFn: () =>
      rideId ? getListRideParticipantsUseCase().execute({ rideId }) : Promise.resolve([]),
    enabled: Boolean(rideId),
  });

  const ratingsQuery = useQuery({
    queryKey: ['rides', 'ratings', rideId],
    queryFn: () =>
      rideId ? getListRideRatingsUseCase().execute(rideId) : Promise.resolve([]),
    enabled: Boolean(rideId),
  });

  const ride = rideQuery.data ?? undefined;
  const targets = useMemo<RateeTarget[]>(() => {
    if (!ride || !viewerId) return [];
    const isOwner = ride.ownerId === viewerId;
    if (isOwner) {
      return (participantsQuery.data ?? [])
        .filter((p) => p.joinedActiveAt != null && p.userId !== viewerId)
        .map((p) => ({ userId: p.userId, role: 'rider' as const }));
    }
    const me = (participantsQuery.data ?? []).find((p) => p.userId === viewerId);
    if (me && me.joinedActiveAt != null) {
      return [{ userId: ride.ownerId, role: 'owner' as const }];
    }
    return [];
  }, [ride, viewerId, participantsQuery.data]);

  const alreadyRatedIds = useMemo(
    () =>
      new Set(
        (ratingsQuery.data ?? []).filter((r) => r.raterId === viewerId).map((r) => r.rateeId),
      ),
    [ratingsQuery.data, viewerId],
  );

  if (!rideId) {
    return (
      <Screen blobs="content">
        <TopBar />
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{t('donations.rides.notFoundTitle')}</Text>
        </View>
      </Screen>
    );
  }

  if (rideQuery.isLoading || !ride) {
    return (
      <Screen blobs="content">
        <TopBar />
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen blobs="content">
      <TopBar />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarPad + 32 }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('general.back')}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('donations.rides.rate.title')}</Text>
          <View style={styles.titleSpacer} />
        </View>

        <Text style={styles.subtitle}>{ride.title}</Text>
        <Text style={styles.route}>
          {ride.originCityName} → {ride.destCityName}
        </Text>

        {targets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('donations.rides.rate.nothingToRate')}</Text>
          </View>
        ) : (
          targets.map((target) => (
            <RateeCard
              key={target.userId}
              rideId={rideId}
              target={target}
              alreadyRated={alreadyRatedIds.has(target.userId)}
              onSubmitted={() => void ratingsQuery.refetch()}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  centerWrap: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  errorText: { ...typography.body, color: colors.textSecondary },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  titleRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  title: { ...typography.h2, color: colors.textPrimary, flex: 1, textAlign: rtlTextAlignStart },
  titleSpacer: { width: 22 },
  subtitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    marginBottom: 4,
  },
  route: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    marginBottom: spacing.lg,
  },
  emptyState: { alignItems: 'center' as const, paddingVertical: spacing.xl },
  emptyText: { ...typography.body, color: colors.textSecondary },
}));
