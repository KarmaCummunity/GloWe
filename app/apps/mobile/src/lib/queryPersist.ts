// PERF-6 / #894 — offline-first React Query cache (AsyncStorage native, IndexedDB web).
// Wiped on sign-out via `clearPersistedQueryCache` → `clearAllPersistedStores`.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, type Query, type QueryKey } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

export const RQ_CACHE_KEY = 'kc-rq-cache';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Query roots worth persisting for instant feed / profile / inbox cold start. */
const PERSISTABLE_ROOTS = new Set([
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60_000,
      gcTime: WEEK_MS,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 2,
    },
  },
});

function createQueryPersister() {
  if (Platform.OS === 'web') {
    return createAsyncStoragePersister({
      storage: {
        getItem: async (key) => (await get<string>(key)) ?? null,
        setItem: async (key, value) => {
          await set(key, value);
        },
        removeItem: async (key) => {
          await del(key);
        },
      },
      key: RQ_CACHE_KEY,
      throttleTime: 1000,
    });
  }
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: RQ_CACHE_KEY,
    throttleTime: 1000,
  });
}

const persister = createQueryPersister();

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: WEEK_MS,
  buster: 'kc-rq-v2',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === 'success' && isPersistableQueryKey(query.queryKey),
  },
};

export async function clearPersistedQueryCache(): Promise<void> {
  await persister.removeClient();
}
