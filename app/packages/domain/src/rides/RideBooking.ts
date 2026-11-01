// A seat booking on a ride offer (rides world on the generic handoff stage).
// Spec: docs/spec/05_giving_worlds.md §5.3 step 3 — the driver sees every booking and
// approves or declines each (D73); unapproved bookings expire ({{D:ride-booking-expiry}}). Gap G47.

/** Booking states the driver manages; cancelled bookings are history and are not listed. */
export const RIDE_BOOKING_STATUSES = ['reserved', 'confirmed', 'handed_over'] as const;
export type RideBookingStatus = (typeof RIDE_BOOKING_STATUSES)[number];

/** Upper bound of seats one passenger can book at once (mirrors `book_ride_seat`). */
export const RIDE_BOOKING_MAX_SEATS = 8;

export interface RideBooking {
  readonly handoffId: string;
  readonly recipientId: string;
  readonly passengerName: string;
  readonly avatarUrl: string | null;
  readonly seats: number;
  readonly status: RideBookingStatus;
  readonly reservedAt: string;
  /** Approval deadline: 12 hours after booking or departure, whichever is earlier ({{D:ride-booking-expiry}}). */
  readonly confirmBy: string | null;
  /** True once the driver rated this passenger after the trip (spec 07 §7.7). */
  readonly ratedByMe: boolean;
}

/** How a ride's seats are split between waiting, approved and completed bookings. */
export interface RideSeatSummary {
  readonly capacity: number;
  readonly waiting: number;
  readonly approved: number;
  readonly completed: number;
  /** Seats still open for booking; never negative. */
  readonly free: number;
}

export function isRideBookingStatus(value: string): value is RideBookingStatus {
  return (RIDE_BOOKING_STATUSES as readonly string[]).includes(value);
}

/** True when `seats` is a whole number a single booking may request. */
export function isValidRideBookingSeats(seats: number): boolean {
  return Number.isInteger(seats) && seats >= 1 && seats <= RIDE_BOOKING_MAX_SEATS;
}

/**
 * Splits a ride's capacity across its bookings. Every listed booking holds its seats,
 * as on the server (`book_ride_seat` counts reserved, confirmed and handed-over seats).
 */
export function summarizeRideSeats(capacity: number, bookings: readonly RideBooking[]): RideSeatSummary {
  const seatsIn = (status: RideBookingStatus) =>
    bookings.filter((b) => b.status === status).reduce((sum, b) => sum + b.seats, 0);
  const waiting = seatsIn('reserved');
  const approved = seatsIn('confirmed');
  const completed = seatsIn('handed_over');
  const safeCapacity = Math.max(0, capacity);
  return {
    capacity: safeCapacity,
    waiting,
    approved,
    completed,
    free: Math.max(0, safeCapacity - waiting - approved - completed),
  };
}
