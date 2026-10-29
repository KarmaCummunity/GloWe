// Core product loop events (#1055) — city + world on every emit.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsCitySegment } from '@kc/domain';
import { track, type AnalyticsEvent } from './analytics';

const ACTIVATION_KEY = 'kc_core_loop_activation_sent';
const RETURN_VISIT_KEY = 'kc_core_loop_return_visit_sent';

export type CoreLoopEvent =
  | 'signup'
  | 'activation'
  | 'listing_created'
  | 'match_shown'
  | 'match_feedback'
  | 'chat_started'
  | 'handover_completed'
  | 'return_visit';

type CoreLoopProps = {
  readonly world?: string;
  readonly cityId?: string | null;
  readonly [key: string]: unknown;
};

function withCoreLoopProps(props?: CoreLoopProps): Record<string, unknown> {
  const cityId = props?.cityId ?? null;
  const { cityId: _drop, ...rest } = props ?? {};
  return {
    ...rest,
    city: analyticsCitySegment(cityId),
    ...(props?.world ? { world: props.world } : {}),
  };
}

export function trackCoreLoop(event: CoreLoopEvent, props?: CoreLoopProps): void {
  track(event as AnalyticsEvent, withCoreLoopProps(props));
}

/** First listing in the session path counts as activation once per install. */
export async function trackActivationIfFirst(props: CoreLoopProps): Promise<void> {
  try {
    const sent = await AsyncStorage.getItem(ACTIVATION_KEY);
    if (sent === '1') return;
    await AsyncStorage.setItem(ACTIVATION_KEY, '1');
    trackCoreLoop('activation', props);
  } catch {
    trackCoreLoop('activation', props);
  }
}

/** Logged-in reopen after the first app open on this install. */
export async function trackReturnVisitIfReturning(props: CoreLoopProps): Promise<void> {
  try {
    const seen = await AsyncStorage.getItem(RETURN_VISIT_KEY);
    if (seen === '1') {
      trackCoreLoop('return_visit', props);
      return;
    }
    await AsyncStorage.setItem(RETURN_VISIT_KEY, '1');
  } catch {
    /* no-op */
  }
}
