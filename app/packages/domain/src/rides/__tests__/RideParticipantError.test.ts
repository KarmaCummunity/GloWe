import { describe, expect, it } from 'vitest';
import { RideParticipantError } from '../RideParticipantError';

describe('RideParticipantError', () => {
  it('defaults message to the code', () => {
    const err = new RideParticipantError('ride_full');
    expect(err.code).toBe('ride_full');
    expect(err.message).toBe('ride_full');
  });

  it('accepts an explicit message', () => {
    const err = new RideParticipantError('auth_required', 'sign in');
    expect(err.message).toBe('sign in');
  });
});
