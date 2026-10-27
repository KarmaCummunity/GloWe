import { describe, expect, it, vi, afterEach } from 'vitest';
import { Linking, Platform } from 'react-native';
import { aboutOpenExternalUrl } from '../aboutOpenExternalUrl';

describe('aboutOpenExternalUrl', () => {
  const origPlatform = Platform.OS;

  afterEach(() => {
    (Platform as { OS: typeof Platform.OS }).OS = origPlatform;
    vi.restoreAllMocks();
  });

  it('uses window.open on web', async () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'web';
    const open = vi.fn().mockReturnValue({});
    vi.stubGlobal('window', { open: open as unknown as Window['open'] });
    await aboutOpenExternalUrl('https://www.instagram.com/karma_community_/', 'err');
    expect(open).toHaveBeenCalledWith(
      'https://www.instagram.com/karma_community_/',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('calls Linking.openURL on ios', async () => {
    (Platform as { OS: typeof Platform.OS }).OS = 'ios';
    const spy = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    await aboutOpenExternalUrl('https://example.com', 'err');
    expect(spy).toHaveBeenCalledWith('https://example.com');
  });
});
