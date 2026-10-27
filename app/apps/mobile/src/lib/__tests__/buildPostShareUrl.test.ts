import { describe, expect, it } from 'vitest';
import { buildPostShareUrl, resolveWebBaseUrl } from '../buildPostShareUrl';

describe('buildPostShareUrl', () => {
  it('joins the base url and the post id', () => {
    expect(buildPostShareUrl('abc-123', 'https://karma-community-kc.com')).toBe(
      'https://karma-community-kc.com/post/abc-123',
    );
  });

  it('strips trailing slashes from the base url', () => {
    expect(buildPostShareUrl('abc-123', 'https://karma-community-kc.com//')).toBe(
      'https://karma-community-kc.com/post/abc-123',
    );
  });

  it('url-encodes the post id', () => {
    expect(buildPostShareUrl('a b/c', 'https://kc.com')).toBe('https://kc.com/post/a%20b%2Fc');
  });

  it('throws on empty post id', () => {
    expect(() => buildPostShareUrl('', 'https://kc.com')).toThrow(/postId/);
  });

  it('throws on empty base url', () => {
    expect(() => buildPostShareUrl('abc', '')).toThrow(/webBaseUrl/);
  });
});

describe('resolveWebBaseUrl', () => {
  it('returns the env var when set', () => {
    expect(resolveWebBaseUrl({ EXPO_PUBLIC_WEB_BASE_URL: 'https://example.com' })).toBe(
      'https://example.com',
    );
  });

  it('strips trailing slashes from the env value', () => {
    expect(resolveWebBaseUrl({ EXPO_PUBLIC_WEB_BASE_URL: 'https://example.com///' })).toBe(
      'https://example.com',
    );
  });

  it('falls back to the production host when env is unset', () => {
    expect(resolveWebBaseUrl({})).toBe('https://karma-community-kc.com');
  });

  it('falls back when env is an empty string', () => {
    expect(resolveWebBaseUrl({ EXPO_PUBLIC_WEB_BASE_URL: '   ' })).toBe('https://karma-community-kc.com');
  });
});

describe('trailing slash handling', () => {
  it('strips any number of trailing slashes', () => {
    expect(buildPostShareUrl('p1', 'https://x.test///')).toBe('https://x.test/post/p1');
    expect(resolveWebBaseUrl({ EXPO_PUBLIC_WEB_BASE_URL: ' https://y.test// ' })).toBe('https://y.test');
  });

  it('handles long slash-only runs in linear time', () => {
    const base = `https://x.test${'/'.repeat(100_000)}a`;
    const t0 = Date.now();
    expect(buildPostShareUrl('p', base)).toBe(`${base}/post/p`);
    expect(Date.now() - t0).toBeLessThan(500);
  });
});
