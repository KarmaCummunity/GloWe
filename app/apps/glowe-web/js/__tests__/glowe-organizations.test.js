import { describe, it, expect } from 'vitest';
import GloweOrganizations from '../glowe-organizations.js';

const {
    mapProjectRow,
    mapProjects,
    isPublicProject,
    publicProjectsForUser,
    validateOutreachDraft,
    buildOutreachPayload,
    personalProjectsView,
    validateProjectDraft,
    buildProjectPayload,
    findProjectById,
    myWishPosts,
    mapOwnedOpportunity,
    mapOwnedOpportunities,
    postTitlesById,
    mapOwnedOffer,
    mapOwnedOffers,
    opportunitiesById,
    mapOwnedApplication,
    volunteerApplicationViews,
    isDeleteAccountConfirmed,
    shouldShowProfileSkeleton,
    validateAvatarFile,
    prepareAvatarUploadFile,
    isAvatarImageFile,
    mapApplicantRow,
    mapApplicantRows,
    canDecideApplication,
    mapOfferForOwner,
    mapOffersForOwner,
    hasContactEmail,
    buildSavedItemPayload,
    isItemSaved,
    canonicalStatus
} = GloweOrganizations;

const isEvent = (opp) => Boolean(opp && (opp.start_at || opp.startAt));

describe('mapProjectRow', () => {
    it('maps a snake_case glowe_projects row to the render shape', () => {
        const row = {
            id: 'p1',
            user_id: 'u1',
            title: 'Clean Water',
            description: 'Wells in rural areas',
            status: 'Active'
        };
        expect(mapProjectRow(row)).toEqual({
            id: 'p1',
            userId: 'u1',
            title: 'Clean Water',
            description: 'Wells in rural areas',
            status: 'Active'
        });
    });

    it('accepts camelCase fields as a fallback', () => {
        expect(mapProjectRow({ id: 'p2', userId: 'u2', title: 'T', description: 'D', status: 'Draft' }))
            .toMatchObject({ id: 'p2', userId: 'u2', status: 'Draft' });
    });

    it('supplies safe defaults for missing fields', () => {
        expect(mapProjectRow({ id: 'p3', user_id: 'u3' })).toEqual({
            id: 'p3',
            userId: 'u3',
            title: '',
            description: '',
            status: 'Active'
        });
    });

    it('normalises a Hebrew-localized status literal back to canonical English', () => {
        // Rows saved before the <option value> fix stored the translated label.
        expect(mapProjectRow({ id: 'p4', user_id: 'u4', status: 'מגייסים שותפים' }))
            .toMatchObject({ status: 'Recruiting partners' });
    });
});

describe('canonicalStatus', () => {
    it('maps each known localized status back to its English enum value', () => {
        expect(canonicalStatus('טיוטה')).toBe('Draft');
        expect(canonicalStatus('פעיל')).toBe('Active');
        expect(canonicalStatus('מגייסים שותפים')).toBe('Recruiting partners');
        expect(canonicalStatus('דרושים מתנדבים')).toBe('Needs volunteers');
        expect(canonicalStatus('מוכן לשיתוף')).toBe('Ready to share');
    });

    it('passes canonical English and unknown values through unchanged', () => {
        expect(canonicalStatus('Active')).toBe('Active');
        expect(canonicalStatus('  Draft  ')).toBe('Draft');
        expect(canonicalStatus('Something else')).toBe('Something else');
        expect(canonicalStatus(null)).toBe('');
        expect(canonicalStatus(undefined)).toBe('');
    });
});

describe('mapProjects', () => {
    it('maps an array of rows', () => {
        const out = mapProjects([{ id: 'a', user_id: 'u', title: 'A', status: 'Active' }]);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({ id: 'a', userId: 'u', title: 'A' });
    });

    it('returns an empty array for non-array input', () => {
        expect(mapProjects(null)).toEqual([]);
        expect(mapProjects(undefined)).toEqual([]);
    });
});

