// Standardised image renderer. Anywhere a remote image is shown, use <KCImage>
// — never react-native's <Image>. Lets us swap implementations (RN Image,
// FastImage, future) in one place.
//
// `fallbackUri` covers the PERF-4 transition: small surfaces pass the
// `-thumb` URL as `uri` and the full URL as `fallbackUri`. New uploads have
// both versions in Storage; existing uploads only have the full version
// until the backfill pass runs, so the fallback keeps old content visible.
import React from 'react';
import { Image, type ImageProps, type ImageStyle } from 'expo-image';
import { StyleProp } from 'react-native';

type Props = {
  uri: string | null | undefined;
  /** Tried once if the primary `uri` fails to load. Useful for thumb → full graceful degrade. */
  fallbackUri?: string | null;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  blurhash?: string;
  /** Pass the row id inside recycled lists (FlashList) so a reused cell never flashes the previous image. */
  recyclingKey?: string;
  priority?: ImageProps['priority'];
  /** Skip the blurhash placeholder (e.g. full-screen viewer on black). */
  noPlaceholder?: boolean;
  accessibilityLabel?: string;
  onLoad?: () => void;
  onError?: () => void;
};

const DEFAULT_PLACEHOLDER = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function KCImage({
  uri,
  fallbackUri,
  width,
  height,
  style,
  contentFit = 'cover',
  blurhash,
  recyclingKey,
  priority,
  noPlaceholder,
  accessibilityLabel,
  onLoad,
  onError,
}: Props) {
  const [currentUri, setCurrentUri] = React.useState<string | null | undefined>(uri);
  const [didFallback, setDidFallback] = React.useState(false);

  React.useEffect(() => {
    setCurrentUri(uri);
    setDidFallback(false);
  }, [uri]);

  const handleError = React.useCallback(() => {
    if (!didFallback && fallbackUri && fallbackUri !== uri) {
      setCurrentUri(fallbackUri);
      setDidFallback(true);
      return;
    }
    onError?.();
  }, [didFallback, fallbackUri, uri, onError]);

  if (!currentUri) return null;
  return (
    <Image
      source={currentUri}
      style={[{ width, height }, style]}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={150}
      placeholder={noPlaceholder ? undefined : { blurhash: blurhash ?? DEFAULT_PLACEHOLDER }}
      recyclingKey={recyclingKey ?? currentUri}
      priority={priority}
      accessibilityLabel={accessibilityLabel}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}
