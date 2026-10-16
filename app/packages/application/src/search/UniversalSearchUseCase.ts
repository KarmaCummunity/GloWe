// ─────────────────────────────────────────────
// UniversalSearchUseCase — orchestrates universal search & explore
// Mapped to SRS: FR-FEED-017+ (universal search engine)
//
// Two modes:
//   1. Search mode (query.length >= 2): searches posts, users, and links
//      by substring matching with the given filters.
//   2. Explore mode (empty query): returns a discovery feed of recent/popular
//      content to keep the screen populated and engaging.
// ─────────────────────────────────────────────

import type { SearchFilters } from '@kc/domain';
import type { ISearchRepository, UniversalSearchResults } from '../ports/ISearchRepository';

export interface UniversalSearchInput {
  query: string;
  filters: SearchFilters;
  viewerId: string | null;
  limits?: { posts?: number; users?: number; links?: number };
}

/** Maximum results per domain in a single call. */
const DEFAULT_LIMIT = 10;
const HARD_MAX = 50;

export class UniversalSearchUseCase {
  constructor(private readonly repo: ISearchRepository) {}

  async execute(input: UniversalSearchInput): Promise<UniversalSearchResults> {
    const trimmed = input.query.trim();

    // Explore mode: empty query → return discovery content.
    // Search mode: query >= 2 chars → full search.
    // Between 1-1 chars → return empty (avoid noise from single-char queries).
    if (trimmed.length > 0 && trimmed.length < 2) {
      return {
        posts: [], users: [], links: [], orgs: [], hashtags: [], suggestedQueries: [],
        postsTotal: 0, usersTotal: 0, linksTotal: 0, orgsTotal: 0, hashtagsTotal: 0,
      };
    }

    const limits = {
      posts: clamp(input.limits?.posts ?? DEFAULT_LIMIT, 1, HARD_MAX),
      users: clamp(input.limits?.users ?? DEFAULT_LIMIT, 1, HARD_MAX),
      links: clamp(input.limits?.links ?? DEFAULT_LIMIT, 1, HARD_MAX),
    };

    const filters = normalizeFilters(input.filters);

    // Pass the trimmed query (may be empty for explore mode)
    return this.repo.search(trimmed, filters, input.viewerId, limits);
  }
}

/** Clamp a number to [lo, hi], truncating any fractional part. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

/** Normalizes filter values: replaces undefined/empty with null, sets defaults. */
function normalizeFilters(raw: SearchFilters): SearchFilters {
  const out: SearchFilters = { ...raw };
  if (!out.resultType) out.resultType = null;
  if (!out.postType) out.postType = null;
  if (!out.category) out.category = null;
  if (!out.donationCategory) out.donationCategory = null;
  if (!out.city) out.city = null;
  if (!out.sortBy) out.sortBy = 'relevance';
  if (!out.minFollowers || out.minFollowers < 0) out.minFollowers = null;
  return out;
}
