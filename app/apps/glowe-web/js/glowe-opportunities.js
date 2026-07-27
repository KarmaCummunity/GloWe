// GloWe Volunteer Network helpers (FR-GLOWE-007).
//
// Pure, DOM-free logic for publishing opportunities to glowe_opportunities.
// Shared by the browser app (window.GloweOpportunities) and unit-tested via
// vitest (module.exports), so they must stay free of DOM / Supabase / globals.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweOpportunities = api;
})(typeof self !== 'undefined' ? self : this, function () {
    function commaList(value) {
        if (Array.isArray(value)) return value.map(function (v) { return String(v).trim(); }).filter(Boolean);
        if (value === undefined || value === null) return [];
        return String(value).split(',').map(function (v) { return v.trim(); }).filter(Boolean);
    }

    // ── Registration terms (FR-GLOWE-012 AC5, migration 0237) ───────────────
    // An opportunity carries the same two registration controls an event does:
    // who gets in ('gated' = the owner approves one by one, 'open' = anyone who
    // applies is confirmed instantly) and how many seats there are. Before
    // migration 0237 these columns existed but only the event path read them.

    function isBlankCapacity(value) {
        return value === undefined || value === null || String(value) === '';
    }

    function toCapacity(value) {
        return isBlankCapacity(value) ? null : Number(value);
    }

    // 'gated' is the safe default: an owner who never touches the control keeps
    // reviewing applicants by hand, which is the behaviour that shipped first.
    function toRegistrationMode(value) {
        return value === 'open' ? 'open' : 'gated';
    }

    function capacityError(value) {
        if (isBlankCapacity(value)) return '';
        const cap = Number(value);
        if (!Number.isInteger(cap) || cap <= 0) return 'Capacity must be a positive number.';
        return '';
    }

    // Validate a "Post an opportunity" draft. Required: title, field, commitment.
    function validateOpportunityDraft(draft) {
        const d = draft || {};
        if (!d.title || !String(d.title).trim()) return { valid: false, error: 'Please add an opportunity title.' };
        if (!d.field || !String(d.field).trim()) return { valid: false, error: 'Please choose an impact field.' };
        if (!d.commitment || !String(d.commitment).trim()) return { valid: false, error: 'Please choose an opportunity type.' };
        const capError = capacityError(d.capacity);
        if (capError) return { valid: false, error: capError };
        return { valid: true, error: '' };
    }

    // Normalize a draft into a glowe_opportunities insert payload. Free-text
    // skills/requirements become arrays; empty lists get friendly defaults so
    // published cards always render at least one tag.
    function normalizeOpportunityDraft(draft) {
        const d = draft || {};
        const skills = commaList(d.skills);
        const requirements = commaList(d.requirements);
        return {
            title: String(d.title || '').trim(),
            organization: String(d.organization || '').trim(),
            organization_en: String(d.organization_en || d.organizationEn || '').trim() || null,
            commitment: d.commitment || '',
            field: d.field || '',
            location: String(d.location || '').trim(),
            duration: String(d.duration || '').trim(),
            description: String(d.description || '').trim(),
            skills: skills.length ? skills : ['Community Support'],
            requirements: requirements.length ? requirements : ['Clear communication'],
            responsibilities: ['Coordinate next steps with interested community members'],
            registration_mode: toRegistrationMode(d.registration_mode || d.registrationMode),
            capacity: toCapacity(d.capacity)
        };
    }

    // True when `userId` already has an application for `opportunityId` in the
    // given list (FR-GLOWE-007 AC5 "Already applied" guard). Accepts both the
    // snake_case server shape (opportunity_id/user_id) and the camelCase local
    // cache shape (opportunityId/userId). Server rows are already user-scoped,
    // so a row without a user field counts as a match on opportunity alone.
    function isDuplicateApplication(list, opportunityId, userId) {
        if (!opportunityId) return false;
        return (list || []).some(function (app) {
            if (!app) return false;
            const oid = app.opportunity_id !== undefined ? app.opportunity_id : app.opportunityId;
            if (String(oid) !== String(opportunityId)) return false;
            const uid = app.user_id !== undefined ? app.user_id : app.userId;
            if (uid === undefined || uid === null || uid === '') return true;
            return String(uid) === String(userId);
        });
    }

    // FR-GLOWE-015 AC5 — admin-removed opportunities (status='removed') are
    // excluded from every public listing. Other statuses (active / cancelled /
    // closed) keep their existing surface-specific handling.
    function isListedOpportunity(row) {
        if (!row) return false;
        const status = row.status !== undefined ? row.status : 'active';
        return status !== 'removed';
    }

    // Sidebar line that tells a visitor what applying here actually does, before
    // they fill the form: are they in on submit, or waiting on the organizer, and
    // is the number of places limited. Returns '' when there is nothing worth
    // saying (the default gated + unlimited case is what people already assume).
    function registrationTermsLabel(opportunity, translate) {
        const t = typeof translate === 'function' ? translate : function (s) { return s; };
        const o = opportunity || {};
        const cap = (o.capacity === undefined || o.capacity === null) ? null : Number(o.capacity);
        const open = toRegistrationMode(o.registrationMode || o.registration_mode) === 'open';
        // Same weld rule as applicationOutcomeMessage: whole sentences translate,
        // the number is appended.
        const places = cap ? ' · ' + t('Places:') + ' ' + cap : '';
        if (open) return t(places ? 'Instant registration' : 'Instant registration — no approval needed') + places;
        if (places) return t('The organizer approves each applicant') + places;
        return '';
    }

    // Copy for the confirmation the applicant sees. The server decides the
    // status (migration 0237), so this maps the outcome rather than predicting
    // it — an open listing that just filled up returns 'Waitlisted', not
    // 'Accepted', and the applicant needs to be told which happened.
    //
    // `translate` is injected (the module stays dependency-free) and every
    // string passed through it is a whole, static sentence: the i18n walker
    // matches exact text, so only the bare waitlist number is welded on.
    function applicationOutcomeMessage(status, position, translate) {
        const t = typeof translate === 'function' ? translate : function (s) { return s; };
        if (status === 'Accepted') {
            return {
                title: t('You are in'),
                body: t('Your place is confirmed. The organizer has your details and will be in touch.')
            };
        }
        if (status === 'Waitlisted') {
            const place = position ? ' ' + t('Your place in line:') + ' ' + position : '';
            return {
                title: t('You are on the waitlist'),
                body: t('All places are taken right now. We will let you know if one opens up.') + place
            };
        }
        return {
            title: t('Application sent'),
            body: t('The organizer reviews each applicant personally. You can track the status in your personal area.')
        };
    }

    return {
        commaList: commaList,
        validateOpportunityDraft: validateOpportunityDraft,
        normalizeOpportunityDraft: normalizeOpportunityDraft,
        isDuplicateApplication: isDuplicateApplication,
        isListedOpportunity: isListedOpportunity,
        applicationOutcomeMessage: applicationOutcomeMessage,
        registrationTermsLabel: registrationTermsLabel,
        toRegistrationMode: toRegistrationMode,
        capacityError: capacityError
    };
});
