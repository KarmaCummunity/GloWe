// Shared state behind InMemoryPostRepository instances (G39 contract fake).
// One store plays the database; one repository per actor plays an RLS-scoped
// client, exactly like one SupabasePostRepository per signed-in user.

import type { Post } from '@kc/domain';
import type { PostWithOwner } from '../../ports/IPostRepository';
import type { PostActorIdentityRow } from '../../ports/postActorIdentity';

export interface InMemoryUser {
  readonly userId: string;
  readonly displayName: string;
  readonly shareHandle: string;
  readonly privacyMode: 'Public' | 'Private';
}

export class InMemoryPostStore {
  readonly users = new Map<string, InMemoryUser>();
  readonly posts = new Map<string, Post>();
  readonly actorIdentities = new Map<string, PostActorIdentityRow>();
  /** Known city ids — the `cities` lookup table the posts FK points at. */
  readonly cities: ReadonlySet<string>;
  private lastTickMs = 0;

  constructor(options: { cities: readonly string[] }) {
    this.cities = new Set(options.cities);
  }

  addUser(overrides: Partial<InMemoryUser> = {}): InMemoryUser {
    const userId = overrides.userId ?? crypto.randomUUID();
    const user: InMemoryUser = {
      userId,
      displayName: overrides.displayName ?? `user ${userId.slice(0, 6)}`,
      shareHandle: overrides.shareHandle ?? `u_${userId.slice(0, 8)}`,
      privacyMode: overrides.privacyMode ?? 'Public',
    };
    this.users.set(userId, user);
    return user;
  }

  /** Strictly increasing timestamps, so `created_at` ordering is total as with Postgres' clock. */
  now(): string {
    this.lastTickMs = Math.max(Date.now(), this.lastTickMs + 1);
    return new Date(this.lastTickMs).toISOString();
  }

  /** Joins the owner the way the adapter's `POST_SELECT_OWNER` projection does. */
  withOwner(post: Post): PostWithOwner {
    const owner = this.users.get(post.ownerId);
    return {
      ...clonePost(post),
      ownerName: owner?.displayName ?? null,
      ownerAvatarUrl: null,
      ownerHandle: owner?.shareHandle ?? '',
      ownerPrivacyMode: owner?.privacyMode ?? 'Public',
      recipientUser: null,
      distanceKm: null,
    };
  }
}

/** Repositories hand out copies: a caller mutating a returned Post must not change the store. */
export function clonePost(post: Post): Post {
  return structuredClone(post);
}

export function identityKey(postId: string, userId: string): string {
  return `${postId}:${userId}`;
}
