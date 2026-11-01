// One booking in the driver's passenger list: who, how many seats, its state and the actions
// that state allows — approve/decline a waiting booking, complete/cancel an approved one, and
// rate the passenger once after the trip (spec 05 §5.3 step 3, D73; spec 07 §7.7).
import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@kc/ui';
import type { RideBooking } from '@kc/domain';
import { HandoffRatingForm } from '../HandoffRatingForm';
import { formatRideTime } from '../../cards/ListingCard';
import { useRideBookingStyles } from './rideBookingStyles';

export interface RideBookingRowActions {
  readonly approve: (handoffId: string) => void;
  readonly decline: (handoffId: string) => void;
  readonly complete: (handoffId: string) => void;
  readonly cancel: (handoffId: string) => void;
  readonly rate: (handoffId: string, rating: number, note: string | null) => void;
}

interface Props {
  readonly booking: RideBooking;
  readonly busy: boolean;
  readonly actions: RideBookingRowActions;
}

export function RideBookingRow({ booking, busy, actions }: Props) {
  const { t } = useTranslation();
  const styles = useRideBookingStyles();
  const id = booking.handoffId;
  const deadline = booking.status === 'reserved' ? formatRideTime(booking.confirmBy) : null;

  return (
    <View style={styles.row} testID={`ride-booking-${id}`}>
      <Text style={styles.name}>{booking.passengerName || t('rideBooking.passengerFallback')}</Text>
      <Text style={styles.caption}>
        {t('rideBooking.seatsCount', { count: booking.seats })} · {t(`rideBooking.statusLabel.${booking.status}`)}
      </Text>
      {deadline ? <Text style={styles.caption}>{t('rideBooking.approveBy', { time: deadline })}</Text> : null}

      {booking.status === 'reserved' ? (
        <View style={styles.actions}>
          <ActionButton testID={`ride-booking-approve-${id}`} label={t('rideBooking.approve')} busy={busy} onPress={() => actions.approve(id)} />
          <ActionButton testID={`ride-booking-decline-${id}`} label={t('rideBooking.decline')} busy={busy} secondary onPress={() => actions.decline(id)} />
        </View>
      ) : null}

      {booking.status === 'confirmed' ? (
        <View style={styles.actions}>
          <ActionButton testID={`ride-booking-complete-${id}`} label={t('rideBooking.completeTrip')} busy={busy} onPress={() => actions.complete(id)} />
          <ActionButton testID={`ride-booking-cancel-${id}`} label={t('rideBooking.cancel')} busy={busy} secondary onPress={() => actions.cancel(id)} />
        </View>
      ) : null}

      {booking.status === 'handed_over' && !booking.ratedByMe ? (
        <HandoffRatingForm busy={busy} onSubmit={(rating, note) => actions.rate(id, rating, note)} />
      ) : null}
    </View>
  );
}

interface ActionButtonProps {
  readonly testID: string;
  readonly label: string;
  readonly busy: boolean;
  readonly secondary?: boolean;
  readonly onPress: () => void;
}

/** Full-width half of an action pair; secondary is the outlined, less prominent choice. */
export function ActionButton({ testID, label, busy, secondary = false, onPress }: ActionButtonProps) {
  const styles = useRideBookingStyles();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      style={[styles.btn, secondary && styles.btnSecondary]}
      disabled={busy}
      onPress={onPress}
    >
      <Text style={[styles.btnText, secondary && styles.btnTextSecondary]}>{label}</Text>
    </Pressable>
  );
}
