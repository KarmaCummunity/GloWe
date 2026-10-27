// ─────────────────────────────────────────────
// Avatar pick + upload pipeline (FR-AUTH-011).
// Pick (camera|gallery) → square center-crop → resize to 512 + JPEG q=0.85
// → upload to `avatars` bucket at <userId>/avatar.jpg → return public URL.
// PERF-4: also writes a 96px square thumb at <userId>/avatar-thumb.jpg
// alongside, and sets immutable cache headers on both. Renderers pick the
// thumb for small surfaces (chrome avatars ≤96px) via deriveThumbUrl.
// ─────────────────────────────────────────────

import { Linking, Platform } from 'react-native';
import i18n from '../i18n';
import { confirmAction } from './platformConfirm';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getSupabaseClient } from '@kc/infrastructure-supabase';
import type { PickedImage } from './imageUpload';
import { base64ToUint8Array } from './mediaEncoding';

const AVATAR_FULL_EDGE = 512;
const AVATAR_THUMB_EDGE = 96;
const COMPRESS = 0.85;
const THUMB_COMPRESS = 0.75;
const AVATAR_BUCKET = 'avatars';
const AVATAR_PATH = (userId: string) => `${userId}/avatar.jpg`;
const AVATAR_THUMB_PATH = (userId: string) => `${userId}/avatar-thumb.jpg`;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export type AvatarSource = 'camera' | 'gallery';

/** Camera capture is mobile-only; web users are gallery-only. */
export const isCameraAvailable = Platform.OS !== 'web';

/**
 * If the OS-level permission was permanently denied (`canAskAgain === false`),
 * surface an actionable alert that opens iOS / Android Settings. If denied but
 * the system can still prompt next time, return false silently — the next tap
 * triggers the system sheet again.
 *
 * Returns `true` when the caller may proceed (granted or limited).
 */
async function ensureMediaLibraryPermission(): Promise<boolean> {
  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (result.granted) return true;
  if (result.canAskAgain) return false;
  const openSettings = await confirmAction(
    i18n.t('errors.media.galleryDeniedTitle'),
    i18n.t('errors.media.galleryDeniedBodyAvatar'),
    { confirmLabel: i18n.t('errors.media.openSettings') },
  );
  if (openSettings) void Linking.openSettings();
  return false;
}

async function ensureCameraPermission(): Promise<boolean> {
  const result = await ImagePicker.requestCameraPermissionsAsync();
  if (result.granted) return true;
  if (result.canAskAgain) return false;
  const openSettings = await confirmAction(
    i18n.t('errors.media.cameraDeniedTitle'),
    i18n.t('errors.media.cameraDeniedBodyAvatar'),
    { confirmLabel: i18n.t('errors.media.openSettings') },
  );
  if (openSettings) void Linking.openSettings();
  return false;
}

/**
 * FR-AUTH-011 AC1: pick a single image from the camera or the gallery.
 * Returns null on cancel / permission denial / camera-on-web.
 *
 * Note: we deliberately do NOT pass `allowsEditing` / `aspect` — on iOS 14+
 * the new PHPickerViewController doesn't support them, and combining them
 * with `aspect: [1,1]` crashes the app on the simulator (iOS 26). We do the
 * square center-crop ourselves in `resizeAndUploadAvatar` via ImageManipulator.
 */
export async function pickAvatarImage(source: AvatarSource): Promise<PickedImage | null> {
  const mediaTypes = ['images'] as ImagePicker.MediaType[]; // SDK 54 array form
  if (source === 'camera') {
    if (!isCameraAvailable) return null;
    if (!(await ensureCameraPermission())) return null;
    const r = await ImagePicker.launchCameraAsync({ mediaTypes, quality: 1, exif: false });
    if (r.canceled) return null;
    const a = r.assets[0]!;
    return { uri: a.uri, width: a.width, height: a.height, fileSize: a.fileSize ?? null };
  }

  if (!(await ensureMediaLibraryPermission())) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes, allowsMultipleSelection: false, quality: 1, exif: false,
  });
  if (r.canceled) return null;
  const a = r.assets[0]!;
  return { uri: a.uri, width: a.width, height: a.height, fileSize: a.fileSize ?? null };
}

/**
 * Square center-crop the picked image, resize to size×size, JPEG-encode, and
 * return raw bytes (avoids the unreliable `fetch(file://).blob()` path — see
 * `mediaEncoding.ts` for context).
 */
async function squareCropAndResize(picked: PickedImage, size: number, compress: number): Promise<Uint8Array> {
  const side = Math.min(picked.width, picked.height);
  const originX = Math.max(0, Math.round((picked.width - side) / 2));
  const originY = Math.max(0, Math.round((picked.height - side) / 2));
  const m = await ImageManipulator.manipulateAsync(
    picked.uri,
    [
      { crop: { originX, originY, width: side, height: side } },
      { resize: { width: size, height: size } },
    ],
    { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!m.base64) throw new Error('avatar_resize: manipulator returned no base64 payload');
  return base64ToUint8Array(m.base64);
}

/**
 * FR-AUTH-011 AC2: square center-crop → 512×512 JPEG → upload to
 * `avatars/<userId>/avatar.jpg` (upsert). PERF-4: also writes a 96×96 thumb
 * at `avatars/<userId>/avatar-thumb.jpg`. Returns the full public URL with a
 * cache-busting `?v=` param so a replacement avatar isn't served from CDN
 * cache for the same path. The thumb URL is derived from the full URL by the
 * renderer via `deriveThumbUrl`.
 */
export async function resizeAndUploadAvatar(picked: PickedImage, userId: string): Promise<string> {
  if (!userId) throw new Error('resizeAndUploadAvatar: userId is required');
  const fullBytes = await squareCropAndResize(picked, AVATAR_FULL_EDGE, COMPRESS);
  const thumbBytes = await squareCropAndResize(picked, AVATAR_THUMB_EDGE, THUMB_COMPRESS);

  const client = getSupabaseClient();
  const fullUpload = await client.storage
    .from(AVATAR_BUCKET)
    .upload(AVATAR_PATH(userId), fullBytes, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });
  if (fullUpload.error) throw new Error(`avatar_upload: ${fullUpload.error.message}`);

  // Thumb upload is best-effort — if it fails the full image still renders
  // (KCImage's `fallbackUri` covers the missing thumb).
  const thumbUpload = await client.storage
    .from(AVATAR_BUCKET)
    .upload(AVATAR_THUMB_PATH(userId), thumbBytes, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
    });
  if (thumbUpload.error) {
    console.warn(`avatar_upload_thumb: ${thumbUpload.error.message}`);
  }

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(AVATAR_PATH(userId));
  return `${data.publicUrl}?v=${Date.now()}`;
}

/**
 * TD-108: delete the Storage object before persisting `avatar_url = null`.
 * Best-effort — Storage failures are logged and swallowed so the user-visible
 * "avatar gone" action still succeeds; the metadata wipe is the source of truth.
 * PERF-4: also removes the sibling thumb in the same call.
 */
export async function removeUploadedAvatar(userId: string): Promise<void> {
  if (!userId) return;
  const client = getSupabaseClient();
  const { error } = await client.storage
    .from(AVATAR_BUCKET)
    .remove([AVATAR_PATH(userId), AVATAR_THUMB_PATH(userId)]);
  if (error) console.warn(`avatar_remove: ${error.message}`);
}
