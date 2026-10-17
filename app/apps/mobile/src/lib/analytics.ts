// Product analytics facade — PostHog when EXPO_PUBLIC_POSTHOG_KEY is set, else no-op
// (console in __DEV__). PII-free properties only (slugs, enums, counts — never email/phone).
// Survey events: FR-SETTINGS-016 AC6. Funnel events: KC#946.

import { capturePosthog } from './observability/posthog';

export type SurveyAnalyticsEvent =
  | 'survey_opened'
  | 'survey_question_answered'
  | 'survey_completed'
  | 'survey_prompt_snoozed'
  | 'feedback_submitted'
  | 'research_share_initiated';

/** Key product funnels (#946). */
export type FunnelAnalyticsEvent =
  | 'signup'
  | 'listing_created'
  | 'match_made'
  | 'donation';

export type AnalyticsEvent = SurveyAnalyticsEvent | FunnelAnalyticsEvent;

type EventProperties = Record<string, unknown>;

/**
 * Emit a product analytics event.
 * Forwards to PostHog when initialised; otherwise __DEV__ console only.
 */
export function track(event: AnalyticsEvent, properties?: EventProperties): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, properties ?? {});
  }
  capturePosthog(event, properties);
}
