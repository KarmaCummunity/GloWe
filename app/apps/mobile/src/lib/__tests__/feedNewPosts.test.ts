import { describe, it, expect } from 'vitest';
import { shouldCountNewPost } from '../feedNewPosts';

describe('shouldCountNewPost', () => {
  it('counts other users posts once', () => {
    const seen = new Set<string>();
    expect(shouldCountNewPost({ postId: 'p1', ownerId: 'u2' }, 'me', seen)).toBe(true);
    expect(shouldCountNewPost({ postId: 'p1', ownerId: 'u2' }, 'me', seen)).toBe(false);
  });

  it('skips the viewer own posts', () => {
    expect(shouldCountNewPost({ postId: 'p1', ownerId: 'me' }, 'me', new Set())).toBe(false);
  });

  it('counts for guests and id-less pings', () => {
    const seen = new Set<string>();
    expect(shouldCountNewPost({ postId: 'p1', ownerId: 'me' }, null, seen)).toBe(true);
    expect(shouldCountNewPost({ postId: null, ownerId: null }, 'me', seen)).toBe(true);
    expect(shouldCountNewPost({ postId: null, ownerId: null }, 'me', seen)).toBe(true);
  });

  it('bounds the dedupe set', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) shouldCountNewPost({ postId: `p${i}`, ownerId: 'x' }, 'me', seen);
    expect(seen.size).toBe(500);
    expect(seen.has('p0')).toBe(false);
    expect(seen.has('p599')).toBe(true);
  });
});
