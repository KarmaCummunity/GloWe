import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prefetch } = vi.hoisted(() => ({ prefetch: vi.fn(async (_u: string[], _p: string) => true) }));
vi.mock('expo-image', () => ({ Image: { prefetch } }));

import { prefetchImages, resetImagePrefetchMemory, takeUnseen } from '../imagePrefetch';

describe('imagePrefetch', () => {
  beforeEach(() => {
    resetImagePrefetchMemory();
    prefetch.mockClear();
  });

  it('dedupes and skips empty urls', () => {
    expect(takeUnseen(['a', null, 'b', 'a', undefined, ''])).toEqual(['a', 'b']);
    expect(takeUnseen(['a', 'c'])).toEqual(['c']);
  });

  it('prefetches only unseen urls into memory+disk', () => {
    prefetchImages(['x', 'y']);
    prefetchImages(['x']);
    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(prefetch).toHaveBeenCalledWith(['x', 'y'], 'memory-disk');
  });

  it('swallows prefetch failures', async () => {
    prefetch.mockRejectedValueOnce(new Error('offline'));
    expect(() => prefetchImages(['z'])).not.toThrow();
    await Promise.resolve();
  });

  it('forgets the oldest urls beyond the memory bound', () => {
    const many = Array.from({ length: 450 }, (_, i) => `u${i}`);
    takeUnseen(many);
    // u0 was evicted, so it counts as unseen again; u449 is still remembered.
    expect(takeUnseen(['u0', 'u449'])).toEqual(['u0']);
  });
});
