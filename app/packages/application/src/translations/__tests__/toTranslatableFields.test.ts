import { describe, it, expect } from 'vitest';
import { toTranslatableFields } from '../toTranslatableFields';
import type { PostWithOwner } from '../../ports/IPostRepository';

function post(over: Partial<PostWithOwner>): PostWithOwner {
  return { postId: 'p1', title: 'Hello', description: 'World', sourceLanguage: 'en', ...over } as PostWithOwner;
}

describe('toTranslatableFields', () => {
  it('emits title + description for a foreign-language post', () => {
    const out = toTranslatableFields(post({}), 'he');
    expect(out.map((f) => f.field).sort((a, b) => a.localeCompare(b))).toEqual(['description', 'title']);
    expect(out[0]).toMatchObject({ postId: 'p1', sourceLanguage: 'en' });
  });
  it('emits nothing when source language equals reader language', () => {
    expect(toTranslatableFields(post({ sourceLanguage: 'he' }), 'he')).toEqual([]);
  });
  it('skips empty/untranslatable fields', () => {
    expect(toTranslatableFields(post({ description: null, title: '123' }), 'he')).toEqual([]);
  });
  it('translates when source language is unknown (null)', () => {
    const out = toTranslatableFields(post({ sourceLanguage: null }), 'he');
    expect(out.map((f) => f.field)).toContain('title');
  });
});
