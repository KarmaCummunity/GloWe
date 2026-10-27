// Matching v2 (0420–0423): "Matches for you" + accept/decline. The engine runs in Postgres
// (pg_cron + listing trigger); the client only reads its own pairs and answers them.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

export type MatchRole = 'offer' | 'request';
export type MatchStatus = 'suggested' | 'accepted';
export type MatchResponse = 'accepted' | 'declined';

export interface MatchSuggestion {
  readonly candidateId: string;
  readonly status: MatchStatus;
  /** 0..1 (LLM-blended when the re-rank flag is on). */
  readonly score: number;
  readonly distanceKm: number | null;
  readonly worldSlug: string;
  readonly myRole: MatchRole;
  readonly myListingId: string;
  readonly myListingTitle: string;
  readonly otherListingId: string;
  readonly otherListingTitle: string;
  readonly otherListingSummary: string | null;
  readonly otherOwner: {
    readonly userId: string;
    readonly displayName: string | null;
    readonly avatarUrl: string | null;
    readonly shareHandle: string | null;
  };
  readonly myResponse: MatchResponse | null;
  readonly otherResponse: MatchResponse | null;
  readonly reason: string | null;
  readonly createdAt: string;
}

export interface MatchRespondResult {
  readonly status: string;
  readonly mutual: boolean;
}

type Row = Database['public']['Functions']['rpc_my_matches']['Returns'][number];

const asResponse = (v: string | null): MatchResponse | null =>
  v === 'accepted' || v === 'declined' ? v : null;

export function mapMatchRow(r: Row): MatchSuggestion {
  return {
    candidateId: r.candidate_id,
    status: r.status === 'accepted' ? 'accepted' : 'suggested',
    score: Number(r.score ?? 0),
    distanceKm: r.distance_km == null ? null : Number(r.distance_km),
    worldSlug: r.world_slug,
    myRole: r.my_role === 'offer' ? 'offer' : 'request',
    myListingId: r.my_listing_id,
    myListingTitle: r.my_listing_title,
    otherListingId: r.other_listing_id,
    otherListingTitle: r.other_listing_title,
    otherListingSummary: r.other_listing_summary ?? null,
    otherOwner: {
      userId: r.other_owner_id,
      displayName: r.other_owner_name ?? null,
      avatarUrl: r.other_owner_avatar ?? null,
      shareHandle: r.other_owner_handle ?? null,
    },
    myResponse: asResponse(r.my_response),
    otherResponse: asResponse(r.other_response),
    reason: r.llm_reason ?? null,
    createdAt: r.created_at,
  };
}

export class SupabaseMatchRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listMine(limit = 20): Promise<MatchSuggestion[]> {
    const { data, error } = await this.client.rpc('rpc_my_matches', { p_limit: limit });
    if (error) throw new Error(`listMyMatches: ${error.message}`);
    return (data ?? []).map(mapMatchRow);
  }

  async respond(candidateId: string, response: 'accept' | 'decline'): Promise<MatchRespondResult> {
    const { data, error } = await this.client.rpc('rpc_match_respond', {
      p_candidate_id: candidateId,
      p_response: response,
    });
    if (error) throw new Error(`respondToMatch: ${error.message}`);
    const out = (data ?? {}) as { status?: unknown; mutual?: unknown };
    return { status: String(out.status ?? ''), mutual: out.mutual === true };
  }

  /** Recomputes the caller's open listings (server-throttled to once per 10 min each). */
  async refreshMine(): Promise<number> {
    const { data, error } = await this.client.rpc('rpc_match_refresh_mine');
    if (error) throw new Error(`refreshMyMatches: ${error.message}`);
    return Number(data ?? 0);
  }
}
