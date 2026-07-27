import { describe, it, expect } from 'vitest';
import GloweOpportunities from '../glowe-opportunities.js';

describe('commaList', () => {
    it('splits a comma string into trimmed, non-empty tokens', () => {
        expect(GloweOpportunities.commaList('Translation, facilitation ,  research ')).toEqual(['Translation', 'facilitation', 'research']);
    });

    it('passes arrays through and handles empty input', () => {
        expect(GloweOpportunities.commaList(['a', ' b '])).toEqual(['a', 'b']);
        expect(GloweOpportunities.commaList('')).toEqual([]);
        expect(GloweOpportunities.commaList(null)).toEqual([]);
    });
});

describe('validateOpportunityDraft', () => {
    it('requires title, field, and commitment', () => {
        expect(GloweOpportunities.validateOpportunityDraft({ title: 'T', field: 'community', commitment: 'Flexible' }).valid).toBe(true);
        expect(GloweOpportunities.validateOpportunityDraft({ title: '  ', field: 'community', commitment: 'Flexible' }).valid).toBe(false);
        expect(GloweOpportunities.validateOpportunityDraft({ title: 'T', field: '', commitment: 'Flexible' }).valid).toBe(false);
        expect(GloweOpportunities.validateOpportunityDraft({ title: 'T', field: 'community', commitment: '' }).valid).toBe(false);
        expect(GloweOpportunities.validateOpportunityDraft(null).valid).toBe(false);
    });

    it('returns a helpful error for the first missing field', () => {
        expect(GloweOpportunities.validateOpportunityDraft({}).error).toMatch(/title/i);
        expect(GloweOpportunities.validateOpportunityDraft({ title: 'T' }).error).toMatch(/impact field/i);
        expect(GloweOpportunities.validateOpportunityDraft({ title: 'T', field: 'community' }).error).toMatch(/opportunity type/i);
    });

    it('rejects a non-positive capacity but allows an empty one', () => {
        const base = { title: 'T', field: 'community', commitment: 'Flexible' };
        expect(GloweOpportunities.validateOpportunityDraft({ ...base, capacity: '' }).valid).toBe(true);
        expect(GloweOpportunities.validateOpportunityDraft({ ...base, capacity: '12' }).valid).toBe(true);
        expect(GloweOpportunities.validateOpportunityDraft({ ...base, capacity: '0' }).valid).toBe(false);
        expect(GloweOpportunities.validateOpportunityDraft({ ...base, capacity: '-3' }).valid).toBe(false);
        expect(GloweOpportunities.validateOpportunityDraft({ ...base, capacity: '2.5' }).valid).toBe(false);
    });
});

// FR-GLOWE-012 AC5 — an opportunity carries the same registration terms an
// event does. 'gated' is the default so an owner who ignores the control keeps
// approving applicants by hand, which is how the feature originally shipped.
describe('registration terms', () => {
    it('defaults to gated and only accepts an explicit open', () => {
        expect(GloweOpportunities.toRegistrationMode('open')).toBe('open');
        expect(GloweOpportunities.toRegistrationMode('gated')).toBe('gated');
        expect(GloweOpportunities.toRegistrationMode('')).toBe('gated');
        expect(GloweOpportunities.toRegistrationMode(undefined)).toBe('gated');
        expect(GloweOpportunities.toRegistrationMode('anything-else')).toBe('gated');
    });

    it('carries registration_mode and capacity into the insert payload', () => {
        const base = { title: 'T', field: 'community', commitment: 'Flexible' };
        expect(GloweOpportunities.normalizeOpportunityDraft({ ...base, registration_mode: 'open', capacity: '8' }))
            .toMatchObject({ registration_mode: 'open', capacity: 8 });
        expect(GloweOpportunities.normalizeOpportunityDraft({ ...base, registrationMode: 'open' }))
            .toMatchObject({ registration_mode: 'open', capacity: null });
        expect(GloweOpportunities.normalizeOpportunityDraft(base))
            .toMatchObject({ registration_mode: 'gated', capacity: null });
    });
});

describe('registrationTermsLabel', () => {
    it('describes instant registration, with places when capped', () => {
        expect(GloweOpportunities.registrationTermsLabel({ registrationMode: 'open' }))
            .toBe('Instant registration — no approval needed');
        expect(GloweOpportunities.registrationTermsLabel({ registrationMode: 'open', capacity: 12 }))
            .toBe('Instant registration · Places: 12');
        expect(GloweOpportunities.registrationTermsLabel({ registration_mode: 'open', capacity: 1 }))
            .toBe('Instant registration · Places: 1');
    });

    it('mentions the places on a gated listing but stays silent on the defaults', () => {
        expect(GloweOpportunities.registrationTermsLabel({ capacity: 5 }))
            .toBe('The organizer approves each applicant · Places: 5');
        expect(GloweOpportunities.registrationTermsLabel({ registrationMode: 'gated' })).toBe('');
        expect(GloweOpportunities.registrationTermsLabel({ capacity: null })).toBe('');
        expect(GloweOpportunities.registrationTermsLabel(null)).toBe('');
    });

    it('translates the sentence and leaves the number alone', () => {
        const label = GloweOpportunities.registrationTermsLabel(
            { registrationMode: 'open', capacity: 4 }, (s) => 'HE:' + s
        );
        expect(label).toBe('HE:Instant registration · HE:Places: 4');
    });
});

