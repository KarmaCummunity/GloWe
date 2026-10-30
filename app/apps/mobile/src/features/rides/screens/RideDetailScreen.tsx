// FR-RIDE-004 — ride detail, contact, owner close/cancel, report owner.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { makeUseStyles, radius, spacing, typography, useTheme, Text } from '@kc/ui';
import { Screen } from '../../../components/ui/Screen';
import { Card } from '../../../components/ui/Card';
import { IconTile } from '../../../components/ui/IconTile';
import { AvatarInitials } from '../../../components/AvatarInitials';
import { EmptyState } from '../../../components/EmptyState';
import { ReportUserModal } from '../../../components/profile/ReportUserModal';
import { useAuthStore } from '../../../store/authStore';
import { getUserRepo } from '../../../services/userComposition';
import { getRideListingUseCase, getCloseRideListingUseCase } from '../composition/ridesComposition';
import { contactRidePublisher } from '../lib/contactRidePublisher';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { useShellTabBarScrollInset } from '../../../navigation/useShellTabBarVisibility';
import { formatRideAddress } from '../lib/formatRideAddress';

const useStyles = makeUseStyles(({ colors }) => ({
  scroll: { padding: spacing.lg, gap: spacing.lg, maxWidth: 480, alignSelf: 'center' as const, width: '100%' },
  card: { gap: spacing.md },
  badge: {
    alignSelf: 'flex-end' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeOffer: { backgroundColor: colors.giveTagBg },
  badgeRequest: { backgroundColor: colors.requestTagBg },
  badgeText: { ...typography.caption, fontWeight: '600' as const },
  title: { ...typography.h2, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  meta: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  body: { ...typography.bodyLarge, color: colors.textPrimary, textAlign: rtlTextAlignStart, lineHeight: 24 },
  ownerRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: spacing.md,
  },
  ownerName: { ...typography.body, fontWeight: '600' as const, color: colors.textPrimary, flex: 1 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
  },
  primaryBtnText: { ...typography.button, color: colors.textInverse },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
  },
  secondaryBtnText: { ...typography.button, color: colors.textPrimary },
  dangerBtn: {
    borderWidth: 1.5,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center' as const,
  },
  dangerBtnText: { ...typography.button, color: colors.error },
  center: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const },
}));

export function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rideId = Array.isArray(id) ? id[0] : id;
  const { t } = useTranslation();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const viewerId = useAuthStore((s) => s.session?.userId ?? null);
  const tabBarPad = useShellTabBarScrollInset();

  const [contactBusy, setContactBusy] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const rideQuery = useQuery({
    queryKey: ['ride', rideId, viewerId],
    queryFn: () => getRideListingUseCase().execute({ rideId: rideId!, viewerId: viewerId! }),
    enabled: Boolean(rideId && viewerId),
  });

  const ride = rideQuery.data;
  const ownerQuery = useQuery({
    queryKey: ['user', ride?.ownerId],
    queryFn: () => getUserRepo().findById(ride!.ownerId),
    enabled: Boolean(ride?.ownerId),
  });

  const isOwner = Boolean(viewerId && ride && ride.ownerId === viewerId);
  const isOpen = ride?.status === 'open';

  const onContact = useCallback(async () => {
    if (!ride || !viewerId) return;
    setContactBusy(true);
    try {
      await contactRidePublisher(viewerId, ride, router);
    } finally {
      setContactBusy(false);
    }
  }, [ride, viewerId, router]);

  const onCloseStatus = async (status: 'closed' | 'cancelled') => {
    if (!ride || !viewerId) return;
    setCloseBusy(true);
    try {
      await getCloseRideListingUseCase().execute({ rideId: ride.rideId, ownerId: viewerId, status });
      await queryClient.invalidateQueries({ queryKey: ['ride', rideId] });
      await queryClient.invalidateQueries({ queryKey: ['rides'] });
      router.back();
    } finally {
      setCloseBusy(false);
    }
  };

  if (rideQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ride) {
    return (
      <Screen blobs="content">
        <EmptyState
          icon="car-outline"
          title={t('donations.rides.notFoundTitle')}
          subtitle={t('donations.rides.notFoundSubtitle')}
        />
      </Screen>
    );
  }

  const isOffer = ride.mode === 'offer';
  const departsLabel = format(new Date(ride.departsAt), "EEEE dd/MM/yyyy HH:mm", { locale: dateFnsHe });
  const ownerName = ownerQuery.data?.displayName ?? t('profile.fallbackName');
  const originLine = formatRideAddress(ride.originCityName, ride.originStreet, ride.originStreetNumber);
  const destLine = formatRideAddress(ride.destCityName, ride.destStreet, ride.destStreetNumber);

  return (
    <Screen blobs="content">
      <Stack.Screen options={{ title: ride.title }} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}>
        <Card padding="base" style={styles.card}>
          <View style={[styles.badge, isOffer ? styles.badgeOffer : styles.badgeRequest]}>
            <Text style={[styles.badgeText, { color: isOffer ? colors.giveTag : colors.requestTag }]}>
              {isOffer ? t('donations.rides.badgeOffer') : t('donations.rides.badgeRequest')}
            </Text>
          </View>
          <Text style={styles.title}>{ride.title}</Text>
          <Text style={styles.meta}>{originLine}</Text>
          <Text style={styles.meta}>{destLine}</Text>
          <Text style={styles.meta}>{departsLabel}</Text>
          {isOffer && ride.seatsAvailable != null ? (
            <Text style={styles.meta}>{t('donations.rides.seats', { count: ride.seatsAvailable })}</Text>
          ) : null}
          {ride.description ? <Text style={styles.body}>{ride.description}</Text> : null}
        </Card>

        <Card padding="base">
          <View style={styles.ownerRow}>
            <IconTile icon="person-outline" size="md" />
            <AvatarInitials name={ownerName} avatarUrl={ownerQuery.data?.avatarUrl ?? null} size={40} />
            <Text style={styles.ownerName}>{ownerName}</Text>
          </View>
        </Card>

        {isOwner && isOpen ? (
          <>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => void onCloseStatus('closed')}
              disabled={closeBusy}
            >
              <Text style={styles.secondaryBtnText}>{t('donations.rides.close')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => void onCloseStatus('cancelled')}
              disabled={closeBusy}
            >
              <Text style={styles.dangerBtnText}>{t('donations.rides.cancel')}</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {!isOwner && isOpen ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void onContact()} disabled={contactBusy}>
            {contactBusy ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>{t('donations.rides.contact')}</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {!isOwner ? (
          <Pressable onPress={() => setReportOpen(true)}>
            <Text style={[styles.meta, { color: colors.primary, textAlign: 'center' as const }]}>
              {t('donations.rides.reportOwner')}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ReportUserModal
        targetUserId={ride.ownerId}
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </Screen>
  );
}
