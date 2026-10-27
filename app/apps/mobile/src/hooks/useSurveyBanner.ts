// useSurveyBanner — eligibility + snooze logic for the survey prompt banner.
// FR-SETTINGS-016 AC6: show at session N with 7-day snooze via AsyncStorage.
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { container } from '../lib/container';
import { track } from '../lib/analytics';

const SNOOZE_DAYS = 7;
const SESSION_COUNT_KEY = 'kc-app-session-count';
const SURVEY_SLUG = 'ux-experience' as const;

function snoozeKey(slug: string): string {
  return `kc-survey-snooze-${slug}`;
}

function isSnoozed(snoozeAt: string | null): boolean {
  if (!snoozeAt) return false;
  const elapsedMs = Date.now() - new Date(snoozeAt).getTime();
  return elapsedMs < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

export interface SurveyBannerState {
  readonly shouldShow: boolean;
  readonly slug: string;
  readonly onSnooze: () => Promise<void>;
}

/**
 * Returns banner eligibility for Survey A (ux-experience).
 * - Reads session count from AsyncStorage (incremented once per mount).
 * - Suppresses banner for 7 days after snooze.
 * - Fails silently on network/storage errors.
 */
export function useSurveyBanner(): SurveyBannerState {
  const [shouldShow, setShouldShow] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    void (async () => {
      try {
        // Increment and read session count.
        const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
        const count = raw ? Number.parseInt(raw, 10) + 1 : 1;
        await AsyncStorage.setItem(SESSION_COUNT_KEY, String(count));

        // Check client-side snooze first (no network needed).
        const snoozeAt = await AsyncStorage.getItem(snoozeKey(SURVEY_SLUG));
        if (isSnoozed(snoozeAt)) return;

        // Ask the use case for server-side eligibility.
        const result = await container.checkSurveyPrompt.execute({
          slug: SURVEY_SLUG,
          sessionCount: count,
        });
        if (result.show) setShouldShow(true);
      } catch {
        // Fail silent — banner is non-critical.
      }
    })();
  }, []);

  const onSnooze = useCallback(async (): Promise<void> => {
    setShouldShow(false);
    track('survey_prompt_snoozed', { slug: SURVEY_SLUG });
    try {
      await AsyncStorage.setItem(snoozeKey(SURVEY_SLUG), new Date().toISOString());
    } catch {
      // Fail silent.
    }
  }, []);

  return { shouldShow, slug: SURVEY_SLUG, onSnooze };
}
