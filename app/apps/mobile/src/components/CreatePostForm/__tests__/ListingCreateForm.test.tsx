// @vitest-environment jsdom
// FR-POST-001 AC6 — the listing create form (rides / food / housing / time). Regression for
// the TestFlight create-form crash: every category renders in both directions and survives a
// direction switch; the form never mounts an inline native date picker or slider; required
// fields block publish with a message; a valid form publishes the expected listing.
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@kc/ui';
import { KINDS_BY_WORLD } from '../../../lib/unifiedCreate/__tests__/listingKindFixtures';

// vi.mock factories are hoisted above imports, so their spies must be hoisted too.
const mocks = vi.hoisted(() => ({
  listKindsForWorld: vi.fn(),
  createListing: vi.fn(),
  cityToRideEndpoint: vi.fn(),
  nativeDatePicker: vi.fn(() => null),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o?.field ? `${k}:${String(o.field)}` : k),
    i18n: { language: 'he' },
  }),
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
// A native picker may only ever mount inside the date sheet, never inline in the form.
vi.mock('@react-native-community/datetimepicker', () => ({
  default: mocks.nativeDatePicker,
  DateTimePickerAndroid: { open: vi.fn() },
}));
vi.mock('../../../services/marketplaceComposition', () => ({
  marketplaceRepository: () => ({
    listKindsForWorld: mocks.listKindsForWorld,
    createListing: mocks.createListing,
    listWorldSubcategories: async () => [],
  }),
}));
vi.mock('../../../services/ridesKnowledgeComposition', () => ({ cityToRideEndpoint: mocks.cityToRideEndpoint }));
vi.mock('../../../services/listingImageUpload', () => ({ pickListingImages: vi.fn(async () => []), uploadListingImages: vi.fn() }));
vi.mock('../../../lib/analyticsCoreLoop', () => ({ trackCoreLoop: vi.fn(), trackActivationIfFirst: vi.fn() }));
vi.mock('../../../lib/haptics', () => ({ hapticLightTap: () => {} }));
vi.mock('../../../navigation/useShellTabBarVisibility', () => ({ useShellTabBarScrollInset: () => 0 }));
vi.mock('../../../store/authStore', () => {
  const state = { session: { userId: 'u1', accountCreatedAt: '2026-01-01T00:00:00.000Z' } };
  const useAuthStore = (sel: (s: typeof state) => unknown) => sel(state);
  useAuthStore.getState = () => state;
  return { useAuthStore };
});
// City picker stand-in: one tap picks Lod.
vi.mock('../../CityPicker', () => ({
  CityPicker: ({ onChange }: { onChange: (c: { id: string; name: string }) => void }) => (
    <button type="button" data-testid="city-picker" onClick={() => onChange({ id: '7000', name: 'לוד' })} />
  ),
}));

import { ListingCreateForm } from '../ListingCreateForm';

const LOD = { cityId: '7000', label: 'לוד', lat: 31.95, lng: 34.89 };

function renderForm(worldSlug: string, direction: 'give' | 'request', title = 'כותרת') {
  const onPublished = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (dir: 'give' | 'request') => (
    <QueryClientProvider client={client}>
      <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>
        <ListingCreateForm
          worldSlug={worldSlug}
          header={null}
          direction={dir}
          title={title}
          onTitleChange={() => {}}
          summary=""
          onSummaryChange={() => {}}
          onPublished={onPublished}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
  const view = render(ui(direction));
  return { onPublished, rerender: (dir: 'give' | 'request') => view.rerender(ui(dir)) };
}

beforeEach(() => {
  mocks.listKindsForWorld.mockImplementation(async (world: string) => KINDS_BY_WORLD[world] ?? []);
  mocks.createListing.mockResolvedValue('listing-1');
  mocks.cityToRideEndpoint.mockResolvedValue(LOD);
});

// Vitest config sets `globals: false`, so testing-library's automatic cleanup is not wired.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ListingCreateForm — renders every category', () => {
  for (const world of ['rides', 'food', 'housing', 'time']) {
    it(`${world}: both directions render and a direction switch keeps the form alive`, async () => {
      const { rerender } = renderForm(world, 'give');
      expect(await screen.findByTestId('listing-publish')).toBeTruthy();
      rerender('request');
      expect(await screen.findByTestId('listing-publish')).toBeTruthy();
      expect(screen.getByTestId('listing-title')).toBeTruthy();
      // No inline native picker anywhere in the scrolling form.
      expect(mocks.nativeDatePicker).not.toHaveBeenCalled();
    });
  }

  it('shows the category-specific fields of the chosen direction', async () => {
    const { rerender } = renderForm('food', 'give');
    expect(await screen.findByTestId('listing-field-food_type')).toBeTruthy();
    expect(screen.getByTestId('listing-field-expires_at')).toBeTruthy();
    rerender('request');
    expect(await screen.findByTestId('listing-field-household_size')).toBeTruthy();
    expect(screen.queryByTestId('listing-field-food_type')).toBeNull();
  });

  it('shows a retry message instead of an endless spinner when kinds fail to load', async () => {
    mocks.listKindsForWorld.mockResolvedValue([]);
    renderForm('time', 'give');
    expect(await screen.findByTestId('listing-kinds-error')).toBeTruthy();
    expect(screen.queryByTestId('listing-publish')).toBeNull();
  });
});

