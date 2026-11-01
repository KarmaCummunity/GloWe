// Driver view of a ride offer: seat summary and every booking with its actions
// (docs/spec/05_giving_worlds.md §5.3 step 3 — the driver approves or declines each, D73).
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Text, typography } from '@kc/ui';
import { summarizeRideSeats } from '@kc/domain';
import { givingHandoffUseCases } from '../../../services/givingHandoffComposition';
import { rideBookingsQueryKey, rideBookingUseCases } from '../../../services/rideBookingComposition';
import { RideBookingRow, type RideBookingRowActions } from './RideBookingRow';
import { useRideBookingAction } from './useRideBookingAction';
import { useRideBookingStyles } from './rideBookingStyles';

interface Props {
  readonly listingId: string;
  readonly cityId: string | null;
  /** Seats the driver offered (`details.seats_available`). */
  readonly capacity: number;
}

export function RideBookingsPanel({ listingId, cityId, capacity }: Props) {
  const { t } = useTranslation();
  const styles = useRideBookingStyles();
  const { busy, run } = useRideBookingAction(listingId, cityId);
  const bookings = useQuery({
    queryKey: rideBookingsQueryKey(listingId),
    queryFn: () => rideBookingUseCases.listForRide().execute(listingId),
  });

  const list = bookings.data ?? [];
  const seats = summarizeRideSeats(capacity, list);

  const actions: RideBookingRowActions = {
    approve: (id) => void run(() => rideBookingUseCases.approve().execute(id), 'match_made'),
    decline: (id) => void run(() => rideBookingUseCases.decline().execute(id)),
    complete: (id) => void run(() => rideBookingUseCases.complete().execute(id), 'handover_completed'),
    cancel: (id) => void run(() => rideBookingUseCases.cancel().execute(id)),
    rate: (id, rating, note) =>
      void run(async () => {
        await givingHandoffUseCases.rate().execute(id, rating, note);
        alert(t('givingHandoff.ratingThanks'));
      }),
  };

  return (
    <View style={styles.box} testID="ride-bookings-panel">
      <Text style={typography.h3}>{t('rideBooking.driverTitle')}</Text>
      <Text style={styles.caption} testID="ride-bookings-seats">
        {t('rideBooking.seatSummary', { free: seats.free, capacity: seats.capacity })}
      </Text>
      {seats.waiting > 0 ? (
        <Text style={styles.caption}>{t('rideBooking.waitingSummary', { count: seats.waiting })}</Text>
      ) : null}

      {bookings.isError ? (
        <Pressable accessibilityRole="button" onPress={() => void bookings.refetch()} testID="ride-bookings-retry">
          <Text style={styles.caption}>{t('rideBooking.loadError')}</Text>
        </Pressable>
      ) : null}
      {bookings.isSuccess && list.length === 0 ? (
        <Text style={styles.caption} testID="ride-bookings-empty">{t('rideBooking.empty')}</Text>
      ) : null}

      {list.map((booking) => (
        <RideBookingRow key={booking.handoffId} booking={booking} busy={busy} actions={actions} />
      ))}
    </View>
  );
}
