// Client-side mirror of the server world rules (0266 listings_enforce_world_rules +
// 0351 items image check) and a mapper from server error codes to stable codes the
// UI can translate. Keep in sync with supabase/migrations/0266, 0351.

export const ROUTED_WORLDS = ['medical', 'animals', 'environment'] as const;

export type MarketplaceRuleErrorCode =
  | 'items_image_required'
  | 'food_expiry_required'
  | 'routed_world_requires_external_body';

/** Server-raised listing error codes the UI has friendly copy for. */
export const MARKETPLACE_SERVER_ERROR_CODES = [
  'items_image_required',
  'food_expiry_required',
  'routed_world_requires_external_body',
  'medical_listing_requires_external_body',
  'external_body_invalid',
  'food_posting_banned',
  'ride_cost_share_cap_exceeded',
  'money_active_campaign_cap',
  'matchmaking_min_age',
  'details_schema_mismatch',
  'listing_details_schema_mismatch',
  'media_path_must_be_owned',
  'member_inactive',
  'auth_required',
  'kind_not_found',
] as const;

export type MarketplaceServerErrorCode = (typeof MARKETPLACE_SERVER_ERROR_CODES)[number];

export interface WorldRulesInput {
  worldSlug: string;
  details: Record<string, unknown>;
  photoCount: number;
  externalBodyId?: string | null;
  now?: Date;
}

function nonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

export function validateMarketplaceWorldRules(input: WorldRulesInput): MarketplaceRuleErrorCode | null {
  const { worldSlug, details, photoCount } = input;

  if (worldSlug === 'items') {
    const hasDetailsImage = nonEmptyString(details.image_url) || nonEmptyString(details.image_path);
    if (photoCount < 1 && !hasDetailsImage) return 'items_image_required';
  }

  if (worldSlug === 'food') {
    const raw = details.expires_at;
    const ts = typeof raw === 'string' ? Date.parse(raw) : Number.NaN;
    const now = (input.now ?? new Date()).getTime();
    if (Number.isNaN(ts) || ts <= now) return 'food_expiry_required';
  }

  if ((ROUTED_WORLDS as readonly string[]).includes(worldSlug) && !nonEmptyString(input.externalBodyId)) {
    return 'routed_world_requires_external_body';
  }

  return null;
}

/** Extracts a known listing error code from a PostgREST / Postgres error (or null). */
export function mapMarketplaceServerError(err: unknown): MarketplaceServerErrorCode | null {
  if (!err || typeof err !== 'object') {
    return typeof err === 'string' ? matchCode(err) : null;
  }
  const e = err as { message?: unknown; details?: unknown; hint?: unknown };
  for (const field of [e.message, e.details, e.hint]) {
    if (typeof field === 'string') {
      const code = matchCode(field);
      if (code) return code;
    }
  }
  return null;
}

function matchCode(text: string): MarketplaceServerErrorCode | null {
  // Longest first so 'listing_details_schema_mismatch' wins over 'details_schema_mismatch'.
  const sorted = [...MARKETPLACE_SERVER_ERROR_CODES].sort((a, b) => b.length - a.length);
  return sorted.find((c) => new RegExp(`(^|[^a-z_])${c}([^a-z_]|$)`).test(text)) ?? null;
}