describe('ListingCreateForm — publish', () => {
  it('blocks publish with the first missing required field', async () => {
    renderForm('food', 'give');
    fireEvent.click(await screen.findByTestId('listing-publish'));
    expect((await screen.findByTestId('listing-error')).textContent).toBe(
      'post.unifiedCreate.errors.fieldRequired:marketplace.field.food_type',
    );
    expect(mocks.createListing).not.toHaveBeenCalled();
  });

  it('asks for a title before anything else', async () => {
    renderForm('time', 'give', ' ');
    fireEvent.click(await screen.findByTestId('listing-publish'));
    expect((await screen.findByTestId('listing-error')).textContent).toBe('post.unifiedCreate.errors.titleRequired');
  });

  it('asks for a city', async () => {
    renderForm('time', 'give');
    fireEvent.click(await screen.findByTestId('listing-publish'));
    expect((await screen.findByTestId('listing-error')).textContent).toBe('post.unifiedCreate.errors.cityRequired');
  });

  it('publishes a time offer with its default duration and the city coordinates', async () => {
    const { onPublished } = renderForm('time', 'give');
    fireEvent.click(await screen.findByTestId('city-picker'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('listing-publish'));
    });
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith('listing-1'));
    expect(mocks.createListing).toHaveBeenCalledWith(
      expect.objectContaining({
        kindId: 'k-volunteer_shift',
        title: 'כותרת',
        details: { duration_minutes: 60 },
        cityId: '7000',
        lat: LOD.lat,
        lng: LOD.lng,
        externalBodyId: null,
      }),
    );
  });

  it('a ride needs its route before it can publish', async () => {
    renderForm('rides', 'give');
    await screen.findByTestId('listing-publish');
    // A ride has exactly the two route pickers (origin, destination) and no separate city.
    expect(screen.getAllByTestId('city-picker').length).toBe(2);
    fireEvent.click(screen.getByTestId('listing-publish'));
    expect((await screen.findByTestId('listing-error')).textContent).toBe(
      'post.unifiedCreate.errors.fieldRequired:marketplace.field.departs_at',
    );
    expect(mocks.createListing).not.toHaveBeenCalled();
  });

  it('publishes a ride with its route, departure and seats', async () => {
    const { onPublished } = renderForm('rides', 'give');
    await screen.findByTestId('listing-publish');
    // Departure through the date sheet (web branch: a datetime-local input).
    fireEvent.click(screen.getByTestId('listing-date-departs_at'));
    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2030-01-01T08:30' } });
    fireEvent.click(screen.getByTestId('listing-date-departs_at-confirm'));
    // Origin and destination resolve asynchronously; both must land in the details.
    const [origin, dest] = screen.getAllByTestId('city-picker');
    await act(async () => {
      fireEvent.click(origin!);
      fireEvent.click(dest!);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('listing-publish'));
    });
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith('listing-1'));
    const payload = mocks.createListing.mock.calls[0]![0] as { details: Record<string, unknown>; cityId: string };
    expect(payload.cityId).toBe('7000');
    expect(payload.details).toMatchObject({
      seats_available: 3,
      reward_model: 'free',
      origin_lat: LOD.lat,
      dest_lat: LOD.lat,
      departs_at: new Date('2030-01-01T08:30').toISOString(),
    });
    expect(payload.details).not.toHaveProperty('cost_share_ils');
  });
});