describe('isPublicProject', () => {
    it('is true for a matching user and non-draft status', () => {
        expect(isPublicProject({ userId: 'u1', status: 'Active' }, 'u1')).toBe(true);
    });

    it('is false when the user does not match', () => {
        expect(isPublicProject({ userId: 'u2', status: 'Active' }, 'u1')).toBe(false);
    });

    it('is false for draft projects (case-insensitive)', () => {
        expect(isPublicProject({ userId: 'u1', status: 'Draft' }, 'u1')).toBe(false);
        expect(isPublicProject({ userId: 'u1', status: 'draft' }, 'u1')).toBe(false);
    });

    it('is false when either project or userId is missing', () => {
        expect(isPublicProject(null, 'u1')).toBe(false);
        expect(isPublicProject({ userId: 'u1', status: 'Active' }, '')).toBe(false);
    });
});

describe('publicProjectsForUser', () => {
    const projects = [
        { id: 'a', userId: 'u1', status: 'Active' },
        { id: 'b', userId: 'u1', status: 'Draft' },
        { id: 'c', userId: 'u2', status: 'Active' },
        { id: 'd', userId: 'u1', status: 'Completed' }
    ];

    it('keeps only non-draft projects owned by the user', () => {
        expect(publicProjectsForUser(projects, 'u1').map(p => p.id)).toEqual(['a', 'd']);
    });

    it('returns an empty array for non-array input', () => {
        expect(publicProjectsForUser(null, 'u1')).toEqual([]);
    });
});

describe('validateOutreachDraft', () => {
    it('accepts a draft with a recipient and a message', () => {
        expect(validateOutreachDraft({ recipientId: 'u1', message: 'Hello there' }))
            .toEqual({ valid: true });
    });

    it('rejects a draft without a recipient', () => {
        expect(validateOutreachDraft({ message: 'Hello' })).toMatchObject({ valid: false });
    });

    it('rejects an empty or whitespace-only message', () => {
        expect(validateOutreachDraft({ recipientId: 'u1', message: '   ' })).toMatchObject({ valid: false });
        expect(validateOutreachDraft({ recipientId: 'u1' })).toMatchObject({ valid: false });
    });

    it('is safe with no input', () => {
        expect(validateOutreachDraft()).toMatchObject({ valid: false });
    });
});

describe('buildOutreachPayload', () => {
    it('builds a glowe_posts outreach row with the recipient in audience', () => {
        const payload = buildOutreachPayload({
            recipientId: 'org-1',
            orgName: 'Open Heart',
            message: '  We would love to collaborate.  '
        });
        expect(payload).toEqual({
            post_type: 'outreach',
            category: 'outreach',
            title: 'Reach-out to Open Heart',
            text: 'We would love to collaborate.',
            audience: 'org-1',
            status: 'sent',
            tags: []
        });
    });

    it('falls back to a generic title when orgName is missing', () => {
        expect(buildOutreachPayload({ recipientId: 'org-2', message: 'Hi' }).title).toBe('Reach-out');
    });

    it('is safe with no input', () => {
        const payload = buildOutreachPayload();
        expect(payload.post_type).toBe('outreach');
        expect(payload.audience).toBe('');
    });
});

describe('validateProjectDraft', () => {
    it('accepts a draft with a title', () => {
        expect(validateProjectDraft({ title: 'Clean Water' })).toEqual({ valid: true });
    });

    it('rejects an empty or whitespace-only title', () => {
        expect(validateProjectDraft({ title: '   ' })).toMatchObject({ valid: false });
        expect(validateProjectDraft({ description: 'no title' })).toMatchObject({ valid: false });
    });

    it('is safe with no input', () => {
        expect(validateProjectDraft()).toMatchObject({ valid: false });
    });
});

