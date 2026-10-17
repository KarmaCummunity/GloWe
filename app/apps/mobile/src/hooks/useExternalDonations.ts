import { useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import {
  buildExternalDonationUrl,
  shouldOpenDonationsExternally,
  webBaseUrl,
  type ExternalDonationKind,
} from '../config/featureFlags';
import { useFeatureFlag } from './useFeatureFlag';

/**
 * iOS + ios_in_app_donations off → donations continue in Safari (App Store 3.2.2(iv)).
 * Android / web: `external` is always false and nothing changes.
 */
export function useExternalDonations() {
  const inApp = useFeatureFlag('ios_in_app_donations');
  const external = shouldOpenDonationsExternally(Platform.OS, inApp);
  const openExternal = useCallback(
    (kind: ExternalDonationKind, orgId: string, listingId?: string | null) =>
      Linking.openURL(buildExternalDonationUrl(webBaseUrl(), kind, orgId, listingId)),
    [],
  );
  return { external, openExternal };
}
