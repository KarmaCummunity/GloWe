// ─────────────────────────────────────────────
// ISearchRepository — Port for universal search
// Mapped to SRS: FR-FEED-017+ (universal search engine)
// ─────────────────────────────────────────────

import type { PostWithOwner } from './IPostRepository';
import type {
  DonationLinkSearchResult,
  HashtagSearchResult,
  OrgSearchResult,
  SearchFilters,
  UserSearchResult,
} from '@kc/domain';

/** Aggregated results from a universal search across posts, users, and links. */
export interface UniversalSearchResults {
  readonly posts: PostWithOwner[];
  readonly users: UserSearchResult[];
  readonly links: DonationLinkSearchResult[];
  readonly orgs: OrgSearchResult[];
  readonly hashtags: HashtagSearchResult[];
  readonly suggestedQueries: string[];
  /** Returned post matches; "at least" when `postsHasMore` (no exact counts — full scans). */
  readonly postsTotal: number;
  /** Returned user matches; "at least" when `usersHasMore`. */
  readonly usersTotal: number;
  /** Returned link matches; "at least" when `linksHasMore`. */
  readonly linksTotal: number;
  /** More posts exist beyond `posts` (has-more paging). */
  readonly postsHasMore?: boolean;
  readonly usersHasMore?: boolean;
  readonly linksHasMore?: boolean;
  readonly orgsTotal: number;
  readonly hashtagsTotal: number;
}

export interface ISearchRepository {
  /**
   * Searches posts, users, and donation links in parallel.
   * The `viewerId` is forwarded to the posts query so RLS can filter correctly.
   * City filter applies to posts + users only; links are national.
   */
  search(
    query: string,
    filters: SearchFilters,
    viewerId: string | null,
    limits: { posts: number; users: number; links: number },
  ): Promise<UniversalSearchResults>;
}
