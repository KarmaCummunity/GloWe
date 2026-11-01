import { describe, expect, it, vi } from 'vitest';
import { SupabaseRideBookingRepository } from '../SupabaseRideBookingRepository';

type AnyClient = ConstructorParameters<typeof SupabaseRideBookingRepository>[0];

const ROW = {
  handoff_id: 'h1',
  recipient_id: 'u1',
  passenger_name: 'Dana',
  avatar_url: null,
  seats: 2,
  status: 'reserved',
  reserved_at: '2026-11-01T08:00:00Z',
  confirm_by: '2026-11-01T10:00:00Z',
  rated_by_me: true,
};

function repoWith(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  const client = { rpc, from: vi.fn() } as unknown as AnyClient;
  return { rpc, repo: new SupabaseRideBookingRepository(client) };
}

describe('SupabaseRideBookingRepository', () => {
  it('books seats and returns the new booking id', async () => {
    const { rpc, repo } = repoWith({ data: { handoff_id: 'h9' }, error: null });
    await expect(repo.bookSeat('l1', 2)).resolves.toBe('h9');
    expect(rpc).toHaveBeenCalledWith('book_ride_seat', { p_listing_id: 'l1', p_seats: 2 });
  });

  it('maps the driver bookings list to camelCase', async () => {
    const { rpc, repo } = repoWith({ data: [ROW], error: null });
    await expect(repo.listForRide('l1')).resolves.toEqual([
      {
        handoffId: 'h1',
        recipientId: 'u1',
        passengerName: 'Dana',
        avatarUrl: null,
        seats: 2,
        status: 'reserved',
        reservedAt: '2026-11-01T08:00:00Z',
        confirmBy: '2026-11-01T10:00:00Z',
        ratedByMe: true,
      },
    ]);
    expect(rpc).toHaveBeenCalledWith('list_ride_bookings', { p_listing_id: 'l1' });
  });

  it('drops rows with a status the driver does not manage', async () => {
    const { repo } = repoWith({ data: [{ ...ROW, status: 'cancelled' }], error: null });
    await expect(repo.listForRide('l1')).resolves.toEqual([]);
  });

  it.each([
    ['approve', 'confirm_ride_booking'],
    ['decline', 'decline_ride_booking'],
    ['cancel', 'cancel_ride_booking'],
    ['complete', 'complete_ride_trip'],
  ] as const)('%s calls %s with the booking id', async (method, fn) => {
    const { rpc, repo } = repoWith({ data: {}, error: null });
    await repo[method]('h1');
    expect(rpc).toHaveBeenCalledWith(fn, { p_handoff_id: 'h1' });
  });

  it('keeps the server error code in the thrown message', async () => {
    const { repo } = repoWith({ data: null, error: { message: 'owner_only' } });
    await expect(repo.decline('h1')).rejects.toThrow('owner_only');
  });
});