describe('buildProjectPayload', () => {
    it('trims fields and keeps the given status', () => {
        expect(buildProjectPayload({ title: '  Wells  ', status: 'Active', description: '  D  ' }))
            .toEqual({ title: 'Wells', status: 'Active', description: 'D' });
    });

    it('defaults status to Draft and description to empty', () => {
        expect(buildProjectPayload({ title: 'T' })).toEqual({ title: 'T', status: 'Draft', description: '' });
    });

    it('is safe with no input', () => {
        expect(buildProjectPayload()).toEqual({ title: '', status: 'Draft', description: '' });
    });
});

describe('findProjectById', () => {
    const projects = [
        { id: 'p1', title: 'Alpha' },
        { id: 2, title: 'Beta' },
        { id: 'p3', title: 'Gamma' }
    ];

    it('finds a project by string id', () => {
        expect(findProjectById(projects, 'p3')).toEqual({ id: 'p3', title: 'Gamma' });
    });

    it('matches ids across number/string types', () => {
        expect(findProjectById(projects, '2')).toEqual({ id: 2, title: 'Beta' });
    });

    it('returns undefined for a missing id, empty id, or non-array', () => {
        expect(findProjectById(projects, 'nope')).toBeUndefined();
        expect(findProjectById(projects, '')).toBeUndefined();
        expect(findProjectById(projects, null)).toBeUndefined();
        expect(findProjectById(null, 'p1')).toBeUndefined();
    });
});

describe('myWishPosts', () => {
    const rows = [
        { id: 'w1', post_type: 'wish', status: 'open' },
        { id: 'c1', post_type: 'community' },
        { id: 'w2', post_type: 'wish', status: 'fulfilled' },
        { id: 'o1', post_type: 'outreach', status: 'sent' }
    ];

    it('keeps only wish posts, open and fulfilled alike', () => {
        expect(myWishPosts(rows).map(r => r.id)).toEqual(['w1', 'w2']);
    });

    it('excludes community and outreach posts', () => {
        const ids = myWishPosts(rows).map(r => r.id);
        expect(ids).not.toContain('c1');
        expect(ids).not.toContain('o1');
    });

    it('accepts camelCase postType as a fallback', () => {
        expect(myWishPosts([{ id: 'w3', postType: 'wish' }]).map(r => r.id)).toEqual(['w3']);
    });

    it('returns an empty array for non-array input', () => {
        expect(myWishPosts(null)).toEqual([]);
        expect(myWishPosts(undefined)).toEqual([]);
    });
});

describe('personalProjectsView', () => {
    const backend = [{ id: 'b1' }];
    const local = [{ id: 'l1' }, { id: 'l2' }];

    it('prefers the backend list once it has loaded', () => {
        expect(personalProjectsView(backend, local)).toBe(backend);
    });

    it('trusts an empty backend list over the local fallback (real empty state)', () => {
        expect(personalProjectsView([], local)).toEqual([]);
    });

    it('falls back to the local list while the backend is still null', () => {
        expect(personalProjectsView(null, local)).toBe(local);
    });

    it('returns an empty array when both are unavailable', () => {
        expect(personalProjectsView(null, null)).toEqual([]);
    });
});

describe('mapOwnedOpportunity', () => {
    it('maps a snake_case glowe_opportunities row to the compact shape', () => {
        const row = {
            id: 'op1', title: 'Beach cleanup', field: 'Environment',
            commitment: 'One-time', location: 'Haifa', status: 'active'
        };
        expect(mapOwnedOpportunity(row)).toEqual({
            id: 'op1', title: 'Beach cleanup', field: 'Environment',
            commitment: 'One-time', location: 'Haifa', status: 'active'
        });
    });

    it('defaults status to "active" and missing strings to empty', () => {
        expect(mapOwnedOpportunity({ id: 'op2' })).toEqual({
            id: 'op2', title: '', field: '', commitment: '', location: '', status: 'active'
        });
    });
});

describe('mapOwnedOpportunities', () => {
    it('maps a row list, preserving order', () => {
        const rows = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
        expect(mapOwnedOpportunities(rows).map(o => o.id)).toEqual(['a', 'b']);
    });

    it('returns an empty array for non-array input', () => {
        expect(mapOwnedOpportunities(null)).toEqual([]);
        expect(mapOwnedOpportunities(undefined)).toEqual([]);
    });
});

