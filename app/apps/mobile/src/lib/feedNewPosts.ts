// FR-FEED-009 — which realtime "new post" pings bump the "N new posts" banner.
import type { NewPublicPostSignal } from '@kc/application';

/**
 * Skip the viewer's own posts (already prepended locally after publish) and
 * duplicate pings for a post already counted this session.
 */
export function shouldCountNewPost(
  post: NewPublicPostSignal,
  viewerId: string | null,
  counted: Set<string>,
): boolean {
  if (viewerId && post.ownerId === viewerId) return false;
  if (post.postId) {
    if (counted.has(post.postId)) return false;
    counted.add(post.postId);
    // Bound memory on very long sessions.
    if (counted.size > 500) counted.delete(counted.values().next().value as string);
  }
  return true;
}
