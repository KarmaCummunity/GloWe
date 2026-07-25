import { describe, it, expect } from 'vitest';
import GloweDevAuth from '../glowe-dev-auth.js';

describe('GloweDevAuth', () => {
    it('is active when local Supabase is configured on non-hosted pages', () => {
        expect(GloweDevAuth.isActive(
            { supabaseUrl: 'http://127.0.0.1:54321' },
            { hostname: 'localhost' }
        )).toBe(true);
        expect(GloweDevAuth.isActive(
            { supabaseUrl: 'http://127.0.0.1:54321' },
            { hostname: '192.168.1.42', port: '4321' }
        )).toBe(true);
        expect(GloweDevAuth.isActive(
            { supabaseUrl: 'https://roeefqpdbftlndzsvhfj.supabase.co' },
            { hostname: 'localhost' }
        )).toBe(false);
        expect(GloweDevAuth.isActive(
            { supabaseUrl: 'http://127.0.0.1:54321' },
            { hostname: 'dev.karma-community.pages.dev' }
        )).toBe(false);
    });

    it('groups personas into individual, admin, and organization', () => {
        expect(GloweDevAuth.PERSONA_GROUPS).toHaveLength(3);
        expect(GloweDevAuth.PERSONAS.length).toBeGreaterThanOrEqual(5);
    });

    it('renders grouped local login modal with persona quick-pick buttons', () => {
        const html = GloweDevAuth.loginModalHtml();
        expect(html).toContain('data-dev-signin-email');
        expect(html).toContain('dev-auth-group');
        expect(html).toContain('New individual');
        expect(html).toContain('New admin');
        expect(html).toContain(GloweDevAuth.DEFAULT_PASSWORD);
    });

    it('builds payloads for new persona variants', () => {
        const payload = GloweDevAuth.signInPayloadFromItem({
            kind: 'new',
            variant: 'org-pending',
            label: 'New organization (pending)',
            subtitle: 'Test org review flow'
        });
        expect(payload.email).toContain('@local.dev');
        expect(payload.profileType).toBe('organization');
        expect(payload.approvalStatus).toBe('pending');
    });
});
