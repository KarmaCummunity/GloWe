// @vitest-environment jsdom
// FR-POST-001 AC7 — housing needs ID verification (D30): a member the server does not let
// publish sees a notice instead of the fields; everyone else, and an unknown answer, sees them.
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@kc/ui';

const mocks = vi.hoisted(() => ({ canPublishInWorld: vi.fn() }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { defaultValue?: string }) => (k.includes('.housing.') ? k : (o?.defaultValue ?? k)) }),
}));
vi.mock('../../../services/marketplaceComposition', () => ({
  marketplaceRepository: () => ({ canPublishInWorld: mocks.canPublishInWorld }),
}));

import { WorldPermissionGate } from '../WorldPermissionGate';

async function renderGate(worldSlug: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>
          <WorldPermissionGate worldSlug={worldSlug}>
            <span data-testid="fields" />
          </WorldPermissionGate>
        </ThemeProvider>
      </QueryClientProvider>,
    );
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WorldPermissionGate', () => {
  it('shows the housing verification notice instead of the fields when publishing is not allowed', async () => {
    mocks.canPublishInWorld.mockResolvedValue(false);
    await renderGate('housing');
    expect(mocks.canPublishInWorld).toHaveBeenCalledWith('housing');
    expect(await screen.findByTestId('world-permission-notice')).toBeTruthy();
    expect(screen.getByText('post.unifiedCreate.noPermission.housing.title')).toBeTruthy();
    expect(screen.queryByTestId('fields')).toBeNull();
  });

  it('shows the fields to a member who may publish', async () => {
    mocks.canPublishInWorld.mockResolvedValue(true);
    await renderGate('time');
    expect(await screen.findByTestId('fields')).toBeTruthy();
    expect(screen.queryByTestId('world-permission-notice')).toBeNull();
  });

  it('shows the fields when the answer cannot be read (the server still enforces it)', async () => {
    mocks.canPublishInWorld.mockRejectedValue(new Error('offline'));
    await renderGate('housing');
    expect(await screen.findByTestId('fields')).toBeTruthy();
  });
});
