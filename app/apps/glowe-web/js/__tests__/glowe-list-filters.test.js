import { describe, it, expect } from 'vitest';
import GloweListFilters from '../glowe-list-filters.js';
import '../glowe-list-filters-presets.js';

describe('GloweListFilters', () => {
    it('exposes presets for all list screens', () => {
        expect(GloweListFilters.presets.organizations).toBeTypeOf('function');
        expect(GloweListFilters.presets.wishes).toBeTypeOf('function');
        expect(GloweListFilters.presets.opportunities).toBeTypeOf('function');
        expect(GloweListFilters.presets.communityFeed).toBeTypeOf('function');
    });

    it('renders wishes panel with search, sort, sheet, and pill groups', () => {
        const html = GloweListFilters.renderPanel(GloweListFilters.presets.wishes());
        expect(html).toContain('glowe-filter-panel');
        expect(html).toContain('id="wish-search"');
        expect(html).toContain('id="wish-sort"');
        expect(html).toContain('data-wish-type="all"');
        expect(html).toContain('wish-filters-open');
        expect(html).toContain('wish-filters-dialog');
    });

    it('renders opportunities panel with select groups in a sheet', () => {
        const html = GloweListFilters.renderPanel(GloweListFilters.presets.opportunities());
        expect(html).toContain('id="filter-location"');
        expect(html).toContain('id="filter-event"');
        expect(html).toContain('opportunity-filters-dialog');
    });

    it('renders compact community feed controls with tabs', () => {
        const html = GloweListFilters.renderPanel(GloweListFilters.presets.communityFeed());
        expect(html).toContain('community-feed-controls');
        expect(html).toContain('data-feed-filter="all"');
        expect(html).toContain('data-feed-filter="event"');
    });
});
