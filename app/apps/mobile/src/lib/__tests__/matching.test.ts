import { describe, it, expect } from 'vitest';
import { matchStateOf, scorePercent, sortMatches } from '../matching';

const m = (over: Partial<{ status: 'suggested' | 'accepted'; myResponse: 'accepted' | 'declined' | null;
  otherResponse: 'accepted' | 'declined' | null; score: number }>) => ({
  status: 'suggested' as const, myResponse: null, otherResponse: null, score: 0.5, ...over,
});

describe('matching helpers', () => {
  it('derives the UI state', () => {
    expect(matchStateOf(m({}))).toBe('new');
    expect(matchStateOf(m({ otherResponse: 'accepted' }))).toBe('theyAccepted');
    expect(matchStateOf(m({ myResponse: 'accepted' }))).toBe('waiting');
    expect(matchStateOf(m({ status: 'accepted', myResponse: 'accepted', otherResponse: 'accepted' }))).toBe('mutual');
  });

  it('clamps and rounds the score to a percentage', () => {
    expect(scorePercent(0.7312)).toBe(73);
    expect(scorePercent(1.4)).toBe(100);
    expect(scorePercent(-1)).toBe(0);
    expect(scorePercent(Number.NaN)).toBe(0);
  });

  it('sorts mutual → theyAccepted → new → waiting, then by score', () => {
    const list = [
      { ...m({ score: 0.9, myResponse: 'accepted' }), id: 'waiting' },
      { ...m({ score: 0.6 }), id: 'new-low' },
      { ...m({ score: 0.8 }), id: 'new-high' },
      { ...m({ score: 0.5, otherResponse: 'accepted' }), id: 'they' },
      { ...m({ score: 0.4, status: 'accepted' }), id: 'mutual' },
    ];
    expect(sortMatches(list).map((x) => x.id)).toEqual(['mutual', 'they', 'new-high', 'new-low', 'waiting']);
  });
});
