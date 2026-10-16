process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';

import { afterEach, describe, expect, it } from 'vitest';
import {
  deriveThumbPath,
  deriveThumbUrl,
  getSupabaseImageThumbUrl,
  getSupabasePublicImageUrl,
} from '../imageUrl';

describe('getSupabasePublicImageUrl', () => {
  it('routes through /object/public/ by default (transforms gated off)', () => {
    const url = getSupabasePublicImageUrl({ bucket: 'post-images', path: 'a/b.jpg', width: 400, quality: 80 });
    expect(url).toContain('/storage/v1/object/public/post-images/a/b.jpg');
    expect(url).not.toContain('?width');
    expect(url).not.toContain('/render/image/');
  });
  it('omits transform params via /object/public/ when none given', () => {
    const url = getSupabasePublicImageUrl({ bucket: 'avatars', path: 'x/y.jpg' });
    expect(url).toContain('/storage/v1/object/public/avatars/x/y.jpg');
    expect(url).not.toContain('?width');
  });
  it('returns empty string for empty path', () => {
    expect(getSupabasePublicImageUrl({ bucket: 'post-images', path: '' })).toBe('');
  });

});

describe('getSupabasePublicImageUrl without env', () => {
  const savedUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const savedKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    if (savedUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = savedUrl;
    if (savedKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  });

  it('returns empty string when Supabase env is missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(getSupabasePublicImageUrl({ bucket: 'post-images', path: 'a.jpg' })).toBe('');
  });
});

describe('deriveThumbPath', () => {
  it('inserts -thumb before the extension', () => {
    expect(deriveThumbPath('a/b/c.jpg')).toBe('a/b/c-thumb.jpg');
  });
  it('handles avatar path layout', () => {
    expect(deriveThumbPath('uuid-1234/avatar.jpg')).toBe('uuid-1234/avatar-thumb.jpg');
  });
  it('handles post path layout (3 segments)', () => {
    expect(deriveThumbPath('user-id/batch-uuid/0.jpg')).toBe('user-id/batch-uuid/0-thumb.jpg');
  });
  it('returns the path unchanged when empty', () => {
    expect(deriveThumbPath('')).toBe('');
  });
  it('falls back to suffix when there is no extension', () => {
    expect(deriveThumbPath('a/b/c')).toBe('a/b/c-thumb');
  });
  it('does not confuse a dot inside a folder name for an extension', () => {
    expect(deriveThumbPath('foo.bar/baz')).toBe('foo.bar/baz-thumb');
  });
  it('handles multi-dot filenames by splitting on the last dot', () => {
    expect(deriveThumbPath('a/b/file.name.jpg')).toBe('a/b/file.name-thumb.jpg');
  });
});

describe('getSupabaseImageThumbUrl', () => {
  it('returns the public URL of the sibling -thumb object', () => {
    const url = getSupabaseImageThumbUrl({ bucket: 'post-images', path: 'u/b/0.jpg' });
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/post-images/u/b/0-thumb.jpg');
  });
  it('returns empty string for empty path', () => {
    expect(getSupabaseImageThumbUrl({ bucket: 'avatars', path: '' })).toBe('');
  });
});

describe('deriveThumbUrl', () => {
  it('thumbifies a Supabase public storage URL with cache-bust query', () => {
    const input = 'https://example.supabase.co/storage/v1/object/public/avatars/uuid/avatar.jpg?v=1700000000000';
    expect(deriveThumbUrl(input)).toBe(
      'https://example.supabase.co/storage/v1/object/public/avatars/uuid/avatar-thumb.jpg?v=1700000000000',
    );
  });
  it('thumbifies a Supabase public storage URL without query', () => {
    const input = 'https://example.supabase.co/storage/v1/object/public/post-images/u/b/0.jpg';
    expect(deriveThumbUrl(input)).toBe(
      'https://example.supabase.co/storage/v1/object/public/post-images/u/b/0-thumb.jpg',
    );
  });
  it('passes Google OAuth avatar URLs through unchanged', () => {
    const input = 'https://lh3.googleusercontent.com/a/ACg8ocI...=s96-c';
    expect(deriveThumbUrl(input)).toBe(input);
  });
  it('passes other external URLs through unchanged', () => {
    const input = 'https://cdn.example.com/static/avatar.png';
    expect(deriveThumbUrl(input)).toBe(input);
  });
  it('returns input unchanged on parse failure', () => {
    expect(deriveThumbUrl('')).toBe('');
    expect(deriveThumbUrl('not a url')).toBe('not a url');
  });
});
