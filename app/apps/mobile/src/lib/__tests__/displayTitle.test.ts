import { describe, expect, it } from 'vitest';
import { cleanDisplayTitle } from '../displayTitle';

describe('cleanDisplayTitle', () => {
  it('strips [DEMO] prefixes', () => {
    expect(cleanDisplayTitle('[DEMO] מחפש/ת טרמפ ללוד')).toBe('מחפש/ת טרמפ ללוד');
    expect(cleanDisplayTitle('[demo][TEST] x')).toBe('x');
  });
  it('keeps normal titles', () => {
    expect(cleanDisplayTitle('ספה [DEMO]')).toBe('ספה [DEMO]');
    expect(cleanDisplayTitle(null)).toBe('');
  });
});
