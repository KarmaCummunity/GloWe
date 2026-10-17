// Warm expo-image's memory+disk cache for images that are about to scroll into
// view (next feed / marketplace page). Deduped so re-renders don't re-request.
import { Image } from 'expo-image';

const MAX_REMEMBERED = 400;
const seen = new Set<string>();

/** Returns the URLs that were not prefetched before (exported for tests). */
export function takeUnseen(urls: readonly (string | null | undefined)[]): string[] {
  const fresh: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    fresh.push(u);
  }
  // Bounded memory: forget the oldest entries (Set keeps insertion order).
  while (seen.size > MAX_REMEMBERED) {
    const first = seen.values().next().value;
    if (first === undefined) break;
    seen.delete(first);
  }
  return fresh;
}

export function prefetchImages(urls: readonly (string | null | undefined)[]): void {
  const fresh = takeUnseen(urls);
  if (fresh.length === 0) return;
  void Image.prefetch(fresh, 'memory-disk').catch(() => {
    // Best effort: a failed prefetch just means the image loads on demand.
  });
}

/** Test helper. */
export function resetImagePrefetchMemory(): void {
  seen.clear();
}