describe('postTitlesById', () => {
    it('builds an id → title lookup, skipping rows without an id', () => {
        const rows = [
            { id: 'p1', title: 'Need a ride' },
            { id: 'p2', title: 'Warm coats' },
            { title: 'orphan' }
        ];
        expect(postTitlesById(rows)).toEqual({ p1: 'Need a ride', p2: 'Warm coats' });
    });

    it('maps a missing title to an empty string', () => {
        expect(postTitlesById([{ id: 'p3' }])).toEqual({ p3: '' });
    });

    it('returns an empty object for non-array input', () => {
        expect(postTitlesById(null)).toEqual({});
        expect(postTitlesById(undefined)).toEqual({});
    });
});

describe('mapOwnedOffer', () => {
    it('maps a snake_case glowe_offers row and attaches the wish title', () => {
        const row = {
            id: 'of1', post_id: 'p1', offer_text: 'I can drive',
            availability: 'Weekends', contact_preference: 'In-app message'
        };
        expect(mapOwnedOffer(row, { p1: 'Need a ride' })).toEqual({
            id: 'of1', wishId: 'p1', wishTitle: 'Need a ride',
            offerText: 'I can drive', availability: 'Weekends', contactPreference: 'In-app message'
        });
    });

    it('leaves wishTitle empty when the post is not in the lookup', () => {
        expect(mapOwnedOffer({ id: 'of2', post_id: 'pX' }, { p1: 'x' }).wishTitle).toBe('');
    });

    it('tolerates a missing lookup and missing fields', () => {
        expect(mapOwnedOffer({ id: 'of3' })).toEqual({
            id: 'of3', wishId: '', wishTitle: '', offerText: '', availability: '', contactPreference: ''
        });
    });
});

describe('mapOwnedOffers', () => {
    it('maps a row list, attaching titles, preserving order', () => {
        const rows = [{ id: 'a', post_id: 'p1' }, { id: 'b', post_id: 'p2' }];
        const titles = { p1: 'First', p2: 'Second' };
        expect(mapOwnedOffers(rows, titles).map(o => [o.id, o.wishTitle]))
            .toEqual([['a', 'First'], ['b', 'Second']]);
    });

    it('returns an empty array for non-array input', () => {
        expect(mapOwnedOffers(null, {})).toEqual([]);
        expect(mapOwnedOffers(undefined, {})).toEqual([]);
    });
});

describe('opportunitiesById', () => {
    it('builds an id → row lookup, skipping rows without an id', () => {
        const rows = [{ id: 'op1', title: 'A' }, { id: 'op2', title: 'B' }, { title: 'orphan' }];
        const map = opportunitiesById(rows);
        expect(Object.keys(map)).toEqual(['op1', 'op2']);
        expect(map.op1.title).toBe('A');
    });

    it('returns an empty object for non-array input', () => {
        expect(opportunitiesById(null)).toEqual({});
        expect(opportunitiesById(undefined)).toEqual({});
    });
});

describe('mapOwnedApplication', () => {
    it('maps a snake_case glowe_applications row and attaches opportunity title + org', () => {
        const row = { id: 'ap1', opportunity_id: 'op1', status: 'Accepted', created_at: '2026-07-04T00:00:00Z' };
        const byId = { op1: { id: 'op1', title: 'Beach cleanup', organization: 'Open Heart' } };
        expect(mapOwnedApplication(row, byId)).toEqual({
            id: 'ap1', opportunityId: 'op1', opportunityTitle: 'Beach cleanup',
            organization: 'Open Heart', status: 'Accepted', appliedAt: '2026-07-04T00:00:00Z'
        });
    });

    it('leaves title/org empty when the opportunity is not in the lookup', () => {
        const out = mapOwnedApplication({ id: 'ap2', opportunity_id: 'opX' }, { op1: {} });
        expect(out.opportunityTitle).toBe('');
        expect(out.organization).toBe('');
    });

    it('defaults status to "Pending" and tolerates a missing lookup', () => {
        expect(mapOwnedApplication({ id: 'ap3', opportunity_id: 'op1' })).toEqual({
            id: 'ap3', opportunityId: 'op1', opportunityTitle: '', organization: '',
            status: 'Pending', appliedAt: ''
        });
    });
});

