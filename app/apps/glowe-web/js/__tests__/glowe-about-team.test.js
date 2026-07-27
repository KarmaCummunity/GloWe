import { describe, it, expect } from 'vitest';
import GloweAboutTeam from '../glowe-about-team.js';

const MICHAL = {
    role_key: 'founder',
    sort_order: 0,
    user_id: '6f3a8156-8212-4641-a546-489626d71188',
    display_name: 'Michal Foux',
    avatar_url: 'https://example.com/m.jpg',
    share_handle: 'u_6f3a815682'
};

const NAVE = {
    role_key: 'tech_partner',
    sort_order: 1,
    user_id: 'a46d79c2-8818-4fea-8c6a-4fc60b5097d0',
    display_name: 'Nave Sarussi',
    avatar_url: '',
    share_handle: 'u_a46d79c288'
};

describe('GloweAboutTeam.mapTeamRows', () => {
    it('maps known roles and sorts by sort_order', () => {
        const out = GloweAboutTeam.mapTeamRows([NAVE, MICHAL]);
        expect(out).toHaveLength(2);
        expect(out[0]).toMatchObject({
            roleKey: 'founder',
            userId: MICHAL.user_id,
            displayName: 'Michal Foux',
            role: 'Founder & CEO',
            profileHref: 'profile?id=' + encodeURIComponent(MICHAL.user_id)
        });
        expect(out[1].roleKey).toBe('tech_partner');
        expect(out[1].role).toContain('Technology partner');
    });

    it('drops unknown roles and rows without user_id', () => {
        expect(GloweAboutTeam.mapTeamRows([
            { role_key: 'advisor', user_id: 'x', display_name: 'A' },
            { role_key: 'founder', display_name: 'No id' }
        ])).toEqual([]);
    });
});

describe('GloweAboutTeam.teamListHtml', () => {
    it('renders profile links and escapes HTML in names', () => {
        const members = GloweAboutTeam.mapTeamRows([{
            ...MICHAL,
            display_name: 'Michal <script>'
        }]);
        const html = GloweAboutTeam.teamListHtml(members);
        expect(html).toContain('profile?id=' + encodeURIComponent(MICHAL.user_id));
        expect(html).toContain('View profile');
        expect(html).toContain('Michal &lt;script&gt;');
        expect(html).not.toContain('<script>');
    });

    it('returns empty string for empty list', () => {
        expect(GloweAboutTeam.teamListHtml([])).toBe('');
    });
});

describe('GloweAboutTeam.initialsFromName', () => {
    it('builds two-letter initials', () => {
        expect(GloweAboutTeam.initialsFromName('Michal Foux')).toBe('MF');
        expect(GloweAboutTeam.initialsFromName('Nave')).toBe('NA');
        expect(GloweAboutTeam.initialsFromName('')).toBe('GW');
    });
});
