import { describe, expect, it } from 'vitest';
import { isPersistableQueryKey } from '../queryPersistKeys';

describe('isPersistableQueryKey (#894)', () => {
  it('persists feed and profile roots', () => {
    expect(isPersistableQueryKey(['feed', 'home'])).toBe(true);
    expect(isPersistableQueryKey(['user-profile', 'uid'])).toBe(true);
    expect(isPersistableQueryKey(['profile-posts', 'uid'])).toBe(true);
    expect(isPersistableQueryKey(['chat-inbox'])).toBe(true);
  });

  it('skips volatile or sensitive keys', () => {
    expect(isPersistableQueryKey(['post-saved', 'pid'])).toBe(false);
    expect(isPersistableQueryKey(['admin-tasks'])).toBe(false);
    expect(isPersistableQueryKey([42])).toBe(false);
  });
});
