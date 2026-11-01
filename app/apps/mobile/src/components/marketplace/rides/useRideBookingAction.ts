// Runs one ride booking action: busy state, success haptic, analytics, cache refresh and a
// friendly alert with the server's error copy on failure (shared by driver and passenger views).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { track } from '../../../lib/analytics';
import { trackCoreLoop } from '../../../lib/analyticsCoreLoop';
import { hapticSuccess } from '../../../lib/haptics';
import { handoffErrorKey } from '../../../lib/marketplaceCreateErrors';
import { rideBookingsQueryKey } from '../../../services/rideBookingComposition';

/** Core-loop events a booking action can complete. */
export type RideBookingAnalytics = 'match_made' | 'handover_completed';

export function useRideBookingAction(listingId: string, cityId: string | null) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, analytics?: RideBookingAnalytics) => {
    setBusy(true);
    try {
      await action();
      if (analytics === 'match_made') track('match_made', { world: 'rides' });
      if (analytics === 'handover_completed') trackCoreLoop('handover_completed', { world: 'rides', cityId });
      hapticSuccess();
      // The passenger's own booking, the driver's list and any listing status change.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['giving-handoff', listingId] }),
        qc.invalidateQueries({ queryKey: rideBookingsQueryKey(listingId) }),
        qc.invalidateQueries({ queryKey: ['marketplace'] }),
      ]);
    } catch (err) {
      alert(t(handoffErrorKey(err) ?? 'givingHandoff.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return { busy, run };
}
