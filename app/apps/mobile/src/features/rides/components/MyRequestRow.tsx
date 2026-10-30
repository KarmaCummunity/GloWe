// FR-RIDE-025 — single passenger-side request row.
// Fetches the linked ride lazily so we get title + route + departure.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import type { RideParticipant } from '@kc/domain';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';

import { Card } from '../../../components/ui/Card';
import { AvatarInitials } from '../../../components/AvatarInitials';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { getUserRepo } from '../../../services/userComposition';
import {
  getCancelRideJoinUseCase,
  getRideListingUseCase,
} from '../composition/ridesComposition';

interface Props {
  readonly request: RideParticipant;
}

const LATE_CANCEL_MS = 30 * 60_000; // FR-RIDE-042 — free cancel window.

export function MyRequestRow({ request }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);

  const rideQuery = useQuery({
    queryKey: ['rides', 'detail', request.rideId],
    queryFn: () => getRideListingUseCase().execute({ rideId: request.rideId, viewerId: '' }),
    staleTime: 60_000,
  });
  const ride = rideQuery.data;

  const ownerQuery = useQuery({
    queryKey: ['user', ride?.ownerId ?? null],
    queryFn: () => (ride ? getUserRepo().findById(ride.ownerId) : Promise.resolve(null)),
    enabled: Boolean(ride),
    staleTime: 60_000,
  });
  const ownerName = ownerQuery.data?.displayName ?? t('profile.fallbackName');

  const isPending = request.status === 'requested';
  const isApprovedFuture = request.status === 'approved' && ride && new Date(ride.departsAt).getTime() > Date.now();

  const cancellableDirect = isPending; // requested → cancel: always free.
  const cancellableWithWarn = isApprovedFuture; // approved → cancel: warn if < 30 min.

  const isLateWindow = ride
    ? new Date(ride.departsAt).getTime() - Date.now() < LATE_CANCEL_MS
    : false;

  const doCancel = async () => {
    setBusy(true);
    try {
      await getCancelRideJoinUseCase().execute({ participantId: request.participantId });
      await queryClient.invalidateQueries({ queryKey: ['rides', 'my-requests'] });
    } finally {
      setBusy(false);
    }
  };

  const handleCancelPress = () => {
    if (cancellableDirect) {
      void doCancel();
      return;
    }
    if (cancellableWithWarn) {
      if (isLateWindow) {
        // FR-RIDE-039 AC1 — warn about rating-impact for late cancel.
        Alert.alert(
          t('donations.rides.requests.cancelLateTitle'),
          t('donations.rides.requests.cancelLateMessage'),
          [
            { text: t('general.back'), style: 'cancel' },
            {
              text: t('donations.rides.requests.cancelConfirm'),
              style: 'destructive',
              onPress: () => void doCancel(),
            },
          ],
        );
      } else {
        void doCancel();
      }
    }
  };

  const statusPill = (() => {
    switch (request.status) {
      case 'requested':
        return { key: 'donations.rides.requests.statusPending', tint: colors.warning, bg: colors.warningLight };
      case 'approved':
        return { key: 'donations.rides.requests.statusApproved', tint: colors.success, bg: colors.successLight };
      case 'rejected':
        return { key: 'donations.rides.requests.statusRejected', tint: colors.error, bg: colors.errorLight };
      case 'cancelled':
        return { key: 'donations.rides.requests.statusCancelled', tint: colors.textSecondary, bg: colors.skeleton };
    }
  })();

  return (
    <Card padding="base" style={styles.card}>
      <Pressable
        onPress={() =>
          router.push(`/(tabs)/donations/rides/${request.rideId}`)
        }
        accessibilityRole="button"
        accessibilityLabel={ride?.title ?? t('donations.rides.requests.title')}
        style={styles.headerBlock}
      >
        <View style={styles.topRow}>
          <View style={[styles.pill, { backgroundColor: statusPill.bg }]}>
            <Text style={[styles.pillText, { color: statusPill.tint }]}>{t(statusPill.key)}</Text>
          </View>
          {ride ? (
            <Text style={styles.timeText}>
              {format(new Date(ride.departsAt), 'dd/MM HH:mm', { locale: dateFnsHe })}
            </Text>
          ) : null}
        </View>
        {ride ? (
          <>
            <Text style={styles.title} numberOfLines={2}>
              {ride.title}
            </Text>
            <Text style={styles.route} numberOfLines={1}>
              {ride.originCityName} → {ride.destCityName}
            </Text>
            <View style={styles.ownerRow}>
              <AvatarInitials
                name={ownerName}
                avatarUrl={ownerQuery.data?.avatarUrl ?? null}
                size={28}
              />
              <Text style={styles.ownerName} numberOfLines={1}>
                {ownerName}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.titleSkeleton}>{t('donations.rides.requests.loadingRide')}</Text>
        )}
      </Pressable>

      {(cancellableDirect || cancellableWithWarn) ? (
        <Pressable
          style={[styles.cancelBtn, busy && styles.btnDisabled]}
          onPress={handleCancelPress}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.error} size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={styles.cancelBtnText}>
                {cancellableDirect
                  ? t('donations.rides.requests.cancelRequest')
                  : t('donations.rides.requests.cancelSeat')}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}
    </Card>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: { gap: spacing.sm },
  headerBlock: { gap: 4 },
  topRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  timeText: { ...typography.caption, color: colors.textSecondary },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  pillText: { ...typography.caption, fontWeight: '600' as const },
  title: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    width: '100%',
  },
  titleSkeleton: {
    ...typography.body,
    color: colors.textDisabled,
    textAlign: rtlTextAlignStart,
  },
  route: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  ownerRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  ownerName: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    textAlign: rtlTextAlignStart,
  },
  cancelBtn: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.errorLight,
  },
  cancelBtnText: { ...typography.caption, color: colors.error, fontWeight: '700' as const },
  btnDisabled: { opacity: 0.5 },
}));
