// FR-POST-023 — download the post's first image into the OS cache so
// `Share.share({ url: <fileUri> })` can attach the binary directly. Native-
// only: web uses Blob/File via fetch in `sharePost.ts`. Returns `null` (not
// throws) on any failure so the caller falls back to the URL-only share
// path instead of dropping the affordance entirely.

import { Platform } from 'react-native';

export type DownloadedImage = Readonly<{
  /** Local `file://` URI safe to pass to `Share.share({ url })`. */
  uri: string;
  /** MIME type derived from the URL extension (falls back to image/jpeg). */
  mimeType: string;
}>;

function extFromUrl(url: string): string {
  const cleaned = url.split('?')[0]!.split('#')[0]!;
  const dot = cleaned.lastIndexOf('.');
  if (dot < 0) return 'jpg';
  const ext = cleaned.slice(dot + 1).toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'heic') {
    return ext;
  }
  return 'jpg';
}

function mimeFromExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

export async function downloadPostImageForShare(
  remoteUrl: string,
  postId: string,
): Promise<DownloadedImage | null> {
  if (Platform.OS === 'web') return null;
  if (!remoteUrl || !postId) return null;
  try {
    // Type narrowed to the legacy module which has cacheDirectory and downloadAsync.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return null;
    const ext = extFromUrl(remoteUrl);
    // Deterministic filename so repeated shares of the same post reuse the
    // cached file instead of re-downloading on every tap.
    const safeId = postId.replace(/[^a-zA-Z0-9-_]/g, '_');
    const target = `${cacheDir}kc-share-${safeId}.${ext}`;
    const result = await FileSystem.downloadAsync(remoteUrl, target);
    if (result.status < 200 || result.status >= 300) return null;
    return { uri: result.uri, mimeType: mimeFromExt(ext) };
  } catch {
    return null;
  }
}
