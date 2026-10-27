import { describe, expect, it } from 'vitest';
import { ListRideParticipantsUseCase } from '../ListRideParticipantsUseCase';
import { FakeRideParticipantRepository } from './fakeRideParticipantRepository';

describe('ListRideParticipantsUseCase', () => {
  it('returns all rows for the requested ride', async () => {
    const repo = new FakeRideParticipantRepository();
    repo.seedRide({
      rideId: 'r1',
      ownerId: 'u_owner',
      status: 'open',
      visibility: 'Public',
      seatsAvailable: 3,
    });
    repo.seedRide({
      rideId: 'r2',
      ownerId: 'u_owner',
      status: 'open',
      visibility: 'Public',
      seatsAvailable: 3,
    });
    repo.setCaller('u_a');
    await repo.request({ rideId: 'r1', note: null });
    repo.setCaller('u_b');
    await repo.request({ rideId: 'r1', note: null });
    repo.setCaller('u_c');
    await repo.request({ rideId: 'r2', note: null });

    const uc = new ListRideParticipantsUseCase(repo);
    const out = await uc.execute({ rideId: 'r1' });

    expect(out).toHaveLength(2);
    expect(out.map((r) => r.userId).sort((a, b) => a.localeCompare(b))).toEqual(['u_a', 'u_b']);
  });

  it('returns an empty list when nothing matches', async () => {
    const repo = new FakeRideParticipantRepository();
    const uc = new ListRideParticipantsUseCase(repo);
    const out = await uc.execute({ rideId: 'missing' });
    expect(out).toEqual([]);
  });
});