describe('volunteerApplicationViews', () => {
    const byId = {
        vol: { id: 'vol', title: 'Weekly tutoring', organization: 'Org A' },
        evt: { id: 'evt', title: 'Beach day', organization: 'Org B', start_at: '2026-08-01T09:00:00Z' }
    };
    const rows = [
        { id: 'a', opportunity_id: 'vol', status: 'Pending' },
        { id: 'b', opportunity_id: 'evt', status: 'Accepted' },
        { id: 'c', opportunity_id: 'missing', status: 'Pending' }
    ];

    it('keeps only non-event applications with a known opportunity, enriched', () => {
        const out = volunteerApplicationViews(rows, byId, isEvent);
        expect(out.map(v => v.id)).toEqual(['a']);
        expect(out[0].opportunityTitle).toBe('Weekly tutoring');
    });

    it('treats a missing isEvent predicate as never-an-event', () => {
        const out = volunteerApplicationViews(rows, byId);
        expect(out.map(v => v.id)).toEqual(['a', 'b']);
    });

    it('returns an empty array for non-array input', () => {
        expect(volunteerApplicationViews(null, byId, isEvent)).toEqual([]);
        expect(volunteerApplicationViews(undefined, byId, isEvent)).toEqual([]);
    });
});

describe('isDeleteAccountConfirmed', () => {
    it('accepts the exact word DELETE, case-insensitive and trimmed', () => {
        expect(isDeleteAccountConfirmed('DELETE')).toBe(true);
        expect(isDeleteAccountConfirmed('  delete  ')).toBe(true);
        expect(isDeleteAccountConfirmed('Delete')).toBe(true);
    });

    it('rejects anything else', () => {
        expect(isDeleteAccountConfirmed('')).toBe(false);
        expect(isDeleteAccountConfirmed('DELET')).toBe(false);
        expect(isDeleteAccountConfirmed('delete my account')).toBe(false);
        expect(isDeleteAccountConfirmed(undefined)).toBe(false);
        expect(isDeleteAccountConfirmed(null)).toBe(false);
    });
});

describe('shouldShowProfileSkeleton', () => {
    it('shows the skeleton only while loading with no cached profile', () => {
        expect(shouldShowProfileSkeleton(true, false)).toBe(true);
    });

    it('hides the skeleton once a cached profile exists (stale-while-revalidate)', () => {
        expect(shouldShowProfileSkeleton(true, true)).toBe(false);
    });

    it('hides the skeleton when not loading, regardless of cache', () => {
        expect(shouldShowProfileSkeleton(false, false)).toBe(false);
        expect(shouldShowProfileSkeleton(false, true)).toBe(false);
    });
});

describe('validateAvatarFile', () => {
    it('accepts an image file under the size cap', () => {
        expect(validateAvatarFile({ type: 'image/png', size: 1024 })).toEqual({ valid: true });
        expect(validateAvatarFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toEqual({ valid: true });
    });

    it('rejects a missing file', () => {
        const r = validateAvatarFile(null);
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/image file/i);
    });

    it('rejects a non-image file', () => {
        const r = validateAvatarFile({ type: 'application/pdf', size: 100 });
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/image file/i);
    });

    it('rejects a file over the 5 MB cap', () => {
        const r = validateAvatarFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 });
        expect(r.valid).toBe(false);
        expect(r.error).toMatch(/5 MB/);
    });

    it('honors a custom maxBytes option', () => {
        expect(validateAvatarFile({ type: 'image/png', size: 2048 }, { maxBytes: 1024 }).valid).toBe(false);
        expect(validateAvatarFile({ type: 'image/png', size: 512 }, { maxBytes: 1024 }).valid).toBe(true);
    });
});