// The server, not the client, decides the outcome (migration 0237) — an open
// listing that just filled up returns Waitlisted, so the copy has to follow the
// returned status rather than assume the happy path.
describe('applicationOutcomeMessage', () => {
    it('confirms an instant acceptance', () => {
        expect(GloweOpportunities.applicationOutcomeMessage('Accepted').title).toMatch(/you are in/i);
    });

    it('names the waitlist position when there is one', () => {
        const msg = GloweOpportunities.applicationOutcomeMessage('Waitlisted', 3);
        expect(msg.title).toMatch(/waitlist/i);
        expect(msg.body).toMatch(/place in line: 3$/);
        expect(GloweOpportunities.applicationOutcomeMessage('Waitlisted', null).body).not.toMatch(/place in line/);
    });

    it('falls back to the pending-review wording', () => {
        expect(GloweOpportunities.applicationOutcomeMessage('Pending').title).toMatch(/sent/i);
        expect(GloweOpportunities.applicationOutcomeMessage(undefined).title).toMatch(/sent/i);
    });

    // Only whole sentences go through the dictionary; the number is welded on
    // afterwards, which is what keeps the copy translatable.
    it('routes every sentence through the injected translator', () => {
        const seen = [];
        const t = (s) => { seen.push(s); return 'HE:' + s; };
        const msg = GloweOpportunities.applicationOutcomeMessage('Waitlisted', 2, t);
        expect(msg.title).toBe('HE:You are on the waitlist');
        expect(msg.body).toBe('HE:All places are taken right now. We will let you know if one opens up. HE:Your place in line: 2');
        expect(seen.every((s) => !/\d/.test(s))).toBe(true);
    });
});

describe('normalizeOpportunityDraft', () => {
    it('builds an insert payload with array skills/requirements', () => {
        const payload = GloweOpportunities.normalizeOpportunityDraft({
            title: '  Translator  ', organization: ' Org ', commitment: 'Flexible', field: 'education',
            location: ' Remote ', duration: 'Ongoing', description: ' Help translate ',
            skills: 'Hebrew, Arabic', requirements: 'Fluency'
        });
        expect(payload).toMatchObject({
            title: 'Translator', organization: 'Org', commitment: 'Flexible', field: 'education',
            location: 'Remote', duration: 'Ongoing', description: 'Help translate',
            skills: ['Hebrew', 'Arabic'], requirements: ['Fluency']
        });
        expect(payload.responsibilities).toHaveLength(1);
    });

    it('applies friendly defaults when skills/requirements are empty', () => {
        const payload = GloweOpportunities.normalizeOpportunityDraft({ title: 'T', field: 'community', commitment: 'Flexible' });
        expect(payload.skills).toEqual(['Community Support']);
        expect(payload.requirements).toEqual(['Clear communication']);
    });
});

describe('isDuplicateApplication', () => {
    it('matches local cache rows on opportunityId + userId', () => {
        const list = [{ opportunityId: 'opp-1', userId: 'u1' }, { opportunityId: 'opp-2', userId: 'u1' }];
        expect(GloweOpportunities.isDuplicateApplication(list, 'opp-1', 'u1')).toBe(true);
        expect(GloweOpportunities.isDuplicateApplication(list, 'opp-3', 'u1')).toBe(false);
        expect(GloweOpportunities.isDuplicateApplication(list, 'opp-1', 'u2')).toBe(false);
    });

    it('matches server rows (snake_case) and treats user-scoped rows without a user field as a match', () => {
        expect(GloweOpportunities.isDuplicateApplication([{ opportunity_id: 'opp-1', user_id: 'u1' }], 'opp-1', 'u1')).toBe(true);
        expect(GloweOpportunities.isDuplicateApplication([{ opportunity_id: 'opp-1' }], 'opp-1', 'u1')).toBe(true);
        expect(GloweOpportunities.isDuplicateApplication([{ opportunity_id: 'opp-2' }], 'opp-1', 'u1')).toBe(false);
    });

    it('is false for empty input or a missing opportunity id', () => {
        expect(GloweOpportunities.isDuplicateApplication([], 'opp-1', 'u1')).toBe(false);
        expect(GloweOpportunities.isDuplicateApplication(null, 'opp-1', 'u1')).toBe(false);
        expect(GloweOpportunities.isDuplicateApplication([{ opportunityId: 'opp-1', userId: 'u1' }], '', 'u1')).toBe(false);
    });
});
