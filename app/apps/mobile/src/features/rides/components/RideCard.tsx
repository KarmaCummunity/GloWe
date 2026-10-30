// FR-RIDE-002 — ride feed card.
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import type { RideListingRow } from '@kc/application';
import { makeUseStyles, radius, spacing, typography } from '@kc/ui';
import { Card } from '../../../components/ui/Card';
import { AvatarInitials } from '../../../components/AvatarInitials';
import { getUserRepo } from '../../../services/userComposition';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { formatRideAddress } from '../lib/formatRideAddress';
import { RideAdvancedChips } from './RideAdvancedChips';

interface Props {
  readonly ride: RideListingRow;
}

export function RideCard({ ride }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const router = useRouter();

  const ownerQuery = useQuery({
    queryKey: ['user', ride.ownerId],
    queryFn: () => getUserRepo().findById(ride.ownerId),
    staleTime: 60_000,
  });
  const ownerName = ownerQuery.data?.displayName ?? t('profile.fallbackName');
  const departsLabel = format(new Date(ride.departsAt), 'dd/MM HH:mm', { locale: dateFnsHe });
  const isOffer = ride.mode === 'offer';
  const originLine = formatRideAddress(ride.originCityName, ride.originStreet, ride.originStreetNumber);
  const destLine = formatRideAddress(ride.destCityName, ride.destStreet, ride.destStreetNumber);

  return (
    <Pressable
      onPress={() =>
        router.push(`/(tabs)/donations/rides/${ride.rideId}`)
      }
      accessibilityRole="button"
      accessibilityLabel={ride.title}
    >
      <Card padding="base" style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.badge, isOffer ? styles.badgeOffer : styles.badgeRequest]}>
            <Text style={[styles.badgeText, isOffer ? styles.badgeTextOffer : styles.badgeTextRequest]}>
              {isOffer ? t('donations.rides.badgeOffer') : t('donations.rides.badgeRequest')}
            </Text>
          </View>
          <Text style={styles.timeText}>{departsLabel}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {ride.title}
        </Text>
        <Text style={styles.route} numberOfLines={2}>
          {originLine} → {destLine}
        </Text>
        {ride.description ? (
          <Text style={styles.snippet} numberOfLines={2}>
            {ride.description}
          </Text>
        ) : null}
        {isOffer && ride.seatsAvailable != null ? (
          <Text style={styles.seats}>{t('donations.rides.seats', { count: ride.seatsAvailable })}</Text>
        ) : null}
        <RideAdvancedChips ride={ride} variant="compact" />
        <View style={styles.ownerRow}>
          <AvatarInitials name={ownerName} avatarUrl={ownerQuery.data?.avatarUrl ?? null} size={32} />
          <Text style={styles.ownerName} numberOfLines={1}>
            {ownerName}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: { gap: spacing.sm },
  topRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeOffer: { backgroundColor: colors.giveTagBg },
  badgeRequest: { backgroundColor: colors.requestTagBg },
  badgeText: { ...typography.caption, fontWeight: '600' as const },
  badgeTextOffer: { color: colors.giveTag },
  badgeTextRequest: { color: colors.requestTag },
  timeText: { ...typography.caption, color: colors.textSecondary },
  title: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    width: '100%',
  },
  route: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    width: '100%',
  },
  snippet: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    width: '100%',
  },
  seats: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600' as const,
    textAlign: rtlTextAlignStart,
  },
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
}));