describe('prepareAvatarUploadFile', () => {
    it('returns the file unchanged when it is already under the cap', async () => {
        const file = { type: 'image/jpeg', size: 1024, name: 'avatar.jpg' };
        await expect(prepareAvatarUploadFile(file)).resolves.toEqual({
            ok: true,
            file,
            compressed: false
        });
    });

    it('rejects a missing file', async () => {
        const result = await prepareAvatarUploadFile(null);
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/image file/i);
    });

    it('rejects a non-image file', async () => {
        const result = await prepareAvatarUploadFile({ type: 'application/pdf', size: 100 });
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/image file/i);
    });

    it('rejects an oversized file when compression is unavailable', async () => {
        const result = await prepareAvatarUploadFile({
            type: 'image/png',
            size: 5 * 1024 * 1024 + 1
        });
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/5 MB/);
    });
});

describe('isAvatarImageFile', () => {
    it('accepts image mime types only', () => {
        expect(isAvatarImageFile({ type: 'image/png' })).toBe(true);
        expect(isAvatarImageFile({ type: 'application/pdf' })).toBe(false);
        expect(isAvatarImageFile(null)).toBe(false);
    });
});

describe('mapApplicantRow (FR-GLOWE-012 AC1)', () => {
    it('maps a snake_case RPC row to the owner-inbox shape', () => {
        const v = mapApplicantRow({
            id: 'app-1',
            user_id: 'u-9',
            status: 'Pending',
            availability: 'Fridays',
            skills: 'listening',
            motivation: 'to help',
            created_at: '2026-07-01T00:00:00Z',
            applicant_name: 'Yael',
            applicant_avatar: 'http://x/a.png',
            applicant_email: 'yael@x.dev'
        });
        expect(v).toEqual({
            id: 'app-1',
            applicantId: 'u-9',
            name: 'Yael',
            avatarUrl: 'http://x/a.png',
            email: 'yael@x.dev',
            availability: 'Fridays',
            skills: 'listening',
            motivation: 'to help',
            status: 'Pending',
            waitlistPosition: null,
            appliedAt: '2026-07-01T00:00:00Z'
        });
    });

    it('carries the waitlist position for a waitlisted applicant', () => {
        expect(mapApplicantRow({ id: 'a', user_id: 'u', status: 'Waitlisted', waitlist_position: 2 }).waitlistPosition)
            .toBe(2);
    });

    it('defaults status to Pending and blanks missing fields', () => {
        const v = mapApplicantRow({ id: 'app-2', user_id: 'u-1' });
        expect(v.status).toBe('Pending');
        expect(v.name).toBe('');
        expect(v.email).toBe('');
        expect(v.motivation).toBe('');
    });

    it('mapApplicantRows maps an array and tolerates non-arrays', () => {
        expect(mapApplicantRows([{ id: 'a', user_id: 'u' }])).toHaveLength(1);
        expect(mapApplicantRows(null)).toEqual([]);
        expect(mapApplicantRows(undefined)).toEqual([]);
    });
});

describe('canDecideApplication (FR-GLOWE-012 AC2)', () => {
    it('is true while the application still awaits a decision', () => {
        expect(canDecideApplication('Pending')).toBe(true);
        // Promoting off the waitlist uses the same Accept button (migration 0237).
        expect(canDecideApplication('Waitlisted')).toBe(true);
    });

    it('is false for settled or missing statuses', () => {
        expect(canDecideApplication('Accepted')).toBe(false);
        expect(canDecideApplication('Declined')).toBe(false);
        expect(canDecideApplication('Cancelled')).toBe(false);
        expect(canDecideApplication('')).toBe(false);
        expect(canDecideApplication(null)).toBe(false);
        expect(canDecideApplication(undefined)).toBe(false);
    });
});

