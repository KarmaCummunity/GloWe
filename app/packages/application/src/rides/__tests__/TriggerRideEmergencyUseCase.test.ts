// FR-RIDE-035 — TriggerRideEmergencyUseCase delegates to the repo's trigger().
import { describe, expect, it, vi } from 'vitest';
import type { RideEmergencyEvent } from '@kc/domain';
import { TriggerRideEmergencyUseCase } from '../TriggerRideEmergencyUseCase';
import type {
  IRideEmergencyRepository,
  TriggerRideEmergencyInput,
} from '../../ports/IRideEmergencyRepository';

describe('TriggerRideEmergencyUseCase', () => {
  it('forwards the input and returns the created event', async () => {
    const input: TriggerRideEmergencyInput = {
      rideId: 'ride-1',
      lat: 32.07,
      lng: 34.78,
      note: 'help',
    };
    const event: RideEmergencyEvent = {
      eventId: 'e1',
      rideId: 'ride-1',
      triggeredBy: 'u_owner',
      triggeredAt: '2026-05-31T10:00:00Z',
      lat: 32.07,
      lng: 34.78,
      note: 'help',
      resolvedAt: null,
      resolvedBy: null,
    };
    const trigger = vi.fn().mockResolvedValue(event);
    const repo: IRideEmergencyRepository = { trigger, listForRide: vi.fn() };

    const out = await new TriggerRideEmergencyUseCase(repo).execute(input);

    expect(out).toEqual(event);
    expect(trigger).toHaveBeenCalledWith(input);
  });

  it('accepts null coordinates when the user denied location permission', async () => {
    const input: TriggerRideEmergencyInput = { rideId: 'ride-2', lat: null, lng: null, note: null };
    const trigger = vi.fn().mockResolvedValue({});
    const repo: IRideEmergencyRepository = { trigger, listForRide: vi.fn() };

    await new TriggerRideEmergencyUseCase(repo).execute(input);

    expect(trigger).toHaveBeenCalledWith(input);
  });

  it('propagates a throttling error from the repo', async () => {
    const repo: IRideEmergencyRepository = {
      trigger: vi.fn().mockRejectedValue(new Error('emergency_throttled')),
      listForRide: vi.fn(),
    };

    await expect(
      new TriggerRideEmergencyUseCase(repo).execute({
        rideId: 'ride-3',
        lat: null,
        lng: null,
        note: null,
      }),
    ).rejects.toThrow(/emergency_throttled/);
  });
});
