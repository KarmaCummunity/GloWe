// Regression guard for "every post renders through ONE base card" (KcCard).
// Fails if a screen/component renders a post or listing title with its own ad-hoc card,
// or if a removed legacy card comes back.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const SCAN_DIRS = ['app', 'src'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))).map((f) => ({
  rel: relative(ROOT, f).split('\\').join('/'),
  src: readFileSync(f, 'utf8'),
}));

/** A <Text> that prints a post / listing / match title directly. */
const RAW_POST_TITLE = /<Text[^>]*>\s*\{\s*(?:cleanDisplayTitle\()?(?:post|item|listing|match|m|p|detail)\.(?:title|otherListingTitle)\b/;

/**
 * Non-post rows that legitimately print an entity's own title (volunteer shifts,
 * owner-only management lists, ride-search rows, admin sections, roadmap) — not post cards.
 * Adding to this list needs a reason in the PR.
 */
const ALLOWED = new Set([
  'src/components/cards/KcCard.tsx',
  'app/(tabs)/donations/time/my-shifts.tsx',
  'app/(tabs)/donations/time/index.tsx',
  'app/(tabs)/donations/time/organizer/index.tsx',
  'app/(tabs)/donations/marketplace/my-listings.tsx',
  'src/components/giving/MyWorldHandoffsList.tsx',
  'src/components/giving/RideMatchSearch.tsx',
  'src/components/admin/admins/AdminsListView.tsx',
  'src/features/about-landing/AboutRoadmapTimeline.tsx',
  // Donations-hub summary link (one-line text list → /matches), not a post card.
  'src/components/matching/MatchesForYouCard.tsx',
]);

describe('post card inventory', () => {
  it('no surface renders a post title outside the base card', () => {
    const offenders = files.filter((f) => !ALLOWED.has(f.rel) && RAW_POST_TITLE.test(f.src)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });

  it('legacy one-off post card is gone', () => {
    expect(existsSync(join(ROOT, 'src/components/PostCard.tsx'))).toBe(false);
    const importsLegacy = files.filter((f) => /components\/PostCard'|from '\.\/PostCard'/.test(f.src)).map((f) => f.rel);
    expect(importsLegacy).toEqual([]);
  });

  it.each([
    ['src/components/PostCardGrid.tsx', 'KcCard'],
    ['src/components/cards/ListingCard.tsx', 'KcCard'],
    ['src/components/cards/SimilarListingCard.tsx', 'KcCard'],
    ['src/components/matching/MatchSuggestionCard.tsx', 'KcCard'],
    ['src/components/search/PostResultCard.tsx', 'PostCardGrid'],
    ['src/components/profile/ProfileMarketplaceListings.tsx', 'SimilarListingCard'],
    ['src/components/marketplace/MarketplaceListingDetailView.tsx', 'SimilarListingCard'],
    ['src/components/marketplace/MarketplaceListingDetailView.tsx', 'PostDetailHeader'],
    ['app/(guest)/feed.tsx', 'PostCardGrid'],
  ])('%s renders through %s', (rel, base) => {
    const f = files.find((x) => x.rel === rel);
    expect(f, rel).toBeDefined();
    expect(f!.src).toMatch(new RegExp(`<${base}\\b`));
  });

  it('similar-listings carousel filters automated-test listings', () => {
    const f = files.find((x) => x.rel === 'src/components/marketplace/MarketplaceListingDetailView.tsx');
    expect(f!.src).toMatch(/isTestListingTitle/);
  });
});
