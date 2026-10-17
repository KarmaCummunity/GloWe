import { describe, expect, it } from 'vitest';
import { localizeSuggestedTag } from '../localizeSuggestedTag';

const he: Record<string, string> = {
  'search.categories.Furniture': 'רהיטים',
  'search.categories.Kitchen': 'מטבח',
  'search.categories.BabyGear': 'ציוד תינוקות',
};
const tHe = (k: string) => he[k] ?? k;
const tEn = (k: string) => k.split('.').pop() ?? k;

describe('localizeSuggestedTag', () => {
  it('maps category tags to Hebrew on he', () => {
    expect(localizeSuggestedTag('furniture', tHe)).toBe('רהיטים');
    expect(localizeSuggestedTag('kitchen', tHe)).toBe('מטבח');
    expect(localizeSuggestedTag('babygear', tHe)).toBe('ציוד תינוקות');
    expect(localizeSuggestedTag('baby-gear', tHe)).toBe('ציוד תינוקות');
  });
  it('uses English labels on en', () => {
    expect(localizeSuggestedTag('furniture', tEn)).toBe('Furniture');
  });
  it('keeps unknown tags and missing translations as-is', () => {
    expect(localizeSuggestedTag('bikes', tHe)).toBe('bikes');
    expect(localizeSuggestedTag('toys', tHe)).toBe('toys');
  });
});
