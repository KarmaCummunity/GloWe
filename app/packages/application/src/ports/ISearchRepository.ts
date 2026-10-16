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
  /** Total matches for posts (may exceed `posts.length` when preview-limited). */
  readonly postsTotal: number;
  /** Total matches for users (may exceed `users.length` when preview-limited). */
  readonly usersTotal: number;
  /** Total matches for links (may exceed `links.length` when preview-limited). */
  readonly linksTotal: number;
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
