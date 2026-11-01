// @vitest-environment jsdom
// FR-FEED-020 AC2 — a world screen: מחפש lists the world's offers with "publish request",
// מציע lists its requests with "publish offer"; each publish button opens the create form
// preset to the world and direction; search results are narrowed to the mode's direction.
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@kc/ui';
import type { MarketplaceBrowseRow } from '@kc/domain';

const mocks = vi.hoisted(() => ({ browsePage: vi.fn(), searchPage: vi.fn(), getListingCards: vi.fn(), push: vi.fn() }));

vi.mock('expo-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'he' } }) }));
vi.mock('../../../services/marketplaceComposition', () => ({
  marketplaceRepository: () => ({
    browsePage: mocks.browsePage,
    searchPage: mocks.searchPage,
    getListingCards: mocks.getListingCards,
    listWorldSubcategories: async () => [],
  }),
}));
vi.mock('../../../navigation/useShellTabBarVisibility', () => ({ useShellTabBarScrollInset: () => 0 }));
vi.mock('../../lists/KcFlashList', () => ({
  KcFlashList: (p: { data: MarketplaceBrowseRow[]; ListHeaderComponent: React.ReactNode; ListEmptyComponent: React.ReactNode }) => (
    <div>
      {p.ListHeaderComponent}
      {p.data.length === 0 ? p.ListEmptyComponent : p.data.map((r) => <span key={r.listingId} data-testid={`row-${r.listingId}`} />)}
    </div>
  ),
}));
// Native-only surfaces (blobs, images) are out of scope here: the rows render as stubs above.
vi.mock('../../ui/Screen', () => ({ Screen: (p: { children: React.ReactNode }) => <div>{p.children}</div> }));
vi.mock('../../cards/ListingCard', () => ({ ListingCard: () => null }));
vi.mock('../../ui/Buttons', () => ({
  PrimaryButton: (p: { testID: string; label: string; onPress: () => void }) => (
    <button type="button" data-testid={p.testID} onClick={p.onPress}>{p.label}</button>
  ),
}));

import { WorldFeedScreen } from '../WorldFeedScreen';

const row = (listingId: string, direction: 'give' | 'request'): MarketplaceBrowseRow => ({
  listingId, worldSlug: 'food', kindSlug: 'k', direction, title: listingId, summary: null,
  urgencyLevel: 2, availabilityStatus: 'ongoing', cityId: null, distanceKm: null,
});

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>
          <WorldFeedScreen worldSlug="food" header={null} />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
}

beforeEach(() => {
  mocks.browsePage.mockImplementation(async (f: { direction: string }) => ({
    rows: f.direction === 'give' ? [row('offer-1', 'give')] : [row('request-1', 'request')],
    nextCursor: null,
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WorldFeedScreen', () => {
  it('opens as a seeker: lists the world offers and offers to publish a request', async () => {
    await renderScreen();
    expect(mocks.browsePage).toHaveBeenCalledWith(expect.objectContaining({ worldSlug: 'food', direction: 'give' }));
    expect(await screen.findByTestId('row-offer-1')).toBeTruthy();
    expect(screen.getByText('donations.worldFeed.offersTitle')).toBeTruthy();
    fireEvent.click(screen.getByTestId('world-feed-publish'));
    expect(mocks.push).toHaveBeenCalledWith('/(tabs)/create?category=food&direction=request');
  });

  it('as an offerer: lists the world requests and offers to publish an offer', async () => {
    await renderScreen();
    await act(async () => {
      fireEvent.click(screen.getByTestId('world-feed-mode-offerer'));
    });
    expect(mocks.browsePage).toHaveBeenCalledWith(expect.objectContaining({ direction: 'request' }));
    expect(await screen.findByTestId('row-request-1')).toBeTruthy();
    expect(screen.getByTestId('world-feed-mode-offerer').getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByTestId('world-feed-publish'));
    expect(mocks.push).toHaveBeenCalledWith('/(tabs)/create?category=food&direction=give');
  });

  it('narrows search results to the mode direction', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.searchPage.mockResolvedValue({ rows: ['a', 'b'], nextCursor: null });
    mocks.getListingCards.mockResolvedValue([row('a', 'give'), row('b', 'request')]);
    await renderScreen();
    await act(async () => {
      fireEvent.change(screen.getByTestId('world-feed-search'), { target: { value: 'pasta' } });
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mocks.searchPage).toHaveBeenCalledWith('pasta', 'food', expect.any(Number), null);
    expect(await screen.findByTestId('row-a')).toBeTruthy();
    expect(screen.queryByTestId('row-b')).toBeNull();
    vi.useRealTimers();
  });

  it('shows the empty message of the mode when nothing is open', async () => {
    mocks.browsePage.mockResolvedValue({ rows: [], nextCursor: null });
    await renderScreen();
    expect((await screen.findByTestId('world-feed-empty')).textContent).toBe('donations.worldFeed.emptyOffers');
  });
});
