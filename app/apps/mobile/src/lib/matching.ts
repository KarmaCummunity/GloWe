// Matching v2 view helpers (pure; unit-tested).
import type { MatchSuggestion } from '@kc/infrastructure-supabase';

/** new: nobody answered · theyAccepted: the other side said yes · waiting: I said yes · mutual: both. */
export type MatchUiState = 'new' | 'theyAccepted' | 'waiting' | 'mutual';

export function matchStateOf(m: Pick<MatchSuggestion, 'status' | 'myResponse' | 'otherResponse'>): MatchUiState {
  if (m.status === 'accepted') return 'mutual';
  if (m.myResponse === 'accepted') return 'waiting';
  if (m.otherResponse === 'accepted') return 'theyAccepted';
  return 'new';
}

export function scorePercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

/** Mutual matches first, then ones the other side already accepted, then by score. */
export function sortMatches<T extends Pick<MatchSuggestion, 'status' | 'myResponse' | 'otherResponse' | 'score'>>(
  list: readonly T[],
): T[] {
  const rank: Record<MatchUiState, number> = { mutual: 0, theyAccepted: 1, new: 2, waiting: 3 };
  return [...list].sort((a, b) => rank[matchStateOf(a)] - rank[matchStateOf(b)] || b.score - a.score);
}
