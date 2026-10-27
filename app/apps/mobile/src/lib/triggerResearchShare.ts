// FR-RESEARCH-004 — shared share handler for in-app surfaces (Settings row, survey card).
import { shareResearchSurvey, type ShareResearchOutcome } from './shareResearchSurvey';
import { track } from './analytics';

const WEB_BASE_URL =
  (process.env.EXPO_PUBLIC_WEB_BASE_URL as string | undefined) ??
  'https://karma-community-kc.com';

type ShareLabels = Readonly<{
  title: string;
  message: string;
  toastShared: string;
  toastCopied: string;
  toastFailed: string;
}>;

type ToastFn = (message: string, kind: 'success' | 'error', durationMs: number) => void;

export async function triggerResearchShare(
  src: string,
  labels: ShareLabels,
  showToast?: ToastFn,
): Promise<ShareResearchOutcome> {
  const outcome = await shareResearchSurvey({
    webBaseUrl: WEB_BASE_URL,
    src,
    title: labels.title,
    message: labels.message,
  });

  track('research_share_initiated', {
    slug: 'alt-platforms-research',
    src,
    outcome: outcome.kind,
  });

  if (!showToast) return outcome;

  if (outcome.kind === 'shared') showToast(labels.toastShared, 'success', 2200);
  else if (outcome.kind === 'copied') showToast(labels.toastCopied, 'success', 2200);
  else if (outcome.kind === 'failed') showToast(labels.toastFailed, 'error', 2200);

  return outcome;
}
