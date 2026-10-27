// FR-RIDE-012 — in-memory IRideParticipantRepository for use-case tests.
//
// Stand-in for the SECURITY DEFINER RPCs in 0139_ride_participants.sql. Models
// only the invariants that the use cases need to drive — not full RLS.
import type { RideParticipant, } from '@kc/domain';
import { RideParticipantError } from '@kc/domain';
import type { IRideParticipantRepository } from '../../ports/IRideParticipantRepository';

interface SeededRide {
  rideId: string;
  ownerId: string;
  status: 'open' | 'closed' | 'cancelled' | 'expired';
  visibility: 'Public' | 'FollowersOnly' | 'OnlyMe';
  seatsAvailable: number | null;
}

export class FakeRideParticipantRepository implements IRideParticipantRepository {
  rows: RideParticipant[] = [];
  rides = new Map<string, SeededRide>();
  callerId: string | null = null;
  private nextId = 1;

  seedRide(ride: SeededRide): void {
    this.rides.set(ride.rideId, ride);
  }

  /** Test helper: mimic the auth.uid() the RPC sees. */
  setCaller(userId: string | null): void {
    this.callerId = userId;
  }

  async request(input: { rideId: string; note: string | null }): Promise<RideParticipant> {
    if (this.callerId === null) throw new RideParticipantError('auth_required');
    const ride = this.rides.get(input.rideId);
    if (!ride) throw new RideParticipantError('ride_not_found');
    if (ride.status !== 'open' || ride.visibility !== 'Public') {
      throw new RideParticipantError('ride_not_joinable');
    }
    if (ride.ownerId === this.callerId) throw new RideParticipantError('cannot_join_own_ride');
    if (input.note !== null && input.note.length > 500) {
      throw new RideParticipantError('note_too_long');
    }
    const active = this.rows.find(
      (r) =>
        r.rideId === input.rideId &&
        r.userId === this.callerId &&
        (r.status === 'requested' || r.status === 'approved'),
    );
    if (active) throw new RideParticipantError('already_requested');

    const now = new Date().toISOString();
    const row: RideParticipant = {
      participantId: `p_${this.nextId++}`,
      rideId: input.rideId,
      userId: this.callerId,
      status: 'requested',
      note: input.note,
      requestedAt: now,
      decidedAt: null,
      decidedBy: null,
      joinedActiveAt: null,
    };
    this.rows.push(row);
    return row;
  }

  async decide(input: {
    participantId: string;
    status: 'approved' | 'rejected';
  }): Promise<RideParticipant> {
    if (this.callerId === null) throw new RideParticipantError('auth_required');
    const idx = this.rows.findIndex((r) => r.participantId === input.participantId);
    if (idx < 0) throw new RideParticipantError('participant_not_found');
    const row = this.rows[idx]!;
    if (row.status !== 'requested') throw new RideParticipantError('participant_not_pending');

    const ride = this.rides.get(row.rideId);
    if (!ride) throw new RideParticipantError('ride_not_found');
    if (ride.ownerId !== this.callerId) throw new RideParticipantError('not_ride_owner');

    if (input.status === 'approved') {
      if (ride.status !== 'open') throw new RideParticipantError('ride_not_open');
      if (ride.seatsAvailable !== null) {
        const approvedCount = this.rows.filter(
          (r) => r.rideId === row.rideId && r.status === 'approved',
        ).length;
        if (approvedCount >= ride.seatsAvailable) {
          throw new RideParticipantError('ride_full');
        }
      }
    }

    const updated: RideParticipant = {
      ...row,
      status: input.status,
      decidedAt: new Date().toISOString(),
      decidedBy: this.callerId,
    };
    this.rows[idx] = updated;
    return updated;
  }

  async cancel(input: { participantId: string }): Promise<RideParticipant> {
    if (this.callerId === null) throw new RideParticipantError('auth_required');
    const idx = this.rows.findIndex((r) => r.participantId === input.participantId);
    if (idx < 0) throw new RideParticipantError('participant_not_found');
    const row = this.rows[idx]!;
    if (row.userId !== this.callerId) throw new RideParticipantError('not_participant');
    if (row.status === 'cancelled') return row;
    if (row.status === 'rejected') throw new RideParticipantError('cannot_cancel_rejected');

    const updated: RideParticipant = {
      ...row,
      status: 'cancelled',
      decidedAt: new Date().toISOString(),
      decidedBy: this.callerId,
    };
    this.rows[idx] = updated;
    return updated;
  }

  async listForRide(input: { rideId: string }): Promise<readonly RideParticipant[]> {
    return this.rows.filter((r) => r.rideId === input.rideId);
  }

  async listForUser(input: {
    userId: string;
    limit?: number;
  }): Promise<readonly RideParticipant[]> {
    const limit = input.limit ?? 30;
    return this.rows
      .filter((r) => r.userId === input.userId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .slice(0, limit);
  }
}
