import { describe, it, expect } from 'vitest';
import { EMPTY_SEARCH_BUCKET, orderByIds, pageFetchSize, toPagedBucket } from '../searchBucket';

describe('searchBucket', () => {
  it('toPagedBucket trims the extra row and flags hasMore', () => {
    expect(toPagedBucket([1, 2, 3], 2)).toEqual({ items: [1, 2], total: 2, hasMore: true });
  });

  it('toPagedBucket keeps a short page as-is', () => {
    expect(toPagedBucket([1], 2)).toEqual({ items: [1], total: 1, hasMore: false });
    expect(toPagedBucket(null, 2)).toEqual({ items: [], total: 0, hasMore: false });
  });

  it('pageFetchSize asks for one extra row', () => {
    expect(pageFetchSize(20)).toBe(21);
    expect(pageFetchSize(0)).toBe(2);
  });

  it('orderByIds follows the id order and drops missing rows', () => {
    const rows = [{ id: 'b' }, { id: 'a' }];
    expect(orderByIds(['a', 'x', 'b'], rows, (r) => r.id)).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('EMPTY_SEARCH_BUCKET has no more', () => {
    expect(EMPTY_SEARCH_BUCKET).toEqual({ items: [], total: 0, hasMore: false });
  });
});
