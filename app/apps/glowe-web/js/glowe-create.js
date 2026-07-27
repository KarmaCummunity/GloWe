// GloWe adaptive create system helpers (FR-GLOWE-016 AC3/AC4/AC7).
//
// Pure, DOM-free logic for the account-type-aware "+ Create" menu: a
// declarative type registry plus the permission/menu-state computation and the
// per-type draft validators. Shared by the browser app (window.GloweCreate)
// and unit-tested via vitest (module.exports), so they must stay free of
// DOM / Supabase / globals.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweCreate = api;
})(typeof self !== 'undefined' ? self : this, function () {
    // ── Capability matrix ───────────────────────────────────────────────────
    // Browser mirror of public.glowe_can_create() (migrations 0236 + 0242). The
    // database is the enforcement point; this copy exists so the create menu
    // renders without a round trip. Both are pinned to the same table by
    // supabase/tests/0236_glowe_publish_guards.sql and
    // js/__tests__/glowe-create.test.js — if you change one, change all three.
    //
    // `kind` is the server-side content kind, not the UI id:
    //   'community' | 'wish' | 'outreach' | 'offer' → glowe_posts.post_type
    //   'opportunity' | 'event'                     → glowe_opportunities
    function canCreate(accountType, approvalStatus, kind) {
        const type = accountType === 'organization' ? 'organization' : 'individual';
        const approval = approvalStatus || 'not_required';
        // Rejected org applications are view-only.
        if (type === 'organization' && approval === 'rejected') return false;
        // Calls FOR volunteers are hosted by an approved organization; an event
        // is an opportunity carrying a date (D-66).
        if (kind === 'opportunity' || kind === 'event') {
            return type === 'organization' && approval === 'approved';
        }
        // A volunteer offer is an individual offering their own time. Pending
        // org applicants keep individual permissions until approved.
        if (kind === 'offer') return !(type === 'organization' && approval === 'approved');
        // Needs, community posts and outreach are open to both account types.
        return true;
    }

    // AC7 — modular type registry: adding a create type is one entry here.
    // `surface` names the Phase-B feature that persists the item; the DOM layer
    // dispatches on `id`; `kind` ties the entry to the server-side matrix above
    // so eligibility is derived, never restated.
    const GLOWE_CREATE_TYPES = [
        {
            id: 'post',
            kind: 'community',
            label: 'Post',
            description: 'Share an update, a story, or knowledge with the community.',
            surface: 'community'
        },
        {
            id: 'event',
            kind: 'event',
            label: 'Event',
            description: 'Publish a volunteering event with a date and registration.',
            surface: 'opportunities'
        },
        {
            id: 'opportunity',
            kind: 'opportunity',
            label: 'Volunteer Opportunity',
            description: 'Recruit volunteers for an ongoing role or project.',
            surface: 'opportunities'
        },
        {
            id: 'need',
            kind: 'wish',
            label: 'Need',
            description: 'Ask the community for help, resources, or partners.',
            surface: 'wishes'
        },
        {
            id: 'offer',
            kind: 'offer',
            label: 'Volunteer Offer',
            description: 'Offer your time and skills so organizations can find you.',
            surface: 'wishes'
        }
    ];

    // AC3 — compute the create-menu state for the current viewer.
    //   loggedIn: boolean; profile: { accountType, approvalStatus } | null.
    // Returns { state: 'anon' | 'unverified' | 'ok', types: [registry entries] }.
    // Members with no account type yet (onboarding skipped) get the individual
    // set — onboarding still enriches non-blockingly (FR-GLOWE-002 AC1).
    function createMenuState(loggedIn, profile) {
        if (!loggedIn) return { state: 'anon', types: [] };
        const p = profile || {};
        const accountType = p.accountType === 'organization' ? 'organization' : 'individual';
        const approvalStatus = p.approvalStatus;
        if (accountType === 'organization' && approvalStatus === 'rejected') {
            return { state: 'unverified', types: [] };
        }
        return {
            state: 'ok',
            types: GLOWE_CREATE_TYPES.filter(function (t) {
                return canCreate(accountType, approvalStatus, t.kind);
            })
        };
    }

    function findCreateType(id) {
        return GLOWE_CREATE_TYPES.find(function (t) { return t.id === id; }) || null;
    }

    function str(value) {
        return String(value == null ? '' : value).trim();
    }

    function withDefault(value, fallback) {
        return value || fallback;
    }

    function toIso(value) {
        return value ? new Date(value).toISOString() : null;
    }

    function isBlankCapacity(value) {
        return value === undefined || value === null || String(value) === '';
    }

    function toCapacity(value) {
        return isBlankCapacity(value) ? null : Number(value);
    }

    function capacityError(value) {
        if (isBlankCapacity(value)) return '';
        const cap = Number(value);
        if (!Number.isInteger(cap) || cap <= 0) return 'Capacity must be a positive number.';
        return '';
    }

    function endTimeError(endAt, startMs) {
        const end = Date.parse(endAt);
        if (Number.isNaN(end) || end < startMs) return 'The end time must be after the start.';
        return '';
    }

    function eventScheduleError(d) {
        if (!d.start_at) return 'Please choose a start date and time.';
        const start = Date.parse(d.start_at);
        if (Number.isNaN(start)) return 'Please choose a valid start date.';
        return d.end_at ? endTimeError(d.end_at, start) : '';
    }

    function eventDraftError(d) {
        if (!str(d.title)) return 'Please add an event title.';
        return eventScheduleError(d) || capacityError(d.capacity);
    }

    // AC4 — event draft validation (an event is an opportunity + start date,
    // migration 0211). Required: title, start date; the date must parse and a
    // provided end must not precede the start.
    function validateEventDraft(draft) {
        const error = eventDraftError(draft || {});
        return error ? { valid: false, error: error } : { valid: true, error: '' };
    }

    // AC4 — normalize an event draft into the glowe_opportunities insert shape.
    function normalizeEventDraft(draft) {
        const d = draft || {};
        return {
            title: str(d.title),
            organization: str(d.organization),
            organization_en: str(d.organization_en || d.organizationEn) || null,
            field: withDefault(d.field, 'Community'),
            commitment: 'Event',
            location: str(d.location),
            duration: str(d.duration),
            description: str(d.description),
            skills: [],
            requirements: [],
            start_at: toIso(d.start_at),
            end_at: toIso(d.end_at),
            event_type: d.event_type === 'digital' ? 'digital' : 'physical',
            event_link: str(d.event_link),
            capacity: toCapacity(d.capacity),
            registration_mode: d.registration_mode === 'open' ? 'open' : 'gated'
        };
    }

    // AC4 — volunteer-offer draft validation (a standing offer of help,
    // post_type='offer', migration 0227). Required: title + description.
    function validateOfferPostDraft(draft) {
        const d = draft || {};
        if (!d.title || !String(d.title).trim()) return { valid: false, error: 'Please add a short headline for your offer.' };
        if (!d.text || !String(d.text).trim()) return { valid: false, error: 'Please describe what you can offer.' };
        return { valid: true, error: '' };
    }

    // AC4 — normalize a volunteer-offer draft into the glowe_posts insert shape.
    function normalizeOfferPostDraft(draft) {
        const d = draft || {};
        return {
            post_type: 'offer',
            title: String(d.title || '').trim(),
            text: String(d.text || '').trim(),
            impact_area: d.impact_area || null,
            category: 'offer',
            status: 'open',
            author_name: String(d.author_name || d.authorName || '').trim(),
            author_name_en: String(d.author_name_en || d.authorNameEn || '').trim() || null
        };
    }

    // A glowe_posts row is a live volunteer offer (Wishing Well "Offers" rail).
    function isOpenOffer(row) {
        if (!row) return false;
        const type = row.post_type !== undefined ? row.post_type : row.postType;
        const status = row.status;
        return type === 'offer' && status === 'open';
    }

    return {
        GLOWE_CREATE_TYPES: GLOWE_CREATE_TYPES,
        canCreate: canCreate,
        createMenuState: createMenuState,
        findCreateType: findCreateType,
        validateEventDraft: validateEventDraft,
        normalizeEventDraft: normalizeEventDraft,
        validateOfferPostDraft: validateOfferPostDraft,
        normalizeOfferPostDraft: normalizeOfferPostDraft,
        isOpenOffer: isOpenOffer
    };
});
