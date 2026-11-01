import { describe, expect, it } from 'vitest';
import {
  isRideBookingStatus,
  isValidRideBookingSeats,
  summarizeRideSeats,
  type RideBooking,
} from '../RideBooking';

function booking(status: RideBooking['status'], seats: number): RideBooking {
  return {
    handoffId: `h-${status}-${seats}`,
    recipientId: 'u1',
    passengerName: 'Dana',
    avatarUrl: null,
    seats,
    status,
    reservedAt: '2026-11-01T08:00:00Z',
    confirmBy: null,
    ratedByMe: false,
  };
}

describe('summarizeRideSeats', () => {
  it('splits seats by booking status and counts what is left', () => {
    const out = summarizeRideSeats(4, [booking('reserved', 1), booking('confirmed', 2)]);
    expect(out).toEqual({ capacity: 4, waiting: 1, approved: 2, completed: 0, free: 1 });
  });

  it('counts completed seats as taken', () => {
    expect(summarizeRideSeats(2, [booking('handed_over', 2)]).free).toBe(0);
  });

  it('never reports negative free seats when bookings exceed capacity', () => {
    expect(summarizeRideSeats(1, [booking('confirmed', 3)]).free).toBe(0);
  });

  it('treats a negative capacity as zero', () => {
    expect(summarizeRideSeats(-2, []).capacity).toBe(0);
  });
});

describe('isValidRideBookingSeats', () => {
  it.each([1, 4, 8])('accepts %i seats', (n) => expect(isValidRideBookingSeats(n)).toBe(true));
  it.each([0, 9, 1.5, Number.NaN])('rejects %s seats', (n) => expect(isValidRideBookingSeats(n)).toBe(false));
});

describe('isRideBookingStatus', () => {
  it('accepts managed statuses and rejects cancelled history', () => {
    expect(isRideBookingStatus('confirmed')).toBe(true);
    expect(isRideBookingStatus('cancelled')).toBe(false);
  });
});
