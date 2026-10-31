// FR-RIDE-034 + FR-RIDE-035 — active ride screen with emergency button.
// Visible to the ride owner + every snapshot participant. Owner sees start /
// arrive CTAs (status-gated); riders see the elapsed timer + 🚨 button.
import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Text } from '@kc/ui';

import { TopBar } from '../../../components/TopBar';
import { Screen } from '../../../components/ui/Screen';
import { useShellTabBarScrollInset } from '../../../navigation/useShellTabBarVisibility';

import { useActiveRide } from '../hooks/useActiveRide';
import { useActiveRideActions } from '../hooks/useActiveRideActions';
import { useActiveRideScreenStyles } from './activeRideScreen.styles';

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hours > 0 ? `${pad(hours)}:` : ''}${pad(mins)}:${pad(secs)}`;
}

export function ActiveRideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = typeof id === 'string' ? id : null;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useActiveRideScreenStyles();
  const router = useRouter();
  const tabBarPad = useShellTabBarScrollInset();

  const active = useActiveRide(rideId);
  const actions = useActiveRideActions(active.refetch);

  const ride = active.ride;
  const status = ride?.status;
  const openEmergency = active.emergencies.find((e) => !e.resolvedAt);
  const startedAtLabel = ride?.startedAt
    ? format(new Date(ride.startedAt), 'dd/MM HH:mm', { locale: dateFnsHe })
    : '—';

  const canStart =
    active.isOwner &&
    status === 'open' &&
    ride !== undefined &&
    new Date(ride.departsAt).getTime() - 30 * 60_000 <= Date.now();
  const canArrive = active.isOwner && status === 'in_transit';

  const handleOpenWaze = () => {
    if (!ride) return;
    const dest = encodeURIComponent(
      ride.destCityName + (ride.destStreet ? `, ${ride.destStreet}` : ''),
    );
    Linking.openURL(`https://waze.com/ul?q=${dest}&navigate=yes`).catch(() => undefined);
  };

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

  if (active.isLoading || !ride) {
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
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarPad + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void active.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('general.back')}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>{t('donations.rides.active.title')}</Text>
          <View style={styles.titleSpacer} />
        </View>

        {openEmergency ? (
          <View style={styles.emergencyBanner}>
            <Ionicons name="warning" size={20} color={colors.textInverse} />
            <Text style={styles.emergencyBannerText}>
              {t('donations.rides.active.emergencyActive')}
            </Text>
          </View>
        ) : null}

        <View style={styles.summary}>
          <Text style={styles.rideTitle} numberOfLines={2}>
            {ride.title}
          </Text>
          <Text style={styles.route}>
            {ride.originCityName} → {ride.destCityName}
          </Text>
          <Text style={styles.meta}>
            {t('donations.rides.active.startedAt')}: {startedAtLabel}
          </Text>
          {active.elapsedSinceStartMs != null ? (
            <Text style={styles.elapsed}>{formatElapsed(active.elapsedSinceStartMs)}</Text>
          ) : null}
          {ride.arrivedAt ? (
            <Text style={styles.meta}>
              {t('donations.rides.active.arrivedAt')}:{' '}
              {format(new Date(ride.arrivedAt), 'dd/MM HH:mm', { locale: dateFnsHe })}
            </Text>
          ) : null}
        </View>

        {active.isOwner ? (
          <View style={styles.ownerActions}>
            {canStart ? (
              <Pressable
                style={[styles.primaryBtn, actions.busy === 'start' && styles.btnDisabled]}
                onPress={() => void actions.start(rideId)}
                disabled={actions.busy !== null}
                accessibilityRole="button"
              >
                {actions.busy === 'start' ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color={colors.textInverse} />
                    <Text style={styles.primaryBtnText}>
                      {t('donations.rides.active.startCta')}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
            {canArrive ? (
              <>
                <Pressable
                  style={[styles.primaryBtn, actions.busy === 'arrived' && styles.btnDisabled]}
                  onPress={() => actions.arrive(rideId, 'arrived')}
                  disabled={actions.busy !== null}
                  accessibilityRole="button"
                >
                  {actions.busy === 'arrived' ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="flag" size={18} color={colors.textInverse} />
                      <Text style={styles.primaryBtnText}>
                        {t('donations.rides.active.arriveCta')}
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.secondaryBtn, actions.busy === 'breakdown' && styles.btnDisabled]}
                  onPress={() => actions.arrive(rideId, 'breakdown')}
                  disabled={actions.busy !== null}
                  accessibilityRole="button"
                >
                  <Ionicons name="construct-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.secondaryBtnText}>
                    {t('donations.rides.active.breakdownCta')}
                  </Text>
                </Pressable>
              </>
            ) : null}
            <Pressable style={styles.linkBtn} onPress={handleOpenWaze} accessibilityRole="button">
              <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              <Text style={styles.linkBtnText}>{t('donations.rides.active.openWaze')}</Text>
            </Pressable>
          </View>
        ) : null}

        {active.isSnapshotParticipant && status === 'in_transit' ? (
          <Pressable
            style={[styles.emergencyBtn, actions.busy === 'emergency' && styles.btnDisabled]}
            onPress={() => actions.emergency(rideId)}
            disabled={actions.busy !== null}
            accessibilityRole="button"
            accessibilityLabel={t('donations.rides.active.emergencyCtaA11y')}
          >
            {actions.busy === 'emergency' ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="warning" size={22} color={colors.textInverse} />
                <Text style={styles.emergencyBtnText}>
                  {t('donations.rides.active.emergencyCta')}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
