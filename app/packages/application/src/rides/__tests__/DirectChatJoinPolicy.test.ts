import { describe, expect, it } from 'vitest';
import { DirectChatJoinPolicy } from '../DirectChatJoinPolicy';

describe('DirectChatJoinPolicy', () => {
  it('always allows direct chat (FR-RIDE-010)', () => {
    expect(new DirectChatJoinPolicy().allowsDirectChat()).toBe(true);
  });
});