describe('mapOfferForOwner (FR-GLOWE-012 AC3)', () => {
    it('maps a snake_case RPC row to the wish-owner inbox shape', () => {
        const v = mapOfferForOwner({
            id: 'offer-1',
            user_id: 'u-7',
            offer_text: 'I can help move boxes',
            availability: 'Weekends',
            contact_preference: 'email',
            created_at: '2026-07-02T00:00:00Z',
            offerer_name: 'Dana',
            offerer_avatar: 'http://x/d.png',
            offerer_email: 'dana@x.dev'
        });
        expect(v).toEqual({
            id: 'offer-1',
            offererId: 'u-7',
            name: 'Dana',
            avatarUrl: 'http://x/d.png',
            email: 'dana@x.dev',
            offerText: 'I can help move boxes',
            availability: 'Weekends',
            contactPreference: 'email',
            createdAt: '2026-07-02T00:00:00Z'
        });
    });

    it('blanks missing fields', () => {
        const v = mapOfferForOwner({ id: 'offer-2', user_id: 'u-1' });
        expect(v.name).toBe('');
        expect(v.email).toBe('');
        expect(v.offerText).toBe('');
        expect(v.contactPreference).toBe('');
    });

    it('mapOffersForOwner maps an array and tolerates non-arrays', () => {
        expect(mapOffersForOwner([{ id: 'o', user_id: 'u' }])).toHaveLength(1);
        expect(mapOffersForOwner(null)).toEqual([]);
        expect(mapOffersForOwner(undefined)).toEqual([]);
    });
});

describe('hasContactEmail (FR-GLOWE-012 AC4)', () => {
    it('is true when the view carries a non-empty email', () => {
        expect(hasContactEmail({ email: 'a@b.dev' })).toBe(true);
    });

    it('is false for blank / missing emails and non-objects', () => {
        expect(hasContactEmail({ email: '' })).toBe(false);
        expect(hasContactEmail({ email: '   ' })).toBe(false);
        expect(hasContactEmail({})).toBe(false);
        expect(hasContactEmail(null)).toBe(false);
        expect(hasContactEmail(undefined)).toBe(false);
    });
});

describe('buildSavedItemPayload (FR-GLOWE-013 AC1)', () => {
    it('maps a card descriptor to the glowe_saved_items column shape', () => {
        expect(buildSavedItemPayload('opportunity', 'op-1', 'Beach cleanup', 'GreenOrg', 'opportunity.html?id=op-1')).toEqual({
            item_type: 'opportunity',
            item_id: 'op-1',
            title: 'Beach cleanup',
            meta: 'GreenOrg',
            href: 'opportunity.html?id=op-1'
        });
    });

    it('coerces a numeric id to a string (matches the text column + 0204 unique index)', () => {
        expect(buildSavedItemPayload('post', 42, 'Hi', '', '').item_id).toBe('42');
    });

    it('defaults missing meta/href/title to empty strings', () => {
        expect(buildSavedItemPayload('wish', 'w-9')).toEqual({
            item_type: 'wish',
            item_id: 'w-9',
            title: '',
            meta: '',
            href: ''
        });
    });
});

describe('isItemSaved (FR-GLOWE-013 AC2)', () => {
    const saved = [
        { type: 'opportunity', id: 'op-1' },
        { type: 'wish', id: '42' }
    ];

    it('is true when a matching type+id is present', () => {
        expect(isItemSaved(saved, 'opportunity', 'op-1')).toBe(true);
    });

    it('compares id as text (numeric vs string id still matches)', () => {
        expect(isItemSaved(saved, 'wish', 42)).toBe(true);
    });

    it('is false when the type differs even if the id matches', () => {
        expect(isItemSaved(saved, 'post', 'op-1')).toBe(false);
    });

    it('is false for a missing item and for a non-array saved list', () => {
        expect(isItemSaved(saved, 'opportunity', 'nope')).toBe(false);
        expect(isItemSaved(null, 'opportunity', 'op-1')).toBe(false);
        expect(isItemSaved(undefined, 'wish', '42')).toBe(false);
    });
});
