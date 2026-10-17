import type { QueryKey } from '@tanstack/react-query';

/** Query roots worth persisting for instant feed / profile / inbox cold start. */
export const PERSISTABLE_ROOTS = new Set([
  'feed',
  'user-profile',
  'profile-other',
  'profile-posts',
  'posts-by-user',
  'chat-inbox',
  'saved-posts',
  'following',
  'followers',
  'notification-inbox',
]);

export function isPersistableQueryKey(queryKey: QueryKey): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && PERSISTABLE_ROOTS.has(root);
}
