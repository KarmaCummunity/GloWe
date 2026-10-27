// FR-RIDE-031 + FR-RIDE-045 AC4 — ArriveRideUseCase passes the reason through and
// defaults it to 'arrived'; the lifecycle guard is enforced by the repo.
import { describe, expect, it, vi } from 'vitest';
import { ArriveRideUseCase } from '../ArriveRideUseCase';
import { StartRideUseCase } from '../StartRideUseCase';
import { FakeRideListingRepository } from './fakeRideListingRepository';
import type { IRideListingRepository, RideListingRow } from '../../ports/IRideListingRepository';

const ME = '11111111-1111-4111-8111-111111111111';

async function makeStartedRide(repo: FakeRideListingRepository): Promise<RideListingRow> {
  const ride = await repo.create({
    ownerId: ME,
    mode: 'offer',
    originCityId: 'c-tlv',
    destCityId: 'c-jlm',
    originStreet: 'A',
    originStreetNumber: null,
    destStreet: 'B',
    destStreetNumber: null,
    departsAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    seatsAvailable: 3,
    description: null,
    title: 'TLV→JLM',
    visibility: 'Public',
  });
  await new StartRideUseCase(repo).execute(ride.rideId);
  return ride;
}

describe('ArriveRideUseCase', () => {
  it('defaults the reason to "arrived" when omitted', async () => {
    const repo = new FakeRideListingRepository();
    const ride = await makeStartedRide(repo);
    const arrived = await new ArriveRideUseCase(repo).execute({ rideId: ride.rideId });
    expect(arrived.status).toBe('completed_pending_rating');
    expect(arrived.arriveReason).toBe('arrived');
    expect(arrived.arrivedAt).not.toBeNull();
  });

  it('forwards an explicit breakdown reason to the repo', async () => {
    const arrive = vi.fn().mockResolvedValue({});
    const repo = { arrive } as unknown as IRideListingRepository;
    await new ArriveRideUseCase(repo).execute({ rideId: 'r1', reason: 'breakdown' });
    expect(arrive).toHaveBeenCalledWith('r1', 'breakdown');
  });

  it('passes the default reason argument to the repo explicitly', async () => {
    const arrive = vi.fn().mockResolvedValue({});
    const repo = { arrive } as unknown as IRideListingRepository;
    await new ArriveRideUseCase(repo).execute({ rideId: 'r2' });
    expect(arrive).toHaveBeenCalledWith('r2', 'arrived');
  });

  it('rejects arriving before the ride has started', async () => {
    const repo = new FakeRideListingRepository();
    const ride = await repo.create({
      ownerId: ME,
      mode: 'offer',
      originCityId: 'c-tlv',
      destCityId: 'c-jlm',
      originStreet: 'A',
      originStreetNumber: null,
      destStreet: 'B',
      destStreetNumber: null,
      departsAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      seatsAvailable: 3,
      description: null,
      title: 'TLV→JLM',
      visibility: 'Public',
    });
    await expect(
      new ArriveRideUseCase(repo).execute({ rideId: ride.rideId }),
    ).rejects.toThrow(/ride_not_in_transit/);
  });
});
