// Main application logic

// Legacy copy kept for fallback toasts when Google auth cannot start.
const LOGIN_MODAL_DEFAULT_INTRO = 'Sign in with your Google account to continue.';

// Modal handling
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId === 'login-modal' && typeof upgradeLoginModal === 'function') {
            upgradeLoginModal();
        } else if (modalId === 'login-modal') {
            const intro = modal.querySelector('.modal-intro');
            if (intro) intro.textContent = LOGIN_MODAL_DEFAULT_INTRO;
        }
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Guests can browse but not save (or perform other gated actions). Start Google
// OAuth immediately instead of an intermediate sign-in modal.
function promptGuestSignIn(message) {
    if (typeof handleGoogleSignIn === 'function') {
        handleGoogleSignIn();
        return;
    }
    showSuccessModal('Sign in', message || LOGIN_MODAL_DEFAULT_INTRO);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = document.querySelector('.modal.active') ? 'hidden' : '';
    }
}

function switchModal(fromModalId, toModalId) {
    closeModal(fromModalId);
    setTimeout(() => openModal(toModalId), 100);
}

function showSuccessModal(title, message) {
    ensureGlobalUI();
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-message').textContent = message;
    openModal('success-modal');
}

// Lightweight transient toast (auto-dismisses). Used for quiet confirmations
// such as profile saves and the share clipboard fallback.
let gloweToastTimer = null;
function showToast(message, options) {
    if (typeof document === 'undefined') return;
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    const text = (dict && dict[message]) ? dict[message] : message;
    let toast = document.getElementById('glowe-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'glowe-toast';
        toast.className = 'glowe-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    const isError = Boolean(options && options.error);
    toast.textContent = text;
    toast.classList.toggle('is-error', isError);
    toast.classList.toggle('is-success', !isError);
    // Reflow so re-triggering the animation works on repeat calls.
    void toast.offsetWidth;
    toast.classList.add('visible');
    if (gloweToastTimer) clearTimeout(gloweToastTimer);
    gloweToastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

// Auto-dismissing confirmation for completed actions (save, publish, etc.).
function showActionToast(title, message) {
    if (typeof document === 'undefined') return;
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    const localTitle = (dict && dict[title]) ? dict[title] : title;
    const localMessage = message ? ((dict && dict[message]) ? dict[message] : message) : '';
    let toast = document.getElementById('glowe-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'glowe-toast';
        toast.className = 'glowe-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.innerHTML = localMessage
        ? `<strong>${escapeHtml(localTitle)}</strong><span>${escapeHtml(localMessage)}</span>`
        : escapeHtml(localTitle);
    toast.classList.remove('is-error');
    toast.classList.add('is-success');
    void toast.offsetWidth;
    toast.classList.add('visible');
    if (gloweToastTimer) clearTimeout(gloweToastTimer);
    gloweToastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

// ── View-only write gating (FR-GLOWE-003) ───────────────────────────────────
// Browsing is open to everyone, but creating content (a need, post, event, or
// discussion) requires a registered account that is allowed to publish. Two
// gates: (1) unregistered "peek" visitors cannot write; (2) an organization is
// view-only until a KC reviewer approves it (approval_status === 'approved').
// Individuals never need approval. Returns { allowed, reason }.
function gloweWriteGate() {
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        return { allowed: false, reason: 'anon' };
    }
    const profile = (typeof getPersonalProfile === 'function') ? getPersonalProfile() : {};
    const isOrg = profile.accountType === 'organization' || profile.type === 'organization';
    if (isOrg && profile.approvalStatus && profile.approvalStatus !== 'approved') {
        return { allowed: false, reason: 'org-unverified' };
    }
    return { allowed: true, reason: 'ok' };
}

// Guard for content-create handlers: returns true when the caller may publish,
// otherwise shows the appropriate view-only notice and returns false.
function canCreateContent(actionKey) {
    const gate = gloweWriteGate();
    if (gate.allowed) return true;
    if (gate.reason === 'anon') {
        // Guest → action-tailored join prompt (FR-GLOWE-023).
        if (window.GloweGuest && typeof window.GloweGuest.showJoinPrompt === 'function') {
            window.GloweGuest.showJoinPrompt(actionKey || 'create-post', {});
        }
    } else {
        showSuccessModal(
            'Awaiting verification',
            'Your organization is under review. Until it is approved you can explore everything, but publishing needs, posts, and events is paused — we only publish verified organizations.'
        );
    }
    return false;
}

// ── Adaptive create system (FR-GLOWE-016 AC3/AC4/AC7) ───────────────────────
// One "+ Create" entry point (header button + mobile FAB) opening a menu that
// shows only the create types the viewer's account may publish, computed from
// the declarative GloweCreate registry.
function openCreateMenu() {
    const state = resolveCreateMenuState();
    if (!state || !handleGatedCreateMenu(state)) return;
    renderCreateMenu(state.types);
}

function resolveCreateMenuState() {
    if (typeof GloweCreate === 'undefined') return null;
    const loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();
    const profile = (typeof getPersonalProfile === 'function') ? getPersonalProfile() : {};
    return GloweCreate.createMenuState(loggedIn, profile);
}

// Gate handling: anon → contextual join, unverified org → notice. Returns
// true when the viewer may see the menu.
function handleGatedCreateMenu(state) {
    if (state.state === 'anon') {
        window.GloweGuest.showJoinPrompt('create-post', {});
        return false;
    }
    if (state.state === 'unverified') {
        showSuccessModal(
            'Awaiting verification',
            'Your organization is under review. Until it is approved you can explore everything, but publishing needs, posts, and events is paused — we only publish verified organizations.'
        );
        return false;
    }
    return true;
}

function renderCreateMenu(types) {
    ensureGlobalUI();
    if (!document.getElementById('glowe-create-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="glowe-create-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('glowe-create-modal')">&times;</span>
                    <h2>What would you like to create?</h2>
                    <div id="glowe-create-options" class="create-menu-options"></div>
                </div>
            </div>
        `);
    }
    document.getElementById('glowe-create-options').innerHTML = types.map(t => `
        <button type="button" class="create-menu-option" onclick="dispatchCreateType('${t.id}')">
            <strong>${escapeHtml(t.label)}</strong>
            <span>${escapeHtml(t.description)}</span>
        </button>
    `).join('');
    if (typeof window.translateGloweTree === 'function') {
        window.translateGloweTree(document.getElementById('glowe-create-modal'));
    }
    openModal('glowe-create-modal');
}

// AC7 — dispatch a chosen create type to its Phase-B surface (one entry per
// registry type; navigation targets are relative-path aware).
const GLOWE_CREATE_DISPATCH = {
    post: () => { window.location.href = `${gloweePagePrefix()}write-post.html`; },
    need: () => openWishComposer(),
    offer: () => openOfferComposer(),
    event: () => openEventComposer(),
    opportunity: () => { window.location.href = `${gloweePagePrefix()}volunteer-network.html?compose=1`; }
};

function gloweePagePrefix() {
    return window.location.pathname.includes('/pages/') ? '' : 'pages/';
}

function dispatchCreateType(typeId) {
    closeModal('glowe-create-modal');
    const handler = GLOWE_CREATE_DISPATCH[typeId];
    if (handler) handler();
}

// AC4 — tailored Event form (an event is an opportunity with a start date,
// migration 0211). Runtime-injected like the other global modals.
function openEventComposer() {
    if (!canCreateContent('create-opportunity')) return;
    ensureGlobalUI();
    if (!document.getElementById('glowe-event-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="glowe-event-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('glowe-event-modal')">&times;</span>
                    <h2>Publish an event</h2>
                    <p class="modal-intro">Events appear on the Volunteer Network with a date and registration.</p>
                    <form onsubmit="handleEventSubmit(event)">
                        <div class="form-group">
                            <label for="event-title">Event title</label>
                            <input id="event-title" required maxlength="140" placeholder="e.g. Community beach cleanup">
                        </div>
                        <div class="form-group">
                            <label for="event-description">Description</label>
                            <textarea id="event-description" rows="3" placeholder="What happens at the event, and who should come?"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="event-start">Starts</label>
                            <input id="event-start" type="datetime-local" required>
                        </div>
                        <div class="form-group">
                            <label for="event-end">Ends (optional)</label>
                            <input id="event-end" type="datetime-local">
                        </div>
                        <div class="form-group">
                            <label for="event-type">Format</label>
                            <select id="event-type">
                                <option value="physical">In person</option>
                                <option value="digital">Online</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="event-location">Location / link</label>
                            <input id="event-location" placeholder="Address, city, or meeting link">
                        </div>
                        <div class="form-group">
                            <label for="event-capacity">Capacity (optional)</label>
                            <input id="event-capacity" type="number" min="1" placeholder="Leave empty for unlimited">
                        </div>
                        <div class="form-group">
                            <label for="event-registration">Registration</label>
                            <select id="event-registration">
                                <option value="gated">Organizer approves each registration</option>
                                <option value="open">Open — instant confirmation</option>
                            </select>
                        </div>
                        <button class="btn btn-primary btn-block" type="submit">Publish Event</button>
                    </form>
                </div>
            </div>
        `);
        if (typeof window.translateGloweTree === 'function') {
            window.translateGloweTree(document.getElementById('glowe-event-modal'));
        }
    }
    openModal('glowe-event-modal');
}

function backendReady() {
    return Boolean(window.gloweBackend && window.gloweBackend.configured());
}

function gloweIsLoggedIn() {
    return typeof isLoggedIn === 'function' && isLoggedIn();
}

// The signed-in author's display name for authored content (orgs publish
// under their organization name). Localized via FR-GLOWE-024 when available.
function gloweReaderLang() {
    return (typeof getGloweLanguage === 'function') ? getGloweLanguage() : 'en';
}

function gloweCurrentAuthorName() {
    const profile = (typeof getPersonalProfile === 'function') ? getPersonalProfile() : {};
    if (typeof GloweLocalizedName !== 'undefined') {
        return GloweLocalizedName.localizedProfileName(profile, gloweReaderLang());
    }
    return profile.orgName || profile.name || 'GloWe Member';
}

// Source + English pair for stamping content snapshots at create time.
function gloweCurrentAuthorNamePair() {
    const profile = (typeof getPersonalProfile === 'function') ? getPersonalProfile() : {};
    const isOrg = profile && profile.accountType === 'organization';
    const primary = (isOrg ? (profile.orgName || profile.name) : (profile && profile.name)) || 'GloWe Member';
    const english = isOrg
        ? (profile.orgNameEn || profile.nameEn || '')
        : ((profile && profile.nameEn) || '');
    return { primary, english };
}

// Shared submit path for the tailored create forms (FR-GLOWE-016 AC4):
// validate → insert → close + reset + confirm. Failures keep the user's
// input in place and explain what happened.
async function submitCreateDraft(form, options) {
    if (!options.check.valid) {
        showSuccessModal('Missing details', options.check.error);
        return;
    }
    if (!backendReady()) {
        showSuccessModal('Backend unavailable', options.offlineBody);
        return;
    }
    try {
        await window.gloweBackend.insertOwned(options.table, options.payload);
        closeModal(options.modalId);
        form.reset();
        showActionToast(options.successTitle, options.successBody);
        if (options.table === 'posts' && reloadWishBoard) await reloadWishBoard();
    } catch (_e) {
        showSuccessModal('Could not publish', options.failBody);
    }
}

function readEventDraft() {
    const isDigital = fieldValue('event-type') === 'digital';
    const locationValue = fieldValue('event-location');
    const author = gloweCurrentAuthorNamePair();
    return {
        title: fieldValue('event-title'),
        description: fieldValue('event-description'),
        start_at: fieldValue('event-start'),
        end_at: fieldValue('event-end'),
        event_type: isDigital ? 'digital' : 'physical',
        event_link: isDigital ? locationValue : '',
        location: isDigital ? 'Online' : locationValue,
        capacity: fieldValue('event-capacity'),
        registration_mode: fieldValue('event-registration'),
        organization: author.primary,
        organization_en: author.english || null
    };
}

async function handleEventSubmit(event) {
    event.preventDefault();
    if (!canCreateContent('create-opportunity')) return;
    const draft = readEventDraft();
    await submitCreateDraft(event.target, {
        check: GloweCreate.validateEventDraft(draft),
        table: 'opportunities',
        payload: GloweCreate.normalizeEventDraft(draft),
        modalId: 'glowe-event-modal',
        successTitle: 'Event published',
        successBody: 'Your event is now live on the Volunteer Network.',
        offlineBody: 'Events need a live connection right now. Please try again shortly.',
        failBody: 'Something went wrong publishing your event. Please try again.'
    });
}

// AC4 — tailored Volunteer-offer form (post_type='offer', migration 0227).
function openOfferComposer() {
    if (!canCreateContent('create-post')) return;
    ensureGlobalUI();
    if (!document.getElementById('glowe-offer-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="glowe-offer-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('glowe-offer-modal')">&times;</span>
                    <h2>Offer your help</h2>
                    <p class="modal-intro">Your offer appears on the Wishing Well so organizations and members can find you.</p>
                    <form onsubmit="handleOfferPostSubmit(event)">
                        <div class="form-group">
                            <label for="offer-title">Headline</label>
                            <input id="offer-title" required maxlength="140" placeholder="e.g. Graphic designer offering 3 hours a week">
                        </div>
                        <div class="form-group">
                            <label for="offer-text">What can you offer?</label>
                            <textarea id="offer-text" rows="4" required placeholder="Skills, time, equipment — anything that could help."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="offer-impact-area">Impact area (optional)</label>
                            <select id="offer-impact-area">
                                <option value="">Select an area</option>
                                <option>Education</option>
                                <option>Climate</option>
                                <option>Social Justice</option>
                                <option>Tech for Good</option>
                                <option>Community Building</option>
                                <option>Health</option>
                                <option>Food Security</option>
                                <option>Knowledge Sharing</option>
                                <option>Civic Innovation</option>
                            </select>
                        </div>
                        <button class="btn btn-primary btn-block" type="submit">Publish Offer</button>
                    </form>
                </div>
            </div>
        `);
        if (typeof window.translateGloweTree === 'function') {
            window.translateGloweTree(document.getElementById('glowe-offer-modal'));
        }
    }
    openModal('glowe-offer-modal');
}

async function handleOfferPostSubmit(event) {
    event.preventDefault();
    if (!canCreateContent('create-post')) return;
    const author = gloweCurrentAuthorNamePair();
    const draft = {
        title: fieldValue('offer-title'),
        text: fieldValue('offer-text'),
        impact_area: fieldValue('offer-impact-area'),
        author_name: author.primary,
        author_name_en: author.english || null
    };
    await submitCreateDraft(event.target, {
        check: GloweCreate.validateOfferPostDraft(draft),
        table: 'posts',
        payload: GloweCreate.normalizeOfferPostDraft(draft),
        modalId: 'glowe-offer-modal',
        successTitle: 'Offer published',
        successBody: 'Your offer is now live on the Wishing Well.',
        offlineBody: 'Offers need a live connection right now. Please try again shortly.',
        failBody: 'Something went wrong publishing your offer. Please try again.'
    });
}

// ── Post-sign-in onboarding (FR-GLOWE-002) ──────────────────────────────────
const GLOWE_ONBOARDING_DISMISSED_KEY = 'glowe-onboarding-dismissed';

function toggleOnboardingOrgFields() {
    const orgFields = document.getElementById('onboarding-org-fields');
    if (!orgFields) return;
    const checked = document.querySelector('input[name="onboarding-account-type"]:checked');
    orgFields.hidden = !(checked && checked.value === 'organization');
}

function openGloweOnboarding(profile) {
    ensureGlobalUI();
    if (!document.getElementById('glowe-onboarding-modal')) return;
    const user = (typeof getCurrentUser === 'function' && getCurrentUser()) || {};
    const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
    setVal('onboarding-display-name', (profile && profile.name) || user.name || '');
    setVal('onboarding-display-name-en', (profile && profile.nameEn) || '');
    setVal('onboarding-country', (profile && profile.country) || '');
    setVal('onboarding-about', (profile && profile.about) || '');
    setVal('onboarding-org-contact-email', user.email || '');
    setVal('onboarding-org-name-en', (profile && profile.orgNameEn) || '');
    toggleOnboardingOrgFields();
    openModal('glowe-onboarding-modal');
}

function dismissGloweOnboarding() {
    sessionStorage.setItem(GLOWE_ONBOARDING_DISMISSED_KEY, '1');
    closeModal('glowe-onboarding-modal');
}

// Auto-invite an incomplete user once per browser session.
function maybeShowGloweOnboarding(profile) {
    if (profile && profile.onboardingComplete) return;
    if (sessionStorage.getItem(GLOWE_ONBOARDING_DISMISSED_KEY) === '1') return;
    sessionStorage.setItem(GLOWE_ONBOARDING_DISMISSED_KEY, '1');
    openGloweOnboarding(profile);
}

async function handleGloweOnboarding(event) {
    event.preventDefault();
    if (!(window.gloweBackend && window.gloweBackend.configured()
          && typeof window.gloweBackend.completeOnboarding === 'function')) {
        dismissGloweOnboarding();
        return;
    }
    const val = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const checked = document.querySelector('input[name="onboarding-account-type"]:checked');
    const accountType = checked ? checked.value : 'individual';
    const isOrg = accountType === 'organization';

    if (isOrg) {
        const missing = [];
        if (!val('onboarding-org-name')) missing.push('organization name');
        if (!val('onboarding-org-description')) missing.push('about the organization');
        if (!val('onboarding-org-contact-name')) missing.push('contact person');
        if (!val('onboarding-org-contact-email')) missing.push('contact email');
        if (missing.length) {
            alert('To submit your organization for review, please add: ' + missing.join(', ') + '.');
            return;
        }
    }

    const submitBtn = document.getElementById('onboarding-submit');
    if (submitBtn) submitBtn.disabled = true;

    const details = {
        displayName: val('onboarding-display-name'),
        displayNameEn: val('onboarding-display-name-en'),
        country: val('onboarding-country'),
        about: val('onboarding-about'),
        accountType,
        org: isOrg ? {
            name: val('onboarding-org-name'),
            nameEn: val('onboarding-org-name-en'),
            registrationNumber: val('onboarding-org-registration'),
            website: val('onboarding-org-website'),
            country: val('onboarding-org-country'),
            field: val('onboarding-org-field'),
            size: val('onboarding-org-size'),
            description: val('onboarding-org-description'),
            contactName: val('onboarding-org-contact-name'),
            contactEmail: val('onboarding-org-contact-email'),
            contactPhone: val('onboarding-org-contact-phone')
        } : null
    };

    try {
        const profile = await window.gloweBackend.completeOnboarding(details);
        if (profile) {
            localStorage.setItem(PERSONAL_PROFILE_KEY, JSON.stringify(profile));
            // Keep the lightweight `gloweUser` name in sync with the chosen name.
            if (typeof getCurrentUser === 'function') {
                const current = getCurrentUser() || {};
                localStorage.setItem('gloweUser', JSON.stringify({
                    ...current,
                    name: profile.name || current.name,
                    type: profile.type || current.type
                }));
            }
        }
        closeModal('glowe-onboarding-modal');
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
        showSuccessModal(
            isOrg ? 'Application submitted' : "You're all set!",
            isOrg
                ? "Thanks! The GloWe team will review your organization. Until then you can explore everything — publishing unlocks once you're approved."
                : 'Welcome to GloWe. Your profile is ready and you have full access.'
        );
    } catch (error) {
        alert((error && error.message) || 'Could not save your details. Please try again.');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

let activeWishForSupport = null;
// Re-fetches the live opportunities board after a publish (FR-GLOWE-007 AC3).
// Assigned in initOpportunitiesPage; null on other pages.
let reloadOpportunities = null;
const PERSONAL_PROFILE_KEY = 'glowePersonalProfile';
const QUESTIONNAIRE_BADGE_DISMISSED_KEY = 'glowe-questionnaire-badge-dismissed';
// The questionnaire detail list is long; default it collapsed and let the user
// expand on demand (session-scoped, mirrors the badge-dismiss pattern).
const QUESTIONNAIRE_COLLAPSED_KEY = 'glowe-questionnaire-collapsed';

function dismissQuestionnaireBadge() {
    sessionStorage.setItem(QUESTIONNAIRE_BADGE_DISMISSED_KEY, '1');
    if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
}

function isQuestionnaireCollapsed() {
    // Default collapsed unless the user has explicitly expanded it this session.
    return sessionStorage.getItem(QUESTIONNAIRE_COLLAPSED_KEY) !== '0';
}

function toggleQuestionnaireProfile() {
    sessionStorage.setItem(QUESTIONNAIRE_COLLAPSED_KEY, isQuestionnaireCollapsed() ? '0' : '1');
    if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
}
// FR-GLOWE-011 AC1 — true while the Personal Area's backend profile fetch is in
// flight (set in initMyApplicationsPage, cleared when syncPersonalDataFromBackend
// settles). Drives the profile-card loading skeleton.
let personalProfileLoading = false;
const PERSONAL_PROJECTS_KEY = 'glowePersonalProjects';
const SAVED_ITEMS_KEY = 'gloweSavedItems';
const POST_COMMENTS_KEY = 'glowePostComments';
const APPLICATIONS_STORAGE_KEY = 'gloweApplications';
const LEGACY_APPLICATIONS_STORAGE_KEY = 'revolutionaryApplications';

let activeReportTarget = {
    type: 'general',
    id: 'site',
    title: 'General concern'
};

const registrationInterests = [
    'Planet & Nature',
    'Justice & Rights',
    'Knowledge & Learning',
    'Health & Wellbeing',
    'Livelihoods & Innovation',
    'Communities & Culture',
    'Crisis & Safety',
    'Civic Power & Participation'
];

const registrationSdgs = [
    'No Poverty',
    'Zero Hunger',
    'Good Health',
    'Quality Education',
    'Gender Equality',
    'Clean Water',
    'Clean Energy',
    'Decent Work',
    'Reduced Inequalities',
    'Climate Action',
    'Peace & Justice',
    'Partnerships'
];

const discussionGroups = [
    {
        id: 'education',
        title: 'Education & Knowledge',
        members: 0,
        posts: 0,
        description: 'A focused group for learning spaces, youth programs, multilingual knowledge sharing, and practical education tools.',
        tags: ['Education', 'Knowledge Sharing', 'Youth'],
        threads: []
    },
    {
        id: 'environment',
        title: 'Environment & Climate Action',
        members: 0,
        posts: 0,
        description: 'For climate, food systems, waste, restoration, repair, and local environmental action.',
        tags: ['Climate', 'Food Security', 'Repair'],
        threads: []
    },
    {
        id: 'health',
        title: 'Health & Community Care',
        members: 0,
        posts: 0,
        description: 'A moderated space for wellbeing, preventive health, emergency response, and community care methods.',
        tags: ['Health', 'Wellbeing', 'Crisis Response'],
        threads: []
    },
    {
        id: 'rights',
        title: 'Rights, Safety & Civic Power',
        members: 0,
        posts: 0,
        description: 'For rights-based action, civic participation, safe moderation, and community trust.',
        tags: ['Justice', 'Safety', 'Civic Action'],
        threads: []
    }
];

const registrationProfileFields = {
    ngo: {
        label: 'NGO / Nonprofit',
        cardDescription: 'For registered nonprofits, community organizations, associations, and civil society groups.',
        storyLabel: 'Organization mission',
        storyPlaceholder: 'What is the mission, who do you serve, and what change are you working toward?',
        valuesLabel: 'Values and goals',
        valuesPlaceholder: 'Share your core values, goals, leadership, and the principles that guide your work.',
        communityLabel: 'Community you serve',
        communityPlaceholder: 'Who do you serve or work with? Include geography, population, or lived reality when relevant.',
        problemLabel: 'Problem you address',
        problemPlaceholder: 'What need, gap, or injustice is your organization responding to?',
        solutionLabel: 'Solution or method',
        solutionPlaceholder: 'Describe the work in practice: field action, education, advocacy, community work, research, or technology.',
        methodsPlaceholder: 'Policy, education, field work, technology, community organizing, research, advocacy...',
        publicPrompt: 'Open to volunteers, donations, or partnerships?',
        publicPlaceholder: 'Example: open to professional volunteers, donors, local partners, events, or knowledge exchange.',
        sizeLabel: 'Organization size',
        sizeOptions: ['1-5 people', '6-20 people', '20+ people', 'National network', 'International network'],
        fundingLabel: 'Funding / support sources',
        guidanceTitle: 'For an NGO profile, we collect',
        guidanceItems: [
            'Mission, values, goals, and the community you serve',
            'Main field, sub-field, SDGs, problem, solution, and working methods',
            'Projects, impact, how you measure success, and what you learned',
            'Public links, media, volunteer openness, and review status'
        ]
    },
    business: {
        label: 'Company / Impact Business',
        cardDescription: 'For companies, heart-led businesses, social businesses, cooperatives, and CSR/ESG teams.',
        storyLabel: 'Business purpose',
        storyPlaceholder: 'What stands at the heart of your business and what do you want to change?',
        valuesLabel: 'Business values',
        valuesPlaceholder: 'What values guide your daily work, your team culture, and your decisions?',
        communityLabel: 'Customers / community',
        communityPlaceholder: 'Who do you serve as customers, and is there a community you already work alongside?',
        problemLabel: 'Social or environmental problem',
        problemPlaceholder: 'What social, environmental, or local challenge does your business respond to?',
        solutionLabel: 'Product, service, or impact model',
        solutionPlaceholder: 'How do your products, services, logistics, space, or expertise create value in practice?',
        methodsPlaceholder: 'Products, services, discounted support, employee volunteering, logistics, space, CSR, ESG...',
        publicPrompt: 'Open to collaborations, products, services, or CSR partnerships?',
        publicPlaceholder: 'Example: open to local collaborations, discounted services, employee volunteering, CSR partnerships.',
        sizeLabel: 'Team / company size',
        sizeOptions: ['1 person', '2-5 people', '6-20 people', '20+ people', 'Corporate / multi-site'],
        fundingLabel: 'Business model / support sources',
        guidanceTitle: 'For a company profile, we collect',
        guidanceItems: [
            'Business identity, values, products or services, and customer/community focus',
            'Where you want to create social or environmental value',
            'How you can contribute: service, product, space, logistics, team time, or partnerships',
            'Public presence, logo, collaboration openness, and profile review status'
        ]
    },
    initiative: {
        label: 'Social Initiative / Project',
        cardDescription: 'For early-stage initiatives, community projects, informal teams, and field-based ideas.',
        storyLabel: 'Initiative story',
        storyPlaceholder: 'Who started it, what do you do in practice, and who is it for?',
        valuesLabel: 'Values and people behind it',
        valuesPlaceholder: 'Who is behind the initiative, what values guide you, and what kind of team or community is involved?',
        communityLabel: 'Community / audience',
        communityPlaceholder: 'Which people, place, or community is this initiative connected to?',
        problemLabel: 'Problem or need',
        problemPlaceholder: 'What need or problem did you notice that made this initiative necessary?',
        solutionLabel: 'What you do in practice',
        solutionPlaceholder: 'Describe the action itself, the model, early wins, and what you are learning as you go.',
        methodsPlaceholder: 'Community action, pilot, storytelling, mutual aid, education, local service, mentorship...',
        publicPrompt: 'Looking for volunteers, mentors, partners, or visibility?',
        publicPlaceholder: 'Example: looking for mentors, professional volunteers, partners, visibility, or a place to pilot.',
        sizeLabel: 'People involved',
        sizeOptions: ['1 founder', '2-5 people', '6-20 people', 'Community-led network', 'Growing team'],
        fundingLabel: 'Current support / resources',
        guidanceTitle: 'For a social initiative profile, we collect',
        guidanceItems: [
            'Who is behind the initiative and what you do in practice',
            'Problem, solution, values, community, team size, and SDG connection',
            'Small wins, what you learned, and how you measure progress',
            'Media, public links, and whether you are open to mentors, volunteers, or partners'
        ]
    },
    volunteer: {
        label: 'Volunteer',
        cardDescription: 'For people who want to give time, care, field support, translation, mentoring, or practical help.',
        storyLabel: 'Volunteer introduction',
        storyPlaceholder: 'Who are you, what kind of causes matter to you, and how would you like to help?',
        valuesLabel: 'How you like to volunteer',
        valuesPlaceholder: 'Do you prefer field support, translation, events, mentoring, community care, or practical tasks?',
        communityLabel: 'Preferred causes / communities',
        communityPlaceholder: 'Which causes, communities, or types of organizations are closest to your heart?',
        problemLabel: 'Causes close to your heart',
        problemPlaceholder: 'What issues do you want to help with, and why do they matter to you?',
        solutionLabel: 'Support you can offer',
        solutionPlaceholder: 'Share your availability, languages, lived experience, and the types of help you can offer.',
        methodsPlaceholder: 'Field work, translation, events, mentoring, community support, logistics, research...',
        publicPrompt: 'Can people contact you directly through GloWe?',
        publicPlaceholder: 'Example: yes, for local volunteering twice a month, remote translation, or event support.',
        sizeLabel: 'Monthly availability',
        sizeOptions: ['Up to 2 hours / month', '3-5 hours / month', '6-10 hours / month', '10+ hours / month', 'Project-based'],
        fundingLabel: 'Preferred communication',
        budgetLabel: 'Support needs / accessibility notes',
        guidanceTitle: 'For a volunteer profile, we collect',
        guidanceItems: [
            'Causes, lived experience, languages, and practical support you can offer',
            'Preferred causes, volunteering style, availability, and geography',
            'Whether you can support one project over time or short focused requests',
            'Profile image, public link if relevant, short intro, and contact preference'
        ]
    },
    professional: {
        label: 'Professional / Service Provider',
        cardDescription: 'For experts who can volunteer, offer professional services, lead forums, and ask the community for support.',
        storyLabel: 'Professional background',
        storyPlaceholder: 'What is your professional field, experience, and the kind of impact work you understand?',
        valuesLabel: 'Professional values',
        valuesPlaceholder: 'How do you want to work with communities, organizations, and local knowledge holders?',
        communityLabel: 'Who you can support',
        communityPlaceholder: 'Which organizations, initiatives, or causes can benefit from your knowledge or services?',
        problemLabel: 'Challenges you can help solve',
        problemPlaceholder: 'What types of questions, bottlenecks, or organizational needs can you help with?',
        solutionLabel: 'Services, volunteering, or forum leadership',
        solutionPlaceholder: 'Share what you can offer: consulting, legal, design, strategy, fundraising, tech, facilitation, or forum leadership.',
        methodsPlaceholder: 'Consulting, design, legal, finance, fundraising, facilitation, technology, research, moderation...',
        publicPrompt: 'Open to volunteering, paid services, forum leadership, or community support?',
        publicPlaceholder: 'Example: volunteer 3 hours/month, paid strategy sessions, can lead a fundraising forum, open to peer advice.',
        sizeLabel: 'Availability / service model',
        sizeOptions: ['Volunteer only', 'Volunteer + paid services', 'Paid services', 'Mentoring / office hours', 'Forum leadership'],
        fundingLabel: 'Preferred engagement',
        budgetLabel: 'Rates / pro-bono policy',
        guidanceTitle: 'For a professional profile, we collect',
        guidanceItems: [
            'Professional title, field, services, and what you can offer',
            'Whether you volunteer, offer paid services, lead forums, or ask for peer support',
            'Availability, service model, causes, SDGs, and geography',
            'Public links, profile image, contact preference, and review status'
        ]
    }
};

window.registrationProfileFields = registrationProfileFields;

// Opportunities are read live from glowe_opportunities (FR-GLOWE-007 AC1);
// created ones appear after a server reload, so display is the live store.
function getAllOpportunitiesForDisplay() {
    return [...opportunities];
}

function readJsonStore(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
        return fallback;
    }
}

function writeJsonStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function filterOpportunityCatalog(opportunityList, filters) {
    return opportunityList.filter(opp => {
        const haystack = `${opp.title} ${opp.description} ${opp.organization} ${(opp.skills || []).join(' ')}`.toLowerCase();
        if (filters.location && filters.location !== 'all' && !opp.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
        if (filters.field && filters.field !== 'all' && opp.field !== filters.field) return false;
        if (filters.commitment && filters.commitment !== 'all' && opp.commitment.toLowerCase() !== filters.commitment.toLowerCase()) return false;
        if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
        return true;
    });
}

function commaList(value) {
    return value.split(',').map(item => item.trim()).filter(Boolean);
}

function getPersonalProfile() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const registeredProfile = typeof buildPersonalProfileFromRegistration === 'function'
        ? buildPersonalProfileFromRegistration(user || {})
        : {};
    const fallback = {
        id: 'demo-personal-profile',
        name: user ? user.name : 'GloWe Member',
        email: user ? user.email : 'member@glowe.community',
        type: user ? (user.profileTypeLabel || (user.type === 'organization' ? 'Organization Representative' : 'Volunteer / Professional')) : 'Volunteer / Professional',
        focus: 'Community collaboration',
        about: 'Using the GloWe space to connect knowledge, skills, projects, and practical opportunities for social impact.',
        needs: 'Looking for relevant collaborations, volunteers, knowledge sharing, and clear next steps.',
        location: 'Remote / Israel',
        languages: ['English', 'Hebrew'],
        availability: 'Flexible',
        skills: ['Community building', 'Project coordination', 'Knowledge sharing']
    };

    try {
        return { ...fallback, ...registeredProfile, ...JSON.parse(localStorage.getItem(PERSONAL_PROFILE_KEY) || '{}') };
    } catch (error) {
        return { ...fallback, ...registeredProfile };
    }
}

function savePersonalProfile(profile) {
    localStorage.setItem(PERSONAL_PROFILE_KEY, JSON.stringify({ ...getPersonalProfile(), ...profile }));
}

// FR-GLOWE-011 AC1 — whether a real profile snapshot has already been cached
// (written by a prior fetchProfile). getPersonalProfile() always returns a
// merged fallback object, so this checks the raw cache key to distinguish a
// first-ever load (skeleton) from a returning user (render cached immediately).
function hasCachedPersonalProfile() {
    try {
        const raw = localStorage.getItem(PERSONAL_PROFILE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return Boolean(parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0);
    } catch (_e) {
        return false;
    }
}

// FR-GLOWE-011 AC1 — profile loading skeleton (hero variant), shown while the
// first backend profile fetch is in flight. Text-free (aria-busy), so no
// user-visible strings to localize beyond the aria-label.
function personalProfileSkeletonHero() {
    return `
        <section class="social-profile-hero is-loading" id="personal-profile" aria-busy="true" aria-label="Loading your profile…">
            <div class="social-cover"></div>
            <div class="social-profile-body">
                <div class="social-profile-head">
                    <div class="skeleton skeleton-avatar social-avatar"></div>
                    <div class="social-profile-copy">
                        <div class="skeleton skeleton-line skeleton-line-sm"></div>
                        <div class="skeleton skeleton-line skeleton-line-lg"></div>
                        <div class="skeleton skeleton-line"></div>
                    </div>
                </div>
            </div>
        </section>`;
}

function getPersonalProjects() {
    const defaults = [
        {
            id: 'demo-project-1',
            title: 'Community Resource Map',
            status: 'Draft',
            description: 'A practical map of local organizations, volunteers, and available support channels.'
        }
    ];

    try {
        const saved = JSON.parse(localStorage.getItem(PERSONAL_PROJECTS_KEY) || '[]');
        return saved.length ? saved : defaults;
    } catch (error) {
        return defaults;
    }
}

function savePersonalProject(project) {
    const projects = getPersonalProjects().filter(item => item.id !== project.id);
    localStorage.setItem(PERSONAL_PROJECTS_KEY, JSON.stringify([{ id: `project-${Date.now()}`, ...project }, ...projects]));
}

// Offline/guest delete: drop a project from the localStorage cache by id.
function removePersonalProjectLocal(id) {
    const remaining = getPersonalProjects().filter(item => String(item.id) !== String(id));
    localStorage.setItem(PERSONAL_PROJECTS_KEY, JSON.stringify(remaining));
}

// FR-GLOWE-011 AC4 — live Personal Area projects. `backendPersonalProjects`
// stays null until a load completes; the view getter then prefers it (even when
// empty) over the localStorage/demo fallback (see personalProjectsView).
let backendPersonalProjects = null;

async function loadPersonalProjects() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    let rows = [];
    try { rows = await backend.listOwned('projects'); } catch (_e) { rows = []; }
    backendPersonalProjects = helpers ? helpers.mapProjects(rows || []) : (rows || []);
    // Mirror to the offline cache (TD-134) so a later offline render still works.
    try {
        if (backendPersonalProjects.length) {
            localStorage.setItem(PERSONAL_PROJECTS_KEY, JSON.stringify(backendPersonalProjects));
        }
    } catch (_e) { /* storage full or unavailable — cache is best-effort */ }
}

function getPersonalProjectsForView() {
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    return helpers
        ? helpers.personalProjectsView(backendPersonalProjects, getPersonalProjects())
        : (Array.isArray(backendPersonalProjects) ? backendPersonalProjects : getPersonalProjects());
}

// FR-GLOWE-011 AC5 — live "My Needs" list. `backendMyWishes` stays null until a
// load completes; the view getter returns it once loaded (there is no local
// wish cache, so the fallback is simply an empty list).
let backendMyWishes = null;

async function loadMyWishes() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    const orgs = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const wishesApi = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
    if (!orgs || !wishesApi) return;
    let rows = [];
    try { rows = await backend.listOwned('posts'); } catch (_e) { rows = []; }
    backendMyWishes = orgs.myWishPosts(rows || []).map(row => wishesApi.mapWishRow(row, gloweLocaleTag()));
}

function getMyWishesForView() {
    return Array.isArray(backendMyWishes) ? backendMyWishes : [];
}

// Render the compact "My Needs" list for the Personal Area (mapped wish rows).
function renderMyNeedsList(list) {
    if (!Array.isArray(list) || !list.length) {
        return '<p class="muted-note">No needs yet. Share what would help on the Wishing Well.</p>';
    }
    return list.map(function (wish) {
        const time = wish.time ? `<span class="muted-note">${escapeHtml(wish.time)}</span>` : '';
        return `
            <article class="personal-need-card">
                <span class="post-type-tag">${escapeHtml(wish.type || 'Open Call')}</span>
                <h3>${escapeHtml(wish.title || '')}</h3>
                <p>${escapeHtml(wish.description || '')}</p>
                ${time}
            </article>
        `;
    }).join('');
}

// FR-GLOWE-011 AC6 — live "My Posts" list. `backendMyPosts` stays null until a
// load completes; the view getter returns it once loaded. There is no local
// authored-post cache, so the fallback is simply an empty list.
let backendMyPosts = null;

async function loadMyPosts() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    const postsApi = (typeof GlowePosts !== 'undefined') ? GlowePosts : null;
    if (!postsApi) return;
    let rows = [];
    try { rows = await backend.listOwned('posts'); } catch (_e) { rows = []; }
    backendMyPosts = postsApi.mapCommunityRows(rows || []);
}

function getMyPostsForView() {
    return Array.isArray(backendMyPosts) ? backendMyPosts : [];
}

// Render the compact "My Posts" list for the Personal Area (mapped community
// post rows). Mirrors renderMyNeedsList; empty state prompts a first post.
function renderMyPostsList(list) {
    if (!Array.isArray(list) || !list.length) {
        return '<p class="muted-note">No posts yet. Share an update with the community.</p>';
    }
    return list.map(function (post) {
        const category = post.category
            ? `<span class="post-type-tag">${escapeHtml(post.category)}</span>`
            : '';
        return `
            <article class="personal-post-card">
                ${category}
                <h3>${escapeHtml(post.title || '')}</h3>
                <p>${escapeHtml(post.text || '')}</p>
            </article>
        `;
    }).join('');
}

// FR-GLOWE-011 AC7 — live "My Opportunities" list. `backendMyOpportunities`
// stays null until a load completes; the getter returns it once loaded. There
// is no local authored-opportunity cache, so the fallback is an empty list.
let backendMyOpportunities = null;

async function loadMyOpportunities() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    const orgs = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    if (!orgs) return;
    let rows = [];
    try { rows = await backend.listOwned('opportunities'); } catch (_e) { rows = []; }
    backendMyOpportunities = orgs.mapOwnedOpportunities(rows || []);
}

function getMyOpportunitiesForView() {
    return Array.isArray(backendMyOpportunities) ? backendMyOpportunities : [];
}

// Render the compact "My Opportunities" list for the Personal Area (authored
// opportunities). Mirrors renderMyPostsList; empty state prompts a first post.
function renderMyOpportunitiesList(list) {
    if (!Array.isArray(list) || !list.length) {
        return '<p class="muted-note">No opportunities yet. Publish one on the Volunteer Network.</p>';
    }
    return list.map(function (opp) {
        const tag = opp.field || opp.commitment;
        const tagHtml = tag ? `<span class="post-type-tag">${escapeHtml(tag)}</span>` : '';
        const location = opp.location ? `<span class="muted-note">${escapeHtml(opp.location)}</span>` : '';
        return `
            <article class="personal-opportunity-card">
                ${tagHtml}
                <h3>${escapeHtml(opp.title || '')}</h3>
                ${location}
            </article>
        `;
    }).join('');
}

// FR-GLOWE-011 AC9 — live "My Offers" list. Offers (glowe_offers) target other
// users' wish posts, so each offer is enriched with the wish's title looked up
// from the public posts list. `backendMyOffers` stays null until a load
// completes; the getter returns [] until then (no local authored-offer cache).
let backendMyOffers = null;

async function loadMyOffers() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    const orgs = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    if (!orgs) return;
    let rows = [];
    let posts = [];
    try { rows = await backend.listOwned('offers'); } catch (_e) { rows = []; }
    try { posts = await backend.listAll('posts'); } catch (_e) { posts = []; }
    backendMyOffers = orgs.mapOwnedOffers(rows || [], orgs.postTitlesById(posts || []));
}

function getMyOffersForView() {
    return Array.isArray(backendMyOffers) ? backendMyOffers : [];
}

// GloWe shares KC's follow graph (see backend.js kcFollowCounts) — no separate
// GloWe follow system. null until the load completes; the getter falls back to
// zeros so the stats grid never shows "undefined".
let personalFollowCounts = null;

async function loadFollowCounts() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    try { personalFollowCounts = await backend.kcFollowCounts(); } catch (_e) { personalFollowCounts = null; }
}

function getFollowCountsForView() {
    return personalFollowCounts || { followers: 0, following: 0 };
}

// Follow UI lives in glowe-follow-ui.js (FR-GLOWE-026) — thin delegates keep app.js lean.
function resolveFollowButtonHtml(targetId) {
    return window.GloweFollowUI
        ? window.GloweFollowUI.resolveFollowButtonHtml(targetId)
        : Promise.resolve('');
}
function handleFollowToggle(targetId) {
    if (window.GloweFollowUI) window.GloweFollowUI.handleFollowToggle(targetId);
}
window.handleFollowToggle = handleFollowToggle;
function hydrateFollowSlots(root) {
    return window.GloweFollowUI
        ? window.GloweFollowUI.hydrateFollowSlots(root)
        : Promise.resolve();
}
function profileFollowStatsHtml(profileId) {
    return window.GloweFollowUI ? window.GloweFollowUI.profileFollowStatsHtml(profileId) : '';
}
function personalFollowStatsHtml(profileId, followCounts) {
    return window.GloweFollowUI
        ? window.GloweFollowUI.personalFollowStatsHtml(profileId, followCounts)
        : '';
}
function loadProfilePublicFollowCounts(profileId, container) {
    if (window.GloweFollowUI) window.GloweFollowUI.loadProfilePublicFollowCounts(profileId, container);
}

// Render the compact "My Offers" list for the Personal Area (offers the user
// made on other people's wishes). Empty state points back to the wish board.
function renderMyOffersList(list) {
    if (!Array.isArray(list) || !list.length) {
        return '<p class="muted-note">No offers yet. Help someone by responding to a wish.</p>';
    }
    return list.map(function (offer) {
        const title = offer.wishTitle ? `<h3>${escapeHtml(offer.wishTitle)}</h3>` : '';
        const avail = offer.availability ? `<span class="muted-note">${escapeHtml(offer.availability)}</span>` : '';
        return `
            <article class="personal-offer-card">
                ${title}
                <p>${escapeHtml(offer.offerText || '')}</p>
                ${avail}
            </article>
        `;
    }).join('');
}

// FR-GLOWE-011 AC8 — live "My Applications" list. Applications the user sent to
// volunteer opportunities load from glowe_applications and are enriched with the
// target opportunity's title/organization. Event RSVPs (whose opportunity has a
// start time) are excluded here — they render in the separate "My Events"
// section. `backendMyApplications` stays null until a load completes; the getter
// returns null until then so the render can fall back to the localStorage cache.
let backendMyApplications = null;

async function loadMyApplications() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    const orgs = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const events = (typeof GloweEvents !== 'undefined') ? GloweEvents : null;
    if (!orgs) return;
    let rows = [];
    let opps = [];
    try { rows = await backend.listOwned('applications'); } catch (_e) { rows = []; }
    try { opps = await backend.listAll('opportunities'); } catch (_e) { opps = []; }
    const byId = orgs.opportunitiesById(opps || []);
    backendMyApplications = orgs.volunteerApplicationViews(rows || [], byId, events && events.isEvent);
}

function getMyApplicationsForView() {
    return Array.isArray(backendMyApplications) ? backendMyApplications : null;
}

function canUseBackend() {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

async function apiRequest(path, options = {}) {
    if (!canUseBackend()) return null;
    if (window.gloweBackend && window.gloweBackend.configured()) {
        try {
            const supabaseResult = await window.gloweBackend.apiRequest(path, options);
            if (supabaseResult !== null && supabaseResult !== undefined) return supabaseResult;
        } catch (error) {
            console.warn('Supabase request failed; using local fallback when possible.', error);
        }
    }
    try {
        const response = await fetch(path, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function syncPersonalDataFromBackend() {
    const [profile, projects, savedItems] = await Promise.all([
        apiRequest('/api/profile'),
        apiRequest('/api/projects'),
        window.gloweBackend && window.gloweBackend.configured()
            ? window.gloweBackend.listOwned('saved_items').catch(() => null)
            : Promise.resolve(null)
    ]);
    if (profile) {
        localStorage.setItem(PERSONAL_PROFILE_KEY, JSON.stringify(profile));
        await backfillPersonalProfileEnglishName(profile);
    }
    if (Array.isArray(projects) && projects.length) localStorage.setItem(PERSONAL_PROJECTS_KEY, JSON.stringify(projects));
    if (Array.isArray(savedItems) && savedItems.length) {
        localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(savedItems.map(item => ({
            type: item.item_type,
            id: item.item_id,
            title: item.title,
            meta: item.meta,
            href: item.href,
            savedAt: item.created_at
        }))));
    }
    return Boolean(profile || projects || savedItems);
}

// FR-GLOWE-011 AC2 — persist the Edit-Profile draft. The whole draft (all
// fields, not just onboarding) is optimistically cached, then upserted via
// gloweBackend.upsertProfile (PUT /api/profile). On success the backend returns
// the canonical persisted row (fromProfileRow — every raw_profile field spread
// back); we refresh the cache from it so the Personal Area re-renders from
// server truth rather than the optimistic draft. Returns the saved profile.
async function persistPersonalProfile(profile) {
    savePersonalProfile(profile);
    const saved = await apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ ...getPersonalProfile(), ...profile })
    });
    if (saved && typeof saved === 'object') {
        savePersonalProfile(saved);
    }
    return saved;
}

// Normalize a project into its backend payload, falling back to the raw object
// when the organizations helper module is unavailable (guest/offline).
function buildProjectBackendPayload(project) {
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    return helpers ? helpers.buildProjectPayload(project) : project;
}

// FR-GLOWE-011 AC4 (write) — persist a new project. When signed in against a
// live backend, insert via insertOwned('projects', …) and refresh the live
// list; otherwise fall back to the localStorage/demo cache (guest/offline).
async function persistPersonalProject(project) {
    const payload = buildProjectBackendPayload(project);
    const backend = window.gloweBackend;
    if (backend && backend.configured() && isLoggedIn()) {
        try {
            await backend.insertOwned('projects', payload);
            await loadPersonalProjects();
            return;
        } catch (_e) { /* fall through to the offline cache */ }
    }
    savePersonalProject(payload);
}

// FR-GLOWE-011 AC4 (write) — delete an owned project. Backend delete is
// user-scoped (removeOwned enforces user_id + RLS); offline path prunes the
// cache. Re-renders the Personal Area after either path.
async function deletePersonalProject(id) {
    if (!id) return;
    const backend = window.gloweBackend;
    if (backend && backend.configured() && isLoggedIn()) {
        try {
            await backend.removeOwned('projects', { id });
            await loadPersonalProjects();
        } catch (_e) { removePersonalProjectLocal(id); }
    } else {
        removePersonalProjectLocal(id);
    }
    if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
}

// FR-GLOWE-011 AC4 (edit) — in-place update of an owned project. Backend update
// is user-scoped (updateOwned enforces id + user_id + RLS); offline path patches
// the localStorage cache. Mirrors persistPersonalProject's signed-in/offline split.
async function updatePersonalProject(id, project) {
    if (!id) return;
    const payload = buildProjectBackendPayload(project);
    const backend = window.gloweBackend;
    if (backend && backend.configured() && isLoggedIn()) {
        try {
            await backend.updateOwned('projects', id, payload);
            await loadPersonalProjects();
            return;
        } catch (_e) { /* fall through to the offline cache */ }
    }
    updatePersonalProjectLocal(id, payload);
}

// Offline/guest edit: replace a project's fields in the localStorage cache by id.
function updatePersonalProjectLocal(id, patch) {
    const projects = getPersonalProjects().map(item => (
        String(item.id) === String(id) ? { ...item, ...patch, id: item.id } : item
    ));
    localStorage.setItem(PERSONAL_PROJECTS_KEY, JSON.stringify(projects));
}

async function uploadProfileImageToCloudinary(file) {
    const signature = await apiRequest('/api/cloudinary/signature', { method: 'POST', body: JSON.stringify({}) });
    if (!signature || !signature.configured) {
        throw new Error(signature && signature.message ? signature.message : 'Cloudinary is not configured yet.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', signature.timestamp);
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Cloudinary upload failed.');
    const payload = await response.json();
    return payload.secure_url;
}

// FR-GLOWE-011 AC3 — resolve a profile-image upload to a URL. Prefers Supabase
// Storage (`gloweBackend.uploadAvatar` → `glowe-avatars` bucket) when signed in
// against a configured backend; falls back to Cloudinary otherwise (guest /
// unconfigured). The caller validates type + size before calling this.
async function uploadProfileImage(file) {
    const backend = window.gloweBackend;
    if (backend && backend.configured() && isLoggedIn()) {
        const url = await backend.uploadAvatar(file);
        if (url) return url;
    }
    return uploadProfileImageToCloudinary(file);
}

async function uploadCoverImage(file) {
    const backend = window.gloweBackend;
    if (backend && backend.configured() && isLoggedIn() && typeof backend.uploadCover === 'function') {
        const url = await backend.uploadCover(file);
        if (url) return url;
    }
    return uploadProfileImageToCloudinary(file);
}

function profileCoverImageUrl(profile) {
    if (!profile) return '';
    return profile.coverImageUrl || profile.cover_image_url || '';
}

function profileCoverStyleAttr(profile) {
    const url = profileCoverImageUrl(profile);
    if (!url) return '';
    const safeUrl = String(url).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return ` style="--profile-cover-image: url('${safeUrl}')"`;
}

function renderSocialCover(profile, options = {}) {
    const editable = Boolean(options && options.editable);
    const extraClass = (options && options.extraClass) || '';
    const hasCover = Boolean(profileCoverImageUrl(profile));
    const classNames = [
        options && options.band ? 'profile-cover-band' : 'social-cover',
        hasCover ? 'has-cover-image' : '',
        extraClass
    ].filter(Boolean).join(' ');
    const styleAttr = profileCoverStyleAttr(profile);
    if (!editable) {
        return `<div class="${classNames}"${styleAttr}></div>`;
    }
    const cameraIcon = (typeof GloweProfileUx !== 'undefined') ? GloweProfileUx.CAMERA_ICON_SVG : '';
    return `
        <div class="social-cover-wrap">
            <div class="${classNames}"${styleAttr}></div>
            <button type="button" class="social-cover-change" aria-label="Change cover photo" title="Change cover photo" onclick="openCoverEditModal()">${cameraIcon}</button>
        </div>`;
}

function refreshOwnedProfileViews() {
    if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
    if (document.getElementById('profile-content') && typeof initProfilePage === 'function') {
        initProfilePage();
    }
}

function renderPersonalAvatar(profile, className = 'profile-avatar') {
    const displayName = localizedProfileDisplayName(profile);
    if (profile.avatarUrl) {
        return `<img class="${className} profile-avatar-img" src="${profile.avatarUrl}" alt="${escapeHtml(displayName)}">`;
    }
    const pair = profileNamePairFrom(profile);
    return renderLocalizedEntityMark(pair.primary, pair.english, displayName, className);
}

function renderProfileValue(value, emptyText = 'Not added yet') {
    if (Array.isArray(value)) return value.length ? value.map(escapeHtml).join(', ') : emptyText;
    return value ? escapeHtml(value) : emptyText;
}

function renderProfileLinkList(value) {
    const links = String(value || '')
        .split(/\n|,/)
        .map(link => link.trim())
        .filter(Boolean);
    if (!links.length) return '<span>Not added yet</span>';
    return links.map(link => {
        const href = /^https?:\/\//i.test(link) ? link : `https://${link}`;
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(link)}</a>`;
    }).join('<br>');
}

function renderQuestionnaireProfile(profile) {
    const typeConfig = registrationProfileFields[profile.profileType] || Object.values(registrationProfileFields).find(config => config.label === profile.type) || registrationProfileFields.ngo;
    const publicLink = profile.publicLink
        ? `<a href="${escapeHtml(/^https?:\/\//i.test(profile.publicLink) ? profile.publicLink : `https://${profile.publicLink}`)}" target="_blank" rel="noopener">${escapeHtml(profile.publicLink)}</a>`
        : 'Not added yet';
    const rows = [
        { label: 'Full name', value: profile.name },
        { label: 'Title / role', value: profile.title },
        { label: 'Organization name', value: profile.organizationName },
        { label: 'Profile type', value: profile.type },
        { label: 'Email verified', value: profile.emailVerified ? 'Yes' : 'Pending' },
        { label: 'Country / region', value: profile.country },
        { label: 'Public link', value: publicLink, raw: true },
        { label: typeConfig.sizeLabel || 'Size / team', value: profile.availability },
        { label: typeConfig.storyLabel || 'Mission / story', value: profile.story || profile.about },
        { label: typeConfig.valuesLabel || 'Values and goals', value: profile.values },
        { label: typeConfig.communityLabel || 'Community / audience', value: profile.community },
        { label: typeConfig.problemLabel || 'Problem addressed', value: profile.problem },
        { label: typeConfig.solutionLabel || 'Solution or method', value: profile.solution },
        { label: 'Interest areas', value: profile.interests || profile.skills },
        { label: 'SDGs', value: profile.sdgs },
        { label: 'Methods / approaches', value: profile.methods },
        { label: 'Public line', value: profile.shortLine },
        { label: 'Geographic activity', value: profile.location },
        { label: typeConfig.publicPrompt || 'Open actions', value: profile.publicActions || profile.needs },
        { label: typeConfig.fundingLabel || 'Funding / support sources', value: profile.funding },
        { label: typeConfig.budgetLabel || 'Annual budget / support context', value: profile.annualBudget }
    ];

    return rows.map(({ label, value, raw }) => `
        <p>
            <strong>${escapeHtml(label)}</strong>
            <span>${raw ? value : renderProfileValue(value)}</span>
        </p>
    `).join('');
}

function getProfileTypeConfig(profile = {}) {
    const normalizedType = String(profile.profileType || profile.type || '').toLowerCase();
    if (normalizedType.includes('business') || normalizedType.includes('company')) return registrationProfileFields.business;
    if (normalizedType.includes('professional') || normalizedType.includes('service')) return registrationProfileFields.professional;
    if (normalizedType.includes('initiative') || normalizedType.includes('project')) return registrationProfileFields.initiative;
    if (normalizedType.includes('volunteer') || normalizedType.includes('activist')) return registrationProfileFields.volunteer;
    if (normalizedType.includes('ngo') || normalizedType.includes('nonprofit') || normalizedType.includes('organization')) return registrationProfileFields.ngo;
    return registrationProfileFields[profile.profileType]
        || Object.values(registrationProfileFields).find(config => config.label === profile.type)
        || registrationProfileFields.ngo;
}

function checkboxGroup(name, options, className = 'choice-grid') {
    return `
        <div class="${className}">
            ${options.map(option => `
                <label class="choice-card">
                    <input type="checkbox" name="${name}" value="${option}">
                    <span>${option}</span>
                </label>
            `).join('')}
        </div>
    `;
}

function renderRegistrationWizard() {
    // Google-only auth: email/password registration is intentionally hidden.
    // The multi-step profile wizard is deferred — profile details are completed
    // after the user signs in with Google. See FR-GLOWE-001 / DECISIONS D-61.
    return `
        <span class="close-modal" onclick="closeModal('register-modal')">&times;</span>
        <div class="auth-google-only">
            <div class="wizard-heading">
                <span class="profile-type">Join GloWe</span>
                <h2>Join the GloWe Community</h2>
                <p>Sign in with your Google account to get started. You can complete your profile after signing in.</p>
            </div>
            <button class="btn btn-primary btn-block google-auth-btn" type="button" onclick="handleGoogleSignIn()">
                <span aria-hidden="true">G</span>
                Continue with Google
            </button>
            <p class="modal-footer-text">Already have an account? <a href="#" onclick="switchModal('register-modal', 'login-modal')">Log in</a></p>
        </div>
    `;
}

function renderRegistrationWizardLegacy() {
    const profileOptions = Object.entries(registrationProfileFields).map(([value, config]) => `
        <label class="profile-type-card">
            <input type="radio" name="type" value="${value}" ${value === 'ngo' ? 'required' : ''}>
            <span>
                <strong>${config.label}</strong>
                <small>${config.cardDescription}</small>
            </span>
        </label>
    `).join('');

    return `
        <span class="close-modal" onclick="closeModal('register-modal')">&times;</span>
        <div class="registration-wizard">
            <div class="wizard-heading">
                <span class="profile-type">Profile onboarding</span>
                <h2>Join the GloWe Community</h2>
                <p>Build a useful profile step by step. You can save a draft now and complete more details later.</p>
            </div>
            <button class="btn btn-outline google-auth-btn" type="button" onclick="handleGoogleSignIn()">
                <span aria-hidden="true">G</span>
                Continue with Google
            </button>
            <div class="wizard-progress" aria-label="Registration progress">
                <span class="active" data-step-dot="1">Account</span>
                <span data-step-dot="2">Profile</span>
                <span data-step-dot="3">Story</span>
                <span data-step-dot="4">Impact</span>
                <span data-step-dot="5">Public</span>
                <span data-step-dot="6">Trust</span>
            </div>
            <form id="register-form" class="wizard-form" onsubmit="handleRegister(event)">
                <section class="wizard-step active" data-register-step="1">
                    <h3>Basic account</h3>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="register-first-name">First name *</label>
                            <input id="register-first-name" name="firstName" required placeholder="Your first name">
                        </div>
                        <div class="form-group">
                            <label for="register-last-name">Last name *</label>
                            <input id="register-last-name" name="lastName" required placeholder="Your last name">
                        </div>
                        <div class="form-group">
                            <label for="register-title">Title / role *</label>
                            <input id="register-title" name="title" required placeholder="Founder, volunteer, project lead, designer...">
                        </div>
                        <div class="form-group">
                            <label for="register-organization-name">Organization name</label>
                            <input id="register-organization-name" name="organizationName" placeholder="If you are joining on behalf of one">
                        </div>
                        <div class="form-group">
                            <label for="register-country">Country *</label>
                            <input id="register-country" name="country" required placeholder="Country / region">
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email *</label>
                            <input id="register-email" name="email" type="email" required placeholder="hello@example.org">
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password *</label>
                            <input id="register-password" name="password" type="password" required minlength="8" placeholder="Minimum 8 characters">
                        </div>
                        <div class="form-group">
                            <label for="register-password-confirm">Confirm password *</label>
                            <input id="register-password-confirm" name="passwordConfirm" type="password" required minlength="8" placeholder="Repeat your password">
                        </div>
                        <div class="form-group email-code-group">
                            <label for="register-email-code">Email verification code *</label>
                            <div class="inline-field-action">
                                <input id="register-email-code" name="emailCode" required inputmode="numeric" placeholder="6-digit code">
                                <button class="btn btn-outline btn-small" type="button" onclick="sendRegistrationEmailCode()">Send code</button>
                            </div>
                            <small id="register-email-code-help">For this MVP, the code is shown on screen and stored locally.</small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="register-public-link">Website / LinkedIn / Facebook</label>
                        <input id="register-public-link" name="publicLink" placeholder="A public link that helps us understand who you are">
                    </div>
                </section>

                <section class="wizard-step" data-register-step="2">
                    <h3>Profile type</h3>
                    <p class="modal-intro">Choose the profile that best describes you. This changes the questions and future profile layout.</p>
                    <div class="profile-type-grid">${profileOptions}</div>
                    <div class="profile-type-guidance" id="register-profile-guidance" aria-live="polite"></div>
                    <div class="form-group">
                        <label for="register-size" id="register-size-label">Size / team</label>
                        <select id="register-size" name="size">
                            <option value="">Choose if relevant</option>
                            <option>1 person</option>
                            <option>2-5 people</option>
                            <option>6-20 people</option>
                            <option>20+ people</option>
                        </select>
                    </div>
                </section>

                <section class="wizard-step" data-register-step="3">
                    <h3>Story and purpose</h3>
                    <div class="form-group">
                        <label for="register-story" id="register-story-label">Organization mission *</label>
                        <textarea id="register-story" name="story" rows="4" required placeholder="What do you do, who do you serve, and why?"></textarea>
                    </div>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="register-values" id="register-values-label">Values and goals *</label>
                            <textarea id="register-values" name="values" rows="4" required placeholder="Values, goals, leadership, or principles"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="register-community" id="register-community-label">Community / audience *</label>
                            <textarea id="register-community" name="community" rows="4" required placeholder="Who do you serve, support, work with, or hope to reach?"></textarea>
                        </div>
                    </div>
                </section>

                <section class="wizard-step" data-register-step="4">
                    <h3>Impact, interests and methods</h3>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="register-problem" id="register-problem-label">Problem you address *</label>
                            <textarea id="register-problem" name="problem" rows="4" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="register-solution" id="register-solution-label">Solution or method *</label>
                            <textarea id="register-solution" name="solution" rows="4" required></textarea>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Main interest areas *</label>
                        ${checkboxGroup('interests', registrationInterests)}
                    </div>
                    <div class="form-group">
                        <label>Relevant SDGs</label>
                        ${checkboxGroup('sdgs', registrationSdgs, 'choice-grid compact-choice-grid')}
                    </div>
                    <div class="form-group">
                        <label for="register-methods">Methods / approaches</label>
                        <input id="register-methods" name="methods" placeholder="Advocacy, education, field work, tech, research, community organizing...">
                    </div>
                </section>

                <section class="wizard-step" data-register-step="5">
                    <h3>Public profile and media</h3>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="register-short-line">Short public line *</label>
                            <input id="register-short-line" name="shortLine" required placeholder="Example: UX designer supporting education and community tech">
                        </div>
                        <div class="form-group">
                            <label for="register-location">Geographic activity *</label>
                            <input id="register-location" name="location" required placeholder="Local / regional / global / remote">
                        </div>
                    </div>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="register-socials">Social links</label>
                            <textarea id="register-socials" name="socials" rows="3" placeholder="Facebook, LinkedIn, Instagram, YouTube..."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="register-media">Articles / videos / reports</label>
                            <textarea id="register-media" name="media" rows="3" placeholder="Up to 3 useful public links"></textarea>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="register-logo">Logo or profile image</label>
                        <input id="register-logo" name="logo" type="file" accept="image/*">
                    </div>
                </section>

                <section class="wizard-step" data-register-step="6">
                    <h3>Trust, contact and review</h3>
                    <div class="form-group">
                        <label for="register-public-actions" id="register-public-actions-label">Public actions</label>
                        <textarea id="register-public-actions" name="publicActions" rows="3" placeholder="Open to volunteers, contact, donations, partnerships, products, events..."></textarea>
                    </div>
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label for="register-funding" id="register-funding-label">Funding / support sources</label>
                            <input id="register-funding" name="funding" placeholder="Optional, internal classification">
                        </div>
                        <div class="form-group">
                            <label for="register-annual-budget" id="register-annual-budget-label">Annual budget</label>
                            <input id="register-annual-budget" name="annualBudget" placeholder="Optional. Helps match relevant support.">
                        </div>
                        <div class="form-group">
                            <label for="register-review-status">Profile status</label>
                            <select id="register-review-status" name="reviewStatus">
                                <option>Save as draft</option>
                                <option>Submit for review</option>
                            </select>
                        </div>
                    </div>
                    <label class="option-row">
                        <input id="register-community-guidelines" type="checkbox" required>
                        I agree to keep GloWe professional, respectful, transparent, and aligned with human rights.
                    </label>
                </section>

                <div class="wizard-actions">
                    <button class="btn btn-outline" type="button" data-register-prev>Back</button>
                    <button class="btn btn-primary" type="button" data-register-next>Next</button>
                    <button class="btn btn-primary" type="submit" data-register-submit>Create Account</button>
                </div>
            </form>
            <p class="modal-footer-text">Already have an account? <a href="#" onclick="switchModal('register-modal', 'login-modal')">Log in</a></p>
        </div>
    `;
}

function normalizeMainNavigation() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '' : 'pages/';
    const homeHref = inPages ? '../index.html' : 'index.html';
    const signedIn = typeof isLoggedIn === 'function' && isLoggedIn();
    const profilePages = ['my-applications', 'connections', 'saved', 'settings'];
    // Home stays in the top nav for every session — parity with the mobile
    // bottom-nav Home tab. Profile appears in the desktop header only when signed in.
    const links = [
        { label: 'Home', href: homeHref, match: 'index' },
        { label: 'Wishing Well', href: `${prefix}wishing-well.html`, match: 'wishing-well' },
        { label: 'Organizations', href: `${prefix}organizations.html`, match: 'organizations' },
        { label: 'Community', href: `${prefix}community.html`, match: 'community' }
    ];
    if (signedIn) {
        links.push({
            label: 'Profile',
            href: `${prefix}my-applications.html`,
            match: 'profile',
            pages: profilePages
        });
    }
    links.push({ label: 'About', href: `${prefix}about.html`, match: 'about' });
    const page = resolveGlowePage(window.location.pathname);
    nav.innerHTML = links.map(link => {
        const active = page === link.match
            || (Array.isArray(link.pages) && link.pages.includes(page))
            || (link.match === 'about' && page === 'whats-next')
            || (link.match === 'community' && (page === 'forums' || page === 'discussion-group'))
            || (link.match === 'wishing-well' && (page === 'volunteer-network' || page === 'opportunities' || page === 'opportunity'));
        return `<a href="${link.href}" class="nav-link${active ? ' active' : ''}"${active ? ' aria-current="page"' : ''}>${link.label}</a>`;
    }).join('');
}
window.normalizeMainNavigation = normalizeMainNavigation;

function ensureHeaderEnd() {
    const headerContainer = document.querySelector('.main-header .container');
    if (!headerContainer) return null;
    let headerEnd = headerContainer.querySelector('.header-end');
    if (!headerEnd) {
        headerEnd = document.createElement('div');
        headerEnd.className = 'header-end';
        headerContainer.appendChild(headerEnd);
    }
    return headerEnd;
}

function ensureLogoBrand() {
    const logo = document.querySelector('.main-header .logo');
    if (!logo) return;
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '' : 'pages/';
    let brand = logo.querySelector('.logo-brand');
    if (!brand) {
        const logoText = logo.querySelector('.logo-text');
        brand = document.createElement('div');
        brand.className = 'logo-brand';
        if (logoText) {
            brand.appendChild(logoText);
        } else {
            brand.innerHTML = '<span class="logo-text">GloWe</span>';
        }
        logo.appendChild(brand);
    }
    let greeting = brand.querySelector('.logo-user-greeting');
    if (!greeting) {
        greeting = document.createElement('a');
        greeting.className = 'logo-user-greeting';
        greeting.href = `${prefix}my-applications.html`;
        greeting.hidden = true;
        greeting.innerHTML = 'Hi, <span id="user-name">there</span>';
        brand.appendChild(greeting);
    } else {
        greeting.href = `${prefix}my-applications.html`;
    }
}

window.ensureLogoBrand = ensureLogoBrand;

function normalizeHeaderUserMenu() {
    const headerContainer = document.querySelector('.main-header .container');
    if (!headerContainer) return;

    const headerEnd = ensureHeaderEnd();
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '' : 'pages/';
    let userMenu = headerEnd.querySelector('.user-menu') || headerContainer.querySelector('.user-menu');
    if (!userMenu) {
        userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
    }
    if (userMenu.parentElement !== headerEnd) {
        headerEnd.appendChild(userMenu);
    }
    userMenu.style.display = 'none';
    // Personal Area is reached via this greeting link (and the mobile Profile
    // tab). Top nav always keeps Home — it no longer swaps away when signed in.
    const chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
    const gearIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
    userMenu.innerHTML = `
        <button class="btn btn-primary btn-small header-create-btn" type="button" onclick="openCreateMenu()">+ Create</button>
        <div class="header-corner-actions">
            <a class="header-icon-btn" href="${prefix}messages.html" aria-label="Messages" title="Messages">${chatIcon}</a>
            <a class="header-icon-btn" href="${prefix}settings.html" aria-label="Settings" title="Settings">${gearIcon}</a>
        </div>
    `;
}

async function applyAdminLink() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured() || typeof backend.isGloweAdmin !== 'function') return;
    const isAdmin = await backend.isGloweAdmin();
    const userMenu = document.querySelector('.user-menu');
    if (!userMenu) return;
    const existing = userMenu.querySelector('.glowe-admin-link');
    if (existing) existing.remove();
    if (!isAdmin) return;
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '' : 'pages/';
    const shieldSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
    const corner = userMenu.querySelector('.header-corner-actions') || userMenu;
    const link = document.createElement('a');
    link.className = 'header-icon-btn glowe-admin-link';
    link.href = `${prefix}admin.html`;
    link.title = 'Admin review';
    link.setAttribute('aria-label', 'Admin review');
    link.innerHTML = shieldSvg;
    corner.appendChild(link);
}
window.applyAdminLink = applyAdminLink;

function normalizeHeaderAuthButtons() {
    const headerContainer = document.querySelector('.main-header .container');
    if (!headerContainer) return;
    const headerEnd = ensureHeaderEnd();
    let authButtons = headerEnd.querySelector('.auth-buttons') || headerContainer.querySelector('.auth-buttons');
    if (!authButtons) {
        authButtons = document.createElement('div');
        authButtons.className = 'auth-buttons';
    }
    if (authButtons.parentElement !== headerEnd) {
        headerEnd.appendChild(authButtons);
    }
    const localDev = window.GloweDevAuth
        && (window.GloweDevAuth.isActive() || window.GloweDevAuth.isLocalSupabaseConfigured());
    const signInLabel = localDev ? 'Dev sign in' : 'Sign up / Sign in';
    authButtons.innerHTML = `
        <button class="btn btn-primary btn-small" type="button" onclick="handleGoogleSignIn()">${signInLabel}</button>
    `;
}

function ensureGlobalFooter() {
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '' : 'pages/';
    const homeHref = inPages ? '../index.html' : 'index.html';
    const currentYear = new Date().getFullYear();
    const footerHtml = `
        <div class="container">
            <div class="footer-grid">
                <div class="footer-section">
                    <h4>GloWe</h4>
                    <p>Bridging local solutions to global challenges through shared knowledge, solidarity, and practical action.</p>
                </div>
                <div class="footer-section">
                    <h4>Explore</h4>
                    <a href="${homeHref}">Home</a>
                    <a href="${prefix}wishing-well.html">Wishing Well</a>
                    <a href="${prefix}organizations.html">Organizations</a>
                    <a href="${prefix}community.html">Community</a>
                    <a href="${prefix}forums.html">Forums</a>
                    <a href="${prefix}about.html">About</a>
                </div>
                <div class="footer-section">
                    <h4>Participate</h4>
                    <a href="${prefix}my-applications.html">Personal Area</a>
                    <a href="${prefix}community.html#community-composer">Write a post</a>
                    <a href="${prefix}volunteer-network.html">Volunteer Network</a>
                    <a href="${prefix}whats-next.html">What's next</a>
                </div>
                <div class="footer-section">
                    <h4>Built With Care</h4>
                    <p>An MVP by the GloWe community, with product and implementation support by Topaz.</p>
                    <a href="${prefix}terms.html">Terms & Community Charter</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>${currentYear} GloWe. Built for shared knowledge, mutual support, and action that lasts.</p>
                <p class="footer-build" translate="no">${footerBuildLabel()}</p>
            </div>
        </div>
    `;

    let footer = document.querySelector('.main-footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'main-footer';
        document.body.appendChild(footer);
    }
    footer.innerHTML = footerHtml;
}

/** App-wide semver from glowe-version.js (FR-GLOWE-025). */
function footerBuildLabel() {
    const version = window.GloweAppVersion && window.GloweAppVersion.version;
    if (typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version)) {
        return `v${version}`;
    }
    return 'v0.0.0-local';
}

// A bottom-nav tab also lights up for its sibling pages (community covers the
// forums cluster; wishes covers the volunteering cluster).
function bottomNavActive(page, match) {
    if (page === match) return true;
    if (match === 'community') return ['forums', 'discussion-group', 'organizations'].includes(page);
    if (match === 'wishing-well') return ['volunteer-network', 'opportunities', 'opportunity'].includes(page);
    return false;
}

function ensureBottomNavigation() {
    if (document.querySelector('.mobile-bottom-nav')) return;
    
    const inPages = window.location.pathname.includes('/pages/');
    const prefix = inPages ? '' : 'pages/';
    const homeHref = inPages ? '../index.html' : 'index.html';
    const page = resolveGlowePage(window.location.pathname);

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';

    const links = [
        {
            label: 'Home',
            href: homeHref,
            match: 'index',
            iconOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
            iconFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path></svg>'
        },
        { 
            label: 'Wishes',
            href: `${prefix}wishing-well.html`,
            match: 'wishing-well',
            iconOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
            iconFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>'
        },
        { 
            label: 'Community',
            href: `${prefix}community.html`,
            match: 'community',
            iconOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
            iconFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path></svg>'
        },
        { 
            label: 'Profile',
            href: `${prefix}my-applications.html`,
            match: 'my-applications',
            iconOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
            iconFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>'
        }
    ];

    const linkHtml = (link) => {
        const active = bottomNavActive(page, link.match);
        const icon = active ? link.iconFilled : link.iconOutline;
        return `
            <a href="${link.href}" class="bottom-nav-link${active ? ' active' : ''}"${active ? ' aria-current="page"' : ''}>
                <span class="nav-icon">${icon}</span>
                <span class="nav-label">${link.label}</span>
            </a>
        `;
    };

    // FR-GLOWE-016 AC3 — the "+" create FAB sits at the center of the bottom
    // nav; the menu it opens adapts to the viewer's account type.
    const createFab = `
        <button type="button" class="bottom-nav-create" aria-label="Create" onclick="openCreateMenu()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
    `;
    nav.innerHTML = links.slice(0, 2).map(linkHtml).join('') + createFab + links.slice(2).map(linkHtml).join('');

    document.body.appendChild(nav);
}

function ensureGlobalUI() {
    ensureLogoBrand();
    normalizeHeaderAuthButtons();
    normalizeHeaderUserMenu();
    ensureGlobalFooter();
    ensureBottomNavigation();
    bindHomeSelfNavGuard();

    if (!document.getElementById('login-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="login-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('login-modal')">&times;</span>
                    <h2>Welcome Back</h2>
                    <p class="modal-intro">Sign in with your Google account to continue.</p>
                    <button type="button" class="btn btn-primary btn-block google-auth-btn" onclick="handleGoogleSignIn()">
                        <span aria-hidden="true">G</span>
                        Continue with Google
                    </button>
                    <p class="modal-footer-text">Don't have an account? <a href="#" onclick="switchModal('login-modal', 'register-modal')">Join our community</a></p>
                </div>
            </div>
        `);
    }
    upgradeLoginModal();

    if (!document.getElementById('register-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="register-modal" class="modal">
                <div class="modal-content">
                    ${renderRegistrationWizard()}
                </div>
            </div>
        `);
    }
    upgradeRegistrationModal();

    if (!document.getElementById('success-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="success-modal" class="modal">
                <div class="modal-content modal-success">
                    <span class="success-icon">GloWe</span>
                    <h2 id="success-title">Success</h2>
                    <p id="success-message">Your action was completed successfully.</p>
                    <button class="btn btn-primary" onclick="closeModal('success-modal')">Continue</button>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('wish-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="wish-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('wish-modal')">&times;</span>
                    <h2>Share a Wish</h2>
                    <p class="modal-intro">A good wish is specific enough for the right helper to say yes.</p>
                    <form onsubmit="handleWishSubmit(event)">
                        <div class="form-group">
                            <label for="wish-title">What do you need?</label>
                            <input type="text" id="wish-title" required placeholder="Mentors, space, visibility...">
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label for="wish-type">Wish type</label>
                                <select id="wish-type" required>
                                    <option value="">Select a type</option>
                                    <option>Volunteers Needed</option>
                                    <option>Partnership Opportunity</option>
                                    <option>Looking for Mentors</option>
                                    <option>Funding Support</option>
                                    <option>Equipment / Space</option>
                                    <option>Visibility / Media</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="wish-impact-area">Impact area</label>
                                <select id="wish-impact-area" required>
                                    <option value="">Select an area</option>
                                    <option>Education</option>
                                    <option>Climate</option>
                                    <option>Social Justice</option>
                                    <option>Tech for Good</option>
                                    <option>Community Building</option>
                                    <option>Health</option>
                                    <option>Food Security</option>
                                    <option>Knowledge Sharing</option>
                                    <option>Civic Innovation</option>
                                    <option>Business-Social Collaboration</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="wish-location-input">Location (optional)</label>
                            <input type="text" id="wish-location-input" placeholder="City, region, remote, or hybrid">
                        </div>
                        <div class="form-group">
                            <label for="wish-details">Short description</label>
                            <textarea id="wish-details" rows="4" required placeholder="Tell the community what would help."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="wish-success">What would success look like?</label>
                            <textarea id="wish-success" rows="3" required placeholder="Example: 3 mentors matched, one grant draft completed, 50 families reached..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Publish Wish</button>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('connect-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="connect-modal" class="modal">
                <div class="modal-content modal-wide">
                    <span class="close-modal" onclick="closeModal('connect-modal')">&times;</span>
                    <h2>Offer Support</h2>
                    <p class="modal-intro" id="connect-context">Send a clear, trusted offer so the organization can decide quickly.</p>
                    <form onsubmit="handleConnectSubmit(event)">
                        <div class="support-summary" id="support-summary"></div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label for="support-type">What can you offer?</label>
                                <select id="support-type" required>
                                    <option value="">Choose support type</option>
                                    <option>Professional volunteering</option>
                                    <option>Mentoring</option>
                                    <option>Funding or grant help</option>
                                    <option>Space or equipment</option>
                                    <option>Business partnership</option>
                                    <option>Media or distribution</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="support-availability">Availability</label>
                                <select id="support-availability" required>
                                    <option value="">Choose availability</option>
                                    <option>This week</option>
                                    <option>Within 2 weeks</option>
                                    <option>This month</option>
                                    <option>Flexible</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="connect-message">Message</label>
                            <textarea id="connect-message" rows="4" required placeholder="Briefly explain your relevant experience, what you can offer, and what you need to know next."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="connect-contact">Preferred contact</label>
                            <select id="connect-contact">
                                <option>In-app message</option>
                                <option>Email</option>
                                <option>Phone</option>
                            </select>
                        </div>
                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">Send Offer</button>
                            <button type="button" class="btn btn-outline" onclick="handleQuickConnect()">Save Draft</button>
                        </div>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('reach-out-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="reach-out-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('reach-out-modal')">&times;</span>
                    <h2>Reach Out</h2>
                    <p class="modal-intro" id="reach-out-context">Send a short message to start a conversation with this organization.</p>
                    <form onsubmit="handleReachOutSubmit(event)">
                        <div class="form-group">
                            <label for="reach-out-message">Message</label>
                            <textarea id="reach-out-message" rows="4" required placeholder="Introduce yourself and explain how you would like to collaborate."></textarea>
                        </div>
                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">Send Message</button>
                            <button type="button" class="btn btn-outline" onclick="closeModal('reach-out-modal')">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('onboarding-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="onboarding-modal" class="modal">
                <div class="modal-content modal-wide">
                    <span class="close-modal" onclick="closeModal('onboarding-modal')">&times;</span>
                    <h2>Find your GloWe path</h2>
                    <p class="modal-intro">Choose the path that matches what you want to do first.</p>
                    <div class="path-grid">
                        <button type="button" onclick="choosePath('organization')">
                            <strong>I represent an organization</strong>
                            <span>Create a profile, post a need, and receive structured offers.</span>
                        </button>
                        <button type="button" onclick="choosePath('volunteer')">
                            <strong>I can help</strong>
                            <span>Find wishes that match your skills, language, location, and time.</span>
                        </button>
                        <button type="button" onclick="choosePath('business')">
                            <strong>I am a business partner</strong>
                            <span>Match CSR teams, logistics, funding, or services with verified needs.</span>
                        </button>
                    </div>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('connection-workspace-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="connection-workspace-modal" class="modal">
                <div class="modal-content modal-wide" id="connection-workspace-content"></div>
            </div>
        `);
    }

    if (!document.getElementById('edit-profile-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="edit-profile-modal" class="modal">
                <div class="modal-content modal-wide">
                    <span class="close-modal" onclick="closeModal('edit-profile-modal')">&times;</span>
                    <h2>Edit profile</h2>
                    <p class="modal-intro">Update the public information that helps others understand who you are and how to collaborate.</p>
                    <form onsubmit="handleProfileEdit(event)">
                        <div id="edit-profile-fields-individual">
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-name">Display name</label>
                                    <input id="edit-profile-name" type="text" required placeholder="Your name">
                                </div>
                                <div class="form-group">
                                    <label for="edit-profile-name-en">Name in English (optional)</label>
                                    <input id="edit-profile-name-en" type="text" placeholder="Latin / English display name">
                                    <small>Generated automatically — change if you like</small>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-profile-about">Bio</label>
                                <textarea id="edit-profile-about" rows="4" placeholder="A few words about you and what you're working on"></textarea>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-focus">Interest areas</label>
                                    <input id="edit-profile-focus" type="text" placeholder="Education, health, climate...">
                                </div>
                                <div class="form-group">
                                    <label for="edit-profile-country">Country / region</label>
                                    <input id="edit-profile-country" type="text" placeholder="Country / region">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-profile-public-link">Website / public link</label>
                                <input id="edit-profile-public-link" type="url" placeholder="https://...">
                            </div>
                        </div>
                        <div id="edit-profile-fields-organization" hidden>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-org-name">Organization name</label>
                                    <input id="edit-profile-org-name" type="text" placeholder="Organization name">
                                </div>
                                <div class="form-group">
                                    <label for="edit-profile-org-name-en">Organization name in English (optional)</label>
                                    <input id="edit-profile-org-name-en" type="text" placeholder="Organization name in English">
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-org-field">Field / sector</label>
                                    <input id="edit-profile-org-field" type="text" placeholder="Education, health, environment...">
                                </div>
                                <div class="form-group">
                                    <label for="edit-profile-org-country">Country</label>
                                    <input id="edit-profile-org-country" type="text" placeholder="Country">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-profile-org-description">Description</label>
                                <textarea id="edit-profile-org-description" rows="4" placeholder="What does your organization do?"></textarea>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-org-website">Website</label>
                                    <input id="edit-profile-org-website" type="url" placeholder="https://...">
                                </div>
                                <div class="form-group">
                                    <label for="edit-profile-org-size">Size (optional)</label>
                                    <input id="edit-profile-org-size" type="text" placeholder="e.g. 1-10, 11-50">
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-org-contact-name">Contact name</label>
                                    <input id="edit-profile-org-contact-name" type="text" placeholder="Contact person">
                                </div>
                                <div class="form-group">
                                    <label for="edit-profile-org-contact-email">Contact email</label>
                                    <input id="edit-profile-org-contact-email" type="email" placeholder="email@example.com">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="edit-profile-org-contact-phone">Contact phone (optional)</label>
                                <input id="edit-profile-org-contact-phone" type="tel" placeholder="+972...">
                            </div>
                        </div>
                        <button class="btn btn-primary btn-block" type="submit">Save profile</button>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('avatar-edit-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="avatar-edit-modal" class="modal">
                <div class="modal-content avatar-edit-modal-content">
                    <span class="close-modal" onclick="closeAvatarEditModal()">&times;</span>
                    <h2>Change profile photo</h2>
                    <div class="avatar-edit-preview-wrap">
                        <img id="avatar-edit-preview" class="avatar-edit-preview" alt="" hidden>
                    </div>
                    <input type="file" id="avatar-edit-file" accept="image/*" hidden onchange="handleAvatarEditFileChange(event)">
                    <small id="avatar-edit-status"></small>
                    <div class="modal-actions avatar-edit-actions">
                        <button type="button" class="btn btn-outline" onclick="triggerAvatarEditReplace()">Replace</button>
                        <button type="button" class="btn btn-outline" onclick="handleAvatarEditRemove()">Remove photo</button>
                        <button type="button" class="btn btn-primary" id="avatar-edit-save-btn" onclick="handleAvatarEditSave()">Save photo</button>
                        <button type="button" class="btn btn-outline" onclick="closeAvatarEditModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('cover-edit-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="cover-edit-modal" class="modal">
                <div class="modal-content cover-edit-modal-content">
                    <span class="close-modal" onclick="closeCoverEditModal()">&times;</span>
                    <h2>Change cover photo</h2>
                    <div class="cover-edit-preview-wrap">
                        <div id="cover-edit-preview" class="cover-edit-preview" hidden></div>
                    </div>
                    <input type="file" id="cover-edit-file" accept="image/*" hidden onchange="handleCoverEditFileChange(event)">
                    <small id="cover-edit-status"></small>
                    <div class="modal-actions cover-edit-actions">
                        <button type="button" class="btn btn-outline" onclick="triggerCoverEditReplace()">Replace</button>
                        <button type="button" class="btn btn-outline" onclick="handleCoverEditRemove()">Remove cover</button>
                        <button type="button" class="btn btn-primary" id="cover-edit-save-btn" onclick="handleCoverEditSave()">Save cover</button>
                        <button type="button" class="btn btn-outline" onclick="closeCoverEditModal()">Cancel</button>
                    </div>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('glowe-onboarding-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="glowe-onboarding-modal" class="modal">
                <div class="modal-content modal-wide">
                    <span class="close-modal" onclick="dismissGloweOnboarding()">&times;</span>
                    <h2>Welcome to GloWe 👋</h2>
                    <p class="modal-intro">Tell us a little about you so the community knows who they're collaborating with. It only takes a minute.</p>
                    <form id="glowe-onboarding-form" onsubmit="handleGloweOnboarding(event)">
                        <div class="form-group">
                            <label for="onboarding-display-name">Your name</label>
                            <input id="onboarding-display-name" type="text" required placeholder="Full name">
                        </div>
                        <div class="form-group">
                            <label for="onboarding-display-name-en">Name in English (optional)</label>
                            <input id="onboarding-display-name-en" type="text" placeholder="Latin / English name — auto-filled if left blank">
                        </div>
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label for="onboarding-country">Country / region</label>
                                <input id="onboarding-country" type="text" placeholder="Country / region">
                            </div>
                            <div class="form-group">
                                <label for="onboarding-about">A short line about you</label>
                                <input id="onboarding-about" type="text" placeholder="One sentence people grasp quickly">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>I'm joining as</label>
                            <div class="onboarding-type-choice">
                                <label class="onboarding-type-card">
                                    <input type="radio" name="onboarding-account-type" value="individual" checked onchange="toggleOnboardingOrgFields()">
                                    <span class="onboarding-type-title">Private individual</span>
                                    <span class="onboarding-type-desc">Volunteer, donor, or community member. Full access right away.</span>
                                </label>
                                <label class="onboarding-type-card">
                                    <input type="radio" name="onboarding-account-type" value="organization" onchange="toggleOnboardingOrgFields()">
                                    <span class="onboarding-type-title">Organization</span>
                                    <span class="onboarding-type-desc">NGO, nonprofit, or initiative. Reviewed before you can publish — only serious applications are accepted.</span>
                                </label>
                            </div>
                        </div>
                        <div id="onboarding-org-fields" hidden>
                            <p class="onboarding-review-note">Organizations are reviewed by the GloWe team. Until you're approved you can browse everything, but posting opportunities, events, and needs stays locked. Please give us enough to take your application seriously.</p>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="onboarding-org-name">Organization name *</label>
                                    <input id="onboarding-org-name" type="text" placeholder="Registered / public name">
                                </div>
                                <div class="form-group">
                                    <label for="onboarding-org-name-en">Organization name in English (optional)</label>
                                    <input id="onboarding-org-name-en" type="text" placeholder="English org name — auto-filled if blank">
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="onboarding-org-registration">Registration / NGO number</label>
                                    <input id="onboarding-org-registration" type="text" placeholder="Legal registration number">
                                </div>
                                <div class="form-group">
                                    <label for="onboarding-org-website">Website / public link</label>
                                    <input id="onboarding-org-website" type="url" placeholder="https://...">
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="onboarding-org-country">Country of operation</label>
                                    <input id="onboarding-org-country" type="text" placeholder="Where you operate">
                                </div>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="onboarding-org-field">Cause / field</label>
                                    <input id="onboarding-org-field" type="text" placeholder="Education, health, climate...">
                                </div>
                                <div class="form-group">
                                    <label for="onboarding-org-size">Organization size</label>
                                    <input id="onboarding-org-size" type="text" placeholder="Volunteers / staff, approx.">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="onboarding-org-description">About the organization *</label>
                                <textarea id="onboarding-org-description" rows="4" placeholder="Mission, who you serve, and what you'd do on GloWe."></textarea>
                            </div>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="onboarding-org-contact-name">Contact person *</label>
                                    <input id="onboarding-org-contact-name" type="text" placeholder="Who we should talk to">
                                </div>
                                <div class="form-group">
                                    <label for="onboarding-org-contact-email">Contact email *</label>
                                    <input id="onboarding-org-contact-email" type="email" placeholder="name@org.org">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="onboarding-org-contact-phone">Contact phone</label>
                                <input id="onboarding-org-contact-phone" type="tel" placeholder="Optional">
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-primary" type="submit" id="onboarding-submit">Save and continue</button>
                            <button class="btn btn-outline" type="button" onclick="dismissGloweOnboarding()">Maybe later</button>
                        </div>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('add-project-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="add-project-modal" class="modal">
                <div class="modal-content modal-wide">
                    <span class="close-modal" onclick="closeModal('add-project-modal')">&times;</span>
                    <h2 id="personal-project-modal-title">Add project</h2>
                    <p class="modal-intro">Add a project that can appear in your personal area and help others understand what you are building.</p>
                    <form onsubmit="handlePersonalProjectSubmit(event)">
                        <input type="hidden" id="personal-project-id" value="">
                        <div class="form-grid-2">
                            <div class="form-group">
                                <label for="personal-project-title">Project title</label>
                                <input id="personal-project-title" required placeholder="Community resource map">
                            </div>
                            <div class="form-group">
                                <label for="personal-project-status">Status</label>
                                <select id="personal-project-status" required>
                                    <option value="Draft">Draft</option>
                                    <option value="Active">Active</option>
                                    <option value="Recruiting partners">Recruiting partners</option>
                                    <option value="Needs volunteers">Needs volunteers</option>
                                    <option value="Ready to share">Ready to share</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="personal-project-description">Description</label>
                            <textarea id="personal-project-description" rows="4" required placeholder="What is the project, who does it support, and what kind of help would move it forward?"></textarea>
                        </div>
                        <button id="personal-project-submit-btn" class="btn btn-primary btn-block" type="submit">Save Project</button>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('wish-detail-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="wish-detail-modal" class="modal">
                <div class="modal-content modal-wide" id="wish-detail-content"></div>
            </div>
        `);
    }

    if (!document.getElementById('report-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="report-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('report-modal')">&times;</span>
                    <h2>Report a concern</h2>
                    <p class="modal-intro">We review every report carefully and confidentially to keep GloWe safe and professional.</p>
                    <form onsubmit="handleReportSubmit(event)">
                        <input id="report-target-type" type="hidden" value="general">
                        <input id="report-target-id" type="hidden" value="site">
                        <input id="report-target-title" type="hidden" value="General concern">
                        <div class="report-target-box">
                            <span>Reporting</span>
                            <strong id="report-target-label">General concern</strong>
                        </div>
                        <div class="form-group">
                            <label for="report-reason">What should we look at?</label>
                            <select id="report-reason" required>
                                <option value="">Choose a reason</option>
                                <option value="spam">Spam or misleading promotion</option>
                                <option value="harassment">Harassment or hate</option>
                                <option value="misinformation">False or misleading information</option>
                                <option value="inappropriate_content">Inappropriate content</option>
                                <option value="fake_profile">Fake profile or impersonation</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="report-details">Details</label>
                            <textarea id="report-details" rows="4" placeholder="Add context that can help our review."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Submit Report</button>
                    </form>
                </div>
            </div>
        `);
    }

    if (!document.getElementById('notification-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="notification-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('notification-modal')">&times;</span>
                    <h2>Notification Preferences</h2>
                    <p class="modal-intro">Choose a rhythm that keeps GloWe useful without creating digital fatigue.</p>
                    <form onsubmit="handleNotificationPrefs(event)">
                        <label class="option-row"><input type="checkbox" checked> Opportunity of the week</label>
                        <label class="option-row"><input type="checkbox" checked> High-match connection proposals</label>
                        <label class="option-row"><input type="checkbox"> Deadline reminders</label>
                        <label class="option-row"><input type="checkbox" checked> Crisis-response playbooks for my region</label>
                        <div class="form-group">
                            <label for="cadence">Preferred cadence</label>
                            <select id="cadence">
                                <option>Weekly digest</option>
                                <option>Only urgent actions</option>
                                <option>Daily 5-minute brief</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Save Preferences</button>
                    </form>
                </div>
            </div>
        `);
    }

    document.querySelectorAll('.auth-buttons button').forEach(button => {
        const label = button.textContent.trim().toLowerCase();
        if (!button.getAttribute('onclick') && (label.includes('log') || label.includes('join') || label.includes('sign'))) {
            button.setAttribute('onclick', 'handleGoogleSignIn()');
        }
    });

    if (!document.body.dataset.globalClickHandler) {
        document.body.dataset.globalClickHandler = 'true';
        document.body.addEventListener('click', function(event) {
            const link = event.target.closest('a[href="#"]');
            if (!link) return;
            const text = link.textContent.trim().toLowerCase();
            if (text.includes('register') || text.includes('join')) {
                event.preventDefault();
                handleGoogleSignIn();
            } else if (text.includes('post') || text.includes('opportunity')) {
                event.preventDefault();
                openWishModal();
            } else if (text.includes('log')) {
                event.preventDefault();
                handleGoogleSignIn();
            }
        });
    }

    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
}

function upgradeRegistrationModal() {
    const modal = document.getElementById('register-modal');
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    if (!content || content.dataset.registrationWizard === 'true') return;
    content.classList.add('modal-wide', 'registration-modal-content');
    content.innerHTML = renderRegistrationWizard();
    content.dataset.registrationWizard = 'true';
    initRegistrationWizard(content);
}

// Google-only auth: overwrite any static email/password login modal (present in
// the original GloWe page templates) with a single "Continue with Google" CTA,
// so every page shows the same Google-only flow. See FR-GLOWE-001 / D-61.
function upgradeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (!modal) return;
    const content = modal.querySelector('.modal-content');
    if (!content) return;

    if (window.GloweDevAuth && (window.GloweDevAuth.isActive() || window.GloweDevAuth.isLocalSupabaseConfigured())) {
        if (content.dataset.googleOnly === 'local-dev') {
            if (typeof window.bindLocalDevPersonaButtons === 'function') {
                window.bindLocalDevPersonaButtons(content);
            }
            return;
        }
        content.innerHTML = window.GloweDevAuth.loginModalHtml();
        content.dataset.googleOnly = 'local-dev';
        if (typeof window.bindLocalDevPersonaButtons === 'function') {
            window.bindLocalDevPersonaButtons(content);
        }
        return;
    }

    if (content.dataset.googleOnly === 'true') return;
    content.innerHTML = `
        <span class="close-modal" onclick="closeModal('login-modal')">&times;</span>
        <h2>Welcome Back!</h2>
        <p class="modal-intro">Sign in with your Google account to continue.</p>
        <button type="button" class="btn btn-primary btn-block google-auth-btn" onclick="handleGoogleSignIn()">
            <span aria-hidden="true">G</span>
            Continue with Google
        </button>
        <p class="modal-footer-text">Don't have an account? <a href="#" onclick="switchModal('login-modal', 'register-modal')">Join our community</a></p>
    `;
    content.dataset.googleOnly = 'true';
}

function initRegistrationWizard(root = document) {
    const form = root.querySelector('#register-form');
    if (!form || form.dataset.wizardReady === 'true') return;
    form.dataset.wizardReady = 'true';
    let step = 1;
    const totalSteps = form.querySelectorAll('[data-register-step]').length;
    const next = form.querySelector('[data-register-next]');
    const prev = form.querySelector('[data-register-prev]');
    const typeInputs = form.querySelectorAll('input[name="type"]');

    function showStep(nextStep) {
        step = Math.max(1, Math.min(totalSteps, nextStep));
        form.querySelectorAll('[data-register-step]').forEach(section => {
            section.classList.toggle('active', Number(section.dataset.registerStep) === step);
        });
        root.querySelectorAll('[data-step-dot]').forEach(dot => {
            dot.classList.toggle('active', Number(dot.dataset.stepDot) <= step);
        });
        prev.style.display = step === 1 ? 'none' : 'inline-flex';
        next.style.display = step === totalSteps ? 'none' : 'inline-flex';
        form.querySelector('[data-register-submit]').style.display = step === totalSteps ? 'inline-flex' : 'none';
    }

    function validateCurrentStep() {
        const active = form.querySelector(`[data-register-step="${step}"]`);
        const fields = [...active.querySelectorAll('input, select, textarea')];
        const validFields = fields.every(field => field.reportValidity());
        if (!validFields) return false;
        if (step === 4 && !form.querySelector('input[name="interests"]:checked')) {
            alert('Please choose at least one main interest area.');
            return false;
        }
        return true;
    }

    function applyProfileType() {
        const selected = form.querySelector('input[name="type"]:checked');
        const config = selected ? registrationProfileFields[selected.value] : registrationProfileFields.ngo;
        if (!config) return;
        const guidance = form.querySelector('#register-profile-guidance');
        if (guidance) {
            guidance.innerHTML = `
                <strong>${config.guidanceTitle}</strong>
                <ul>${(config.guidanceItems || []).map(item => `<li>${item}</li>`).join('')}</ul>
            `;
        }
        form.querySelector('#register-story-label').textContent = `${config.storyLabel} *`;
        form.querySelector('#register-story').placeholder = config.storyPlaceholder;
        form.querySelector('#register-values-label').textContent = `${config.valuesLabel} *`;
        form.querySelector('#register-values').placeholder = config.valuesPlaceholder;
        form.querySelector('#register-community-label').textContent = `${config.communityLabel} *`;
        form.querySelector('#register-community').placeholder = config.communityPlaceholder;
        form.querySelector('#register-problem-label').textContent = `${config.problemLabel} *`;
        form.querySelector('#register-problem').placeholder = config.problemPlaceholder;
        form.querySelector('#register-solution-label').textContent = `${config.solutionLabel} *`;
        form.querySelector('#register-solution').placeholder = config.solutionPlaceholder;
        form.querySelector('#register-methods').placeholder = config.methodsPlaceholder;
        form.querySelector('#register-public-actions-label').textContent = config.publicPrompt;
        form.querySelector('#register-public-actions').placeholder = config.publicPlaceholder;
        form.querySelector('#register-size-label').textContent = config.sizeLabel;
        const sizeSelect = form.querySelector('#register-size');
        if (sizeSelect && Array.isArray(config.sizeOptions)) {
            const currentValue = sizeSelect.value;
            sizeSelect.innerHTML = `<option value="">Choose if relevant</option>${config.sizeOptions.map(option => `<option>${option}</option>`).join('')}`;
            if (config.sizeOptions.includes(currentValue)) {
                sizeSelect.value = currentValue;
            }
        }
        form.querySelector('#register-funding-label').textContent = config.fundingLabel;
        const annualBudgetLabel = form.querySelector('#register-annual-budget-label');
        const annualBudgetInput = form.querySelector('#register-annual-budget');
        if (annualBudgetLabel && annualBudgetInput) {
            annualBudgetLabel.textContent = config.budgetLabel || (selected && selected.value === 'ngo' ? 'Annual budget' : 'Budget / support context');
            annualBudgetInput.placeholder = selected && selected.value === 'ngo'
                ? 'Example: under $50k, $50k-$250k, $250k+, or prefer not to say'
                : 'Optional. Share only what helps the community understand your context.';
        }
    }

    next.addEventListener('click', () => {
        if (validateCurrentStep()) showStep(step + 1);
    });
    prev.addEventListener('click', () => showStep(step - 1));
    typeInputs.forEach(input => input.addEventListener('change', applyProfileType));
    applyProfileType();
    showStep(1);
}

function collectChecked(form, name) {
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
}

function openWishModal() {
    ensureGlobalUI();
    openModal('wish-modal');
}

function openOnboardingModal() {
    ensureGlobalUI();
    openModal('onboarding-modal');
}

function renderProfileStatusChipHtml(chip) {
    if (!chip) return '';
    const klass = `profile-status-cta profile-status-cta--${chip.kind}`;
    const label = escapeHtml(chip.label);
    if (chip.action === 'none') {
        return `<span class="${klass}" aria-disabled="true">${label}</span>`;
    }
    return `<button type="button" class="${klass}" onclick="handleProfileStatusChipClick('${chip.action}')">${label}</button>`;
}

function handleProfileStatusChipClick(action) {
    if (action === 'edit') {
        openEditProfile();
        return;
    }
    if (action !== 'onboarding') return;
    openGloweOnboarding(getPersonalProfile());
}

async function openEditProfile(profileName = '') {
    ensureGlobalUI();
    let profile = getPersonalProfile();
    if (typeof GloweLocalizedName !== 'undefined'
        && GloweLocalizedName.profileNeedsEnglishName(profile)) {
        profile = await backfillPersonalProfileEnglishName(profile) || profile;
    }
    const isOrg = profile.accountType === 'organization';
    const individualPanel = document.getElementById('edit-profile-fields-individual');
    const orgPanel = document.getElementById('edit-profile-fields-organization');
    if (individualPanel) individualPanel.hidden = isOrg;
    if (orgPanel) orgPanel.hidden = !isOrg;

    const nameEl = document.getElementById('edit-profile-name');
    const orgNameEl = document.getElementById('edit-profile-org-name');
    if (nameEl) nameEl.required = !isOrg;
    if (orgNameEl) orgNameEl.required = isOrg;

    if (isOrg) {
        if (orgNameEl) orgNameEl.value = profileName || profile.orgName || profile.name || '';
        const orgNameEnEl = document.getElementById('edit-profile-org-name-en');
        if (orgNameEnEl) orgNameEnEl.value = profile.orgNameEn || '';
        const orgFieldEl = document.getElementById('edit-profile-org-field');
        if (orgFieldEl) orgFieldEl.value = profile.orgField || '';
        const orgDescEl = document.getElementById('edit-profile-org-description');
        if (orgDescEl) orgDescEl.value = profile.orgDescription || profile.about || '';
        const orgWebsiteEl = document.getElementById('edit-profile-org-website');
        if (orgWebsiteEl) orgWebsiteEl.value = profile.orgWebsite || '';
        const orgCountryEl = document.getElementById('edit-profile-org-country');
        if (orgCountryEl) orgCountryEl.value = profile.orgCountry || profile.country || '';
        const orgSizeEl = document.getElementById('edit-profile-org-size');
        if (orgSizeEl) orgSizeEl.value = profile.orgSize || '';
        const orgContactNameEl = document.getElementById('edit-profile-org-contact-name');
        if (orgContactNameEl) orgContactNameEl.value = profile.orgContactName || '';
        const orgContactEmailEl = document.getElementById('edit-profile-org-contact-email');
        if (orgContactEmailEl) orgContactEmailEl.value = profile.orgContactEmail || '';
        const orgContactPhoneEl = document.getElementById('edit-profile-org-contact-phone');
        if (orgContactPhoneEl) orgContactPhoneEl.value = profile.orgContactPhone || '';
    } else {
        const aboutValue = profile.about || profile.story || profile.shortLine || '';
        if (nameEl) nameEl.value = profileName || profile.name || '';
        const nameEnEl = document.getElementById('edit-profile-name-en');
        if (nameEnEl) nameEnEl.value = profile.nameEn || '';
        const aboutEl = document.getElementById('edit-profile-about');
        if (aboutEl) aboutEl.value = aboutValue;
        const focusEl = document.getElementById('edit-profile-focus');
        if (focusEl) focusEl.value = profile.focus || '';
        const countryEl = document.getElementById('edit-profile-country');
        if (countryEl) countryEl.value = profile.country || '';
        const publicLinkEl = document.getElementById('edit-profile-public-link');
        if (publicLinkEl) publicLinkEl.value = profile.publicLink || '';
    }
    openModal('edit-profile-modal');
}

let avatarEditPendingFile = null;
let avatarEditRemoveRequested = false;
let avatarEditPreviewObjectUrl = null;

function revokeAvatarEditPreviewUrl() {
    if (avatarEditPreviewObjectUrl) {
        URL.revokeObjectURL(avatarEditPreviewObjectUrl);
        avatarEditPreviewObjectUrl = null;
    }
}

function setAvatarEditStatus(message, options) {
    const status = document.getElementById('avatar-edit-status');
    if (!status) return;
    status.textContent = message || '';
    const isError = Boolean(options && options.error);
    status.classList.toggle('is-error', isError && Boolean(message));
    status.classList.toggle('is-info', !isError && Boolean(message));
}

function updateAvatarEditPreview(src) {
    const preview = document.getElementById('avatar-edit-preview');
    if (!preview) return;
    if (src) {
        preview.src = src;
        preview.hidden = false;
    } else {
        preview.removeAttribute('src');
        preview.hidden = true;
    }
}

function resetAvatarEditState() {
    avatarEditPendingFile = null;
    avatarEditRemoveRequested = false;
    revokeAvatarEditPreviewUrl();
    const input = document.getElementById('avatar-edit-file');
    if (input) input.value = '';
    setAvatarEditStatus('');
}

function closeAvatarEditModal() {
    resetAvatarEditState();
    closeModal('avatar-edit-modal');
}

function openAvatarEditModal() {
    ensureGlobalUI();
    resetAvatarEditState();
    const profile = getPersonalProfile();
    updateAvatarEditPreview(profile.avatarUrl || '');
    openModal('avatar-edit-modal');
}

function triggerAvatarEditReplace() {
    const input = document.getElementById('avatar-edit-file');
    if (input) input.click();
}

// fallow-ignore-next-line complexity
async function handleAvatarEditFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    if (orgHelpers && typeof orgHelpers.prepareAvatarUploadFile === 'function') {
        setAvatarEditStatus('Preparing photo...');
        const prepared = await orgHelpers.prepareAvatarUploadFile(file);
        if (!prepared.ok) {
            setAvatarEditStatus(prepared.error, { error: true });
            event.target.value = '';
            return;
        }
        avatarEditPendingFile = prepared.file;
        avatarEditRemoveRequested = false;
        revokeAvatarEditPreviewUrl();
        avatarEditPreviewObjectUrl = URL.createObjectURL(prepared.file);
        updateAvatarEditPreview(avatarEditPreviewObjectUrl);
        setAvatarEditStatus(
            prepared.compressed ? 'Photo optimized for upload.' : '',
            { error: false }
        );
        return;
    }
    const check = orgHelpers ? orgHelpers.validateAvatarFile(file) : { valid: true };
    if (!check.valid) {
        setAvatarEditStatus(check.error, { error: true });
        event.target.value = '';
        return;
    }
    avatarEditPendingFile = file;
    avatarEditRemoveRequested = false;
    revokeAvatarEditPreviewUrl();
    avatarEditPreviewObjectUrl = URL.createObjectURL(file);
    updateAvatarEditPreview(avatarEditPreviewObjectUrl);
    setAvatarEditStatus('');
}

function handleAvatarEditRemove() {
    avatarEditPendingFile = null;
    avatarEditRemoveRequested = true;
    revokeAvatarEditPreviewUrl();
    const input = document.getElementById('avatar-edit-file');
    if (input) input.value = '';
    updateAvatarEditPreview('');
    setAvatarEditStatus('Photo will be removed when you save.', { error: false });
}

// fallow-ignore-next-line complexity
async function handleAvatarEditSave() {
    const saveBtn = document.getElementById('avatar-edit-save-btn');
    if (saveBtn) saveBtn.disabled = true;

    try {
        if (avatarEditRemoveRequested) {
            setAvatarEditStatus('Saving...');
            await persistPersonalProfile({ avatarUrl: '' });
        } else if (avatarEditPendingFile) {
            const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
            let fileToUpload = avatarEditPendingFile;
            if (orgHelpers && typeof orgHelpers.prepareAvatarUploadFile === 'function') {
                const prepared = await orgHelpers.prepareAvatarUploadFile(avatarEditPendingFile);
                if (!prepared.ok) {
                    setAvatarEditStatus(prepared.error, { error: true });
                    return;
                }
                fileToUpload = prepared.file;
            } else {
                const check = orgHelpers ? orgHelpers.validateAvatarFile(avatarEditPendingFile) : { valid: true };
                if (!check.valid) {
                    setAvatarEditStatus(check.error, { error: true });
                    return;
                }
            }
            setAvatarEditStatus('Uploading...');
            const avatarUrl = await uploadProfileImage(fileToUpload);
            await persistPersonalProfile({ avatarUrl });
        } else {
            closeAvatarEditModal();
            return;
        }

        closeAvatarEditModal();
        refreshOwnedProfileViews();
        showToast('Profile saved');
    } catch (error) {
        setAvatarEditStatus(error.message || 'Could not save photo.', { error: true });
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

let coverEditPendingFile = null;
let coverEditRemoveRequested = false;
let coverEditPreviewObjectUrl = null;

function revokeCoverEditPreviewUrl() {
    if (coverEditPreviewObjectUrl) {
        URL.revokeObjectURL(coverEditPreviewObjectUrl);
        coverEditPreviewObjectUrl = null;
    }
}

function setCoverEditStatus(message, options) {
    const status = document.getElementById('cover-edit-status');
    if (!status) return;
    status.textContent = message || '';
    const isError = Boolean(options && options.error);
    status.classList.toggle('is-error', isError && Boolean(message));
    status.classList.toggle('is-info', !isError && Boolean(message));
}

function updateCoverEditPreview(src) {
    const preview = document.getElementById('cover-edit-preview');
    if (!preview) return;
    if (src) {
        preview.style.backgroundImage = `url('${String(src).replace(/'/g, "\\'")}')`;
        preview.hidden = false;
    } else {
        preview.style.backgroundImage = '';
        preview.hidden = true;
    }
}

function resetCoverEditState() {
    coverEditPendingFile = null;
    coverEditRemoveRequested = false;
    revokeCoverEditPreviewUrl();
    setCoverEditStatus('');
    const input = document.getElementById('cover-edit-file');
    if (input) input.value = '';
    const saveBtn = document.getElementById('cover-edit-save-btn');
    if (saveBtn) saveBtn.disabled = false;
}

function closeCoverEditModal() {
    resetCoverEditState();
    closeModal('cover-edit-modal');
}

function openCoverEditModal() {
    ensureGlobalUI();
    resetCoverEditState();
    const profile = getPersonalProfile();
    updateCoverEditPreview(profileCoverImageUrl(profile));
    openModal('cover-edit-modal');
}

function triggerCoverEditReplace() {
    const input = document.getElementById('cover-edit-file');
    if (input) input.click();
}

async function handleCoverEditFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    if (orgHelpers && typeof orgHelpers.prepareAvatarUploadFile === 'function') {
        setCoverEditStatus('Preparing photo...');
        const prepared = await orgHelpers.prepareAvatarUploadFile(file);
        if (!prepared.ok) {
            setCoverEditStatus(prepared.error, { error: true });
            event.target.value = '';
            return;
        }
        coverEditPendingFile = prepared.file;
        coverEditRemoveRequested = false;
        revokeCoverEditPreviewUrl();
        coverEditPreviewObjectUrl = URL.createObjectURL(prepared.file);
        updateCoverEditPreview(coverEditPreviewObjectUrl);
        setCoverEditStatus(
            prepared.compressed ? 'Photo optimized for upload.' : '',
            { error: false }
        );
        return;
    }
    const check = orgHelpers ? orgHelpers.validateAvatarFile(file) : { valid: true };
    if (!check.valid) {
        setCoverEditStatus(check.error, { error: true });
        event.target.value = '';
        return;
    }
    coverEditPendingFile = file;
    coverEditRemoveRequested = false;
    revokeCoverEditPreviewUrl();
    coverEditPreviewObjectUrl = URL.createObjectURL(file);
    updateCoverEditPreview(coverEditPreviewObjectUrl);
    setCoverEditStatus('');
}

function handleCoverEditRemove() {
    coverEditPendingFile = null;
    coverEditRemoveRequested = true;
    revokeCoverEditPreviewUrl();
    const input = document.getElementById('cover-edit-file');
    if (input) input.value = '';
    updateCoverEditPreview('');
    setCoverEditStatus('Cover will be removed when you save.', { error: false });
}

async function handleCoverEditSave() {
    const saveBtn = document.getElementById('cover-edit-save-btn');
    if (saveBtn) saveBtn.disabled = true;

    try {
        if (coverEditRemoveRequested) {
            setCoverEditStatus('Saving...');
            await persistPersonalProfile({ coverImageUrl: '' });
        } else if (coverEditPendingFile) {
            const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
            let fileToUpload = coverEditPendingFile;
            if (orgHelpers && typeof orgHelpers.prepareAvatarUploadFile === 'function') {
                const prepared = await orgHelpers.prepareAvatarUploadFile(coverEditPendingFile);
                if (!prepared.ok) {
                    setCoverEditStatus(prepared.error, { error: true });
                    return;
                }
                fileToUpload = prepared.file;
            } else {
                const check = orgHelpers ? orgHelpers.validateAvatarFile(coverEditPendingFile) : { valid: true };
                if (!check.valid) {
                    setCoverEditStatus(check.error, { error: true });
                    return;
                }
            }
            setCoverEditStatus('Uploading...');
            const coverImageUrl = await uploadCoverImage(fileToUpload);
            await persistPersonalProfile({ coverImageUrl });
        } else {
            closeCoverEditModal();
            return;
        }

        closeCoverEditModal();
        refreshOwnedProfileViews();
        showToast('Profile saved');
    } catch (error) {
        setCoverEditStatus(error.message || 'Could not save cover photo.', { error: true });
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function handleProfileEdit(event) {
    event.preventDefault();
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };
    const existing = getPersonalProfile();
    const isOrg = existing.accountType === 'organization';
    let profileDraft;

    if (isOrg) {
        const orgName = val('edit-profile-org-name');
        const orgDescription = val('edit-profile-org-description');
        const country = val('edit-profile-org-country');
        const orgField = val('edit-profile-org-field');
        profileDraft = {
            name: orgName || existing.name,
            orgName,
            orgNameEn: val('edit-profile-org-name-en'),
            orgField,
            orgDescription,
            about: orgDescription,
            orgWebsite: val('edit-profile-org-website'),
            country,
            orgCountry: country,
            orgSize: val('edit-profile-org-size'),
            orgContactName: val('edit-profile-org-contact-name'),
            orgContactEmail: val('edit-profile-org-contact-email'),
            orgContactPhone: val('edit-profile-org-contact-phone'),
            type: 'Organization',
            focus: orgField
        };
    } else {
        const aboutValue = val('edit-profile-about');
        profileDraft = {
            name: val('edit-profile-name'),
            nameEn: val('edit-profile-name-en'),
            about: aboutValue,
            story: aboutValue,
            shortLine: aboutValue.slice(0, 160),
            focus: val('edit-profile-focus'),
            country: val('edit-profile-country'),
            publicLink: val('edit-profile-public-link'),
            type: 'Individual'
        };
    }

    try {
        await persistPersonalProfile(profileDraft);
        closeModal('edit-profile-modal');
        if (typeof window.renderPersonalArea === 'function') {
            window.renderPersonalArea();
        }
        showToast('Profile saved');
    } catch (error) {
        showToast(error.message || 'Could not save profile.', { error: true });
    }
}

function setProjectModalMode(title, submitLabel) {
    const heading = document.getElementById('personal-project-modal-title');
    const button = document.getElementById('personal-project-submit-btn');
    if (heading) heading.textContent = title;
    if (button) button.textContent = submitLabel;
}

function openPersonalProjectModal() {
    ensureGlobalUI();
    document.getElementById('personal-project-id').value = '';
    document.getElementById('personal-project-title').value = '';
    document.getElementById('personal-project-status').value = 'Draft';
    document.getElementById('personal-project-description').value = '';
    setProjectModalMode('Add project', 'Save Project');
    openModal('add-project-modal');
}

// FR-GLOWE-011 AC4 (edit) — open the shared project modal in edit mode, pre-filled
// from the current view list (backend-preferred, localStorage fallback). The
// hidden id routes handlePersonalProjectSubmit down the update path.
function openEditPersonalProjectModal(id) {
    ensureGlobalUI();
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const projects = getPersonalProjectsForView();
    const project = helpers
        ? helpers.findProjectById(projects, id)
        : projects.find(p => String(p.id) === String(id));
    if (!project) return;
    document.getElementById('personal-project-id').value = project.id;
    document.getElementById('personal-project-title').value = project.title || '';
    const statusValue = helpers ? helpers.canonicalStatus(project.status) : project.status;
    document.getElementById('personal-project-status').value = statusValue || 'Draft';
    document.getElementById('personal-project-description').value = project.description || '';
    setProjectModalMode('Edit project', 'Update Project');
    openModal('add-project-modal');
}

async function handlePersonalProjectSubmit(event) {
    event.preventDefault();
    if (!canCreateContent()) return;
    const id = document.getElementById('personal-project-id').value;
    const draft = {
        title: document.getElementById('personal-project-title').value,
        status: document.getElementById('personal-project-status').value,
        description: document.getElementById('personal-project-description').value
    };
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const check = helpers ? helpers.validateProjectDraft(draft) : { valid: true };
    if (!check.valid) { showSuccessModal('Missing details', check.error || 'Please add a project title.'); return; }
    if (id) {
        await updatePersonalProject(id, draft);
    } else {
        await persistPersonalProject(draft);
    }
    closeModal('add-project-modal');
    if (typeof window.renderPersonalArea === 'function') {
        window.renderPersonalArea();
    }
    showActionToast(id ? 'Project updated' : 'Project added', id
        ? 'Your project changes were saved.'
        : 'The project now appears in your personal area.');
}

function choosePath(path) {
    closeModal('onboarding-modal');
    if (path === 'organization') {
        openWishModal();
        return;
    }
    if (path === 'volunteer') {
        window.location.href = window.location.pathname.includes('/pages/')
            ? 'volunteer-network.html'
            : 'pages/volunteer-network.html';
        return;
    }
    window.location.href = window.location.pathname.includes('/pages/')
        ? 'organizations.html'
        : 'pages/organizations.html';
}

// Open the "Post a Need" composer, gated by the write-permission check.
function openWishComposer() {
    ensureGlobalUI();
    if (!canCreateContent()) return;
    openModal('wish-modal');
}

async function handleWishSubmit(event) {
    event.preventDefault();
    if (!canCreateContent()) return;
    const helpers = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
    const draft = {
        title: (document.getElementById('wish-title').value || '').trim(),
        wish_type: document.getElementById('wish-type').value,
        impact_area: document.getElementById('wish-impact-area').value,
        details: document.getElementById('wish-details').value,
        success: document.getElementById('wish-success').value,
        location: document.getElementById('wish-location-input').value
    };
    const check = helpers ? helpers.validateWishDraft(draft)
        : { valid: Boolean(draft.title && draft.wish_type && draft.impact_area) };
    if (!check.valid) { showSuccessModal('Missing details', check.error || 'Please fill in the required fields.'); return; }
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Publishing...'; }
    try {
        const profile = typeof getPersonalProfile === 'function' ? getPersonalProfile() : null;
        const author = gloweCurrentAuthorNamePair();
        await backend.insertOwned('posts', {
            post_type: 'wish', status: 'open',
            title: draft.title, wish_type: draft.wish_type, impact_area: draft.impact_area,
            text: helpers ? helpers.buildWishText(draft) : (draft.details || ''),
            authorName: author.primary || (profile && profile.name) || 'GloWe Member',
            authorNameEn: author.english || null
        });
        closeModal('wish-modal');
        event.target.reset();
        showActionToast('Wish published', 'Your need is now live on the Wishing Well.');
        const onWishPage = resolveGlowePage(window.location.pathname) === 'wishing-well';
        if (onWishPage) {
            if (typeof resetWishBoardFilters === 'function') resetWishBoardFilters();
            if (reloadWishBoard) await reloadWishBoard();
        } else {
            const inPages = window.location.pathname.includes('/pages/');
            window.location.href = `${inPages ? '' : 'pages/'}wishing-well.html`;
        }
    } catch (_e) {
        showSuccessModal('Could not publish', 'Something went wrong publishing your wish. Please try again.');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Publish Wish'; }
    }
}

function showSupportModal(wishId = null) {
    ensureGlobalUI();
    activeWishForSupport = wishId ? wishes.find(item => String(item.id) === String(wishId)) : null;
    const context = document.getElementById('connect-context');
    const summary = document.getElementById('support-summary');
    const message = document.getElementById('connect-message');
    if (activeWishForSupport) {
        context.textContent = `You are offering support for: ${activeWishForSupport.title}`;
        summary.innerHTML = `
            <strong>${activeWishForSupport.author}</strong>
            <span>${activeWishForSupport.type} | ${activeWishForSupport.location}</span>
            <p>${activeWishForSupport.description}</p>
        `;
        if (message) {
            message.value = `Hi ${activeWishForSupport.author}, I can help with ${activeWishForSupport.title}. `;
        }
    } else {
        context.textContent = 'Send a clear, trusted offer so the organization can decide quickly.';
        summary.innerHTML = '';
        if (message) message.value = '';
    }
    openModal('connect-modal');
}

function readSupportOfferDraft() {
    const draft = {
        support_type: fieldValue('support-type'),
        availability: fieldValue('support-availability'),
        message: fieldValue('connect-message'),
        contact_preference: fieldValue('connect-contact') || 'In-app message'
    };
    draft.offer_text = GloweWishes.buildOfferText(draft);
    return draft;
}

// FR-GLOWE-016 AC6 — helping on a need also opens the real 1:1 KC chat with
// the need's owner, seeded with the need title + offer text.
async function openChatForActiveWish(offerText) {
    if (!activeWishForSupport.authorId) return null;
    const firstMessage = GloweMessages.buildFirstMessage('need', activeWishForSupport.title, offerText);
    return startDirectChat(activeWishForSupport.authorId, firstMessage).catch(() => null);
}

async function submitSupportOffer(form, draft) {
    try {
        await window.gloweBackend.insertOwned('offers', {
            post_id: activeWishForSupport.id,
            offer_text: draft.offer_text,
            availability: draft.availability,
            contact_preference: draft.contact_preference
        });
    } catch (_e) {
        showSuccessModal('Could not send offer', 'Something went wrong sending your offer. Please try again.');
        return;
    }
    closeModal('connect-modal');
    form.reset();
    const chatId = await openChatForActiveWish(draft.offer_text);
    if (chatId) {
        redirectToChatThread(chatId);
        return;
    }
    showActionToast('Offer sent', 'Your offer of support has been recorded. The organizer can follow up with you.');
}

async function handleConnectSubmit(event) {
    event.preventDefault();
    if (!gloweIsLoggedIn()) {
        showSuccessModal('Sign in to offer support', 'Please sign in or create a free account to send an offer to this need.');
        return;
    }
    const draft = readSupportOfferDraft();
    const check = GloweWishes.validateOfferDraft(draft);
    if (!check.valid) {
        showSuccessModal('Missing details', check.error);
        return;
    }
    if (!backendReady() || !activeWishForSupport) return;
    await submitSupportOffer(event.target, draft);
}

function handleQuickConnect() {
    closeModal('connect-modal');
    showActionToast('Draft saved', 'Your offer draft is saved in this workspace so you can return to it later.');
}

// FR-GLOWE-010 AC6 — "Reach out" contact flow. Opens a lightweight modal that,
// on submit, persists a private outreach post (post_type='outreach') addressed
// to the organization. Phase B stub for direct messaging (routes to KC DMs in C).
let activeReachOutRecipient = null;

function openReachOutModal(recipientId, recipientName) {
    ensureGlobalUI();
    activeReachOutRecipient = { id: recipientId, name: recipientName || 'this organization' };
    const context = document.getElementById('reach-out-context');
    const message = document.getElementById('reach-out-message');
    if (context) context.textContent = `Send a short message to ${activeReachOutRecipient.name} to start a conversation.`;
    if (message) message.value = '';
    openModal('reach-out-modal');
}

// FR-GLOWE-016 AC6 — "Reach out" opens a real 1:1 KC chat with the
// organization (supersedes the FR-GLOWE-014 outreach-post stub).
async function handleReachOutSubmit(event) {
    event.preventDefault();
    if (!gloweIsLoggedIn()) {
        showSuccessModal('Sign in to reach out', 'Please sign in or create a free account to message this organization.');
        return;
    }
    const message = fieldValue('reach-out-message');
    if (!activeReachOutRecipient || message.length < 2) {
        showSuccessModal('Missing details', 'Please write a short message.');
        return;
    }
    const chatId = await startDirectChat(activeReachOutRecipient.id, message).catch(() => null);
    closeModal('reach-out-modal');
    event.target.reset();
    if (chatId) {
        redirectToChatThread(chatId);
        return;
    }
    showSuccessModal('Could not send message', 'Something went wrong sending your message. Please try again.');
}

function openConnectionWorkspace() {
    ensureGlobalUI();
    const wish = activeWishForSupport;
    const content = document.getElementById('connection-workspace-content');
    const title = wish ? wish.title : 'New collaboration';
    const author = wish ? wish.author : 'GloWe member';
    content.innerHTML = `
        <span class="close-modal" onclick="closeModal('connection-workspace-modal')">&times;</span>
        <div class="workspace-header">
            <span class="hero-kicker">Connection workspace</span>
            <h2>${escapeHtml(title)}</h2>
            <p>Your offer was sent to ${escapeHtml(author)}. This shared workspace shows the next steps that make the connection real.</p>
        </div>
        <div class="workspace-steps">
            <article class="done"><strong>Offer sent</strong><span>Structured support offer submitted.</span></article>
            <article><strong>Organization review</strong><span>${escapeHtml(author)} reviews fit, timing, and safety details.</span></article>
            <article><strong>First coordination call</strong><span>Both sides confirm scope, timeline, and ownership.</span></article>
            <article><strong>Impact update</strong><span>A short outcome note documents what changed.</span></article>
        </div>
        <div class="impact-update-box">
            <h3>Draft impact update</h3>
            <p>When work is complete, this becomes a short public note: what was needed, who helped, what happened, and what is still needed.</p>
            <button class="btn btn-primary" type="button" onclick="showSuccessModal('Impact update drafted', 'This closes the loop from need to documented outcome.')">Draft Update</button>
        </div>
    `;
    openModal('connection-workspace-modal');
}

function openReportModal(type = 'general', id = 'site', title = 'General concern') {
    // FR-GLOWE-015 AC1 — reporting requires login (reports are per-reporter).
    if (!(typeof isLoggedIn === 'function' && isLoggedIn())) {
        window.GloweGuest.requireMemberForAction('report-content', { title }, function () {});
        return;
    }
    ensureGlobalUI();
    activeReportTarget = { type, id: String(id), title };
    const targetType = document.getElementById('report-target-type');
    const targetId = document.getElementById('report-target-id');
    const targetTitle = document.getElementById('report-target-title');
    const targetLabel = document.getElementById('report-target-label');
    if (targetType) targetType.value = activeReportTarget.type;
    if (targetId) targetId.value = activeReportTarget.id;
    if (targetTitle) targetTitle.value = activeReportTarget.title;
    if (targetLabel) targetLabel.textContent = activeReportTarget.title;
    openModal('report-modal');
}

function openNotificationPrefs() {
    ensureGlobalUI();
    openModal('notification-modal');
}

function handleNotificationPrefs(event) {
    event.preventDefault();
    closeModal('notification-modal');
    showActionToast('Preferences saved', 'GloWe will focus on action-oriented updates and avoid unnecessary noise.');
}

function openFundingBrief() {
    showSuccessModal('Funding preparation', 'For the MVP, this is a planning prompt. Future versions may include structured grant briefs and budget checklists.');
}

function openCrowdfundingModal() {
    showSuccessModal('Future community support flow', 'For the MVP, urgent funding appears as wishes, posts, and direct collaboration requests rather than a separate funding pool.');
}

// FR-GLOWE-016 AC6 — private message entry point. Opens a compose modal and,
// on send, creates (or reuses) the real 1:1 KC chat with the recipient and
// jumps into the thread. Cards pass the recipient's user id where known.
let activeMessageRecipient = null;

function openPrivateMessage(name = 'this member', recipientId = '') {
    // Guests → action-tailored join prompt (FR-GLOWE-023).
    if (!gloweIsLoggedIn()) {
        window.GloweGuest.requireMemberForAction('send-message', { org: name }, function () {});
        return;
    }
    if (!recipientId) {
        showSuccessModal('Messaging unavailable', 'This member cannot receive direct messages yet.');
        return;
    }
    ensureGlobalUI();
    activeMessageRecipient = { id: recipientId, name };
    const modal = document.getElementById('message-modal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="message-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('message-modal')">&times;</span>
                    <h2>Write a message</h2>
                    <p class="modal-intro" id="message-context"></p>
                    <form onsubmit="handleMessageSubmit(event)">
                        <div class="form-group">
                            <label for="message-body">Message</label>
                            <textarea id="message-body" rows="5" required placeholder="Write a short, respectful message with clear next steps."></textarea>
                        </div>
                        <button class="btn btn-primary btn-block" type="submit">Send Message</button>
                    </form>
                </div>
            </div>
        `);
    }
    document.getElementById('message-context').textContent = `To: ${name}`;
    document.getElementById('message-body').value = '';
    openModal('message-modal');
}

async function handleMessageSubmit(event) {
    event.preventDefault();
    const body = fieldValue('message-body');
    const check = GloweMessages.validateMessageDraft(body);
    if (!check.valid || !activeMessageRecipient) return;
    const chatId = await startDirectChat(activeMessageRecipient.id, body).catch(() => null);
    closeModal('message-modal');
    if (chatId) {
        redirectToChatThread(chatId);
        return;
    }
    showSuccessModal('Could not send message', 'Something went wrong sending your message. Please try again.');
}

function addProjectFeedback() {
    showActionToast('Feedback saved', 'This recommendation can appear on the project after community moderation.');
}

function rateOrganization(name = 'this organization') {
    showActionToast('Rating recorded', `Your trust signal for ${name} will help rank active organizations by involvement and documented impact.`);
}

function toggleLowDataMode() {
    const enabled = !document.body.classList.contains('low-data-mode');
    document.body.classList.toggle('low-data-mode', enabled);
    localStorage.setItem('gloweLowDataMode', enabled ? 'true' : 'false');
    showSuccessModal(
        enabled ? 'Low-data mode on' : 'Low-data mode off',
        enabled ? 'Images and heavy visual layers are reduced for faster, lighter use.' : 'Full visual experience restored.'
    );
}

function getInitials(name = '') {
    return name
        .replace(/&/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase() || 'GW';
}

function renderEntityMark(name, className = 'entity-mark') {
    return `<span class="${className}">${getInitials(name)}</span>`;
}

function bilingualNameAttrs(primary, english) {
    return `data-ln-primary="${escapeHtml(primary || '')}" data-ln-english="${escapeHtml(english || '')}"`;
}

function renderLocalizedEntityMark(primary, english, displayName, className = 'entity-mark') {
    return `<span class="${className}" ${bilingualNameAttrs(primary, english)}>${getInitials(displayName)}</span>`;
}

function authorNamePairFrom(row) {
    const r = row || {};
    return {
        primary: String(r.authorName != null ? r.authorName : (r.author_name != null ? r.author_name : (r.author || ''))).trim(),
        english: String(r.authorNameEn != null ? r.authorNameEn : (r.author_name_en != null ? r.author_name_en : (r.authorEn || ''))).trim()
    };
}

function orgNamePairFrom(row) {
    const r = row || {};
    return {
        primary: String(r.organization != null ? r.organization : (r.namePrimary != null ? r.namePrimary : (r.orgName || r.name || ''))).trim(),
        english: String(r.organizationEn != null ? r.organizationEn : (r.organization_en != null ? r.organization_en : (r.nameEn || ''))).trim()
    };
}

function profileNamePairFrom(profile) {
    if (typeof GloweLocalizedName !== 'undefined' && typeof GloweLocalizedName.profileNamePair === 'function') {
        return GloweLocalizedName.profileNamePair(profile);
    }
    const p = profile || {};
    const isOrg = p.accountType === 'organization';
    if (isOrg) {
        return {
            primary: String(p.orgName || p.name || '').trim(),
            english: String(p.orgNameEn || p.nameEn || '').trim()
        };
    }
    return {
        primary: String(p.name || '').trim(),
        english: String(p.nameEn || '').trim()
    };
}

function localizedProfileDisplayName(profile, fallback) {
    if (typeof GloweLocalizedName !== 'undefined') {
        return GloweLocalizedName.localizedProfileName(profile, gloweReaderLang()) || fallback || 'GloWe Member';
    }
    const pair = profileNamePairFrom(profile);
    return pair.primary || pair.english || fallback || 'GloWe Member';
}

function localizedProfileFirstName(profile, fallback) {
    if (typeof GloweLocalizedName !== 'undefined' && typeof GloweLocalizedName.localizedFirstName === 'function') {
        return GloweLocalizedName.localizedFirstName(profile, gloweReaderLang(), fallback || 'there');
    }
    return localizedProfileDisplayName(profile, fallback || 'there').split(/\s+/)[0] || fallback || 'there';
}

function applyLocalizedNameAttrs(el, profile) {
    if (!el) return;
    const pair = profileNamePairFrom(profile);
    el.setAttribute('data-ln-primary', pair.primary);
    el.setAttribute('data-ln-english', pair.english);
}

function markProfileBioTranslation(rootEl, profile) {
    if (!rootEl || !profile || !profile.id || profile.id === 'demo-personal-profile') return;
    const isOrg = profile.accountType === 'organization';
    const field = isOrg && profile.orgDescription ? 'org_description' : 'about';
    rootEl.setAttribute('data-tr-card', '');
    rootEl.setAttribute('data-tr-type', 'glowe_profile');
    rootEl.setAttribute('data-tr-id', profile.id);
    const bioEl = rootEl.querySelector('[data-profile-bio]');
    if (bioEl) bioEl.setAttribute('data-tr-field', field);
    if (window.GloweTranslate && typeof window.GloweTranslate.scan === 'function') {
        window.GloweTranslate.scan(rootEl);
    }
}

async function getLocalizedPersonalProfile() {
    let profile = getPersonalProfile();
    if (!profile || !profile.id || profile.id === 'demo-personal-profile') return profile;
    const ensured = await withEnsuredEnglishNames([profile]);
    return ensured[0] || profile;
}

function renderPersonLinkContent(profile, options = {}) {
    const className = options.className || 'avatar';
    const pair = profileNamePairFrom(profile);
    const displayName = localizedProfileDisplayName(profile);
    const metaHtml = options.meta ? `<small>${escapeHtml(options.meta)}</small>` : '';
    return `
        ${renderLocalizedEntityMark(pair.primary, pair.english, displayName, className)}
        <span><strong ${bilingualNameAttrs(pair.primary, pair.english)}>${escapeHtml(displayName)}</strong>${metaHtml}</span>
    `;
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function jsString(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Read a form field's trimmed value; '' when the element is absent.
function fieldValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value).trim() : '';
}

// Navigate into a chat thread with the correct relative path from any page.
function redirectToChatThread(chatId) {
    const inPages = window.location.pathname.includes('/pages/');
    window.location.href = `${inPages ? '' : 'pages/'}messages.html?chat=${encodeURIComponent(chatId)}`;
}

// A PostgREST 42501 (admin assert / RLS) → "reviewers only" style handling.
function isForbiddenError(error) {
    if (!error) return false;
    return error.code === '42501' || /forbidden|permission/i.test(error.message || '');
}

function getSavedItems() {
    try {
        return JSON.parse(localStorage.getItem(SAVED_ITEMS_KEY) || '[]');
    } catch (error) {
        return [];
    }
}

function getApplications() {
    try {
        const current = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
        if (current) return JSON.parse(current);
        const legacy = localStorage.getItem(LEGACY_APPLICATIONS_STORAGE_KEY);
        if (legacy) {
            localStorage.setItem(APPLICATIONS_STORAGE_KEY, legacy);
            return JSON.parse(legacy);
        }
        return [];
    } catch (error) {
        return [];
    }
}

function saveApplications(applications) {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
}

function setSavedItems(items) {
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
}

function saveItem(type, id, title, meta = '', href = '') {
    // FR-GLOWE-013 AC1 — saving requires login (saved items sync per user). Guests
    // get the sign-in / registration screen with save-specific copy, not a notice.
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        promptGuestSignIn('Sign in or create a free account to save items to your area.');
        return;
    }
    const items = getSavedItems();
    const itemId = String(id);
    const exists = items.some(item => item.type === type && String(item.id) === itemId);
    if (!exists) {
        const savedItem = { type, id: itemId, title, meta, href, savedAt: new Date().toISOString() };
        setSavedItems([savedItem, ...items]);
        if (window.gloweBackend && window.gloweBackend.configured()) {
            const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
            const payload = helpers
                ? helpers.buildSavedItemPayload(type, itemId, title, meta, href)
                : { item_type: type, item_id: itemId, title, meta, href };
            window.gloweBackend.insertOwned('saved_items', payload).catch(() => {});
        }
    }
    showActionToast('Saved', `${title} was added to your saved area.`);
}

function removeSavedItem(type, id) {
    setSavedItems(getSavedItems().filter(item => !(item.type === type && String(item.id) === String(id))));
    if (window.gloweBackend && window.gloweBackend.configured()) {
        window.gloweBackend.removeOwned('saved_items', {
            item_type: type,
            item_id: String(id)
        }).catch(() => {});
    }
    if (typeof window.renderSavedItemsPage === 'function') window.renderSavedItemsPage();
    if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
}

// FR-GLOWE-013 AC2 — render a Save/Saved toggle button that reflects whether the
// item is already in the user's saved list. Raw values are escaped here (callers
// pass unescaped title/meta/href). The saved-state label is "Saved"; the unsaved
// label is card-specific (kept on data-save-label for the in-place flip).
function savedToggleButtonHtml(type, id, title, meta, href, saveLabel, className) {
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const saved = helpers ? helpers.isItemSaved(getSavedItems(), type, id) : false;
    const cls = (className || 'btn btn-outline btn-small') + (saved ? ' is-saved' : '');
    const label = saved ? 'Saved' : saveLabel;
    return `<button class="${cls}" type="button" aria-pressed="${saved}" data-save-label="${escapeHtml(saveLabel)}" onclick="toggleSavedItem(this, '${jsString(type)}', '${jsString(String(id))}', '${jsString(String(title))}', '${jsString(String(meta))}', '${jsString(String(href))}')">${escapeHtml(label)}</button>`;
}

// Icon-only save control for card headers (org directory). Keeps the SVG on
// toggle — refreshSavedToggleButton only flips aria/class for this variant.
function savedToggleIconHtml(type, id, title, meta, href, saveLabel) {
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const saved = helpers ? helpers.isItemSaved(getSavedItems(), type, id) : false;
    const label = saved ? 'Saved' : (saveLabel || 'Save');
    const cls = 'save-icon-btn' + (saved ? ' is-saved' : '');
    return `<button class="${cls}" type="button" aria-pressed="${saved}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" data-save-label="${escapeHtml(saveLabel || 'Save')}" onclick="event.preventDefault(); event.stopPropagation(); toggleSavedItem(this, '${jsString(type)}', '${jsString(String(id))}', '${jsString(String(title))}', '${jsString(String(meta))}', '${jsString(String(href))}')">${BOOKMARK_ICON_SVG}</button>`;
}

// Flip a rendered toggle button in place after a save/unsave (avoids a full list
// re-render / scroll reset). Setting textContent replaces the text node, which the
// i18n MutationObserver catches and localizes.
function refreshSavedToggleButton(btn, type, id) {
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const saved = helpers ? helpers.isItemSaved(getSavedItems(), type, id) : false;
    btn.setAttribute('aria-pressed', String(saved));
    btn.classList.toggle('is-saved', saved);
    const label = saved ? 'Saved' : (btn.getAttribute('data-save-label') || 'Save');
    if (btn.classList.contains('save-icon-btn')) {
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        return;
    }
    btn.textContent = label;
}

// FR-GLOWE-013 AC2 — toggle a card's saved state: unsave when already saved, else
// save. Login-gated (saved items sync per user). saveItem shows its own "Saved"
// confirmation; the button flips in place either way.
function toggleSavedItem(btn, type, id, title, meta, href) {
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        promptGuestSignIn('Sign in or create a free account to save items to your area.');
        return;
    }
    const helpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const saved = helpers ? helpers.isItemSaved(getSavedItems(), type, id) : false;
    if (saved) {
        removeSavedItem(type, id);
    } else {
        saveItem(type, id, title, meta, href);
    }
    if (btn) refreshSavedToggleButton(btn, type, id);
}

function getPostComments() {
    try {
        return JSON.parse(localStorage.getItem(POST_COMMENTS_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

// Backend comment cache (FR-GLOWE-008 AC4). Null until loaded / when the
// backend is not configured, in which case cards fall back to localStorage.
let backendPostComments = null;

// Fetch all glowe_comments and group them by post_id for the feed render.
async function loadPostComments() {
    backendPostComments = null;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    let rows = [];
    try { rows = await backend.listAll('comments'); } catch (_e) { rows = []; }
    const helpers = (typeof GlowePosts !== 'undefined') ? GlowePosts : null;
    const grouped = helpers ? helpers.groupCommentsByPost(rows || []) : {};
    const flat = [];
    Object.keys(grouped).forEach(function (postId) {
        (grouped[postId] || []).forEach(function (c) { flat.push(c); });
    });
    const patched = await withEnsuredAuthorEnglishNames(flat);
    const out = {};
    patched.forEach(function (c) {
        const key = String(c.postId == null ? '' : c.postId);
        if (!out[key]) out[key] = [];
        out[key].push(c);
    });
    backendPostComments = out;
}

// Comments to render for a post: backend rows (authoritative) merged with any
// local-only comment just posted; localStorage-only when backend is offline.
function getPostCommentsFor(postId) {
    const local = getPostComments()[postId] || [];
    if (!backendPostComments) return local;
    const backend = backendPostComments[postId] || [];
    return (typeof GlowePosts !== 'undefined')
        ? GlowePosts.mergeCommentLists(backend, local)
        : backend;
}

// Live forum group catalog (glowe_forum_groups). null before the first load
// attempt; an array afterwards (possibly empty when the backend is offline or
// unseeded, in which case the hardcoded discussionGroups is the demo fallback).
// FR-GLOWE-009 AC1.
let backendForumGroups = null;

async function loadForumGroups() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { backendForumGroups = []; return; }
    let rows = [];
    try { rows = await backend.listAll('forum_groups', { orderBy: 'created_at', ascending: true }); } catch (_e) { rows = []; }
    backendForumGroups = (typeof GloweForums !== 'undefined')
        ? GloweForums.mapForumGroups(rows || [])
        : [];
}

// The forum groups to render: live catalog when loaded and non-empty, else the
// hardcoded discussionGroups demo fallback.
function getForumGroups() {
    return (backendForumGroups && backendForumGroups.length) ? backendForumGroups : discussionGroups;
}

// Kick off a one-shot live load then re-render, guarded so it fires at most once
// per page and never loops when the backend returns no rows.
function refreshForumGroups(rerender) {
    if (backendForumGroups !== null) return;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { backendForumGroups = []; return; }
    loadForumGroups().then(function () {
        if (backendForumGroups && backendForumGroups.length) rerender();
    });
}

// Live forum threads (glowe_forum_threads). null before the first load attempt;
// an array afterwards (empty when offline / no threads, in which case the
// localStorage 'gloweForumThreads' mirror is the offline fallback). FR-GLOWE-009
// AC2/AC3.
let backendForumThreads = null;

async function loadForumThreads() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { backendForumThreads = []; return; }
    let rows = [];
    try { rows = await backend.listAll('forum_threads'); } catch (_e) { rows = []; }
    backendForumThreads = (typeof GloweForums !== 'undefined')
        ? GloweForums.mapForumThreads(rows || [])
        : [];
}

// localStorage thread mirror normalized to the mapped render shape.
function localForumThreads() {
    const stored = JSON.parse(localStorage.getItem('gloweForumThreads') || '[]');
    return stored.map(function (t) {
        return {
            id: t.id || '',
            groupId: (t.group && t.group.id) || '',
            authorId: '',
            title: t.title || '',
            body: t.text || '',
            createdAt: t.createdAt || '',
            replies: t.replies || 0
        };
    });
}

// Threads to render: live table when loaded and non-empty, else localStorage.
function getForumThreads() {
    return (backendForumThreads && backendForumThreads.length) ? backendForumThreads : localForumThreads();
}

function refreshForumThreads(rerender) {
    if (backendForumThreads !== null) return;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { backendForumThreads = []; return; }
    loadForumThreads().then(function () {
        if (backendForumThreads && backendForumThreads.length) rerender();
    });
}

// Persist a new forum thread: optimistic localStorage mirror (offline fallback,
// TD-134) plus a backend insert when configured. `extras` carries mirror-only
// fields (type/fileName) that have no column on glowe_forum_threads.
async function persistForumThread(group, title, body, extras) {
    const local = JSON.parse(localStorage.getItem('gloweForumThreads') || '[]');
    local.unshift(Object.assign({
        title: title,
        text: body,
        replies: 0,
        lastActive: 'Just now',
        createdAt: new Date().toISOString(),
        group: group
    }, extras || {}));
    localStorage.setItem('gloweForumThreads', JSON.stringify(local));
    const backend = window.gloweBackend;
    if (backend && backend.configured()) {
        try { await backend.insertOwned('forum_threads', { group_id: group.id, title: title, body: body }); }
        catch (_e) { /* offline mirror already saved */ }
    }
}

// Force a fresh backend thread reload (after a create).
async function reloadForumThreads() {
    backendForumThreads = null;
    await loadForumThreads();
}

// Live forum replies (glowe_forum_replies). null before the first load attempt;
// an array afterwards (empty when offline / no replies, in which case the
// localStorage 'gloweForumReplies' mirror is the offline fallback). Loaded
// ascending by created_at so replies read oldest-first. FR-GLOWE-009 AC4/AC7.
let backendForumReplies = null;

async function loadForumReplies() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { backendForumReplies = []; return; }
    let rows = [];
    try { rows = await backend.listAll('forum_replies', { orderBy: 'created_at', ascending: true }); }
    catch (_e) { rows = []; }
    backendForumReplies = (typeof GloweForums !== 'undefined')
        ? GloweForums.mapForumReplies(rows || [])
        : [];
}

// localStorage reply mirror normalized to the mapped render shape.
function localForumReplies() {
    const stored = JSON.parse(localStorage.getItem('gloweForumReplies') || '[]');
    return stored.map(function (r) {
        return {
            id: r.id || '',
            threadId: r.threadId || '',
            authorId: '',
            body: r.body || '',
            createdAt: r.createdAt || ''
        };
    });
}

// Replies to render: live table when loaded and non-empty, else localStorage.
function getForumReplies() {
    return (backendForumReplies && backendForumReplies.length) ? backendForumReplies : localForumReplies();
}

function refreshForumReplies(rerender) {
    if (backendForumReplies !== null) return;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { backendForumReplies = []; return; }
    loadForumReplies().then(function () {
        if (backendForumReplies && backendForumReplies.length) rerender();
    });
}

// Persist a new reply: optimistic localStorage mirror (offline fallback, TD-134)
// plus a backend insert when configured.
async function persistForumReply(threadId, body) {
    const local = JSON.parse(localStorage.getItem('gloweForumReplies') || '[]');
    local.push({
        id: `local-reply-${Date.now()}`,
        threadId: threadId,
        body: body,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('gloweForumReplies', JSON.stringify(local));
    const backend = window.gloweBackend;
    if (backend && backend.configured()) {
        try { await backend.insertOwned('forum_replies', { thread_id: threadId, body: body }); }
        catch (_e) { /* offline mirror already saved */ }
    }
}

// Force a fresh backend reply reload (after a create).
async function reloadForumReplies() {
    backendForumReplies = null;
    await loadForumReplies();
}

// Overlay live per-group stats (FR-GLOWE-009 AC7) onto mapped groups: post count
// = threads in the group, member count = distinct authors of a thread or reply in
// the group. Falls back to any preset value (hardcoded discussionGroups demo).
function withGroupStats(groups) {
    if (typeof GloweForums === 'undefined') return groups;
    const threads = getForumThreads();
    const replies = getForumReplies();
    const posts = GloweForums.groupThreadCounts(threads);
    const members = GloweForums.groupMemberCounts(threads, replies);
    return groups.map(function (g) {
        return Object.assign({}, g, {
            posts: posts[g.id] || g.posts || 0,
            members: members[g.id] || g.members || 0
        });
    });
}

// Human-readable last-activity label for a thread's created_at.
function formatThreadActivity(createdAt) {
    if (!createdAt) return 'Just now';
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? 'Just now' : d.toLocaleDateString(gloweLocaleTag());
}

function savePostComment(postId, text) {
    const comments = getPostComments();
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const author = gloweCurrentAuthorNamePair();
    const newComment = {
        id: `comment-${Date.now()}`,
        authorId: user ? user.id : '',
        author: author.primary,
        authorEn: author.english || '',
        text: text.trim(),
        createdAt: new Date().toISOString()
    };
    comments[postId] = [newComment, ...(comments[postId] || [])];
    localStorage.setItem(POST_COMMENTS_KEY, JSON.stringify(comments));
    if (window.gloweBackend && window.gloweBackend.configured()) {
        window.gloweBackend.insertOwned('comments', {
            post_id: postId,
            text: newComment.text,
            author_name: newComment.author,
            author_name_en: newComment.authorEn || null
        }).catch(() => {});
    }
    return newComment;
}

function getPostId(post, index = 0) {
    return post.id || `${post.authorId || 'post'}-${String(post.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
}

function getOpportunityByAnyId(id) {
    return opportunities.find(opp => String(opp.id) === String(id));
}

function getSavedCommunityPosts() {
    try {
        return JSON.parse(localStorage.getItem('gloweCommunityPosts') || '[]');
    } catch (error) {
        return [];
    }
}

function saveCommunityPost(post) {
    const saved = getSavedCommunityPosts();
    const enrichedPost = {
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        authorId: post.authorId || 'sample-user-6',
        authorName: post.authorName,
        title: post.title,
        category: post.category,
        text: post.text,
        tags: post.tags || [],
        audience: post.audience || 'Everyone',
        language: post.language || 'English',
        link: post.link || ''
    };
    localStorage.setItem('gloweCommunityPosts', JSON.stringify([enrichedPost, ...saved]));
    apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify(enrichedPost)
    });
    return enrichedPost;
}

function getAllCommunityPosts() {
    return [...getSavedCommunityPosts(), ...communityPosts].map((post, index) => ({
        ...post,
        id: getPostId(post, index)
    }));
}

// One familiar Share icon per post, using the platform's native share sheet
// (Web Share API) exactly like every other app. No per-network buttons and no
// bare "Copy link" — desktop browsers without navigator.share fall back to a
// silent clipboard copy + toast. (FR-GLOWE-008 AC5; design fix #9.)
const SHARE_ICON_SVG = '<svg class="share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';
const BOOKMARK_ICON_SVG = '<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';

// Familiar visual anchors for the post actions (Jakob's Law; design fix #8).
const COMMENT_ICON_SVG = '<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
const SEND_ICON_SVG = '<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';

// Resolve a post's relative path (e.g. "community.html?post=42") to an
// absolute, shareable URL. Falls back to the current page when no path given.
function postShareUrl(path = '') {
    return new URL(path || window.location.pathname, window.location.href).href;
}

// Native share with a silent clipboard fallback. AbortError means the user
// dismissed the OS share sheet — treat it as a no-op, not an error.
async function sharePost(title, path = '') {
    const url = postShareUrl(path);
    const name = (title && String(title).trim()) || 'GloWe';
    if (await tryNativeShare(name, url)) return;
    await copyShareLink(url);
}

// Attempt the platform's native share sheet. Returns true when it handled the
// share — including an AbortError (the user dismissed the sheet) — and false
// when the API is unavailable or errored, so the caller can fall back to copy.
async function tryNativeShare(name, url) {
    if (!navigator.share) return false;
    try {
        await navigator.share({ title: name, text: `${name} | GloWe`, url });
        return true;
    } catch (error) {
        return Boolean(error && error.name === 'AbortError');
    }
}

async function copyShareLink(url) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            showToast('Link copied');
            return;
        }
    } catch (error) {
        // Clipboard blocked (e.g. insecure context) — show the link to copy by hand.
    }
    showSuccessModal('Copy this link', url);
}

function renderShareButton(title, path = '', extraClass = '') {
    const safeTitle = escapeHtml(title);
    const titleArg = jsString(title);
    const pathArg = jsString(path);
    const cls = ['post-share-button', extraClass].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" onclick="sharePost('${titleArg}', '${pathArg}')" aria-label="${escapeHtml(gloweText('Share'))} ${safeTitle}" title="Share">${SHARE_ICON_SVG}<span class="post-share-label">Share</span></button>`;
}

// FR-GLOWE-015 AC1 — persist a report to glowe_reports. Duplicate reports on
// the same target by the same reporter surface as "already reported" (AC3).
function readReportDraft() {
    return {
        targetType: fieldValue('report-target-type') || activeReportTarget.type,
        targetId: fieldValue('report-target-id') || activeReportTarget.id,
        reason: fieldValue('report-reason'),
        note: fieldValue('report-details')
    };
}

// Duplicate reports on the same target dedupe server-side (AC3).
function showReportSubmitError(error) {
    if (GloweModeration.isDuplicateReportError(error)) {
        showSuccessModal('Already reported', 'You already reported this. Our team will review it.');
        return;
    }
    showSuccessModal('Could not send report', 'Something went wrong sending your report. Please try again.');
}

async function handleReportSubmit(event) {
    event.preventDefault();
    const draft = readReportDraft();
    const check = GloweModeration.validateReportDraft(draft);
    if (!check.valid) {
        showSuccessModal('Missing details', check.error);
        return;
    }
    if (!backendReady()) {
        showSuccessModal('Could not send report', 'Reporting needs a live connection right now. Please try again shortly.');
        return;
    }
    try {
        await window.gloweBackend.submitReport(GloweModeration.buildReportPayload(draft));
        event.target.reset();
        closeModal('report-modal');
        showActionToast('Report received', 'Thank you. We will review this with care and confidentiality.');
    } catch (error) {
        closeModal('report-modal');
        showReportSubmitError(error);
    }
}

function openWishDetail(wishId) {
    ensureGlobalUI();
    const wish = wishes.find(item => String(item.id) === String(wishId));
    if (!wish) return;
    const style = wishTypeStyles[wish.type] || { color: '#E3F5F0' };
    const authorPair = authorNamePairFrom(wish);
    const authorName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.resolveLocalizedName(authorPair.primary, authorPair.english, gloweReaderLang())
            || authorPair.primary || wish.author || 'GloWe Member'
        : (wish.author || 'GloWe Member');
    const content = document.getElementById('wish-detail-content');
    content.innerHTML = `
        <button class="close-modal" type="button" aria-label="Close wish details" onclick="closeModal('wish-detail-modal')">&times;</button>
        <div class="wish-detail-scroll" data-tr-card data-tr-type="glowe_post" data-tr-id="${wish.id}">
            <div class="wish-detail-hero" style="--tag-color: ${style.color}">
                <span class="wish-type" style="background:${style.color}">${wish.type}</span>
                <h2 data-tr-field="title">${wish.title}</h2>
                <a class="wish-author" href="profile.html?id=${wish.authorId}">
                    ${renderLocalizedEntityMark(authorPair.primary, authorPair.english, authorName)}
                    <span ${bilingualNameAttrs(authorPair.primary, authorPair.english)}>${escapeHtml(authorName)}</span>
                    <small>${wish.time}</small>
                </a>
            </div>
            <p class="wish-detail-description" data-tr-field="text">${wish.description}</p>
            <div class="opportunity-details">
                <span class="opportunity-detail">${wish.location}</span>
                <span class="opportunity-detail">${wish.areas.join(', ')}</span>
            </div>
            <div class="dream-box">
                <h3>The dream</h3>
                <p>To turn a local need into a shared action that others can join, support, or learn from.</p>
                <h3>Looking for</h3>
                <div class="opportunity-skills">
                    ${wish.areas.map(area => `<span class="skill-tag">${area}</span>`).join('')}
                </div>
            </div>
            <div class="card-actions wish-detail-actions">
                <button class="btn btn-primary" type="button" onclick="showSupportModal('${wish.id}')">Offer Support</button>
                ${savedToggleButtonHtml('wish', wish.id, wish.title, wish.author, `wishing-well.html?wish=${wish.id}`, 'Save', 'btn btn-outline')}
                <button class="btn btn-outline" type="button" onclick="openReportModal('wish', '${wish.id}', '${jsString(wish.title)}')">Report</button>
                <button class="btn btn-outline" type="button" onclick="closeModal('wish-detail-modal')">Back to wishes</button>
            </div>
            <div id="wish-offers" class="wish-offers" aria-live="polite" hidden></div>
        </div>
    `;
    openModal('wish-detail-modal');
    renderWishOffers(wish);
}

// FR-GLOWE-012 AC3 — resolve whether the current viewer owns this wish, so the
// "Offers" inbox only renders to the wish author. Mirrors isOpportunityOwner.
function isWishOwnerViewing(wish) {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (!user || !wish) return false;
    const wishesApi = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
    if (wishesApi) return wishesApi.isWishOwner(wish, user.id);
    return Boolean(wish.authorId && wish.authorId === user.id);
}

// FR-GLOWE-012 AC3 — render the wish owner's "Offers" inbox inside the wish
// detail modal (read-only for this slice). Fetches offers via the owner-scoped
// glowe_list_offers_for_post RPC (migration 0225) and lists each offerer's name,
// offer text, availability, contact preference and submitted date.
async function renderWishOffers(wish) {
    const area = document.getElementById('wish-offers');
    if (!area) return;
    if (!isWishOwnerViewing(wish)) { area.hidden = true; return; }
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { area.hidden = true; return; }
    area.hidden = false;
    area.innerHTML = '<h3>Offers</h3><p class="muted-note">Loading offers…</p>';
    let rows = [];
    try {
        rows = await backend.listOffersForPost(wish.id);
    } catch (_e) {
        area.innerHTML = '<h3>Offers</h3><p class="event-register-error">Could not load offers.</p>';
        return;
    }
    const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const views = orgHelpers ? orgHelpers.mapOffersForOwner(rows) : [];
    area.innerHTML = wishOffersHtml(views);
    wireConnectButtons(area);
}

// Build the offers-inbox markup from mapped offer views.
function wishOffersHtml(views) {
    const header = `<h3>Offers <span class="applicant-count">(${views.length})</span></h3>`;
    if (!views.length) {
        return `${header}<p class="muted-note">No offers yet.</p>`;
    }
    const rows = views.map(function (v) {
        const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString(gloweLocaleTag()) : '';
        return `
        <li class="applicant-row">
            <div class="applicant-head">
                <strong>${escapeHtml(v.name || 'GloWe volunteer')}</strong>
            </div>
            ${v.offerText ? `<p class="applicant-field">${escapeHtml(v.offerText)}</p>` : ''}
            ${v.availability ? `<p class="applicant-field"><strong>Availability:</strong> ${escapeHtml(v.availability)}</p>` : ''}
            ${v.contactPreference ? `<p class="applicant-field"><strong>Preferred contact:</strong> ${escapeHtml(v.contactPreference)}</p>` : ''}
            ${date ? `<p class="applicant-meta">${gloweText('Offered')} ${escapeHtml(date)}</p>` : ''}
            ${connectButtonHtml(v) ? `<div class="applicant-actions">${connectButtonHtml(v)}</div>` : ''}
        </li>`;
    }).join('');
    return `${header}<ul class="applicant-list">${rows}</ul>`;
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        const modalId = e.target.id;
        closeModal(modalId);
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            closeModal(activeModal.id);
        }
    }
});

// Render opportunity card
// ── Supabase row → render-format mappers ────────────────────────────────────

function mapOpportunityRow(row) {
    return {
        id: row.id,
        title: row.title || '',
        organization: row.organization || 'GloWe Member',
        organizationEn: row.organization_en || '',
        orgIcon: row.org_icon || getInitials(row.organization || 'GloWe'),
        location: row.location || '',
        commitment: row.commitment || '',
        duration: row.duration || '',
        field: row.field || '',
        description: row.description || '',
        skills: Array.isArray(row.skills) ? row.skills : [],
        featured: Boolean(row.featured),
        ownerId: row.user_id || null,
        // Event fields (additive model, migration 0211). Null on plain opportunities.
        startAt: row.start_at || null,
        endAt: row.end_at || null,
        eventType: row.event_type || null,
        capacity: typeof row.capacity === 'number' ? row.capacity : null,
        registrationMode: row.registration_mode || 'gated',
        status: row.status || 'active'
    };
}

function mapPostRow(row) {
    if (typeof GlowePosts !== 'undefined') return GlowePosts.mapPostRow(row);
    const authorName = row.author_name || 'Community Member';
    const authorNameEn = row.author_name_en || '';
    return {
        id: row.id,
        title: row.title || '',
        category: row.category || '',
        text: row.text || '',
        tags: Array.isArray(row.tags) ? row.tags : [],
        authorId: row.user_id || '',
        authorName,
        authorNameEn,
        createdAt: row.created_at || ''
    };
}

// Load community posts from glowe_posts (post_type='community') into the shared
// `communityPosts` array. Wishes (post_type='wish') are filtered out so they do
// not leak into the community feed (FR-GLOWE-008).
async function loadCommunityPosts() {
    const backend = window.gloweBackend;
    communityPosts.length = 0;
    if (!backend || !backend.configured()) return;
    const helpers = (typeof GlowePosts !== 'undefined') ? GlowePosts : null;
    let rows = [];
    try { rows = await backend.listAll('posts'); } catch (_e) { rows = []; }
    let mapped = helpers
        ? helpers.mapCommunityRows(rows)
        : (rows || []).map(mapPostRow);
    mapped = await withEnsuredAuthorEnglishNames(mapped);
    communityPosts.push(...mapped);
}

// Publish a community post to glowe_posts (post_type='community'). Shared by the
// inline composer and the write-post form (FR-GLOWE-008). Returns true on a
// persisted insert, false when gated/invalid/failed (with a user-facing modal).
async function submitCommunityPost(draft) {
    if (!canCreateContent()) return false;
    const helpers = (typeof GlowePosts !== 'undefined') ? GlowePosts : null;
    const check = helpers ? helpers.validatePostDraft(draft) : { valid: Boolean(draft && draft.title) };
    if (!check.valid) {
        showSuccessModal('Missing details', check.error || 'Please complete the post before publishing.');
        return false;
    }
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) {
        showSuccessModal('Backend unavailable', 'Posts need a live connection right now. Please try again shortly.');
        return false;
    }
    const payload = helpers ? helpers.normalizePostDraft(draft) : draft;
    try {
        await backend.insertOwned('posts', payload);
        return true;
    } catch (_e) {
        showSuccessModal('Could not publish', 'Something went wrong publishing your post. Please try again.');
        return false;
    }
}

// Delete a community post the signed-in viewer owns (FR-GLOWE-008 AC7). RLS
// scopes removeOwned to auth.uid(), so a non-owner call is a no-op server-side;
// the CTA is only rendered for owners. Reloads the feed after a successful delete.
async function deleteCommunityPost(postId) {
    if (!postId) return;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    if (typeof window.confirm === 'function' && !window.confirm('Delete this post? This cannot be undone.')) return;
    try {
        await backend.removeOwned('posts', { id: postId });
    } catch (_e) {
        showSuccessModal('Could not delete', 'Something went wrong deleting your post. Please try again.');
        return;
    }
    await initCommunityPage();
    showActionToast('Post deleted', 'Your post was removed from the community feed.');
}

// Display name for the signed-in author, falling back to their saved profile.
function currentAuthorName() {
    const profile = typeof getPersonalProfile === 'function' ? getPersonalProfile() : null;
    if (profile && typeof GloweLocalizedName !== 'undefined') {
        return GloweLocalizedName.localizedProfileName(profile, gloweReaderLang());
    }
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user && user.name) return user.name;
    return (profile && profile.name) || 'Community Member';
}

function mapProfileToOrg(profile) {
    const lang = gloweReaderLang();
    const primary = profile.orgName || profile.name || 'Organization';
    const english = profile.orgNameEn || profile.nameEn || '';
    const name = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedProfileName(profile, lang)
        : primary;
    return {
        id: profile.id,
        name,
        namePrimary: primary,
        nameEn: english,
        type: profile.orgField || profile.type || 'Organization',
        mission: profile.orgDescription || profile.about || '',
        missionField: profile.orgDescription ? 'org_description' : 'about',
        location: profile.orgCountry || profile.location || '',
        scope: profile.country || '',
        volunteers: 0,
        impactArea: profile.focus || '',
        status: 'Verified',
        size: profile.orgSize || '',
        website: profile.orgWebsite || ''
    };
}

async function fetchAndPopulate(backendFn, targetArray, mapper, postProcess) {
    try {
        if (typeof gloweBackend === 'undefined' || !gloweBackend.configured()) return;
        const rows = await backendFn();
        if (!rows) return;
        // FR-GLOWE-015 AC5 — admin-removed content never surfaces publicly.
        const visible = rows.filter(row => !row || row.status !== 'removed');
        let mapped = visible.map(mapper);
        if (typeof postProcess === 'function') mapped = await postProcess(mapped);
        targetArray.splice(0, targetArray.length, ...mapped);
    } catch (_e) {
        // leave array empty; page shows empty state
    }
}

// FR-GLOWE-024 — on Personal Area load, lazy-fill missing English names for the
// signed-in owner so EN readers and downstream author snapshots resolve Latin names.
// fallow-ignore-next-line complexity
async function backfillPersonalProfileEnglishName(profile) {
    const backend = window.gloweBackend;
    const ready = profile && profile.id
        && typeof GloweLocalizedName !== 'undefined'
        && GloweLocalizedName.profileNeedsEnglishName(profile)
        && backend
        && typeof backend.ensureProfileEnglishNames === 'function'
        && backend.configured()
        && typeof isLoggedIn === 'function'
        && isLoggedIn();
    if (!ready) return profile;
    const englishBefore = String(profile.orgNameEn || profile.nameEn || '').trim();
    const patches = await backend.ensureProfileEnglishNames([profile.id]);
    if (!patches || !patches.length) return profile;
    const next = GloweLocalizedName.applyEnglishNamePatches([profile], patches)[0] || profile;
    const englishAfter = String(next.orgNameEn || next.nameEn || '').trim();
    savePersonalProfile(next);
    if (!englishBefore && englishAfter && typeof window.renderPersonalArea === 'function') {
        window.renderPersonalArea();
    }
    return next;
}

// FR-GLOWE-024 — when the reader is on EN, materialize missing *_en columns for
// profiles that still only have a non-Latin source name, then return patched rows.
async function withEnsuredEnglishNames(profiles) {
    const list = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
    if (!list.length) return list;
    if (gloweReaderLang() !== 'en') return list;
    if (typeof GloweLocalizedName === 'undefined') return list;
    const needing = list.filter(GloweLocalizedName.profileNeedsEnglishName);
    if (!needing.length) return list;
    const backend = window.gloweBackend;
    if (!backend || typeof backend.ensureProfileEnglishNames !== 'function') return list;
    const patches = await backend.ensureProfileEnglishNames(needing.map((p) => p.id));
    if (!patches || !patches.length) return list;
    return GloweLocalizedName.applyEnglishNamePatches(list, patches);
}

// FR-GLOWE-024 — backfill missing author English snapshots on posts/comments
// from the author's glowe_profiles row (generate-on-read when still empty).
async function withEnsuredAuthorEnglishNames(items) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) return list;
    if (gloweReaderLang() !== 'en') return list;
    if (typeof GloweLocalizedName === 'undefined') return list;
    const needing = list.filter(GloweLocalizedName.authorNeedsEnglishName);
    if (!needing.length) return list;
    const ids = [];
    const seen = {};
    needing.forEach(function (row) {
        const id = row.authorId || row.userId;
        if (!id || seen[String(id)]) return;
        seen[String(id)] = true;
        ids.push(String(id));
    });
    if (!ids.length) return list;
    const backend = window.gloweBackend;
    if (!backend || typeof backend.ensureProfileEnglishNames !== 'function') return list;
    const patches = await backend.ensureProfileEnglishNames(ids);
    if (!patches || !patches.length) return list;
    return GloweLocalizedName.applyAuthorEnglishFromProfiles(list, patches);
}

// FR-GLOWE-024 — backfill missing organization English snapshots on opportunities
// from the publisher's glowe_profiles row (generate-on-read when still empty).
async function withEnsuredOrganizationEnglishNames(items) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) return list;
    if (gloweReaderLang() !== 'en') return list;
    if (typeof GloweLocalizedName === 'undefined') return list;
    const needing = list.filter(GloweLocalizedName.organizationNeedsEnglishName);
    if (!needing.length) return list;
    const ids = [];
    const seen = {};
    needing.forEach(function (row) {
        const id = row.ownerId || row.userId;
        if (!id || seen[String(id)]) return;
        seen[String(id)] = true;
        ids.push(String(id));
    });
    if (!ids.length) return list;
    const backend = window.gloweBackend;
    if (!backend || typeof backend.ensureProfileEnglishNames !== 'function') return list;
    const patches = await backend.ensureProfileEnglishNames(ids);
    if (!patches || !patches.length) return list;
    return GloweLocalizedName.applyOrganizationEnglishFromProfiles(list, patches);
}

function translationToggleSlotHtml() {
    if (typeof GloweUiConventions !== 'undefined') {
        return GloweUiConventions.translationToggleSlotHtml();
    }
    return '<div class="tr-slot" aria-live="polite"></div>';
}

function cardActionsClassName() {
    if (typeof GloweUiConventions !== 'undefined') {
        return GloweUiConventions.cardActionsClass();
    }
    return 'card-actions card-actions--consistent';
}

function uniqueCardMeta(values) {
    if (typeof GloweUiConventions !== 'undefined') {
        return GloweUiConventions.uniqueMeta(values);
    }
    return (values || []).filter(Boolean);
}

// Prefer extensionless page paths when attaching a query string. Local `serve`
// clean-URL mode 301-redirects `foo.html?x=1` → `/foo` and drops the query,
// which made org profile links open "Profile not found" while hosted Cloudflare
// Pages kept working.
function glowePageHref(path, query) {
    const clean = String(path || '').replace(/\.html$/i, '');
    if (query == null || query === '') return clean;
    const q = String(query).replace(/^\?/, '');
    return q ? `${clean}?${q}` : clean;
}

function directoryUi() {
    return (typeof GloweUiConventions !== 'undefined') ? GloweUiConventions : null;
}

function renderOpportunityCard(opportunity, basePath = '') {
    const ui = directoryUi();
    const titleForMessage = jsString(opportunity.title);
    const detailHref = glowePageHref(`${basePath}pages/opportunity.html`, `id=${encodeURIComponent(opportunity.id)}`);
    const skills = Array.isArray(opportunity.skills) ? opportunity.skills : [];
    const events = (typeof GloweEvents !== 'undefined') ? GloweEvents : null;
    const isEvent = events ? events.isEvent(opportunity) : false;
    const orgName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedOrganizationName(opportunity, gloweReaderLang(), 'GloWe Member')
        : (opportunity.organization || 'GloWe Member');
    const orgPair = orgNamePairFrom(opportunity);
    const location = opportunity.location || '';
    const duration = opportunity.duration || '';
    const commitment = opportunity.commitment || '';
    // Commitment enums are chrome i18n keys — omit data-tr-field so gloweLang can localize.
    const eventMeta = isEvent
        ? `<span class="opportunity-detail"><strong>When:</strong> ${escapeHtml(events.formatEventDate(opportunity, gloweLocaleTag()))}</span>`
        : '';
    const detailBits = [
        eventMeta,
        location ? `<span class="opportunity-detail"><strong>Location:</strong> <span data-tr-field="location">${escapeHtml(location)}</span></span>` : '',
        duration ? `<span class="opportunity-detail"><strong>Duration:</strong> <span data-tr-field="duration">${escapeHtml(duration)}</span></span>` : '',
        !isEvent && commitment
            ? `<span class="opportunity-detail"><strong>Commitment:</strong> <span>${escapeHtml(commitment)}</span></span>`
            : ''
    ].filter(Boolean).join('');
    const eventChip = isEvent
        ? `<span class="skill-tag directory-card-meta-chip">${escapeHtml(events.eventTypeLabel(opportunity.eventType) || 'Event')}</span>`
        : '';
    const skillTags = skills.map((skill, i) =>
        `<span class="skill-tag" title="${escapeHtml(skill)}" data-tr-field="skills.${i}">${escapeHtml(skill)}</span>`
    ).join('');
    const avatarHtml = (ui ? ui.avatarWrapHtml(
        renderLocalizedEntityMark(orgPair.primary, orgPair.english, orgName),
        { verified: false }
    ) : renderLocalizedEntityMark(orgPair.primary, orgPair.english, orgName))
        + `<span class="directory-card-org-name" ${bilingualNameAttrs(orgPair.primary, orgPair.english)}>${escapeHtml(orgName)}</span>`;
    // Save lives in the ⋯ menu only (no header bookmark icon).
    const moreMenuHtml = `
            <details class="post-more-menu card-more-menu directory-card-more">
                <summary aria-label="More opportunity actions">...</summary>
                <div class="post-more-panel">
                    ${savedToggleButtonHtml('opportunity', opportunity.id, opportunity.title, orgName, detailHref, 'Save opportunity', 'post-menu-action')}
                    <button type="button" onclick="openPrivateMessage('${jsString(orgName)}', '${jsString(opportunity.ownerId || '')}')">Message publisher</button>
                    <button type="button" onclick="openReportModal('opportunity', '${opportunity.id}', '${titleForMessage}')">Report</button>
                </div>
            </details>`;
    const actionsClass = ui ? ui.directoryActionsClass() : 'card-actions';
    const cardSpec = {
        href: detailHref,
        ariaLabel: opportunity.title || 'Opportunity',
        trType: 'glowe_opportunity',
        trId: opportunity.id,
        moreMenuHtml,
        avatarHtml,
        titleHtml: `<h3 class="opportunity-title" data-tr-field="title">${escapeHtml(opportunity.title)}</h3>`,
        descriptionHtml: `<p class="opportunity-description" data-tr-field="description">${escapeHtml(opportunity.description)}</p>`,
        detailsHtml: detailBits ? `<div class="opportunity-meta-group opportunity-details">${detailBits}</div>` : '',
        skillsHtml: (eventChip || skillTags) ? `<div class="opportunity-skills">${eventChip}${skillTags}</div>` : '',
        actionsHtml: `<div class="${actionsClass}">${renderShareButton(opportunity.title, detailHref)}</div>`
    };
    if (ui) return ui.directoryCardHtml(cardSpec);
    return `<article class="opportunity-card directory-card">${cardSpec.titleHtml}${cardSpec.actionsHtml}</article>`;
}

// Render organization card — same directory shell as opportunity cards.
function renderOrganizationCard(organization, basePath = '') {
    const ui = directoryUi();
    const profileHref = glowePageHref(`${basePath}pages/profile.html`, `id=${encodeURIComponent(organization.id)}`);
    const orgPair = orgNamePairFrom(organization);
    const placeBits = uniqueCardMeta([organization.location, organization.scope]);
    const volunteerCount = String(organization.volunteers || 0);
    const detailHtml = [
        ...placeBits.map((v) => `<span class="opportunity-detail">${escapeHtml(v)}</span>`),
        // Split count + label so i18n can translate the exact key "volunteers".
        `<span class="opportunity-detail">${escapeHtml(volunteerCount)} <span>volunteers</span></span>`
    ].join('');
    const skillTags = uniqueCardMeta([
        organization.type || 'Organization',
        organization.impactArea || ''
    ]).map((tag, i) => {
        const tr = i === 0 ? ' data-tr-field="org_field"' : '';
        return `<span class="skill-tag"${tr}>${escapeHtml(tag)}</span>`;
    }).join('');
    const avatarInner = renderLocalizedEntityMark(orgPair.primary, orgPair.english, organization.name);
    const avatarHtml = ui
        ? ui.avatarWrapHtml(avatarInner, { verified: true })
        : `<span class="directory-avatar-wrap" title="Verified">${avatarInner}</span>`;
    // Save lives in the ⋯ menu only (no header bookmark icon).
    const moreMenuHtml = `
            <details class="post-more-menu card-more-menu directory-card-more">
                <summary aria-label="More profile actions">...</summary>
                <div class="post-more-panel">
                    ${savedToggleButtonHtml('profile', organization.id, organization.name, organization.type || 'Organization', profileHref, 'Save profile', 'post-menu-action')}
                    <button type="button" onclick="openPrivateMessage('${jsString(organization.name)}', '${jsString(organization.id)}')">Message</button>
                    <button type="button" onclick="openReportModal('profile', '${organization.id}', '${jsString(organization.name)}')">Report</button>
                </div>
            </details>`;
    const actionsClass = ui ? ui.directoryActionsClass() : 'card-actions org-card-actions';
    const cardSpec = {
        href: profileHref,
        ariaLabel: organization.name,
        trType: 'glowe_profile',
        trId: organization.id,
        moreMenuHtml,
        avatarHtml,
        titleHtml: `<h3 class="opportunity-title" data-follow-name="${organization.id}" ${bilingualNameAttrs(orgPair.primary, orgPair.english)}>${escapeHtml(organization.name)}</h3>`,
        descriptionHtml: `<p class="opportunity-description" data-tr-field="${organization.missionField}">${escapeHtml(organization.mission)}</p>`,
        detailsHtml: `<div class="opportunity-details">${detailHtml}</div>`,
        skillsHtml: `<div class="opportunity-skills">${skillTags}</div>`,
        actionsHtml: `<div class="${actionsClass}">`
            + `<button class="btn btn-primary btn-small" type="button" onclick="openReachOutModal('${organization.id}', '${jsString(organization.name)}')">Reach Out</button>`
            + `<span class="follow-slot" data-follow-slot="${organization.id}"></span>`
            + `</div>`
    };
    if (ui) return ui.directoryCardHtml(cardSpec);
    return `<article class="opportunity-card directory-card">${cardSpec.titleHtml}${cardSpec.actionsHtml}</article>`;
}

// Wish board cards share the org/opportunity directory shell (FR-GLOWE-006 /
// AC9): small avatar in the header; Save + Share only inside the ⋯ menu (no
// white circle / heart / footer Share); stretch link opens the wish detail modal.
function renderWishCard(wish) {
    const ui = directoryUi();
    const style = wishTypeStyles[wish.type] || { color: '#E3F5F0' };
    const areas = Array.isArray(wish.areas) ? wish.areas : [];
    const authorPair = authorNamePairFrom(wish);
    const authorName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.resolveLocalizedName(authorPair.primary, authorPair.english, gloweReaderLang())
            || authorPair.primary || 'GloWe Member'
        : (wish.author || 'GloWe Member');
    const wishHref = glowePageHref('wishing-well.html', `wish=${encodeURIComponent(wish.id)}`);
    // Save + Share live in the ⋯ menu only (no oversized footer Share button).
    const moreMenuHtml = `
            <details class="post-more-menu card-more-menu directory-card-more">
                <summary aria-label="More wish actions">...</summary>
                <div class="post-more-panel">
                    ${savedToggleButtonHtml('wish', wish.id, wish.title, authorName, wishHref, 'Save wish', 'post-menu-action')}
                    <button type="button" onclick="sharePost('${jsString(wish.title)}', '${jsString(wishHref)}')">Share</button>
                    <button type="button" onclick="openPrivateMessage('${jsString(authorName)}', '${jsString(wish.authorId || '')}')">Message author</button>
                    <button type="button" onclick="openReportModal('wish', '${wish.id}', '${jsString(wish.title)}')">Report</button>
                </div>
            </details>`;
    const avatarInner = renderLocalizedEntityMark(authorPair.primary, authorPair.english, authorName);
    const avatarHtml = (ui
        ? ui.avatarWrapHtml(avatarInner, { verified: false })
        : avatarInner)
        + `<span class="directory-card-org-name" ${bilingualNameAttrs(authorPair.primary, authorPair.english)}>${escapeHtml(authorName)}</span>`;
    const detailHtml = uniqueCardMeta([wish.location, areas.join(', '), wish.time])
        .map((v) => `<span class="opportunity-detail">${escapeHtml(v)}</span>`)
        .join('');
    const typeTag = wish.type
        ? `<span class="skill-tag directory-card-meta-chip" style="background:${style.color}" title="${escapeHtml(wish.type)}">${escapeHtml(wish.type)}</span>`
        : '';
    const actionsClass = ui ? ui.directoryActionsClass() : 'card-actions';
    const cardSpec = {
        href: wishHref,
        ariaLabel: wish.title || 'Open wish details',
        stretchOnclick: `event.preventDefault(); openWishDetail('${wish.id}')`,
        trType: 'glowe_post',
        trId: wish.id,
        moreMenuHtml,
        avatarHtml,
        titleHtml: `<h3 class="opportunity-title" data-tr-field="title">${escapeHtml(wish.title)}</h3>`,
        descriptionHtml: `<p class="opportunity-description" data-tr-field="text">${escapeHtml(wish.description)}</p>`,
        detailsHtml: detailHtml ? `<div class="opportunity-details">${detailHtml}</div>` : '',
        skillsHtml: typeTag ? `<div class="opportunity-skills">${typeTag}</div>` : '',
        actionsHtml: `<div class="${actionsClass}">`
            + `<button class="btn btn-primary btn-small" type="button" onclick="showSupportModal('${wish.id}')">Offer Support</button>`
            + wishOwnerControls(wish)
            + `</div>`
    };
    if (ui) return ui.directoryCardHtml(cardSpec);
    return `<article class="opportunity-card directory-card">${cardSpec.titleHtml}${cardSpec.actionsHtml}</article>`;
}

function renderProjectCard(project, options) {
    // `options.deletable` is only passed from the owner's Personal Area. On the
    // public profile the map callback passes the numeric index here, whose
    // `.deletable` is undefined — so the control stays hidden for viewers.
    const ownerActions = (options && options.deletable)
        ? GloweProfileUx.projectOwnerActionsHtml(jsString(project.id))
        : '';
    return `
        <div class="project-card" data-tr-card data-tr-type="glowe_project" data-tr-id="${project.id}">
            <span class="opportunity-badge">${escapeHtml(project.status)}</span>
            <h3 data-tr-field="title">${escapeHtml(project.title)}</h3>
            <p data-tr-field="description">${escapeHtml(project.description)}</p>
            ${ownerActions}
        </div>
    `;
}

function formatCommentCount(count) {
    const n = Number(count) || 0;
    const lang = (typeof getGloweLanguage === 'function') ? getGloweLanguage() : 'en';
    if (lang === 'he') {
        if (n === 0) return 'אין תגובות';
        if (n === 1) return 'תגובה אחת';
        return `${n} תגובות`;
    }
    if (n === 1) return '1 comment';
    return `${n} comments`;
}

// BCP-47 tag for Intl/toLocaleDateString calls. GLOWE_LANGUAGES codes ('en',
// 'he', 'ru', 'ar', 'am') already are valid BCP-47 primary tags, so this is a
// pass-through today — named separately so a future switch to a more specific
// region tag (e.g. 'he-IL') only touches one place.
function gloweLocaleTag() {
    return getGloweLanguage();
}

// GLOWE_TRANSLATIONS['Post'] already carries the verb sense ("Publish") for the
// compose/submit buttons, so the post-type badge's noun sense ("a post") needs
// its own small map — reusing that key would render the badge as "Publish |
// Knowledge Share" instead of "Post | Knowledge Share".
const GLOWE_POST_NOUN = { he: 'פוסט', ru: 'Пост', ar: 'منشور', am: 'ልጥፍ' };

// The post-type badge concatenates a static "Post" label with post.category in
// one template literal, which collapses into a single DOM text node that the
// passive i18n walker (translateGloweTree) can never match against a
// dictionary key — so it always rendered in English regardless of interface
// language. Build the localized string here instead. Forum-originated posts
// store category as "<Label> | <Group Title>", where the group title is real
// content and must stay verbatim — only the recognized prefix is translated.
function glowePostTypeLabel(category, separator) {
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    const postWord = GLOWE_POST_NOUN[getGloweLanguage()] || 'Post';
    const raw = String(category || '').trim();
    if (!raw) return postWord;
    const sepIdx = raw.indexOf(' | ');
    const label = sepIdx === -1
        ? ((dict && dict[raw]) || raw)
        : ((dict && dict[raw.slice(0, sepIdx)]) || raw.slice(0, sepIdx)) + raw.slice(sepIdx);
    return `${postWord}${separator || ' | '}${label}`;
}

// Same problem as glowePostTypeLabel() above: a static "<Label>:" prefix glued
// to a dynamic value in one template literal never reaches the i18n walker as
// an isolated text node, so it always rendered in English. Look the label up
// in the shared dict directly instead.
function glowePrefixedLabel(key) {
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    return `${(dict && dict[key]) || key}:`;
}

// Same problem again, mirrored: a count glued in FRONT of a static label
// ("3 volunteers connected") — the count comes first this time, but it still
// collapses into one text node the i18n walker can never match.
function gloweCountedLabel(count, key) {
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    return `${count} ${(dict && dict[key]) || key}`;
}

// Plain dict lookup with English fallback, for a JS-level fallback string
// that isn't itself glued to a dynamic value (unlike the helpers below) but
// still needs a translation before it's used as one.
function gloweText(key) {
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    return (dict && dict[key]) || key;
}

// A dynamic value sandwiched between a static prefix and suffix ("The work
// responds to needs connected to X and helps make local knowledge easier to
// access and act on.") — same weld problem, just with text on both sides.
function gloweSandwichedLabel(prefixKey, value, suffixKey) {
    const dict = typeof gloweDict === 'function' ? gloweDict() : null;
    const prefix = (dict && dict[prefixKey]) || prefixKey;
    const suffix = (dict && dict[suffixKey]) || suffixKey;
    return `${prefix}${value}${suffix}`;
}

// TD-141 — admin/self-facing badges (report status, report/saved-item target
// type) rendered the raw DB enum value verbatim with no label at all, so
// there was no English word for translateGloweTree to match. These maps give
// each enum value an English label, which then goes through the normal dict
// lookup. 'post' reuses GLOWE_POST_NOUN — same "Post" verb/noun collision as
// glowePostTypeLabel() above.
const GLOWE_REPORT_STATUS_LABEL = { open: 'Open', dismissed: 'Dismissed', actioned: 'Actioned' };
const GLOWE_TARGET_TYPE_LABEL = {
    post: null, opportunity: 'Opportunity', profile: 'Profile',
    comment: 'Comment', thread: 'Thread', reply: 'Reply', general: 'General'
};
const GLOWE_SAVED_ITEM_TYPE_LABEL = { post: null, profile: 'Profile', wish: 'Wish', opportunity: 'Opportunity' };

function gloweEnumLabel(map, key) {
    const label = map[String(key || '')];
    if (label === null) return GLOWE_POST_NOUN[getGloweLanguage()] || 'Post';
    return gloweText(label || key);
}

// Session-only: which post comment threads the viewer opened this visit.
// Survives community re-renders (post/comment submit) without localStorage.
const gloweExpandedPostComments = new Set();

function isPostCommentsExpanded(postId) {
    return gloweExpandedPostComments.has(String(postId));
}

function expandPostComments(postId) {
    gloweExpandedPostComments.add(String(postId));
}

function renderPostCommentRow(comment, { lead = false, postId = '', openOnClick = false } = {}) {
    const commentPair = authorNamePairFrom(comment);
    const commentAuthor = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.resolveLocalizedName(commentPair.primary, commentPair.english, gloweReaderLang())
        : (comment.author || 'Community Member');
    const commentId = comment.id || '';
    const trAttrs = commentId
        ? ` data-tr-card data-tr-type="glowe_comment" data-tr-id="${escapeHtml(String(commentId))}"`
        : '';
    const leadClass = lead ? ' comment-row--lead' : '';
    const openAttrs = openOnClick
        ? ` role="button" tabindex="0" onclick="openPostComments('${jsString(postId)}')"`
        : '';
    return `
                    <article class="comment-row${leadClass}"${trAttrs}${openAttrs}>
                        ${renderLocalizedEntityMark(commentPair.primary, commentPair.english, commentAuthor, 'comment-avatar')}
                        <div>
                            ${commentId ? translationToggleSlotHtml() : ''}
                            <strong ${bilingualNameAttrs(commentPair.primary, commentPair.english)}>${escapeHtml(commentAuthor)}</strong>
                            <p${commentId ? ' data-tr-field="text"' : ''}>${escapeHtml(comment.text)}</p>
                        </div>
                    </article>`;
}

// Pre-existing render hotspot (owner menu + comments + tags); this PR only
// added the action icons/count + share button, not the underlying complexity.
// fallow-ignore-next-line complexity
function renderPostCard(post) {
    const authorPair = authorNamePairFrom(post);
    const authorName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedAuthorName(post, gloweReaderLang(), 'Community Member')
        : (post.authorName || 'Community Member');
    const profileHref = post.authorId ? `profile.html?id=${post.authorId}` : '#';
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const postId = post.id || getPostId(post);
    const comments = getPostCommentsFor(postId);
    const commentsExpanded = isPostCommentsExpanded(postId);
    const viewer = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const ownsPost = (typeof GlowePosts !== 'undefined')
        ? GlowePosts.isPostOwner(post, viewer && viewer.id)
        : Boolean(viewer && viewer.id && String(post.authorId) === String(viewer.id));
    const deleteButton = ownsPost
        ? `<button type="button" class="post-delete-action" onclick="deleteCommunityPost('${postId}')">Delete post</button>`
        : '';
    const tagsHtml = tags.length
        ? `<div class="post-tag-row">${tags.map((tag, i) =>
            `<span data-tr-field="tags.${i}" title="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
        ).join('')}</div>`
        : '';
    const leadComment = comments[0];
    const extraComments = comments.slice(1);
    const leadHtml = leadComment
        ? renderPostCommentRow(leadComment, { lead: true, postId, openOnClick: !commentsExpanded })
        : '';
    const extraHtml = extraComments.length
        ? `<div class="comment-thread-extra">${extraComments.map((c) => renderPostCommentRow(c, { postId })).join('')}</div>`
        : '';
    const moreCommentsHtml = comments.length > 1
        ? `<button type="button" class="comment-thread-toggle" onclick="openPostComments('${postId}')">${escapeHtml(gloweText('See all comments'))}</button>`
        : '';
    const collapsedClass = commentsExpanded ? ' is-expanded' : ' is-collapsed';
    return `
        <article class="post-card" id="post-${postId}" data-tr-card data-tr-type="glowe_post" data-tr-id="${postId}">
            <details class="post-more-menu">
                <summary aria-label="More post actions">...</summary>
                <div class="post-more-panel">
                    ${savedToggleButtonHtml('post', postId, post.title, post.category, `community.html#post-${postId}`, 'Save post', 'post-menu-action')}
                    ${savedToggleButtonHtml('profile', post.authorId || authorName, authorName, 'Community profile', profileHref, 'Save profile', 'post-menu-action')}
                    <button type="button" onclick="openPrivateMessage('${jsString(authorName)}', '${jsString(post.authorId || '')}')">Message</button>
                    <button type="button" onclick="openReportModal('post', '${postId}', '${jsString(post.title)}')">Report</button>
                    ${deleteButton}
                </div>
            </details>
            <div class="post-author-row">
                <a class="post-author" href="${profileHref}">
                    ${renderLocalizedEntityMark(authorPair.primary, authorPair.english, authorName, 'avatar')}
                    <span>
                        <strong ${bilingualNameAttrs(authorPair.primary, authorPair.english)}>${escapeHtml(authorName)}</strong>
                        <small>${post.createdAt ? new Date(post.createdAt).toLocaleDateString(gloweLocaleTag()) : gloweText('now')}</small>
                    </span>
                </a>
                <span class="post-type-tag" title="${escapeHtml(glowePostTypeLabel(post.category))}">${escapeHtml(glowePostTypeLabel(post.category))}</span>
            </div>
            ${translationToggleSlotHtml()}
            <h3 data-tr-field="title">${escapeHtml(post.title)}</h3>
            <p data-tr-field="text">${escapeHtml(post.text)}</p>
            ${tagsHtml}
            <div class="post-engagement-row">
                <button type="button" class="comment-summary" aria-live="polite" onclick="openPostComments('${postId}')">${formatCommentCount(comments.length)}</button>
            </div>
            <div class="post-actions">
                <button type="button" onclick="openPostComments('${postId}')">${COMMENT_ICON_SVG}<span>Comment</span>${comments.length ? `<span class="action-count">${comments.length}</span>` : ''}</button>
                <button type="button" onclick="openPrivateMessage('${jsString(authorName)}', '${jsString(post.authorId || '')}')">${SEND_ICON_SVG}<span>Send</span></button>
                ${renderShareButton(post.title, `community.html?post=${encodeURIComponent(postId)}`)}
            </div>
            <div class="post-comments${collapsedClass}" id="comments-${postId}">
                ${leadHtml}
                ${extraHtml}
                ${moreCommentsHtml}
                <form class="comment-form" onsubmit="handlePostComment(event, '${postId}')">
                    <input id="comment-input-${postId}" aria-label="Write a thoughtful comment..." placeholder="Write a thoughtful comment..." required onfocus="revealPostComments('${postId}')">
                    <button type="submit">Post</button>
                </form>
            </div>
        </article>
    `;
}

function focusCommentBox(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function revealPostComments(postId) {
    expandPostComments(postId);
    const thread = document.getElementById(`comments-${postId}`);
    if (thread) {
        thread.classList.remove('is-collapsed');
        thread.classList.add('is-expanded');
    }
}

function openPostComments(postId) {
    revealPostComments(postId);
    focusCommentBox(postId);
}

function handlePostComment(event, postId) {
    event.preventDefault();
    const input = event.target.querySelector('input');
    if (!input || !input.value.trim()) return;
    expandPostComments(postId);
    savePostComment(postId, input.value);
    initCommunityPage();
    setTimeout(() => focusCommentBox(postId), 0);
}

function renderDailyActionCard(action) {
    return `
        <article class="daily-action-card">
            <span>${action.label}</span>
            <h3>${action.title}</h3>
            <p>${action.description}</p>
            <a class="btn btn-primary btn-small" href="${action.href}">${action.cta}</a>
        </article>
    `;
}

function renderSmartMatch(match) {
    return `
        <article class="match-card">
            <div class="match-score">${match.score}%</div>
            <div>
                <span class="wish-type">${match.type}</span>
                <h3>${match.title}</h3>
                <p>${match.reason}</p>
                <button class="btn btn-outline btn-small" type="button" onclick="showSupportModal()">${match.action}</button>
            </div>
        </article>
    `;
}

function renderPlaybook(playbook) {
    return `
        <article class="playbook-card">
            <span>${playbook.area}</span>
            <h3>${playbook.title}</h3>
            <p>${playbook.description}</p>
            <button class="btn btn-outline btn-small" type="button" onclick="showSuccessModal('Playbook opened', 'In the full platform this will open a concise, multilingual action guide.')">Open Playbook</button>
        </article>
    `;
}

function renderDistributionTool(tool) {
    return `
        <article class="capability-card">
            <span class="capability-label">Distribution</span>
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
        </article>
    `;
}

function renderGrantRecommendation(grant) {
    return `
        <article class="grant-card">
            <div class="match-score">${grant.fit}%</div>
            <div>
                <span class="capability-label">Grant match</span>
                <h3>${grant.fund}</h3>
                <p>${grant.focus}</p>
                <small>${glowePrefixedLabel('Deadline')} ${grant.deadline}</small>
                <a class="btn btn-outline btn-small" href="pages/whats-next.html">Learn More</a>
            </div>
        </article>
    `;
}

function renderEngagementTool(tool) {
    return `
        <article class="capability-card">
            <span class="capability-label">Interaction</span>
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
            <button class="btn btn-outline btn-small" type="button" onclick="addProjectFeedback()">Try Flow</button>
        </article>
    `;
}

function renderRewardLeader(leader, index) {
    return `
        <article class="leader-card">
            <div class="leader-rank">${index + 1}</div>
            <div>
                <span class="capability-label">${leader.badge}</span>
                <h3>${leader.name}</h3>
                <p>${leader.reason}</p>
                <strong>${leader.score.toLocaleString()} points</strong>
                <button class="btn btn-outline btn-small" type="button" onclick="rateOrganization('${leader.name.replace(/'/g, "\\'")}')">Review Impact</button>
            </div>
        </article>
    `;
}

function renderRole(role) {
    return `
        <article class="role-row">
            <strong>${role.role}</strong>
            <p>${role.permissions}</p>
        </article>
    `;
}

function renderBusinessItem(item) {
    return `<article class="business-row">${item}</article>`;
}

function renderRoadmapPhase(phase) {
    return `
        <article class="roadmap-row">
            <span>${phase.phase}</span>
            <h4>${phase.title}</h4>
            <p>${phase.focus}</p>
        </article>
    `;
}

function renderPostTopicButton(topic, index) {
    return `
        <button class="topic-choice ${index === 0 ? 'active' : ''}" type="button" data-post-topic="${topic.id}">
            <strong>${topic.label}</strong>
            <span>${topic.description}</span>
        </button>
    `;
}

function openInlineComposer() {
    const container = document.getElementById('inline-composer');
    if (!container) return;
    container.classList.add('active');
    container.innerHTML = `
        <form id="inline-post-form" class="inline-post-form" onsubmit="handleInlinePostSubmit(event)">
            <div class="section-toolbar compact-toolbar">
                <div>
                    <span class="hero-kicker">New post</span>
                    <h2>Write to the community</h2>
                </div>
                <button class="btn btn-outline btn-small" type="button" onclick="closeInlineComposer()">Close</button>
            </div>
            <div class="form-grid-2">
                <div class="form-group">
                    <label for="inline-post-topic">Topic</label>
                    <select id="inline-post-topic" required>
                        ${postTopics.map(topic => `<option value="${topic.id}">${topic.label}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="inline-post-tags">Tags</label>
                    <input id="inline-post-tags" type="text" placeholder="Education, Climate, Health">
                </div>
            </div>
            <div id="inline-topic-prompt" class="topic-prompt"></div>
            <div class="form-group">
                <label for="inline-post-title">Title</label>
                <input id="inline-post-title" type="text" required placeholder="What do you want the community to notice?">
            </div>
            <div class="form-group">
                <label for="inline-post-body">Post</label>
                <textarea id="inline-post-body" rows="5" required placeholder="Share knowledge, ask for a connection, publish an event, or start a discussion."></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" type="submit">Publish to Feed</button>
                <button class="btn btn-outline" type="button" onclick="showSuccessModal('Draft saved', 'Your post draft is saved in this workspace.')">Save Draft</button>
            </div>
        </form>
    `;
    const topicSelect = document.getElementById('inline-post-topic');
    const prompt = document.getElementById('inline-topic-prompt');
    function updatePrompt() {
        const topic = postTopics.find(item => item.id === topicSelect.value) || postTopics[0];
        prompt.innerHTML = `<strong>${topic.label}</strong><span>${topic.prompt}</span>`;
    }
    topicSelect.addEventListener('change', updatePrompt);
    updatePrompt();
}

function closeInlineComposer() {
    const container = document.getElementById('inline-composer');
    if (container) {
        container.classList.remove('active');
        container.innerHTML = '';
    }
}

async function handleInlinePostSubmit(event) {
    event.preventDefault();
    const topic = postTopics.find(item => item.id === document.getElementById('inline-post-topic').value) || postTopics[0];
    const author = gloweCurrentAuthorNamePair();
    const published = await submitCommunityPost({
        title: document.getElementById('inline-post-title').value,
        category: topic.label,
        text: document.getElementById('inline-post-body').value,
        tags: document.getElementById('inline-post-tags').value,
        audience: 'Everyone',
        author_name: author.primary,
        author_name_en: author.english || null
    });
    if (!published) return;
    closeInlineComposer();
    await initCommunityPage();
    showActionToast('Post published to feed', 'The new post appears at the top of the community feed.');
}

function initWritePostPage() {
    const topicsContainer = document.getElementById('post-topics');
    const topicSelect = document.getElementById('post-topic');
    const promptBox = document.getElementById('topic-prompt');
    const preview = document.getElementById('post-preview');
    const form = document.getElementById('post-form');
    if (!topicsContainer || !topicSelect || !promptBox || !preview || !form) return;

    topicsContainer.innerHTML = postTopics.map(renderPostTopicButton).join('');
    topicSelect.innerHTML = postTopics.map(topic => `<option value="${topic.id}">${topic.label}</option>`).join('');

    function selectedTopic() {
        return postTopics.find(topic => topic.id === topicSelect.value) || postTopics[0];
    }

    function setTopic(topicId) {
        topicSelect.value = topicId;
        document.querySelectorAll('[data-post-topic]').forEach(button => {
            button.classList.toggle('active', button.dataset.postTopic === topicId);
        });
        updatePreview();
    }

    function updatePreview() {
        const topic = selectedTopic();
        const title = document.getElementById('post-title').value || 'Your post title';
        const audience = document.getElementById('post-audience').value || 'Community members';
        const body = document.getElementById('post-body').value || topic.prompt;
        const tags = document.getElementById('post-tags').value || 'Education, Climate, Health';
        promptBox.innerHTML = `<strong>${topic.label}</strong><span>${topic.prompt}</span>`;
        preview.innerHTML = `
            <article class="post-card">
                <span class="wish-type">${topic.label}</span>
                <h3>${title}</h3>
                <p>${body}</p>
                <div class="opportunity-details">
                    <span class="opportunity-detail">${glowePrefixedLabel('Audience')} ${audience}</span>
                    <span class="opportunity-detail">${glowePrefixedLabel('Tags')} ${tags}</span>
                </div>
                <div class="post-actions">
                    <button type="button">Like</button>
                    <button type="button">Comment</button>
                    <button type="button">Share</button>
                    <button type="button">Connect</button>
                </div>
            </article>
        `;
    }

    topicsContainer.addEventListener('click', event => {
        const button = event.target.closest('[data-post-topic]');
        if (button) setTopic(button.dataset.postTopic);
    });
    [topicSelect, ...form.querySelectorAll('input, textarea, select')].forEach(input => {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const topic = selectedTopic();
        const author = gloweCurrentAuthorNamePair();
        const published = await submitCommunityPost({
            title: document.getElementById('post-title').value,
            category: topic.label,
            text: document.getElementById('post-body').value,
            tags: document.getElementById('post-tags').value,
            audience: document.getElementById('post-audience').value,
            language: document.getElementById('post-language').value,
            link: document.getElementById('post-link').value,
            author_name: author.primary,
            author_name_en: author.english || null
        });
        if (!published) return;
        showActionToast('Post connected to feed', 'Your post was saved and will appear at the top of the community feed.');
        setTimeout(() => {
            window.location.href = 'community.html';
        }, 700);
    });
    setTopic(postTopics[0].id);
}

// Render application card
function renderApplicationCard(application) {
    // Prefer the pre-enriched fields from a live glowe_applications view
    // (FR-GLOWE-011 AC8); fall back to the local opportunity lookup for the
    // legacy localStorage application shape.
    const opportunity = getOpportunityByAnyId(application.opportunityId);
    const title = application.opportunityTitle || (opportunity ? opportunity.title : 'Unknown Opportunity');
    const org = application.organization || (opportunity ? opportunity.organization : '');
    const appliedAt = application.appliedAt || application.createdAt;
    const statusClass = `status-${String(application.status || '').toLowerCase()}`;

    return `
        <div class="application-card">
            <div class="application-info">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(org)}${appliedAt ? ` • ${gloweText('Applied on')} ${new Date(appliedAt).toLocaleDateString(gloweLocaleTag())}` : ''}</p>
            </div>
            <span class="application-status ${statusClass}">${escapeHtml(application.status || '')}</span>
        </div>
    `;
}

// Initialize featured opportunities on home page
async function initFeaturedOpportunities() {
    // FR-GLOWE-016 AC2 — signed-in members get a personalized home in the same
    // page container; guests fall through to the marketing home below untouched.
    // Auth flips (login/logout without navigation) re-enter via refreshHomeForAuthState
    // from updateAuthUI(); the auth-key guard prevents a double fetch on first paint.
    await refreshHomeForAuthState();
}

// Track which home shell is currently rendered so login/logout can swap it
// without a full page reload (FR-GLOWE-016 AC2).
let _gloweHomeAuthKey = null;
// Generation token: stale guest/member inits must not tear down a newer shell
// (rapid Home taps used to stack async initGuestHome over initMemberHome).
let _gloweHomeGen = 0;

function teardownMemberHome() {
    document.body.classList.remove('glowe-member-home');
    const root = document.getElementById('member-home');
    if (root && root._homeFeedObserver) {
        try { root._homeFeedObserver.disconnect(); } catch (_e) { /* ignore */ }
        root._homeFeedObserver = null;
        root._homeFeed = null;
    }
    if (!root) return;
    root.hidden = true;
    root.innerHTML = '';
    root.classList.remove('member-home-community-only');
}

function isHomeHref(href) {
    if (!href) return false;
    const clean = String(href).split(/[?#]/)[0];
    if (!clean || clean === '#') return false;
    return /(^|\/)index\.html?$/.test(clean)
        || clean === './'
        || clean === '/'
        || /\/glowe\/?$/.test(clean);
}

// FR-GLOWE-016 AC2 — tapping Home while already on Home must not full-reload
// the marketing HTML shell (that is what caused the guest flash).
function bindHomeSelfNavGuard() {
    if (window.__gloweHomeSelfNavBound) return;
    window.__gloweHomeSelfNavBound = true;
    document.addEventListener('click', function onHomeSelfNav(event) {
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!anchor) return;
        if (typeof resolveGlowePage !== 'function') return;
        if (resolveGlowePage(window.location.pathname) !== 'index') return;
        if (!isHomeHref(anchor.getAttribute('href'))) return;
        event.preventDefault();
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    }, true);
}

async function initGuestHome(gen = _gloweHomeGen) {
    if (gen !== _gloweHomeGen) return;
    teardownMemberHome();
    // Drop the pre-paint member expectation so guest marketing can show
    // (e.g. stale gloweUser cleared by syncSupabaseSession).
    if (window.GloweAuthPaint) window.GloweAuthPaint.clearExpectMemberPaint();

    const COMING_SOON = '<p class="muted-note">This section will come alive as the community grows.</p>';

    try {
        const sources = await loadHomeFeedSources();
        if (gen !== _gloweHomeGen) return;
        const HF = window.GloweHomeFeed;
        const ranked = HF ? HF.buildHomeFeed(sources, { nowMs: Date.now() }) : [];
        renderGuestHomeFeedPeek(ranked);
    } catch (_e) {
        if (gen !== _gloweHomeGen) return;
        const el = document.getElementById('guest-home-feed');
        if (el) {
            el.hidden = false;
            el.innerHTML = homeFeedEmptyHtml();
        }
    }

    const container = document.getElementById('featured-opportunities');
    if (container) {
        const featured = getFeaturedOpportunities().slice(0, 3);
        container.innerHTML = featured.length
            ? featured.map(opp => renderOpportunityCard(opp)).join('')
            : '<div class="empty-state"><h3>No opportunities posted yet</h3><p>Be the first to share a volunteer role or collaboration request with the community.</p><a class="btn btn-primary btn-small" href="pages/opportunities.html">Post an opportunity</a></div>';
    }

    if (gen !== _gloweHomeGen) return;

    const dailyContainer = document.getElementById('daily-actions');
    if (dailyContainer) dailyContainer.innerHTML = dailyActions.length ? dailyActions.map(renderDailyActionCard).join('') : COMING_SOON;

    const matchContainer = document.getElementById('smart-matches');
    if (matchContainer) matchContainer.innerHTML = smartMatches.length ? smartMatches.map(renderSmartMatch).join('') : COMING_SOON;

    const playbookContainer = document.getElementById('applied-playbooks');
    if (playbookContainer) playbookContainer.innerHTML = appliedPlaybooks.length ? appliedPlaybooks.map(renderPlaybook).join('') : COMING_SOON;

    const distributionContainer = document.getElementById('distribution-tools');
    if (distributionContainer) distributionContainer.innerHTML = distributionChannels.length ? distributionChannels.map(renderDistributionTool).join('') : COMING_SOON;

    const grantContainer = document.getElementById('grant-recommendations');
    if (grantContainer) grantContainer.innerHTML = grantRecommendations.length ? grantRecommendations.map(renderGrantRecommendation).join('') : COMING_SOON;

    const engagementContainer = document.getElementById('engagement-tools');
    if (engagementContainer) engagementContainer.innerHTML = engagementTools.length ? engagementTools.map(renderEngagementTool).join('') : COMING_SOON;

    const rewardsContainer = document.getElementById('reward-leaders');
    if (rewardsContainer) rewardsContainer.innerHTML = rewardLeaders.length ? rewardLeaders.map(renderRewardLeader).join('') : COMING_SOON;

    const rolesContainer = document.getElementById('user-roles');
    if (rolesContainer) rolesContainer.innerHTML = userRoleBlueprint.length ? userRoleBlueprint.map(renderRole).join('') : COMING_SOON;

    const businessContainer = document.getElementById('business-model');
    if (businessContainer) businessContainer.innerHTML = businessModelItems.length ? businessModelItems.map(renderBusinessItem).join('') : COMING_SOON;

    const roadmapContainer = document.getElementById('roadmap-phases');
    if (roadmapContainer) roadmapContainer.innerHTML = roadmapPhases.length ? roadmapPhases.map(renderRoadmapPhase).join('') : COMING_SOON;
}

// Swap guest ↔ member home immediately when auth state changes (no reload).
async function refreshHomeForAuthState(options = {}) {
    if (typeof resolveGlowePage === 'function' && resolveGlowePage(window.location.pathname) !== 'index') {
        return;
    }
    const loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();
    const user = loggedIn && typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const key = loggedIn ? ('in:' + (user && user.id ? user.id : '')) : 'out';
    if (!options.force && key === _gloweHomeAuthKey) return;
    const gen = ++_gloweHomeGen;
    _gloweHomeAuthKey = key;
    if (loggedIn) {
        await initMemberHome(gen);
        return;
    }
    await initGuestHome(gen);
}
window.refreshHomeForAuthState = refreshHomeForAuthState;
window.isHomeHref = isHomeHref;

// --- Member home (FR-GLOWE-016 AC2) — unified discovery feed ---------------

function homeFeedEmptyHtml() {
    return '<div class="empty-state"><h3>The community is just getting started</h3><p>Be the first to share a post or an opportunity others can join.</p><a class="btn btn-primary btn-small" href="pages/community.html">Start the conversation</a></div>';
}

function renderHomeFeedCard(item) {
    const HF = window.GloweHomeFeed;
    const kind = (item && item.kind) || 'post';
    const id = (item && item.id) || '';
    const href = (item && item.hrefPath) || (HF ? HF.defaultHref(kind, id, item) : '#');
    const tag = kind === 'post'
        ? glowePostTypeLabel((item && item.category) || '', ' · ')
        : gloweText((item && item.tagKey) || 'Post');
    const title = escapeHtml((item && item.title) || 'GloWe');
    const snippet = escapeHtml((item && item.snippet) || '');
    const author = escapeHtml((item && item.authorLabel) || '');
    const trType = (kind === 'opportunity' || kind === 'event')
        ? 'glowe_opportunity'
        : (kind === 'forum_thread' || kind === 'forum_group')
            ? 'glowe_forum_thread'
            : 'glowe_post';
    const field = (kind === 'opportunity' || kind === 'event') ? 'description' : 'text';
    return `
        <article class="home-feed-card member-feed-card" data-tr-card data-tr-type="${trType}" data-tr-id="${escapeHtml(String(id))}" data-feed-kind="${escapeHtml(kind)}">
            ${typeof translationToggleSlotHtml === 'function' ? translationToggleSlotHtml() : ''}
            <a class="member-feed-card-link" href="${escapeHtml(href)}">
                <span class="member-feed-type">${escapeHtml(tag)}</span>
                <h3 data-tr-field="title">${title}</h3>
                <p data-tr-field="${field}">${snippet}</p>
                ${author ? `<span class="member-feed-author">${author}</span>` : ''}
            </a>
        </article>`;
}

function scheduleMemberHomeTranslation(root) {
    if (!root || !window.GloweTranslate || typeof window.GloweTranslate.scan !== 'function') return;
    const scan = function () {
        root.querySelectorAll('[data-tr-card]').forEach(function (card) {
            if (!card.querySelector('.tr-toggle')) card.removeAttribute('data-tr-done');
        });
        window.GloweTranslate.scan(root);
    };
    scan();
    setTimeout(scan, 500);
    setTimeout(scan, 2000);
}

function renderMemberHomeMarkup(feedHtml) {
    return `
        <div class="container member-home-inner member-home-community-only">
            <section class="member-section member-home-community">
                <div class="section-toolbar">
                    <div><h2>What is happening on GloWe</h2></div>
                </div>
                <div class="member-feed-grid" id="home-feed-grid">${feedHtml}</div>
                <div id="home-feed-sentinel" class="home-feed-sentinel" aria-hidden="true"></div>
                <p id="home-feed-end" class="muted-note home-feed-end" hidden>You're caught up</p>
            </section>
        </div>`;
}

function attachHomeFeedObserver(root) {
    const sentinel = root.querySelector('#home-feed-sentinel');
    const grid = root.querySelector('#home-feed-grid');
    const endEl = root.querySelector('#home-feed-end');
    const HF = window.GloweHomeFeed;
    if (!sentinel || !grid || !HF || !window.IntersectionObserver) return;
    if (root._homeFeedObserver) {
        try { root._homeFeedObserver.disconnect(); } catch (_e) { /* ignore */ }
    }
    const io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        const st = root._homeFeed;
        if (!st || st.done) {
            if (endEl) endEl.hidden = false;
            io.disconnect();
            return;
        }
        const page = HF.pageSlice(st.items, st.offset, HF.PAGE_SIZE_NEXT);
        grid.insertAdjacentHTML('beforeend', page.items.map(renderHomeFeedCard).join(''));
        st.offset = page.nextOffset;
        st.done = page.done;
        if (page.done && endEl) endEl.hidden = false;
        scheduleMemberHomeTranslation(root);
    }, { rootMargin: '240px 0px' });
    io.observe(sentinel);
    root._homeFeedObserver = io;
}

async function loadHomeFeedSources() {
    await Promise.all([
        fetchAndPopulate(() => gloweBackend.listAll('opportunities'), opportunities, mapOpportunityRow, withEnsuredOrganizationEnglishNames),
        loadCommunityPosts(),
        loadPostComments(),
        loadLiveWishes(),
        loadForumGroups(),
        loadForumThreads()
    ]);
    const wishRows = Array.isArray(wishes) ? wishes : [];
    const openWishes = wishRows.filter(function (w) { return w && w.type !== 'Volunteer Offer'; });
    const openOffers = wishRows.filter(function (w) { return w && w.type === 'Volunteer Offer'; });
    return {
        posts: getAllCommunityPosts(),
        opportunities: getAllOpportunitiesForDisplay(),
        wishes: openWishes,
        offers: openOffers,
        forumGroups: getForumGroups(),
        forumThreads: getForumThreads(),
        commentsByPostId: backendPostComments || {},
        saveCountsByKey: {},
        isEvent: function (opp) {
            return typeof GloweEvents !== 'undefined' && GloweEvents.isEvent(opp);
        }
    };
}

function hideGuestHomeFeed() {
    const el = document.getElementById('guest-home-feed');
    if (el) {
        el.hidden = true;
        el.innerHTML = '';
    }
}

function renderGuestHomeFeedPeek(ranked) {
    const el = document.getElementById('guest-home-feed');
    const HF = window.GloweHomeFeed;
    if (!el || !HF) return;
    const preview = HF.pageSlice(ranked, 0, HF.GUEST_PREVIEW_LIMIT);
    el.hidden = false;
    el.innerHTML = `
        <div class="section-toolbar"><div><h2>What is happening on GloWe</h2></div></div>
        <div class="member-feed-grid">${preview.items.length ? preview.items.map(renderHomeFeedCard).join('') : homeFeedEmptyHtml()}</div>
        <div class="guest-home-feed-cta">
            <p>Join GloWe to see more and take part.</p>
            <button type="button" class="btn btn-primary" onclick="handleGoogleSignIn()">Continue with Google</button>
        </div>`;
    if (typeof translateGloweTree === 'function') translateGloweTree(el);
    scheduleMemberHomeTranslation(el);
}

async function initMemberHome(gen = _gloweHomeGen) {
    if (gen !== _gloweHomeGen) return;
    const root = document.getElementById('member-home');
    if (!root) return;
    document.body.classList.add('glowe-member-home');
    hideGuestHomeFeed();
    root.hidden = false;
    root.classList.add('member-home-community-only');
    root.innerHTML = '<div class="container"><p class="muted-note">Loading your GloWe home…</p></div>';

    const sources = await loadHomeFeedSources();
    if (gen !== _gloweHomeGen) return;

    const HF = window.GloweHomeFeed;
    const ranked = HF
        ? HF.buildHomeFeed(sources, { nowMs: Date.now() })
        : [];
    const page = HF
        ? HF.pageSlice(ranked, 0, HF.PAGE_SIZE_FIRST)
        : { items: [], nextOffset: 0, done: true };
    const feedHtml = page.items.length
        ? page.items.map(renderHomeFeedCard).join('')
        : homeFeedEmptyHtml();
    root.innerHTML = renderMemberHomeMarkup(feedHtml);
    root._homeFeed = { items: ranked, offset: page.nextOffset, done: page.done };
    if (page.done) {
        const endEl = root.querySelector('#home-feed-end');
        if (endEl && page.items.length) endEl.hidden = false;
    } else {
        attachHomeFeedObserver(root);
    }
    if (window.GloweAuthPaint) window.GloweAuthPaint.clearExpectMemberPaint();
    scheduleMemberHomeTranslation(root);
}

// Initialize all opportunities page
async function initOpportunitiesPage() {
    const container = document.getElementById('opportunities-list');
    const composer = document.getElementById('opportunity-composer');
    const filters = {
        location: 'all',
        field: 'all',
        commitment: 'all',
        event: 'all',
        search: ''
    };

    function applyEventFilter(list) {
        if (filters.event === 'all' || typeof GloweEvents === 'undefined') return list;
        const eventFilters = filters.event === 'physical' || filters.event === 'digital'
            ? { type: filters.event }
            : { timeframe: filters.event === 'upcoming' ? 'upcoming' : 'all' };
        return GloweEvents.sortByStart(GloweEvents.filterEvents(list, eventFilters));
    }

    function renderOpportunities() {
        const filtered = applyEventFilter(filterOpportunityCatalog(getAllOpportunitiesForDisplay(), filters));
        if (filtered.length === 0) {
            const hasFilters = filters.location !== 'all' || filters.field !== 'all' || filters.commitment !== 'all' || filters.event !== 'all' || filters.search;
            container.innerHTML = hasFilters
                ? '<div class="empty-state"><div class="empty-state-icon">No results</div><h3>No opportunities found</h3><p>Try adjusting your filters or search terms.</p></div>'
                : '<div class="empty-state"><h3>No opportunities posted yet</h3><p>Be the first to share a volunteer role or collaboration request with the GloWe community.</p><button class="btn btn-primary btn-small" type="button" onclick="openOpportunityComposer()">Post an opportunity</button></div>';
        } else {
            container.innerHTML = filtered.map(opp => renderOpportunityCard(opp, '../')).join('');
        }
    }

    window.renderOpportunitiesList = renderOpportunities;

    // Re-fetch the live board after a publish so created opportunities appear
    // with real server ids (working detail links), not a client-side copy.
    reloadOpportunities = async function () {
        await fetchAndPopulate(() => gloweBackend.listAll('opportunities'), opportunities, mapOpportunityRow, withEnsuredOrganizationEnglishNames);
        renderOpportunities();
    };

    // Add filter event listeners
    const locationFilter = document.getElementById('filter-location');
    const fieldFilter = document.getElementById('filter-field');
    const commitmentFilter = document.getElementById('filter-commitment');
    const eventFilter = document.getElementById('filter-event');
    const searchInput = document.getElementById('search-opportunities');

    if (locationFilter) {
        locationFilter.addEventListener('change', function() {
            filters.location = this.value;
            renderOpportunities();
        });
    }

    if (fieldFilter) {
        fieldFilter.addEventListener('change', function() {
            filters.field = this.value;
            renderOpportunities();
        });
    }

    if (commitmentFilter) {
        commitmentFilter.addEventListener('change', function() {
            filters.commitment = this.value;
            renderOpportunities();
        });
    }

    if (eventFilter) {
        eventFilter.addEventListener('change', function() {
            filters.event = this.value;
            renderOpportunities();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filters.search = this.value;
            renderOpportunities();
        });
    }

    // Fetch real data then render
    if (container) {
        container.innerHTML = '<div class="empty-state"><p class="muted-note">Loading opportunities…</p></div>';
        await fetchAndPopulate(() => gloweBackend.listAll('opportunities'), opportunities, mapOpportunityRow, withEnsuredOrganizationEnglishNames);
        renderOpportunities();
    }

    if (composer && !composer.dataset.ready) {
        composer.dataset.ready = 'true';
    }

    // FR-GLOWE-016 AC7 — the create menu deep-links here with ?compose=1 to
    // open the publish form directly.
    if (new URLSearchParams(window.location.search).get('compose') === '1') {
        openOpportunityComposer();
        const composerEl = document.getElementById('opportunity-composer');
        if (composerEl) composerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function openOpportunityComposer() {
    const composer = document.getElementById('opportunity-composer');
    if (!composer) return;

    composer.classList.add('active');
    composer.innerHTML = `
        <form class="inline-post-form opportunity-form" onsubmit="handleOpportunitySubmit(event)">
            <div class="form-grid-2">
                <div class="form-group">
                    <label for="opportunity-title">Opportunity title</label>
                    <input id="opportunity-title" required placeholder="Example: Volunteer translator for community guide">
                </div>
                <div class="form-group">
                    <label for="opportunity-organization">Organization or project</label>
                    <input id="opportunity-organization" required placeholder="Organization / initiative name">
                </div>
                <div class="form-group">
                    <label for="opportunity-type">Opportunity type</label>
                    <select id="opportunity-type" required>
                        <option value="Flexible">Volunteer Opportunity</option>
                        <option value="Part-time">Part-time Role</option>
                        <option value="Full-time">Paid Full-time Role</option>
                        <option value="Project-based">Project-based Collaboration</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="opportunity-field">Impact field</label>
                    <select id="opportunity-field" required>
                        <option value="community">Community</option>
                        <option value="education">Education</option>
                        <option value="environment">Environment</option>
                        <option value="advocacy">Advocacy</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="opportunity-location">Location</label>
                    <input id="opportunity-location" required placeholder="Remote / Tel Aviv / Global">
                </div>
                <div class="form-group">
                    <label for="opportunity-duration">Duration</label>
                    <input id="opportunity-duration" required placeholder="One day / 3 months / Ongoing">
                </div>
            </div>
            <div class="form-group">
                <label for="opportunity-description">Short description</label>
                <textarea id="opportunity-description" rows="4" required placeholder="Describe the need, who this helps, and what the person will do."></textarea>
            </div>
            <div class="form-grid-2">
                <div class="form-group">
                    <label for="opportunity-skills">Skills or tags</label>
                    <input id="opportunity-skills" required placeholder="Translation, facilitation, research">
                </div>
                <div class="form-group">
                    <label for="opportunity-requirements">Requirements</label>
                    <input id="opportunity-requirements" placeholder="Languages, experience, availability">
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" type="submit">Publish Opportunity</button>
                <button class="btn btn-outline" type="button" onclick="closeOpportunityComposer()">Cancel</button>
            </div>
        </form>
    `;
    document.getElementById('opportunity-title').focus();
}

function closeOpportunityComposer() {
    const composer = document.getElementById('opportunity-composer');
    if (!composer) return;
    composer.classList.remove('active');
    composer.innerHTML = '';
}

async function handleOpportunitySubmit(event) {
    event.preventDefault();
    if (!canCreateContent()) return;
    const helpers = (typeof GloweOpportunities !== 'undefined') ? GloweOpportunities : null;
    const author = gloweCurrentAuthorNamePair();
    const orgPrimary = document.getElementById('opportunity-organization').value;
    const draft = {
        title: document.getElementById('opportunity-title').value,
        organization: orgPrimary,
        organization_en: (String(orgPrimary || '').trim() === String(author.primary || '').trim()
            || !String(orgPrimary || '').trim())
            ? (author.english || null)
            : ((typeof GloweLocalizedName !== 'undefined'
                && GloweLocalizedName.isPrimarilyLatin(orgPrimary)) ? orgPrimary.trim() : null),
        commitment: document.getElementById('opportunity-type').value,
        field: document.getElementById('opportunity-field').value,
        location: document.getElementById('opportunity-location').value,
        duration: document.getElementById('opportunity-duration').value,
        description: document.getElementById('opportunity-description').value,
        skills: document.getElementById('opportunity-skills').value,
        requirements: document.getElementById('opportunity-requirements').value
    };
    const check = helpers ? helpers.validateOpportunityDraft(draft) : { valid: Boolean(draft.title) };
    if (!check.valid) { showSuccessModal('Missing details', check.error || 'Please complete the opportunity.'); return; }
    const payload = helpers ? helpers.normalizeOpportunityDraft(draft) : draft;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    try {
        await backend.insertOwned('opportunities', payload);
        closeOpportunityComposer();
        event.target.reset();
        if (reloadOpportunities) await reloadOpportunities();
        showActionToast('Opportunity published', `${payload.title} was added to the opportunities board.`);
    } catch (_e) {
        showSuccessModal('Could not publish', 'Something went wrong publishing your opportunity. Please try again.');
    }
}

// Initialize organizations page
async function initOrganizationsPage() {
    const container = document.getElementById('organizations-list');
    if (!container) return;

    const searchInput = document.getElementById('organization-search');
    const regionSelect = document.getElementById('organization-region-filter');
    const typeSelect = document.getElementById('organization-type-filter');
    const clearButton = document.getElementById('organization-clear-filters');
    const countLabel = document.getElementById('organization-results-count');

    function buildVisibleOrgs() {
        return [...organizations];
    }

    function refreshFilters(visibleOrgs) {
        const regions = [...new Set(visibleOrgs.map(org => org.country || org.scope || org.location).filter(Boolean))].sort();
        const types = [...new Set(visibleOrgs.map(org => org.type || 'Organization').filter(Boolean))].sort();
        if (regionSelect) {
            regionSelect.innerHTML = '<option value="all">All regions</option>' + regions.map(region => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join('');
        }
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="all">All types</option>' + types.map(type => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
        }
    }

    function renderOrganizations() {
        const visibleOrgs = buildVisibleOrgs();
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const region = regionSelect ? regionSelect.value : 'all';
        const type = typeSelect ? typeSelect.value : 'all';
        const filtered = visibleOrgs.filter(org => {
            const searchable = [org.name, org.type, org.mission, org.impactArea, org.country, org.location, org.scope, org.size].filter(Boolean).join(' ').toLowerCase();
            const regionMatch = region === 'all' || [org.country, org.scope, org.location].filter(Boolean).some(v => String(v).toLowerCase().includes(region.toLowerCase()));
            const typeMatch = type === 'all' || String(org.type || '').toLowerCase() === type.toLowerCase();
            const queryMatch = !query || searchable.includes(query);
            return regionMatch && typeMatch && queryMatch;
        });

        const hasFilters = query || (regionSelect && regionSelect.value !== 'all') || (typeSelect && typeSelect.value !== 'all');
        container.innerHTML = filtered.length
            ? filtered.map(org => renderOrganizationCard(org, '../')).join('')
            : hasFilters
                ? '<div class="empty-state organizations-empty-state"><h3>No matching profiles</h3><p>Try a broader keyword or clear a filter.</p></div>'
                : '<div class="empty-state organizations-empty-state"><h3>No organizations yet</h3><p>Organizations join GloWe by creating a profile and completing verification. The first approved profiles will appear here.</p></div>';

        if (countLabel) {
            countLabel.textContent = `${filtered.length} of ${visibleOrgs.length} profiles shown`;
        }
        hydrateFollowSlots(container);
    }

    [searchInput, regionSelect, typeSelect].filter(Boolean).forEach(control => {
        control.addEventListener('input', renderOrganizations);
        control.addEventListener('change', renderOrganizations);
    });
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (regionSelect) regionSelect.value = 'all';
            if (typeSelect) typeSelect.value = 'all';
            renderOrganizations();
        });
    }

    container.innerHTML = '<div class="empty-state"><p class="muted-note">Loading organizations…</p></div>';
    try {
        const rows = await gloweBackend.listApprovedOrgs();
        const ensured = await withEnsuredEnglishNames(rows || []);
        organizations.splice(0, organizations.length, ...ensured.map(mapProfileToOrg));
    } catch (_e) {
        organizations.splice(0, organizations.length);
    }
    refreshFilters(buildVisibleOrgs());
    renderOrganizations();
}

// Re-read + re-render the wish board after a create/close. Assigned when the
// Wishing Well page initialises; a no-op elsewhere.
let reloadWishBoard = null;
let resetWishBoardFilters = null;

async function initWishingWellPage() {
    const container = document.getElementById('wishes-list');
    const typeButtons = document.querySelectorAll('[data-wish-type]');
    const areaButtons = document.querySelectorAll('[data-impact-area]');
    const searchInput = document.getElementById('wish-search');
    const sortSelect = document.getElementById('wish-sort');
    const clearBtn = document.getElementById('clear-wish-filters');
    const resultsCount = document.getElementById('wish-results-count');
    const filterToggle = document.getElementById('wish-filter-toggle');
    const advancedFilters = document.getElementById('wish-filter-advanced');
    const filters = { type: 'all', area: 'all', query: '', sort: 'newest' };

    function renderWishes() {
        const helpers = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
        const hasFilters = filters.type !== 'all' || filters.area !== 'all' || filters.query;
        const filtered = helpers ? helpers.filterWishes(wishes, filters) : wishes;
        const sorted = helpers ? helpers.sortWishes(filtered, filters.sort) : filtered;
        container.innerHTML = sorted.length
            ? sorted.map(renderWishCard).join('')
            : hasFilters ? emptyWishFilteredHtml() : emptyWishBoardHtml();
        if (resultsCount) {
            // Split count from label so translateGloweTree can match exact keys
            // ("wish shown" / "wishes shown") — a welded "N wishes shown" never
            // hits the dictionary (same pattern as org "volunteers").
            if (sorted.length === 1) {
                resultsCount.innerHTML = '1 <span>wish shown</span>';
            } else if (sorted.length > 0) {
                resultsCount.innerHTML = `${sorted.length} <span>wishes shown</span>`;
            } else {
                resultsCount.textContent = hasFilters ? 'No wishes match your filters' : '';
            }
        }
    }

    resetWishBoardFilters = function () {
        filters.type = 'all';
        filters.area = 'all';
        filters.query = '';
        filters.sort = 'newest';
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'newest';
        typeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.wishType === 'all'));
        areaButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.impactArea === 'all'));
        if (advancedFilters) advancedFilters.classList.remove('is-open');
        if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
        renderWishes();
    };

    reloadWishBoard = async function () { await loadLiveWishes(); renderWishes(); };

    typeButtons.forEach(button => button.addEventListener('click', function() {
        filters.type = this.dataset.wishType;
        typeButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        renderWishes();
    }));
    areaButtons.forEach(button => button.addEventListener('click', function() {
        filters.area = this.dataset.impactArea;
        areaButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        renderWishes();
    }));
    if (searchInput) searchInput.addEventListener('input', function() {
        filters.query = this.value.trim();
        renderWishes();
    });
    if (sortSelect) sortSelect.addEventListener('change', function() {
        filters.sort = this.value || 'newest';
        renderWishes();
    });
    if (filterToggle && advancedFilters) {
        filterToggle.addEventListener('click', function() {
            const open = advancedFilters.classList.toggle('is-open');
            filterToggle.setAttribute('aria-expanded', String(open));
        });
    }
    if (clearBtn) clearBtn.addEventListener('click', resetWishBoardFilters);
    if (container) {
        container.innerHTML = '<div class="empty-state"><p class="muted-note">Loading wishes…</p></div>';
        await loadLiveWishes();
        renderWishes();
        const deepWish = new URLSearchParams(window.location.search).get('wish');
        if (deepWish) openWishDetail(deepWish);
    }
    window.addEventListener('pageshow', function onWishBoardShow(event) {
        if (!event.persisted || !container) return;
        reloadWishBoard();
    });
}

function emptyWishFilteredHtml() {
    return '<div class="empty-state"><div class="empty-state-icon">No results</div><h3>No wishes found</h3><p>Try clearing one of the filters.</p></div>';
}

function emptyWishBoardHtml() {
    return '<div class="empty-state"><h3>No wishes yet</h3><p>The Wishing Well fills up as community members post support requests, calls for volunteers, and collaboration opportunities. Be the first to share what your project needs.</p><button class="btn btn-primary btn-small" type="button" onclick="openWishComposer()">Post a wish</button></div>';
}

// Owner-only "Mark as fulfilled" control on a wish card.
function wishOwnerControls(wish) {
    const helpers = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    const isOwner = helpers ? helpers.isWishOwner(wish, user && user.id) : false;
    if (!isOwner) return '';
    return `<button class="btn btn-outline btn-small" type="button" onclick="markWishFulfilled('${wish.id}')">Mark as fulfilled</button>`;
}

// The wish owner marks their need fulfilled → status='fulfilled' drops it from
// the open board (FR-GLOWE-006 AC5).
async function markWishFulfilled(wishId) {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    if (!window.confirm('Mark this wish as fulfilled? It will be removed from the open board.')) return;
    try {
        await backend.updateOwned('posts', wishId, { status: 'fulfilled' });
    } catch (_e) {
        /* reload reflects the server's authoritative state */
    }
    if (reloadWishBoard) await reloadWishBoard();
}

// Load open wishes from glowe_posts (post_type='wish', status='open') into the
// shared `wishes` array, then refresh the hero stats. Falls back to empty on any error.
async function loadLiveWishes() {
    const backend = window.gloweBackend;
    const helpers = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
    wishes.length = 0;
    if (!backend || !backend.configured() || !helpers) { updateWellSummary(0); return; }
    let rows = [];
    try { rows = await backend.listAll('posts'); } catch (_e) { rows = []; }
    // The board carries open needs (wishes) plus standing volunteer offers
    // (post_type='offer', FR-GLOWE-016), newest first as returned by listAll.
    const create = (typeof GloweCreate !== 'undefined') ? GloweCreate : null;
    let mapped = (rows || []).reduce((acc, row) => {
        if (helpers.isOpenWish(row)) acc.push(helpers.mapWishRow(row, gloweLocaleTag()));
        else if (create && create.isOpenOffer(row)) acc.push({ ...helpers.mapWishRow(row, gloweLocaleTag()), type: 'Volunteer Offer' });
        return acc;
    }, []);
    mapped = await withEnsuredAuthorEnglishNames(mapped);
    wishes.push(...mapped);
    let projectCount = 0;
    try { projectCount = ((await backend.listAll('projects')) || []).length; } catch (_e) { projectCount = 0; }
    updateWellSummary(projectCount);
}

// Render the hero stats strip from the live wish list (FR-GLOWE-006 AC7).
function updateWellSummary(projectCount) {
    const panel = document.getElementById('well-summary-panel');
    if (!panel) return;
    const helpers = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
    const stats = helpers ? helpers.wishStats(wishes) : { openWishes: wishes.length, impactAreas: 0 };
    panel.innerHTML = `
        <div class="well-summary-stat"><strong>${stats.openWishes}</strong><span>Open wishes</span></div>
        <div class="well-summary-stat"><strong>${stats.impactAreas}</strong><span>Impact areas</span></div>
        <div class="well-summary-stat"><strong>${projectCount || 0}</strong><span>Active projects</span></div>
    `;
}

async function initCommunityPage() {
    const container = document.getElementById('community-feed');
    const peopleContainer = document.getElementById('people-list');
    const groupsContainer = document.getElementById('topic-groups-list');
    const searchInput = document.getElementById('community-feed-search');
    const feedFilterButtons = document.querySelectorAll('[data-feed-filter]');

    function postMatchesFilter(post, filter) {
        if (filter === 'all') return true;
        const haystack = `${post.title || ''} ${post.category || ''} ${post.text || ''}`.toLowerCase();
        if (filter === 'question') return haystack.includes('question') || haystack.includes('discussion') || haystack.includes('?');
        if (filter === 'need') return haystack.includes('need') || haystack.includes('volunteer') || haystack.includes('open call') || haystack.includes('looking for');
        if (filter === 'knowledge') return haystack.includes('knowledge') || haystack.includes('guide') || haystack.includes('checklist') || haystack.includes('tips') || haystack.includes('best practices');
        if (filter === 'event') return haystack.includes('event') || haystack.includes('webinar') || haystack.includes('workshop');
        return true;
    }

    function renderFeed() {
        if (!container) return;
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const activeFilter = document.querySelector('[data-feed-filter].active')?.dataset.feedFilter || 'all';
        const posts = getAllCommunityPosts().filter(post => {
            const searchable = `${post.title || ''} ${post.category || ''} ${post.text || ''} ${(post.tags || []).join(' ')}`.toLowerCase();
            return postMatchesFilter(post, activeFilter) && (!query || searchable.includes(query));
        });
        container.innerHTML = posts.length
            ? posts.map(renderPostCard).join('')
            : '<div class="empty-state"><h3>The conversation starts here</h3><p>No posts yet — share knowledge, ask for support, or open a discussion to get things going.</p><button class="btn btn-primary btn-small" type="button" onclick="openInlineComposer()">Write the first post</button></div>';
    }

    if (searchInput) searchInput.addEventListener('input', renderFeed);
    feedFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            feedFilterButtons.forEach(item => item.classList.remove('active'));
            button.classList.add('active');
            renderFeed();
        });
    });

    // Fetch real posts + comments, then render
    if (container) {
        container.innerHTML = '<div class="empty-state"><p class="muted-note">Loading posts…</p></div>';
        await Promise.all([loadCommunityPosts(), loadPostComments()]);
        renderFeed();
    }

    if (peopleContainer) {
        const visiblePeople = [...people];
        peopleContainer.innerHTML = visiblePeople.length
            ? visiblePeople.map(person => `
                <div class="person-row">
                    <a href="profile.html?id=${person.id}">
                        ${renderPersonLinkContent(person, { meta: person.location || '' })}
                    </a>
                    <div class="person-actions">
                        <button type="button" onclick="showSuccessModal('Profile saved', '${jsString(localizedProfileDisplayName(person))} was saved to your profile list.')">Save</button>
                        <button type="button" onclick="openPrivateMessage('${jsString(localizedProfileDisplayName(person))}')">Message</button>
                    </div>
                </div>
            `).join('')
            : '<p class="muted-note">Members will appear here once they join the community.</p>';
    }

    if (groupsContainer) {
        if (backendForumGroups === null) await loadForumGroups();
        const pillGroups = getForumGroups();
        groupsContainer.innerHTML = pillGroups.length > 0
            ? pillGroups.map(group => `
                <a class="filter-pill group-link-pill" href="discussion-group.html?group=${group.id}">
                    ${escapeHtml(group.title)}${group.members > 0 ? `<span>${group.members}</span>` : ''}
                </a>
            `).join('')
            : '<p class="muted-note">Discussion groups will appear here soon.</p>';
    }
}

function initAdminPage() {
    const reportsContainer = document.getElementById('admin-reports');
    const orgContainer = document.getElementById('admin-org-requests');
    if (!reportsContainer && !orgContainer) return;

    if (orgContainer) loadPendingOrgs();
    if (reportsContainer) loadModerationReports();
    initAdminTabs();
    prefetchAdminHealthBadge();

    const backend = window.gloweBackend;
    if (backend && backend.configured()) {
        backend.fetchAdminCounts().then(({ members, orgs }) => {
            const mStat = document.querySelector('[data-admin-stat="total-members"]');
            const oStat = document.querySelector('[data-admin-stat="total-orgs"]');
            if (mStat) mStat.textContent = members;
            if (oStat) oStat.textContent = orgs;
        }).catch(() => {});
    }
}

let adminHealthLoaded = false;

function getAdminTabFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'health') return 'health';
    if (window.location.hash === '#health') return 'health';
    return 'moderation';
}

function switchAdminTab(tabName) {
    const tab = tabName === 'health' ? 'health' : 'moderation';
    document.querySelectorAll('[data-admin-tab]').forEach((btn) => {
        const active = btn.dataset.adminTab === tab;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.admin-tab-panel').forEach((panel) => {
        const active = panel.id === `admin-tab-${tab}`;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
    });
    if (tab === 'health' && !adminHealthLoaded) {
        loadAdminHealthPanel();
    }
}

function initAdminTabs() {
    const bar = document.querySelector('.admin-tab-bar');
    if (!bar) return;
    bar.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-admin-tab]');
        if (!btn) return;
        switchAdminTab(btn.dataset.adminTab);
    });
    switchAdminTab(getAdminTabFromUrl());
}

function updateAdminHealthBadge(overall) {
    const badge = document.getElementById('admin-health-tab-badge');
    if (!badge || !window.GloweHealth) return;
    const showBadge = overall && overall !== 'ok' && overall !== 'unknown';
    badge.hidden = !showBadge;
    badge.className = `admin-tab-badge ${GloweHealth.statusClass(overall)}`;
    badge.textContent = showBadge ? GloweHealth.statusLabel(overall) : '';
}

async function prefetchAdminHealthBadge() {
    if (!backendReady() || !window.GloweHealth) return;
    try {
        const summary = await window.gloweBackend.adminHealthSummary();
        updateAdminHealthBadge(GloweHealth.worstStatus(summary));
    } catch {
        /* badge stays hidden until a full load */
    }
}

function adminHealthErrorHtml(error) {
    if (isForbiddenError(error)) {
        return '<div class="empty-state"><h3>Reviewers only</h3><p>Production health probes are visible to GloWe reviewers.</p></div>';
    }
    return '<div class="empty-state"><h3>Could not load health probes</h3><p>Please refresh and try again.</p></div>';
}

function renderAdminHealthSummary(rows) {
    const summaryEl = document.getElementById('admin-health-summary');
    const overallEl = document.getElementById('admin-health-overall');
    if (!summaryEl || !overallEl || !window.GloweHealth) return;

    const normalized = (rows || []).map((row) => GloweHealth.normalizeSummaryRow(row)).filter(Boolean);
    const overall = GloweHealth.worstStatus(normalized);
    overallEl.textContent = GloweHealth.statusLabel(overall);
    overallEl.className = `health-pill ${GloweHealth.statusClass(overall)}`;
    updateAdminHealthBadge(overall);

    if (!normalized.length) {
        summaryEl.innerHTML = '<div class="empty-state"><h3>No probes yet</h3><p>Production synthetics will appear here after the first scheduled run or deploy smoke.</p></div>';
        return;
    }

    summaryEl.innerHTML = normalized.map((row) => `
        <article class="admin-health-card ${GloweHealth.statusClass(row.status)}">
            <div class="admin-health-card-head">
                <span class="health-status-dot" aria-hidden="true"></span>
                <h3>${escapeHtml(GloweHealth.humanCheckName(row.checkName))}</h3>
                <span class="health-pill ${GloweHealth.statusClass(row.status)}">${escapeHtml(GloweHealth.statusLabel(row.status))}</span>
            </div>
            <p class="admin-health-meta">${escapeHtml(GloweHealth.formatLatency(row.latencyMs))} · ${escapeHtml(GloweHealth.formatCheckedAt(row.checkedAt))}</p>
            ${row.errorDetail ? `<p class="admin-health-error">${escapeHtml(row.errorDetail)}</p>` : ''}
        </article>
    `).join('');
}

function renderAdminHealthHistory(rows) {
    const historyEl = document.getElementById('admin-health-history');
    if (!historyEl || !window.GloweHealth) return;
    const list = (rows || []).map((row) => GloweHealth.normalizeSummaryRow({
        check_name: row.check_name,
        status: row.status,
        latency_ms: row.latency_ms,
        error_detail: row.error_detail,
        app_version: row.app_version,
        checked_at: row.checked_at,
    })).filter(Boolean);

    if (!list.length) {
        historyEl.innerHTML = '<tr><td colspan="6"><div class="empty-state"><h3>No history yet</h3><p>Recent probe runs will be listed here.</p></div></td></tr>';
        return;
    }

    historyEl.innerHTML = list.map((row) => `
        <tr>
            <th scope="row">${escapeHtml(GloweHealth.humanCheckName(row.checkName))}</th>
            <td><span class="health-pill ${GloweHealth.statusClass(row.status)}">${escapeHtml(GloweHealth.statusLabel(row.status))}</span></td>
            <td>${escapeHtml(GloweHealth.formatLatency(row.latencyMs))}</td>
            <td>${escapeHtml(row.appVersion || '—')}</td>
            <td>${escapeHtml(GloweHealth.formatCheckedAt(row.checkedAt))}</td>
            <td class="admin-health-detail">${row.errorDetail ? escapeHtml(row.errorDetail) : '—'}</td>
        </tr>
    `).join('');
}

async function loadAdminHealthPanel(force = false) {
    const summaryEl = document.getElementById('admin-health-summary');
    const refreshBtn = document.getElementById('admin-health-refresh');
    if (!summaryEl || !backendReady()) return;

    if (refreshBtn) refreshBtn.disabled = true;
    if (force || !adminHealthLoaded) {
        summaryEl.innerHTML = '<div class="empty-state admin-health-placeholder"><h3>Loading…</h3><p>Fetching the latest probe results.</p></div>';
    }

    try {
        const [summary, history] = await Promise.all([
            window.gloweBackend.adminHealthSummary(),
            window.gloweBackend.adminListHealthChecks(30),
        ]);
        adminHealthLoaded = true;
        renderAdminHealthSummary(summary);
        renderAdminHealthHistory(history);
    } catch (error) {
        summaryEl.innerHTML = adminHealthErrorHtml(error);
        const historyEl = document.getElementById('admin-health-history');
        if (historyEl) historyEl.innerHTML = '';
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

// FR-GLOWE-015 AC4 — live moderation report queue, backed by the admin-gated
// glowe_admin_list_reports RPC (migration 0227). Non-admins get a 42501 from
// the RPC, surfaced as a "locked" empty state rather than a crash.
function moderationQueueErrorHtml(error) {
    if (isForbiddenError(error)) {
        return '<div class="empty-state"><h3>Reviewers only</h3><p>This queue is visible to GloWe reviewers. Ask an administrator for access.</p></div>';
    }
    return '<div class="empty-state"><h3>Could not load reports</h3><p>Please refresh and try again.</p></div>';
}

async function loadModerationReports() {
    const container = document.getElementById('admin-reports');
    if (!container) return;
    if (!backendReady()) {
        container.innerHTML = '<div class="empty-state"><h3>Backend not configured</h3><p>Moderation is available once the shared backend is connected.</p></div>';
        return;
    }
    container.innerHTML = '<div class="empty-state"><h3>Loading…</h3><p>Fetching community reports.</p></div>';
    let rows;
    try {
        rows = await window.gloweBackend.adminListReports();
    } catch (error) {
        container.innerHTML = moderationQueueErrorHtml(error);
        return;
    }
    renderModerationReports(GloweModeration.mapAdminReportRows(rows));
}

function renderModerationReports(reports) {
    const container = document.getElementById('admin-reports');
    if (!container) return;
    const reportStat = document.querySelector('[data-admin-stat="reports"]');
    if (reportStat) reportStat.textContent = GloweModeration.openReports(reports).length;
    if (!reports.length) {
        container.innerHTML = '<div class="empty-state"><h3>No reports yet</h3><p>Community reports will appear here.</p></div>';
        return;
    }
    const reasonLabel = (value) => {
        const match = GloweModeration.REPORT_REASONS.find(r => r.value === value);
        return match ? match.label : value;
    };
    container.innerHTML = reports.map(report => {
        const isOpen = report.status === 'open';
        const targetHref = GloweModeration.reportTargetHref(report, '');
        const actions = isOpen ? `
                <div class="card-actions">
                    ${GloweModeration.canRemoveTarget(report.targetType)
                        ? `<button class="btn btn-primary btn-small" type="button" onclick="decideGloweReport('${report.id}', 'remove', '${jsString(report.targetType)}', '${jsString(report.targetId)}')">Remove content</button>`
                        : ''}
                    <button class="btn btn-outline btn-small" type="button" onclick="decideGloweReport('${report.id}', 'dismiss')">Dismiss</button>
                </div>` : '';
        return `
            <article class="admin-card">
                <span class="post-type-tag">${escapeHtml(gloweEnumLabel(GLOWE_REPORT_STATUS_LABEL, report.status))}</span>
                <h3>${escapeHtml(reasonLabel(report.reason))}</h3>
                <p><strong>${escapeHtml(gloweEnumLabel(GLOWE_TARGET_TYPE_LABEL, report.targetType))}</strong> | ${escapeHtml(report.targetId)}</p>
                <p>${escapeHtml(report.note || 'No additional details were provided.')}</p>
                <small>${glowePrefixedLabel('Reporter')} ${escapeHtml(report.reporterName)} | ${report.createdAt ? new Date(report.createdAt).toLocaleString(gloweLocaleTag()) : ''}</small>
                ${targetHref ? `<p><a href="${targetHref}" target="_blank" rel="noopener">Open reported item</a></p>` : ''}
                ${actions}
            </article>
        `;
    }).join('');
}

// FR-GLOWE-015 AC4+AC5 — admin decision on a report: dismiss, or remove the
// reported content (posts/opportunities) and action the report atomically.
async function applyGloweReportDecision(reportId, action, targetType, targetId) {
    if (action === 'remove') {
        await window.gloweBackend.adminRemoveContent(GloweModeration.canonicalTargetType(targetType), targetId, reportId);
        showActionToast('Content removed', 'The reported content is no longer publicly visible.');
        return;
    }
    await window.gloweBackend.adminDismissReport(reportId);
    showActionToast('Report dismissed', 'The report was closed with no action.');
}

function showModerationDecisionError(error) {
    if (isForbiddenError(error)) {
        showSuccessModal('Reviewers only', 'Only GloWe reviewers can act on reports.');
        return;
    }
    showSuccessModal('Could not save decision', 'Something went wrong while saving the decision. Please try again.');
}

async function decideGloweReport(reportId, action, targetType = '', targetId = '') {
    if (!backendReady()) return;
    try {
        await applyGloweReportDecision(reportId, action, targetType, targetId);
    } catch (error) {
        showModerationDecisionError(error);
        return;
    }
    loadModerationReports();
}

// FR-GLOWE-003 AC4: live pending-organization review queue, backed by the
// admin-gated glowe_list_pending_orgs RPC. Non-reviewers get a 42501 from the
// RPC, which we surface as a "locked" empty state rather than a crash.
async function loadPendingOrgs() {
    const container = document.getElementById('admin-org-requests');
    if (!container) return;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) {
        container.innerHTML = '<div class="empty-state"><h3>Backend not configured</h3><p>Organization review is available once the shared backend is connected.</p></div>';
        return;
    }
    container.innerHTML = '<div class="empty-state"><h3>Loading…</h3><p>Fetching organizations awaiting verification.</p></div>';
    let orgs;
    try {
        orgs = await backend.listPendingOrgs();
    } catch (error) {
        const forbidden = error && (error.code === '42501' || /forbidden|permission/i.test(error.message || ''));
        container.innerHTML = forbidden
            ? '<div class="empty-state"><h3>Reviewers only</h3><p>This queue is visible to GloWe reviewers. Ask an administrator for access.</p></div>'
            : '<div class="empty-state"><h3>Could not load queue</h3><p>Please refresh and try again.</p></div>';
        return;
    }
    renderPendingOrgs(orgs || []);
}

function renderPendingOrgs(orgs) {
    const container = document.getElementById('admin-org-requests');
    if (!container) return;
    const orgStat = document.querySelector('[data-admin-stat="orgs"]');
    if (orgStat) orgStat.textContent = orgs.length;
    if (!orgs.length) {
        container.innerHTML = '<div class="empty-state"><h3>No pending organizations</h3><p>Verified organizations will publish freely; new submissions show up here.</p></div>';
        return;
    }
    container.innerHTML = orgs.map(org => {
        const id = escapeHtml(org.id);
        const orgName = escapeHtml(org.orgName || org.name || 'Unnamed organization');
        const submittedDate = org.orgSubmittedAt
            ? new Date(org.orgSubmittedAt).toLocaleDateString(gloweLocaleTag(), { day: '2-digit', month: 'short', year: 'numeric' })
            : '';
        const detail = (label, value) => value
            ? `<p><strong>${escapeHtml(gloweText(label))}:</strong> ${escapeHtml(value)}</p>` : '';
        return `
            <details class="admin-org-accordion">
                <summary class="admin-org-summary">
                    <span class="admin-org-summary-name">${orgName}</span>
                    <span class="admin-org-summary-meta">${escapeHtml(org.orgField || '')}${org.orgField && org.orgCountry ? ' · ' : ''}${escapeHtml(org.orgCountry || '')}</span>
                    ${submittedDate ? `<span class="admin-org-summary-date">${gloweText('Submitted')} ${submittedDate}</span>` : ''}
                    <span class="admin-org-summary-chevron" aria-hidden="true">▾</span>
                </summary>
                <div class="admin-org-detail">
                    <article class="admin-card">
                        <span class="post-type-tag">Pending verification</span>
                        <h3>${orgName}</h3>
                        ${detail('Country', org.orgCountry || org.country)}
                        ${detail('Field', org.orgField)}
                        ${detail('Website', org.orgWebsite)}
                        ${detail('Registration', org.orgRegistrationNumber)}
                        ${detail('Contact', org.orgContactName)}
                        ${detail('Contact email', org.orgContactEmail || org.email)}
                        ${detail('Contact phone', org.orgContactPhone)}
                        ${detail('Size', org.orgSize)}
                        ${org.orgDescription ? `<p>${escapeHtml(org.orgDescription)}</p>` : ''}
                        <label class="admin-note-label">
                            Review note <span class="admin-note-required">(required for rejection)</span>
                            <textarea id="org-note-${id}" rows="2" placeholder="Explain the decision — especially required when rejecting"></textarea>
                        </label>
                        <div class="card-actions">
                            <button class="btn btn-primary btn-small" type="button" onclick="decideGloweOrg('${id}', 'approved')">Approve</button>
                            <button class="btn btn-outline btn-small" type="button" onclick="decideGloweOrg('${id}', 'rejected')">Reject</button>
                        </div>
                    </article>
                </div>
            </details>
        `;
    }).join('');
}

async function decideGloweOrg(profileId, decision) {
    const backend = window.gloweBackend;
    if (!backend || typeof backend.setOrgApproval !== 'function') return;
    const noteInput = document.getElementById(`org-note-${profileId}`);
    const note = noteInput ? noteInput.value.trim() : '';
    if (decision === 'rejected' && !note) {
        showSuccessModal(
            'Rejection reason required',
            'Please explain why this organization is being rejected. The organization will see this note.'
        );
        if (noteInput) noteInput.focus();
        return;
    }
    try {
        await backend.setOrgApproval(profileId, decision, note);
    } catch (error) {
        const forbidden = error && (error.code === '42501' || /forbidden|permission/i.test(error.message || ''));
        showSuccessModal(
            forbidden ? 'Reviewers only' : 'Could not save decision',
            forbidden
                ? 'Only GloWe reviewers can approve or reject organizations.'
                : 'Something went wrong while saving the decision. Please try again.'
        );
        return;
    }
    const verb = decision === 'approved' ? 'approved' : 'rejected';
    showActionToast('Decision saved', `The organization has been ${verb}.`);
    loadPendingOrgs();
}

function initForumsPage() {
    const container = document.getElementById('forum-categories');
    const threadsContainer = document.getElementById('forum-thread-list');
    const leadersContainer = document.getElementById('forum-leaders');
    const groupSelect = document.getElementById('forum-question-group');
    const stats = document.querySelectorAll('[data-forum-stat]');
    refreshForumGroups(initForumsPage);
    refreshForumThreads(initForumsPage);
    refreshForumReplies(initForumsPage);
    const forumGroups = withGroupStats(getForumGroups());
    const replyCounts = GloweForums.countRepliesByThread(getForumReplies());
    const allThreads = getForumThreads().map(thread => ({
        ...thread,
        replies: replyCounts[thread.id] || 0,
        group: forumGroups.find(g => g.id === thread.groupId) || { id: thread.groupId, title: '' }
    }));
    if (groupSelect) {
        groupSelect.innerHTML = forumGroups.map(group => `<option value="${group.id}">${group.title}</option>`).join('');
    }
    if (leadersContainer) {
        leadersContainer.innerHTML = people.length > 0
            ? people.slice(0, 4).map((person, index) => `
                <article class="forum-leader-card">
                    <a href="profile.html?id=${person.id}" class="forum-leader-main">
                        ${renderPersonLinkContent(person, {
                            meta: (person.skills || []).slice(0, 2).join(', ')
                        })}
                    </a>
                    <p>${index % 2 === 0 ? 'Available for peer advice and focused questions.' : 'Can help facilitate a respectful, practical discussion.'}</p>
                    <button class="btn btn-outline btn-small" type="button" onclick="openPrivateMessage('${jsString(localizedProfileDisplayName(person))}')">Message</button>
                </article>
            `).join('')
            : '<p class="muted-note">Community members with active contributions will be featured here.</p>';
    }
    if (container) {
        container.innerHTML = forumGroups.length > 0
            ? forumGroups.map(group => `
                <a class="forum-group-card" href="discussion-group.html?group=${group.id}">
                    <div class="forum-group-stats">
                        ${group.members > 0 ? `<span>${gloweCountedLabel(group.members, 'members')}</span>` : ''}
                        ${group.posts > 0 ? `<span>${gloweCountedLabel(group.posts, 'posts')}</span>` : ''}
                    </div>
                    <h3>${escapeHtml(group.title)}</h3>
                    <p>${escapeHtml(group.description)}</p>
                    <div class="post-tag-row">${group.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
                </a>
            `).join('')
            : '<p class="muted-note">Discussion groups will appear here once they are set up.</p>';
    }
    if (threadsContainer) {
        threadsContainer.innerHTML = allThreads.length > 0
            ? allThreads.map(thread => `
                <article class="thread-row" data-tr-card data-tr-type="glowe_forum_thread" data-tr-id="${escapeHtml(String(thread.id))}">
                    <div>
                        <span class="post-type-tag">${escapeHtml(thread.group.title)}</span>
                        ${translationToggleSlotHtml()}
                        <h3><a href="discussion-group.html?group=${thread.group.id}" data-tr-field="title">${escapeHtml(thread.title)}</a></h3>
                        <p>${gloweCountedLabel(thread.replies || 0, 'replies')} | ${gloweText('Last active')} ${escapeHtml(formatThreadActivity(thread.createdAt))}</p>
                    </div>
                    <a class="btn btn-outline btn-small" href="discussion-group.html?group=${thread.group.id}">Open</a>
                </article>
            `).join('')
            : '<p class="muted-note">Active threads will appear here once community members start discussions.</p>';
    }
    if (stats.length) {
        const totals = {
            groups: forumGroups.length,
            threads: allThreads.length,
            members: forumGroups.reduce((sum, group) => sum + group.members, 0)
        };
        stats.forEach(stat => {
            stat.textContent = totals[stat.dataset.forumStat] || '0';
        });
    }
}

async function handleForumQuestionSubmit(event) {
    event.preventDefault();
    if (!canCreateContent()) return;
    const form = event.target;
    const groupId = form.querySelector('#forum-question-group').value;
    const forumGroups = getForumGroups();
    const group = forumGroups.find(item => item.id === groupId) || forumGroups[0];
    const fileInput = form.querySelector('#forum-question-file');
    const type = form.querySelector('#forum-question-type').value;
    const title = form.querySelector('#forum-question-title').value.trim();
    const body = form.querySelector('#forum-question-body').value.trim();
    await persistForumThread(group, title, body, {
        type,
        fileName: fileInput && fileInput.files[0] ? fileInput.files[0].name : ''
    });
    saveCommunityPost({
        authorId: 'sample-user-6',
        title,
        category: `${type} | ${group.title}`,
        text: body,
        tags: group.tags,
        audience: group.title
    });
    showActionToast('Question published', 'Your forum post is now visible in the forum and community feed.');
    form.reset();
    await reloadForumThreads();
    initForumsPage();
}

function initSavedPage() {
    const container = document.getElementById('saved-items-list');
    const summary = document.getElementById('saved-summary');
    if (!container) return;

    function renderSavedItemsPage() {
        const items = getSavedItems();
        const grouped = {
            opportunity: items.filter(item => item.type === 'opportunity'),
            post: items.filter(item => item.type === 'post'),
            profile: items.filter(item => item.type === 'profile'),
            wish: items.filter(item => item.type === 'wish')
        };
        if (summary) {
            summary.innerHTML = `
                <div><strong>${items.length}</strong><span>Saved items</span></div>
                <div><strong>${grouped.opportunity.length}</strong><span>Opportunities</span></div>
                <div><strong>${grouped.post.length}</strong><span>Posts</span></div>
                <div><strong>${grouped.profile.length}</strong><span>Profiles</span></div>
            `;
        }
        container.innerHTML = items.length ? items.map(item => `
            <article class="saved-item-card">
                <div>
                    <span class="post-type-tag">${escapeHtml(gloweEnumLabel(GLOWE_SAVED_ITEM_TYPE_LABEL, item.type))}</span>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.meta || 'Saved from the GloWe community')}</p>
                    <small>${gloweText('Saved')} ${new Date(item.savedAt).toLocaleDateString(gloweLocaleTag())}</small>
                </div>
                <div class="saved-card-actions">
                    ${item.href ? `<a class="btn btn-primary btn-small" href="${item.href}">Open</a>` : ''}
                    <button class="btn btn-outline btn-small" type="button" onclick="removeSavedItem('${item.type}', '${item.id}')">Remove</button>
                </div>
            </article>
        `).join('') : `
            <div class="empty-state">
                <h3>No saved items yet</h3>
                <p>Save posts, profiles, and opportunities to return to them from this screen.</p>
                <a class="btn btn-primary btn-small" href="community.html">Explore Community</a>
            </div>
        `;
    }

    window.renderSavedItemsPage = renderSavedItemsPage;
    renderSavedItemsPage();
}

// Render one discussion thread card with its inline replies + reply composer.
// Shared so the thread-row markup lives in one place (SonarCloud duplication).
function renderDiscussionThread(thread, group, allReplies) {
    const replies = GloweForums.repliesForThread(allReplies, thread.id);
    const replyItems = replies.length > 0
        ? replies.map(reply => `
            <li class="thread-reply" data-tr-card data-tr-type="glowe_forum_reply" data-tr-id="${escapeHtml(String(reply.id))}">
                ${translationToggleSlotHtml()}
                <p data-tr-field="body">${escapeHtml(reply.body)}</p>
                <small>${escapeHtml(formatThreadActivity(reply.createdAt))}</small>
            </li>
        `).join('')
        : '<li class="thread-reply muted-note">No replies yet. Be the first to respond.</li>';
    return `
        <article class="thread-row" data-tr-card data-tr-type="glowe_forum_thread" data-tr-id="${escapeHtml(String(thread.id))}">
            <div>
                <span class="post-type-tag">${escapeHtml(formatThreadActivity(thread.createdAt))}</span>
                ${translationToggleSlotHtml()}
                <h3 data-tr-field="title">${escapeHtml(thread.title)}</h3>
                <p data-tr-field="body">${thread.body ? escapeHtml(thread.body) : gloweSandwichedLabel('Discussion from members of ', escapeHtml(group.title), '.')}</p>
                <p class="thread-reply-count">${gloweCountedLabel(replies.length, 'replies')}</p>
                <ul class="thread-reply-list">${replyItems}</ul>
                <form class="inline-reply-form" onsubmit="handleReplySubmit(event, '${jsString(thread.id)}')">
                    <input class="reply-input" required placeholder="Write a reply">
                    <button class="btn btn-outline btn-small" type="submit">Reply</button>
                </form>
                <div class="thread-actions">
                    ${renderShareButton(thread.title, `discussion-group.html?group=${encodeURIComponent(group.id)}`)}
                </div>
            </div>
        </article>
    `;
}

function initDiscussionGroupPage() {
    refreshForumGroups(initDiscussionGroupPage);
    refreshForumThreads(initDiscussionGroupPage);
    refreshForumReplies(initDiscussionGroupPage);
    const forumGroups = withGroupStats(getForumGroups());
    const params = new URLSearchParams(window.location.search);
    const group = forumGroups.find(item => item.id === (params.get('group') || 'education')) || forumGroups[0];
    const groupThreads = (typeof GloweForums !== 'undefined')
        ? GloweForums.threadsForGroup(getForumThreads(), group.id)
        : [];
    const allReplies = getForumReplies();
    const header = document.getElementById('discussion-group-header');
    const members = document.getElementById('discussion-member-list');
    const threads = document.getElementById('discussion-thread-list');
    const composer = document.getElementById('discussion-composer');
    if (!header || !members || !threads || !composer) return;

    header.innerHTML = `
        <span class="hero-kicker">Discussion group</span>
        <h1>${escapeHtml(group.title)}</h1>
        <p>${escapeHtml(group.description)}</p>
        <div class="post-tag-row">${group.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        ${group.members > 0 || group.posts > 0 || groupThreads.length > 0 ? `
        <div class="group-stats-row">
            ${group.members > 0 ? `<span>${gloweCountedLabel(group.members, 'members')}</span>` : ''}
            ${group.posts > 0 ? `<span>${gloweCountedLabel(group.posts, 'posts')}</span>` : ''}
            ${groupThreads.length > 0 ? `<span>${gloweCountedLabel(groupThreads.length, 'active threads')}</span>` : ''}
        </div>` : ''}
    `;
    members.innerHTML = people.length > 0
        ? people.slice(0, 5).map(person => `
            <div class="person-row">
                <a href="profile.html?id=${person.id}">
                    ${renderPersonLinkContent(person, {
                        meta: (person.skills || []).slice(0, 2).join(', ')
                    })}
                </a>
                <button type="button" onclick="openPrivateMessage('${jsString(localizedProfileDisplayName(person))}')">Message</button>
            </div>
        `).join('')
        : '<p class="muted-note">Members will appear here once they join this group.</p>';
    threads.innerHTML = groupThreads.length > 0
        ? groupThreads.map(thread => renderDiscussionThread(thread, group, allReplies)).join('')
        : '<div class="empty-state"><h3>No threads yet</h3><p>Start the first conversation in this group.</p></div>';
    composer.innerHTML = `
        <form class="inline-post-form" onsubmit="handleDiscussionSubmit(event, '${group.id}')">
            <div class="form-group">
                <label for="discussion-title">Start a thread</label>
                <input id="discussion-title" required placeholder="Ask a focused question for this group">
            </div>
            <div class="form-group">
                <label for="discussion-body">Context</label>
                <textarea id="discussion-body" rows="4" required placeholder="What do you need input on, and what kind of answers would help?"></textarea>
            </div>
            <button class="btn btn-primary" type="submit">Publish Thread</button>
        </form>
    `;
}

async function handleReplySubmit(event, threadId) {
    event.preventDefault();
    if (!canCreateContent()) return;
    const input = event.target.querySelector('.reply-input');
    const body = input ? input.value.trim() : '';
    if (!body) return;
    await persistForumReply(threadId, body);
    event.target.reset();
    await reloadForumReplies();
    initDiscussionGroupPage();
}

async function handleDiscussionSubmit(event, groupId) {
    event.preventDefault();
    if (!canCreateContent()) return;
    const forumGroups = getForumGroups();
    const group = forumGroups.find(item => item.id === groupId) || forumGroups[0];
    const title = document.getElementById('discussion-title').value.trim();
    const body = document.getElementById('discussion-body').value.trim();
    await persistForumThread(group, title, body);
    saveCommunityPost({
        authorId: 'sample-user-6',
        title,
        category: `Discussion | ${group.title}`,
        text: body,
        tags: group.tags,
        audience: group.title
    });
    showActionToast('Thread published', 'Your discussion thread now appears in the community feed and this group.');
    event.target.reset();
    await reloadForumThreads();
    initDiscussionGroupPage();
}

// UUID pattern used to detect real DB profile IDs vs. static sample IDs.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function _profileNotFound(container) {
    container.innerHTML = `
        <div class="empty-state">
            <h3>Profile not found</h3>
            <p>This profile is not available yet, or the link points to an older demo profile.</p>
            <div class="modal-actions">
                <a class="btn btn-primary" href="organizations.html">Browse Organizations</a>
                <a class="btn btn-outline" href="community.html">Back to Community</a>
                <a class="btn btn-outline" href="my-applications.html">Open Personal Area</a>
            </div>
        </div>
    `;
}

// Map a glowe_profiles DB row (fromProfileRow output) to the shape that
// the profile-page rendering code expects (same as static sample profiles).
function _adaptDbProfile(p, projects) {
    const isOrg = p.accountType === 'organization';
    // FR-TRANSLATE-005 AC7 — resolve which real source column backs the mission
    // prose so the reader driver can translate it (org: org_description else
    // about; member: about). Only DB profiles carry this; static profiles omit
    // `_tr`, so they get no (unmatchable) translation markup. See TD-135.
    const missionField = isOrg ? (p.orgDescription ? 'org_description' : 'about') : 'about';
    const lang = gloweReaderLang();
    const displayName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedProfileName(p, lang)
        : (isOrg ? (p.orgName || p.name || 'Unnamed organization') : (p.name || 'Anonymous'));
    return {
        _tr: { type: 'glowe_profile', id: p.id, missionField: missionField },
        id: p.id,
        name: displayName,
        namePrimary: isOrg ? (p.orgName || p.name || '') : (p.name || ''),
        nameEnglish: isOrg ? (p.orgNameEn || p.nameEn || '') : (p.nameEn || ''),
        nameEn: isOrg ? (p.orgNameEn || p.nameEn || '') : (p.nameEn || ''),
        type: isOrg ? (p.orgField || 'Organization') : 'Community Member',
        email: p.orgContactEmail || p.email || '',
        location: p.location || p.orgCountry || '',
        scope: p.orgCountry || '',
        languages: p.languages || [],
        skills: p.skills || [],
        impactArea: p.orgField || p.focus || '',
        mission: isOrg ? (p.orgDescription || p.about || '') : (p.about || ''),
        bio: p.about || '',
        story: p.about || '',
        focus: p.focus || '',
        website: p.orgWebsite || '',
        volunteers: 0,
        opportunities: 0,
        projects: Array.isArray(projects) ? projects : [],
        accountType: p.accountType,
        onboardingComplete: p.onboardingComplete,
        approvalStatus: p.approvalStatus,
        about: p.about || '',
        orgDescription: p.orgDescription || '',
        orgField: p.orgField || '',
        avatarUrl: p.avatarUrl || '',
        coverImageUrl: profileCoverImageUrl(p),
        _raw: p,
        isOwnerView: false
    };
}

// AC5 — load a profile's public projects (glowe_projects rows for this user,
// excluding drafts). Public read via listAll('projects'); mapping/filtering is
// delegated to the GloweOrganizations pure helpers. Best-effort: any failure
// (offline, missing helper) yields an empty list so the profile still renders.
async function _loadPublicProjects(backend, userId) {
    if (typeof GloweOrganizations === 'undefined' || !backend || !backend.configured()) return [];
    try {
        const rows = await backend.listAll('projects');
        const mapped = GloweOrganizations.mapProjects(rows || []);
        return GloweOrganizations.publicProjectsForUser(mapped, userId);
    } catch (_e) {
        return [];
    }
}

async function initProfilePage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || 'sample-org-1';
    const container = document.getElementById('profile-content');
    if (!container) return;

    const staticProfile = getProfileById(id);
    if (staticProfile) {
        _renderProfileContent(staticProfile, container);
        return;
    }

    if (!UUID_RE.test(id)) {
        _profileNotFound(container);
        return;
    }

    container.innerHTML = '<div class="empty-state"><h3>Loading profile…</h3><p>Fetching from the community directory.</p></div>';
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { _profileNotFound(container); return; }
    try {
        let dbProfile = await backend.fetchProfileById(id);
        if (!dbProfile) { _profileNotFound(container); return; }
        const ensured = await withEnsuredEnglishNames([dbProfile]);
        dbProfile = ensured[0] || dbProfile;
        const projects = await _loadPublicProjects(backend, id);
        const me = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const adapted = _adaptDbProfile(dbProfile, projects);
        adapted.isOwnerView = Boolean(me && me.id === dbProfile.id);
        _renderProfileContent(adapted, container);
    } catch {
        _profileNotFound(container);
    }
}

function _publicTrustStatusLabel(profile, isOrg) {
    return GloweProfileUx.publicTrustStatusLabel(profile, isOrg);
}

function _renderProfileContent(profile, container) {

    const isOrg = profile.accountType === 'organization'
        || (!profile.accountType && profile.type && profile.type !== 'Community Member');
    const isOwnerView = Boolean(profile.isOwnerView);
    const ux = (typeof GloweProfileUx !== 'undefined') ? GloweProfileUx : null;
    const chip = isOwnerView && ux
        ? ux.profileStatusChip(profile, { isOwner: true })
        : null;
    const chipHtml = chip ? renderProfileStatusChipHtml(chip) : '';
    const cameraIcon = ux ? ux.CAMERA_ICON_SVG : '';
    const namePair = {
        primary: profile.namePrimary || profile.name || '',
        english: profile.nameEnglish || profile.nameEn || ''
    };
    const avatarHtml = isOwnerView
        ? `<div class="social-avatar-wrap">${renderPersonalAvatar(profile, 'profile-avatar social-avatar')}<button type="button" class="social-avatar-change social-avatar-change--icon" aria-label="Change profile photo" onclick="openAvatarEditModal()">${cameraIcon}</button></div>`
        : (profile.avatarUrl
            ? renderPersonalAvatar(profile, 'profile-avatar')
            : renderLocalizedEntityMark(namePair.primary, namePair.english, profile.name, 'profile-avatar'));
    const typeConfig = getProfileTypeConfig(profile);
    const projects = profile.projects || [];
    const languages = profile.languages || [];
    const tags = (profile.skills || [profile.impactArea]).filter(Boolean);
    const relatedWishes = wishes.filter(wish => wish.authorId === profile.id).slice(0, 3);
    const profilePosts = communityPosts.filter(post => post.authorId === profile.id).slice(0, 3);
    const relatedOpportunities = opportunities.filter(opp => {
        const searchable = `${opp.organization} ${opp.title} ${opp.description} ${opp.field} ${(opp.skills || []).join(' ')}`.toLowerCase();
        return searchable.includes(profile.name.toLowerCase()) || tags.some(tag => searchable.includes(String(tag).toLowerCase().split(' ')[0]));
    }).slice(0, 3);
    const safeName = jsString(profile.name);
    const primaryStat = isOrg ? profile.volunteers : profilePosts.length;
    const primaryStatLabel = isOrg ? 'Volunteers' : 'Posts';
    const opportunityCount = isOrg ? profile.opportunities || relatedOpportunities.length : relatedOpportunities.length;
    const missionText = profile.mission || profile.story || profile.bio || 'A GloWe community profile sharing work, knowledge, and opportunities for impact.';
    const valuesText = profile.values || (profile.type && profile.type.toLowerCase().includes('business')
        ? 'Ethical business, practical access, community benefit, and responsible technology.'
        : 'Transparency, dignity, collaboration, and shared learning.');
    const communityText = profile.community || profile.audience || profile.collaboration || 'Organizations, volunteers, partners, and communities looking for useful collaboration.';
    // Plain fallback strings below (methodsText/publicActionsText/learningText)
    // render as standalone, isolated text nodes with no dynamic value spliced
    // in — translateGloweTree() picks them up automatically once the exact
    // string is a dictionary key, same as any other static chrome text.
    // problemText/progressText DO splice in a runtime value, so they need the
    // weld-safe helpers (see glowePostTypeLabel() above for why).
    const problemText = profile.problem || gloweSandwichedLabel(
        'The work responds to needs connected to ',
        profile.impactArea || gloweText('community impact'),
        ' and helps make local knowledge easier to access and act on.'
    );
    const solutionText = profile.solution || profile.collaboration || missionText;
    const methodsText = profile.methods || profile.scope || 'Community work, partnerships, shared knowledge, and practical field-based action.';
    const publicActionsText = profile.publicActions || profile.needs || profile.collaboration || 'Open to relevant conversations and collaboration through GloWe.';
    const progressText = profile.impact || gloweCountedLabel(profile.volunteers || primaryStat || 0, 'people connected through projects, opportunities, or community activity.');
    const learningText = profile.learning || 'This profile can add more field insights, measurement notes, and lessons learned as the work develops.';
    const mediaLinks = profile.media || profile.website || profile.publicLink || '';
    const trustStatus = _publicTrustStatusLabel(profile, isOrg);
    const safeContact = profile.email || 'Contact through GloWe messages';

    // FR-TRANSLATE-005 AC7 — DB profiles carry `_tr`; tag the mission prose so the
    // reader driver translates it. Static profiles have no source row, so no attr.
    const missionFieldAttr = profile._tr ? ` data-tr-field="${profile._tr.missionField}"` : '';

    container.innerHTML = `
        <section class="profile-cover profile-story-cover">
            ${renderSocialCover(profile, { editable: isOwnerView, band: true })}
            <div class="profile-hero">
                ${avatarHtml}
                <div class="profile-summary">
                    <div class="social-profile-tags">
                        <span class="profile-type">${escapeHtml(profile.type || 'Community Member')}</span>
                        ${chipHtml}
                    </div>
                    <h1 data-follow-name="${profile.id}" ${bilingualNameAttrs(namePair.primary, namePair.english)}>${escapeHtml(profile.name)}</h1>
                    <p${missionFieldAttr}>${escapeHtml(missionText)}</p>
                    <div class="opportunity-skills">${tags.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}</div>
                </div>
                <div class="profile-actions">
                    <button class="btn btn-outline" type="button" onclick="showSuccessModal('Profile saved', '${safeName} was saved to your profile list.')">Save</button>
                    <button class="btn btn-primary" type="button" onclick="openPrivateMessage('${safeName}')">Message</button>
                    ${!isOwnerView && profile.id ? '<span class="follow-slot" data-follow-slot="' + profile.id + '"></span>' : ''}
                    <details class="profile-more-menu">
                        <summary aria-label="More profile actions">...</summary>
                        <div>
                            ${isOwnerView ? `<button type="button" onclick="openEditProfile('${safeName}')">Edit profile</button>` : ''}
                            <button type="button" onclick="openReportModal('profile', '${profile.id}', '${safeName}')">Report</button>
                        </div>
                    </details>
                </div>
            </div>
            <div class="profile-stats">
                <div><strong>${primaryStat}</strong><span>${primaryStatLabel}</span></div>
                <div><strong>${projects.length}</strong><span>Projects</span></div>
                <div><strong>${opportunityCount}</strong><span>Opportunities</span></div>
                <div><strong>${relatedWishes.length}</strong><span>Open Needs</span></div>
                ${profileFollowStatsHtml(profile.id)}
            </div>
        </section>

        <section class="profile-grid">
            <div class="profile-main-column">
                <article class="profile-section-card profile-story-card">
                    <div class="profile-section-heading">
                        <span>01</span>
                        <h2>${escapeHtml(typeConfig.storyLabel || (isOrg ? 'Organization story' : 'Profile story'))}</h2>
                    </div>
                    <p class="profile-lead-text"${missionFieldAttr}>${escapeHtml(missionText)}</p>
                    <div class="profile-narrative-grid">
                        <p><strong>${escapeHtml(typeConfig.valuesLabel || 'Values')}</strong><span>${escapeHtml(valuesText)}</span></p>
                        <p><strong>${escapeHtml(typeConfig.communityLabel || 'Community')}</strong><span>${escapeHtml(communityText)}</span></p>
                        <p><strong>${escapeHtml(typeConfig.sizeLabel || 'Size / availability')}</strong><span>${escapeHtml(profile.size || profile.availability || 'Not specified yet')}</span></p>
                        <p><strong>Languages</strong><span>${escapeHtml(languages.join(', ') || 'Not specified yet')}</span></p>
                    </div>
                </article>

                <article class="profile-section-card profile-story-card">
                    <div class="profile-section-heading">
                        <span>02</span>
                        <h2>Impact approach</h2>
                    </div>
                    <div class="profile-impact-story">
                        <div>
                            <strong>${escapeHtml(typeConfig.problemLabel || 'Problem')}</strong>
                            <p>${escapeHtml(problemText)}</p>
                        </div>
                        <div>
                            <strong>${escapeHtml(typeConfig.solutionLabel || 'Solution')}</strong>
                            <p>${escapeHtml(solutionText)}</p>
                        </div>
                        <div>
                            <strong>Methods / approaches</strong>
                            <p>${escapeHtml(methodsText)}</p>
                        </div>
                        <div>
                            <strong>What is open now</strong>
                            <p>${escapeHtml(publicActionsText)}</p>
                        </div>
                    </div>
                </article>

                <article class="profile-section-card profile-story-card">
                    <div class="profile-section-heading">
                        <span>03</span>
                        <h2>Projects</h2>
                    </div>
                    <div class="projects-grid">${projects.map(renderProjectCard).join('') || '<p class="muted-note">No projects listed yet.</p>'}</div>
                </article>

                <article class="profile-section-card profile-story-card">
                    <div class="profile-section-heading">
                        <span>04</span>
                        <h2>Measurement and learning</h2>
                    </div>
                    <div class="profile-learning-panel">
                        <p><strong>Impact so far</strong><span>${escapeHtml(progressText)}</span></p>
                        <p><strong>How success is understood</strong><span>${escapeHtml(profile.measurement || 'Through participation, useful connections, project progress, and community feedback.')}</span></p>
                        <p><strong>What we are learning</strong><span>${escapeHtml(learningText)}</span></p>
                    </div>
                </article>

                <article class="profile-section-card profile-story-card">
                    <div class="profile-section-heading">
                        <span>05</span>
                        <h2>Opportunities & collaboration</h2>
                    </div>
                    <div class="mini-opportunity-list">
                        ${relatedOpportunities.length ? relatedOpportunities.map(opp => `
                            <article>
                                <span class="opportunity-badge">${opp.commitment}</span>
                                <h3>${opp.title}</h3>
                                <p>${opp.description}</p>
                                <div class="opportunity-details">
                                    <span>${opp.location}</span>
                                    <span>${opp.duration}</span>
                                </div>
                                <a class="btn btn-outline btn-small" href="opportunity.html?id=${opp.id}">View Details</a>
                            </article>
                        `).join('') : '<p class="muted-note">No matching opportunities yet. This is where open roles and collaboration requests will appear.</p>'}
                    </div>
                </article>

                ${relatedWishes.length ? `
                    <article class="profile-section-card profile-story-card">
                        <div class="profile-section-heading">
                            <span>06</span>
                            <h2>Open Needs</h2>
                        </div>
                        <div class="mini-need-list">
                            ${relatedWishes.map(wish => `
                                <article>
                                    <span class="wish-type">${wish.type}</span>
                                    <h3>${wish.title}</h3>
                                    <p>${wish.description}</p>
                                    <button class="btn btn-primary btn-small" type="button" onclick="showSupportModal('${wish.id}')">Offer Support</button>
                                </article>
                            `).join('')}
                        </div>
                    </article>
                ` : ''}

                <article class="profile-section-card profile-story-card">
                    <div class="profile-section-heading">
                        <span>${relatedWishes.length ? '07' : '06'}</span>
                        <h2>Community Activity</h2>
                    </div>
                    <div class="profile-post-list">
                        ${profilePosts.length ? profilePosts.map(post => `
                            <article>
                                <span class="post-type-tag">${escapeHtml(glowePostTypeLabel(post.category))}</span>
                                <h3>${post.title}</h3>
                                <p>${post.text}</p>
                            </article>
                        `).join('') : '<p class="muted-note">No community posts yet.</p>'}
                    </div>
                </article>
            </div>

            <aside class="profile-sidebar">
                <article class="org-info-card profile-contact-card">
                    <h4>Contact</h4>
                    <p>${profile.website ? `<a href="${escapeHtml(profile.website)}" target="_blank" rel="noopener">${escapeHtml(profile.website)}</a>` : 'Contact through GloWe messages'}</p>
                    <p>${escapeHtml(safeContact)}</p>
                    <button class="btn btn-primary btn-block" type="button" onclick="openPrivateMessage('${safeName}')">Start Conversation</button>
                </article>

                <article class="org-info-card">
                    <h4>Profile snapshot</h4>
                    <div class="profile-info-list compact">
                        <p><strong>Location</strong><span>${escapeHtml(profile.location || profile.country || 'Not specified')}</span></p>
                        <p><strong>Scope</strong><span>${escapeHtml(profile.scope || profile.availability || 'Open to coordination')}</span></p>
                        <p><strong>Impact area</strong><span>${escapeHtml(profile.impactArea || tags.join(', ') || 'Community impact')}</span></p>
                        <p><strong>Public links</strong><span>${renderProfileLinkList(mediaLinks)}</span></p>
                    </div>
                </article>

                <article class="org-info-card">
                    <h4>Trust & status</h4>
                    <div class="profile-check-list">
                        <span>${escapeHtml(trustStatus)}</span>
                        <span>Usually replies within 3-5 days</span>
                        <span>${isOrg ? gloweCountedLabel(profile.volunteers, 'volunteers connected') : gloweCountedLabel(projects.length, 'projects listed')}</span>
                    </div>
                </article>

                <article class="org-info-card">
                    <h4>${isOrg ? 'Impact signals' : 'What I offer'}</h4>
                    <p>${escapeHtml(isOrg ? profile.impactArea : tags.join(', '))}</p>
                    <h4>Impact signals</h4>
                    <div class="impact-signals">
                        ${impactSignals.slice(0, 4).map(signal => `
                            <span title="${signal.metric}">
                                <strong>${signal.tag}</strong>
                                <small>${signal.category}</small>
                            </span>
                        `).join('')}
                    </div>
                </article>

                <article class="org-info-card">
                    <h4>Profile actions</h4>
                    <button class="btn btn-outline btn-block" type="button" onclick="openReportModal('profile', '${profile.id}', '${safeName}')">Report</button>
                </article>
            </aside>
        </section>
    `;

    // FR-TRANSLATE-005 AC7 — for DB profiles, mark the container as a translatable
    // glowe_profile card (the nesting guard in glowe-translate.js keeps the inner
    // project cards translating under their own type), then nudge the driver.
    if (profile._tr) {
        container.setAttribute('data-tr-card', '');
        container.setAttribute('data-tr-type', profile._tr.type);
        container.setAttribute('data-tr-id', profile._tr.id);
        if (window.GloweTranslate && typeof window.GloweTranslate.scan === 'function') {
            window.GloweTranslate.scan();
        }
    }

    if (!isOwnerView && profile.id) {
        resolveFollowButtonHtml(profile.id).then(function (html) {
            const slot = container.querySelector('[data-follow-slot="' + profile.id + '"]');
            if (slot) slot.innerHTML = html;
        });
    }
    loadProfilePublicFollowCounts(profile.id, container);
}

// Initialize opportunity detail page
// FR-TRANSLATE-005 AC7 — mark the opportunity detail grid as one translatable
// card (main + sidebar meta), then nudge the GloweTranslate driver.
function markOpportunityDetailForTranslation(opportunityId) {
    const card = document.querySelector('.opportunity-detail-grid');
    if (!card || !opportunityId) return;
    card.setAttribute('data-tr-card', '');
    card.setAttribute('data-tr-type', 'glowe_opportunity');
    card.setAttribute('data-tr-id', opportunityId);
    const title = document.getElementById('opp-title');
    if (title) title.setAttribute('data-tr-field', 'title');
    const description = document.getElementById('opp-description');
    if (description) description.setAttribute('data-tr-field', 'description');
    const location = document.getElementById('opp-location');
    if (location) location.setAttribute('data-tr-field', 'location');
    const duration = document.getElementById('opp-duration');
    if (duration) duration.setAttribute('data-tr-field', 'duration');
    const commitment = document.getElementById('opp-commitment');
    if (commitment) commitment.setAttribute('data-tr-field', 'commitment');
    if (window.GloweTranslate && typeof window.GloweTranslate.scan === 'function') {
        window.GloweTranslate.scan();
    }
}

async function initOpportunityDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const opportunityId = urlParams.get('id');

    if (!opportunityId) {
        window.location.href = 'volunteer-network.html';
        return;
    }

    // A full page load starts with an empty in-memory store, so remote
    // opportunities/events aren't present yet — fetch before the lookup.
    if (!getOpportunityByAnyId(opportunityId)
        && typeof gloweBackend !== 'undefined' && gloweBackend.configured()) {
        await fetchAndPopulate(() => gloweBackend.listAll('opportunities'), opportunities, mapOpportunityRow, withEnsuredOrganizationEnglishNames);
    }

    const opportunity = getOpportunityByAnyId(opportunityId);
    if (!opportunity) {
        window.location.href = 'volunteer-network.html';
        return;
    }
    
    // Populate page content
    const orgPair = orgNamePairFrom(opportunity);
    const orgName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedOrganizationName(opportunity, gloweReaderLang(), 'GloWe Member')
        : (opportunity.organization || 'GloWe Member');
    document.getElementById('opp-title').textContent = opportunity.title;
    document.getElementById('opp-org').innerHTML = `${renderLocalizedEntityMark(orgPair.primary, orgPair.english, orgName)} ${escapeHtml(orgName)}`;
    document.getElementById('opp-location').textContent = opportunity.location;
    document.getElementById('opp-duration').textContent = opportunity.duration;
    document.getElementById('opp-commitment').textContent = opportunity.commitment;
    document.getElementById('opp-description').textContent = opportunity.description;

    // FR-TRANSLATE-005 AC7 — requirements/responsibilities/skills are text[]
    // columns; tag each chip with a per-element field so the reader driver
    // translates and caches every item independently.
    const emptyDetail = '<li class="empty-detail">None specified for this opportunity.</li>';

    const requirementsList = document.getElementById('opp-requirements');
    const reqs = (opportunity.requirements || []).filter(Boolean);
    requirementsList.innerHTML = reqs.length
        ? reqs.map((req, i) => `<li data-tr-field="requirements.${i}">${escapeHtml(req)}</li>`).join('')
        : emptyDetail;

    const responsibilitiesList = document.getElementById('opp-responsibilities');
    const resps = (opportunity.responsibilities || []).filter(Boolean);
    responsibilitiesList.innerHTML = resps.length
        ? resps.map((resp, i) => `<li data-tr-field="responsibilities.${i}">${escapeHtml(resp)}</li>`).join('')
        : emptyDetail;

    const skillsContainer = document.getElementById('opp-skills');
    const skillItems = (opportunity.skills || []).filter(Boolean);
    skillsContainer.innerHTML = skillItems.length
        ? skillItems.map((skill, i) => `<span class="skill-tag" title="${escapeHtml(skill)}" data-tr-field="skills.${i}">${escapeHtml(skill)}</span>`).join('')
        : '';

    // Mark the card + scan AFTER every tagged field exists (main + sidebar).
    markOpportunityDetailForTranslation(opportunity.id);
    
    // Organization info
    const org = getOrganizationByName(opportunity.organization);
    if (org) {
        const orgDisplay = localizedProfileDisplayName(org, org.name);
        document.getElementById('org-name').textContent = orgDisplay;
        document.getElementById('org-mission').textContent = org.mission;
        const orgNameEl = document.getElementById('org-name');
        if (orgNameEl) applyLocalizedNameAttrs(orgNameEl, org);
    } else {
        document.getElementById('org-name').textContent = orgName;
        document.getElementById('org-mission').textContent = 'This local opportunity was published by a GloWe community member and is ready for interested volunteers or collaborators.';
    }

    const trustPanel = document.getElementById('opp-trust-panel');
    if (trustPanel) {
        trustPanel.innerHTML = `
            <h4>What happens next</h4>
            <ol class="clean-step-list">
                <li>Save the opportunity if you want to compare it later.</li>
                <li>Apply with your availability and relevant skills.</li>
                <li>The organization receives your message and can continue in GloWe messages.</li>
            </ol>
            ${savedToggleButtonHtml('opportunity', opportunity.id, opportunity.title, opportunity.organization, `opportunity.html?id=${encodeURIComponent(opportunity.id)}`, 'Save Opportunity', 'btn btn-outline btn-block')}
        `;
    }
    
    const events = (typeof GloweEvents !== 'undefined') ? GloweEvents : null;
    const isEvent = events ? events.isEvent(opportunity) : false;

    // The owner manages applicants instead of applying to their own opportunity.
    const ownerViewing = !isEvent && isLoggedIn() && isOpportunityOwner(opportunity);

    // Events use the registration panel; plain opportunities keep the apply-modal.
    const applyBtn = document.getElementById('apply-btn');
    if (applyBtn && !isEvent && !ownerViewing) {
        applyBtn.addEventListener('click', function() {
            window.GloweGuest.requireMemberForAction(
                'apply-opportunity',
                { org: (opportunity && opportunity.organization) || '' },
                function () { openModal('apply-modal'); }
            );
        });
    } else if (applyBtn && ownerViewing) {
        applyBtn.hidden = true;
    }

    if (isEvent) setupEventRegistration(opportunity, events);
    else if (ownerViewing) renderOpportunityApplicants(opportunity);
}

// FR-GLOWE-012 AC1 — true when the signed-in user published this opportunity.
function isOpportunityOwner(opportunity) {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    return Boolean(user && opportunity && opportunity.ownerId && user.id === opportunity.ownerId);
}

// FR-GLOWE-012 AC1 — render the opportunity owner's "Applicants" inbox
// (read-only for this slice). Fetches applications via the owner-scoped
// glowe_list_applications_for_opportunity RPC (migration 0220) and lists each
// applicant's name, volunteer answers, status and applied date.
async function renderOpportunityApplicants(opportunity) {
    const area = document.getElementById('opp-applicants');
    if (!area) return;
    area.hidden = false;
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { area.hidden = true; return; }
    area.innerHTML = '<h2>Applicants</h2><p class="muted-note">Loading applicants…</p>';
    let rows = [];
    try {
        rows = await backend.listApplicationsForOpportunity(opportunity.id);
    } catch (_e) {
        area.innerHTML = '<h2>Applicants</h2><p class="event-register-error">Could not load applicants.</p>';
        return;
    }
    const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const views = orgHelpers ? orgHelpers.mapApplicantRows(rows) : [];
    area.innerHTML = opportunityApplicantsHtml(views);
    area.querySelectorAll('[data-app][data-decide]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            handleApplicationDecision(opportunity, btn.getAttribute('data-app'), btn.getAttribute('data-decide'));
        });
    });
    wireConnectButtons(area);
}

// FR-GLOWE-012 AC4 — wire the delegated "Connect" CTA handlers within a rendered
// inbox (shared by the applicants and offers lists). Each button carries the
// contact email in data-connect.
function wireConnectButtons(area) {
    if (!area) return;
    area.querySelectorAll('[data-connect]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            handleConnectEmail(btn.getAttribute('data-connect'));
        });
    });
}

// FR-GLOWE-012 AC4 — the "Connect" CTA button markup, rendered only when the
// view carries a contact email.
function connectButtonHtml(view) {
    const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const hasEmail = orgHelpers ? orgHelpers.hasContactEmail(view) : Boolean(view && view.email);
    if (!hasEmail) return '';
    return `<button class="btn btn-outline btn-sm" type="button" data-connect="${escapeHtml(String(view.email))}">Connect</button>`;
}

// Build the applicants-inbox markup from mapped applicant views.
function opportunityApplicantsHtml(views) {
    const header = `<h2>Applicants <span class="applicant-count">(${views.length})</span></h2>`;
    if (!views.length) {
        return `${header}<p class="muted-note">No applications yet.</p>`;
    }
    const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const rows = views.map(function (v) {
        const date = v.appliedAt ? new Date(v.appliedAt).toLocaleDateString(gloweLocaleTag()) : '';
        const canDecide = orgHelpers ? orgHelpers.canDecideApplication(v.status) : v.status === 'Pending';
        const decideButtons = canDecide ? `
                <button class="btn btn-primary btn-sm" type="button" data-app="${escapeHtml(String(v.id))}" data-decide="Accepted">Accept</button>
                <button class="btn btn-outline btn-sm" type="button" data-app="${escapeHtml(String(v.id))}" data-decide="Declined">Decline</button>` : '';
        const connectButton = connectButtonHtml(v);
        const actions = (decideButtons || connectButton) ? `
            <div class="applicant-actions">${decideButtons}${connectButton}</div>` : '';
        return `
        <li class="applicant-row">
            <div class="applicant-head">
                <strong>${escapeHtml(v.name || 'GloWe volunteer')}</strong>
                <span class="applicant-status status-${escapeHtml(String(v.status).toLowerCase())}">${escapeHtml(v.status)}</span>
            </div>
            ${v.availability ? `<p class="applicant-field"><strong>Availability:</strong> ${escapeHtml(v.availability)}</p>` : ''}
            ${v.skills ? `<p class="applicant-field"><strong>Skills:</strong> ${escapeHtml(v.skills)}</p>` : ''}
            ${v.motivation ? `<p class="applicant-field"><strong>Motivation:</strong> ${escapeHtml(v.motivation)}</p>` : ''}
            ${date ? `<p class="applicant-meta">${gloweText('Applied')} ${escapeHtml(date)}</p>` : ''}
            ${actions}
        </li>`;
    }).join('');
    return `${header}<ul class="applicant-list">${rows}</ul>`;
}

// FR-GLOWE-012 AC4 — copy text (a contact email) to the clipboard for the
// "Connect" CTA. Prefers the async Clipboard API, falling back to a temporary
// textarea + document.execCommand('copy') where it is unavailable (older
// browsers, insecure contexts). Returns true on success.
async function copyTextToClipboard(text) {
    const value = String(text || '');
    if (!value) return false;
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (_e) { /* fall through to the legacy path */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (_e) {
        return false;
    }
}

// FR-GLOWE-012 AC4 — the "Connect" CTA copies the applicant/offerer contact
// email to the clipboard and confirms (Phase B). Phase C will route to KC DMs.
async function handleConnectEmail(email) {
    const ok = await copyTextToClipboard(email);
    showSuccessModal('Connect', ok ? 'Email copied to clipboard' : 'Could not copy the email.');
}

// FR-GLOWE-012 AC2 — owner accept/decline of an application. Fires the
// owner-scoped RPC via the backend, then re-renders the inbox from server truth.
async function handleApplicationDecision(opportunity, applicationId, decision) {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    try {
        await backend.updateApplicationStatus(applicationId, decision);
    } catch (_e) {
        const area = document.getElementById('opp-applicants');
        if (area) area.insertAdjacentHTML('afterbegin', '<p class="event-register-error">Could not update the application. Please try again.</p>');
        return;
    }
    renderOpportunityApplicants(opportunity);
}

// Replace the apply card with an event summary + registration panel (FR-GLOWE-007-C).
function setupEventRegistration(opportunity, events) {
    const card = document.querySelector('.apply-card');
    if (!card) return;
    const typeLabel = events.eventTypeLabel(opportunity.eventType) || 'Event';
    const modeLabel = opportunity.registrationMode === 'open' ? 'Instant registration' : 'Approval required';
    card.innerHTML = `
        <h3>Event registration</h3>
        <div class="opportunity-details">
            <span class="opportunity-detail"><strong>When:</strong> ${escapeHtml(events.formatEventDate(opportunity, gloweLocaleTag()))}</span>
            <span class="opportunity-detail"><strong>Type:</strong> ${escapeHtml(typeLabel)}</span>
            <span class="opportunity-detail"><strong>Registration:</strong> ${escapeHtml(modeLabel)}</span>
        </div>
        <div id="event-register-area" aria-live="polite"></div>
    `;
    renderEventRegisterArea(opportunity, events);
}

// Decide what to show in the registration area: ended / closed notice, sign-in
// prompt, current-status panel, or the registration form.
async function renderEventRegisterArea(opportunity, events) {
    const area = document.getElementById('event-register-area');
    if (!area) return;
    // The organizer manages registrations instead of registering for their own event.
    if (isLoggedIn() && isEventOwner(opportunity)) {
        renderOrganizerPanel(area, opportunity, events);
        return;
    }
    if (events.eventTiming(opportunity) === 'past') {
        area.innerHTML = '<p class="muted-note">This event has ended.</p>';
        return;
    }
    if (events.isEventCancelled(opportunity)) {
        area.innerHTML = '<p class="muted-note">This event has been cancelled by the organizer.</p>';
        return;
    }
    if (opportunity.status && opportunity.status !== 'active') {
        area.innerHTML = '<p class="muted-note">This event is no longer open for registration.</p>';
        return;
    }
    if (!isLoggedIn()) {
        area.innerHTML = `<button class="btn btn-primary btn-block" type="button" id="glowe-rsvp-join">Save your spot</button>`;
        const rsvpBtn = area.querySelector('#glowe-rsvp-join');
        if (rsvpBtn) rsvpBtn.addEventListener('click', function () {
            window.GloweGuest.requireMemberForAction('rsvp-event', { title: (opportunity && opportunity.title) || '' }, function () {});
        });
        return;
    }
    const registration = await findMyRegistration(opportunity.id, events);
    if (registration) renderRegisteredState(area, opportunity, events, registration);
    else renderRegisterForm(area, opportunity);
}

async function findMyRegistration(opportunityId, events) {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return null;
    try {
        const regs = await backend.listMyRegistrations();
        return events.findRegistration(regs || [], opportunityId);
    } catch (_e) {
        return null;
    }
}

function renderRegisteredState(area, opportunity, events, registration) {
    const label = events.registrationStatusLabel(registration.status);
    const canCancel = events.canCancelRegistration(registration.status);
    area.innerHTML = `
        <p class="event-register-status">Status: <strong>${escapeHtml(label)}</strong></p>
        <div id="event-link-area"></div>
        ${canCancel ? '<button class="btn btn-outline btn-block" type="button" id="event-cancel-btn">Cancel registration</button>' : ''}
    `;
    if (registration.status === 'Accepted') renderEventLink(opportunity, events);
    if (!canCancel) return;
    document.getElementById('event-cancel-btn').addEventListener('click', async function() {
        const backend = window.gloweBackend;
        try { await backend.cancelRegistration(registration.id); } catch (_e) { /* reload reflects truth */ }
        renderEventRegisterArea(opportunity, events);
    });
}

// For a confirmed registrant on a digital event, reveal the join link when the
// server allows it, otherwise show when it will appear.
async function renderEventLink(opportunity, events) {
    if (!events.isDigital(opportunity)) return;
    const holder = document.getElementById('event-link-area');
    if (!holder) return;
    const backend = window.gloweBackend;
    let link = null;
    try { link = backend ? await backend.getEventLink(opportunity.id) : null; } catch (_e) { link = null; }
    if (link) {
        holder.innerHTML = `<p class="event-link-line">Join link: <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a></p>`;
        return;
    }
    const hint = events.linkRevealHint(opportunity);
    holder.innerHTML = hint ? `<p class="muted-note">${escapeHtml(hint)}</p>` : '';
}

function renderRegisterForm(area, opportunity) {
    const profile = typeof getPersonalProfile === 'function' ? getPersonalProfile() : null;
    const email = (profile && profile.email) || '';
    area.innerHTML = `
        <form id="event-register-form" class="event-register-form">
            <div class="form-group">
                <label for="event-reg-email">Email</label>
                <input type="email" id="event-reg-email" value="${escapeHtml(email)}" placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label for="event-reg-phone">Phone (optional)</label>
                <input type="text" id="event-reg-phone" placeholder="050-0000000">
            </div>
            <div class="form-group">
                <label for="event-reg-comment">Message to the organizer (optional)</label>
                <textarea id="event-reg-comment" rows="2" placeholder="Anything the organizer should know..."></textarea>
            </div>
            <button class="btn btn-primary btn-block" type="submit">Register for event</button>
        </form>
    `;
    document.getElementById('event-register-form')
        .addEventListener('submit', (e) => submitEventRegistration(e, opportunity));
}

async function submitEventRegistration(event, opportunity) {
    event.preventDefault();
    const backend = window.gloweBackend;
    const events = (typeof GloweEvents !== 'undefined') ? GloweEvents : null;
    if (!backend || !backend.configured() || !events) return;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registering...'; }
    try {
        const row = await backend.registerForEvent(opportunity.id, {
            email: document.getElementById('event-reg-email').value,
            phone: document.getElementById('event-reg-phone').value,
            comment: document.getElementById('event-reg-comment').value
        });
        const accepted = row && row.status === 'Accepted';
        showSuccessModal(
            accepted ? 'You are registered!' : 'Registration submitted',
            accepted
                ? 'Your spot is confirmed. Manage it from your personal area.'
                : 'Your registration is pending review by the organizer.'
        );
        renderEventRegisterArea(opportunity, events);
    } catch (err) {
        const area = document.getElementById('event-register-area');
        if (area) area.insertAdjacentHTML('afterbegin', `<p class="event-register-error">${escapeHtml(registrationErrorMessage(err))}</p>`);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Register for event'; }
    }
}

// Map a Postgres/PostgREST error from glowe_register_for_event to friendly copy.
function registrationErrorMessage(err) {
    const raw = (err && (err.message || err.error_description)) || '';
    if (raw.includes('already have an active registration')) return 'You are already registered for this event.';
    if (raw.includes('not open for registration') || raw.includes('already ended')) return 'This event is no longer open for registration.';
    if (raw.includes('sign in')) return 'Please sign in to register.';
    return 'Could not complete your registration. Please try again.';
}

// ── Organizer portal (FR-GLOWE-007-E) ──────────────────────────────────────
// True when the signed-in user published this event.
function isEventOwner(opportunity) {
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    return Boolean(user && opportunity && opportunity.ownerId && user.id === opportunity.ownerId);
}

// Render the organizer's registrant list with accept/decline controls.
async function renderOrganizerPanel(area, opportunity, events) {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) { area.innerHTML = ''; return; }
    area.innerHTML = '<p class="muted-note">Loading registrations…</p>';
    let regs = [];
    try {
        regs = await backend.listEventRegistrations(opportunity.id);
    } catch (_e) {
        area.innerHTML = '<p class="event-register-error">Could not load registrations.</p>';
        return;
    }
    area.innerHTML = organizerPanelHtml(regs, opportunity, events);
    area.querySelectorAll('[data-decide]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            handleOrganizerDecision(btn.getAttribute('data-reg'), btn.getAttribute('data-decide'), opportunity, events);
        });
    });
    const cancelBtn = document.getElementById('event-cancel-event-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { handleCancelEvent(opportunity, events); });
}

function organizerPanelHtml(registrations, opportunity, events) {
    const accepted = events.acceptedCount(registrations);
    const rows = (registrations || []).map(function (r) { return organizerRegistrationRowHtml(r, events); }).join('');
    const cancelled = events.isEventCancelled(opportunity);
    const cancelControl = cancelled
        ? '<p class="event-register-status"><strong>This event is cancelled.</strong></p>'
        : '<button class="btn btn-outline btn-block" type="button" id="event-cancel-event-btn">Cancel event</button>';
    return `
        <div class="organizer-panel">
            <h4>Manage registrations</h4>
            <p class="organizer-capacity">${escapeHtml(events.capacityLabel(opportunity, accepted))}</p>
            <div class="organizer-reg-list">${rows || '<p class="muted-note">No registrations yet.</p>'}</div>
            <div class="organizer-cancel-event">${cancelControl}</div>
        </div>
    `;
}

function organizerRegistrationRowHtml(reg, events) {
    const name = reg.registrant_name || reg.submitted_email || 'Registrant';
    const contact = [reg.submitted_email, reg.submitted_phone].filter(Boolean).join(' · ');
    const statusLabel = events.registrationStatusLabel(reg.status) || reg.status;
    const note = reg.rejection_note ? `<p class="muted-note">${glowePrefixedLabel('Reason')} ${escapeHtml(reg.rejection_note)}</p>` : '';
    const actions = events.canDecideRegistration(reg.status)
        ? `<div class="organizer-actions">
               <button class="btn btn-small btn-primary" type="button" data-decide="accept" data-reg="${escapeHtml(reg.id)}">Accept</button>
               <button class="btn btn-small btn-outline" type="button" data-decide="decline" data-reg="${escapeHtml(reg.id)}">Decline</button>
           </div>`
        : '';
    return `
        <article class="organizer-reg-item">
            <div>
                <strong>${escapeHtml(name)}</strong>
                <span class="status-badge status-${reg.status.toLowerCase()}">${escapeHtml(statusLabel)}</span>
                ${contact ? `<p class="muted-note">${escapeHtml(contact)}</p>` : ''}
                ${note}
            </div>
            ${actions}
        </article>
    `;
}

// Accept or decline a registration, then refresh the panel from server truth.
async function handleOrganizerDecision(registrationId, decision, opportunity, events) {
    const backend = window.gloweBackend;
    if (!backend || !registrationId) return;
    let note = '';
    if (decision === 'decline') {
        note = (window.prompt('Reason for declining (required, shown to the registrant):') || '').trim();
        if (!note) return;
    }
    try {
        await backend.decideEventRegistration(registrationId, decision, note.slice(0, 500));
    } catch (_e) {
        /* re-render reflects the server's authoritative state */
    }
    const area = document.getElementById('event-register-area');
    if (area) renderOrganizerPanel(area, opportunity, events);
}

// Organizer cancels the whole event (after confirmation), then refreshes.
async function handleCancelEvent(opportunity, events) {
    const backend = window.gloweBackend;
    if (!backend) return;
    if (!window.confirm('Cancel this event? Registrants will see it as cancelled.')) return;
    try {
        const row = await backend.cancelEvent(opportunity.id);
        if (row && row.status) opportunity.status = row.status;
    } catch (_e) {
        /* re-render reflects the server's authoritative state */
    }
    const area = document.getElementById('event-register-area');
    if (area) renderOrganizerPanel(area, opportunity, events);
}

// Handle application submission
async function handleApplicationSubmit(event) {
    event.preventDefault();
    if (!isLoggedIn()) {
        showSuccessModal('Sign in to apply', 'Please sign in or create a free account to apply to this opportunity.');
        return;
    }
    const opportunityId = new URLSearchParams(window.location.search).get('id');
    const user = getCurrentUser();
    const helpers = (typeof GloweOpportunities !== 'undefined') ? GloweOpportunities : null;
    const backend = window.gloweBackend;

    // Guard against duplicate applications (AC5). Prefer the authoritative
    // server list; fall back to the local cache when the backend is offline.
    let existing = getApplications();
    if (backend && backend.configured()) {
        try { existing = await backend.listOwned('applications') || []; } catch (_e) { existing = getApplications(); }
    }
    if (helpers && helpers.isDuplicateApplication(existing, opportunityId, user && user.id)) {
        closeModal('apply-modal');
        showSuccessModal('Already applied', 'You have already applied to this opportunity. Track its status in your personal area.');
        return;
    }

    const availability = document.getElementById('apply-availability').value;
    const skills = document.getElementById('apply-skills').value;
    const motivation = document.getElementById('apply-motivation').value;

    if (backend && backend.configured()) {
        try {
            await backend.insertOwned('applications', {
                opportunity_id: String(opportunityId),
                availability,
                skills,
                motivation,
                status: 'Pending'
            });
        } catch (_e) {
            showSuccessModal('Could not apply', 'Something went wrong submitting your application. Please try again.');
            return;
        }
    }

    // Local cache keeps the Personal Area "Applications" list responsive until
    // it is migrated to a live Supabase read (GLOWE.B6).
    const applications = getApplications();
    applications.push({
        id: Date.now(),
        opportunityId,
        userId: user.id,
        availability,
        skills,
        motivation,
        status: 'Pending',
        appliedAt: new Date().toISOString()
    });
    saveApplications(applications);

    closeModal('apply-modal');
    showSuccessModal(
        'Application Submitted!',
        'Your application has been submitted successfully. You can track its status in your personal area.'
    );
}

// Initialize my applications page
function initMyApplicationsPage() {
    const container = document.getElementById('personal-area-content');
    if (!container) return;
    // FR-GLOWE-023 AC1 — an anonymous visitor tapping the "Profile" tab sees an
    // in-page sign-in prompt (like Settings/Messages) instead of being bounced
    // back to the guest home; the contextual join modal opens immediately so
    // the tap isn't a dead end.
    if (!(typeof isLoggedIn === 'function' && isLoggedIn())) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Sign in to open your personal area</h3>
                <p>Your profile, applications, needs, and saved items live here once you are signed in.</p>
                <button class="btn btn-primary" type="button" onclick="window.GloweGuest.requireMemberForAction('open-personal-area', {}, function(){})">Sign up / Sign in</button>
            </div>
        `;
        if (window.GloweGuest) window.GloweGuest.requireMemberForAction('open-personal-area', {}, function () {});
        return;
    }

    function renderPersonalArea() {
        const profile = getPersonalProfile();
        const displayName = localizedProfileDisplayName(profile);
        const namePair = profileNamePairFrom(profile);
        const projects = getPersonalProjectsForView();
        const myNeeds = getMyWishesForView();
        const myPosts = getMyPostsForView();
        const myOpportunities = getMyOpportunitiesForView();
        const myOffers = getMyOffersForView();
        const followCounts = getFollowCountsForView();
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        const applications = getApplications();
        const localApplications = user ? applications.filter(app => app.userId === user.id) : [];
        // Prefer the live glowe_applications view once loaded (AC8); the local
        // cache is the offline/pre-load fallback.
        const liveApplications = getMyApplicationsForView();
        const userApplications = liveApplications || localApplications;
        const savedPosts = getSavedCommunityPosts().slice(0, 3);
        const savedItems = getSavedItems();
        const savedPreview = savedItems.slice(0, 6);
        // FR-GLOWE-011 AC1 — skeleton only on a first-ever load (fetch in flight,
        // no cached profile yet); returning users see their cached profile.
        const orgHelpers = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
        const showProfileSkeleton = orgHelpers
            ? orgHelpers.shouldShowProfileSkeleton(personalProfileLoading, hasCachedPersonalProfile())
            : false;
        const ux = (typeof GloweProfileUx !== 'undefined') ? GloweProfileUx : null;
        const chip = ux ? ux.profileStatusChip(profile, { isOwner: true }) : null;
        const bioSrc = ux ? ux.profileBioSource(profile) : { text: profile.shortLine || profile.about || '', field: 'about' };
        const bioText = bioSrc.text || profile.shortLine || profile.about || profile.story || 'Your GloWe profile is ready to be completed.';
        const chipHtml = chip ? renderProfileStatusChipHtml(chip) : '';
        const cameraIcon = ux ? ux.CAMERA_ICON_SVG : '';
        const isOrganization = profile.accountType === 'organization';
        const profileTypeHtml = isOrganization
            ? `<span class="profile-type">${escapeHtml(profile.type || 'Organization')}</span>`
            : '';
        const editIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        // FR-GLOWE-024 — EN UI prefers display_name_en; HE prefers primary Hebrew name.
        const heroDisplayName = (typeof GloweLocalizedName !== 'undefined')
            ? GloweLocalizedName.localizedProfileName(profile, gloweReaderLang())
            : (profile.name || '');

        container.innerHTML = `
            <div class="personal-shell personal-shell--compact">
                <div class="personal-main">
                    ${showProfileSkeleton ? personalProfileSkeletonHero() : `<section class="social-profile-hero" id="personal-profile">
                        ${renderSocialCover(profile, { editable: true })}
                        <div class="social-profile-body">
                            <div class="social-profile-head">
                                <div class="social-avatar-wrap">
                                    ${renderPersonalAvatar(profile, 'profile-avatar social-avatar')}
                                    <button type="button" class="social-avatar-change social-avatar-change--icon" aria-label="Change profile photo" onclick="openAvatarEditModal()">${cameraIcon}</button>
                                </div>
                                <div class="social-profile-copy">
                                    <div class="social-profile-tags">
                                        ${profileTypeHtml}
                                        ${chipHtml}
                                    </div>
                                    <h2 class="social-profile-name-row">
                                        <span ${bilingualNameAttrs(namePair.primary, namePair.english)}>${escapeHtml(heroDisplayName)}</span>
                                        <button type="button" class="profile-name-edit-btn" aria-label="Edit profile" title="Edit profile" onclick="openEditProfile()">${editIcon}</button>
                                    </h2>
                                    <div class="social-profile-bio" data-tr-card data-tr-type="glowe_profile" data-tr-id="${escapeHtml(profile.id || '')}">
                                        <p data-tr-field="${bioSrc.field || 'about'}">${escapeHtml(bioText)}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="profile-meta-row">
                                <span>${escapeHtml(profile.focus || 'Focus not added yet')}</span>
                                <span>${escapeHtml(profile.location || profile.country || 'Location not added yet')}</span>
                                <span>${escapeHtml(profile.availability || 'Team size not added yet')}</span>
                            </div>
                            <div class="personal-actions">
                                <button class="btn btn-outline" type="button" onclick="openPersonalProjectModal()">Add Project</button>
                                <a class="btn btn-outline" href="community.html">Write Post</a>
                            </div>
                        </div>
                    </section>`}

                    <div class="personal-summary-bar">
                        <section class="personal-stats-grid personal-stats-grid--compact" aria-label="Profile summary">
                            ${personalFollowStatsHtml(profile.id, followCounts)}
                            <div><strong>${projects.length}</strong><span>Projects</span></div>
                            <div><strong>${userApplications.length}</strong><span>Applications</span></div>
                            <div><strong>${savedItems.length}</strong><span>Saved</span></div>
                            <div><strong>${savedPosts.length}</strong><span>Posts</span></div>
                        </section>
                        <nav class="personal-nav personal-nav--scroll" aria-label="Personal area sections">
                            <a href="#personal-profile">Overview</a>
                            <a href="#personal-projects">Projects</a>
                            <a href="#personal-opportunities">Opportunities</a>
                            <a href="#personal-needs">My Needs</a>
                            <a href="#personal-posts">My Posts</a>
                            <a href="#personal-my-opportunities">My Opportunities</a>
                            <a href="#personal-offers">My Offers</a>
                            <a href="#personal-events">My Events</a>
                            <a href="#personal-saved">Saved</a>
                            <a href="#personal-activity">Activity</a>
                        </nav>
                    </div>

                    <section class="personal-grid">
                        <article class="profile-section-card${isQuestionnaireCollapsed() ? ' is-collapsed' : ''}">
                            <div class="profile-section-heading">
                                <span>01</span>
                                <h2>Profile From Questionnaire</h2>
                                ${isOrganization && sessionStorage.getItem(QUESTIONNAIRE_BADGE_DISMISSED_KEY) !== '1' ? `
                                    <span class="questionnaire-type-badge">
                                        ${escapeHtml('Organization')}
                                        <button type="button" class="questionnaire-badge-close" onclick="dismissQuestionnaireBadge()" aria-label="Dismiss">&times;</button>
                                    </span>
                                ` : ''}
                                <button type="button" class="section-collapse-toggle" onclick="toggleQuestionnaireProfile()" aria-expanded="${!isQuestionnaireCollapsed()}">
                                    ${isQuestionnaireCollapsed() ? 'Show details' : 'Hide details'}
                                    <span class="collapse-chevron" aria-hidden="true">▾</span>
                                </button>
                            </div>
                            <div class="profile-info-list section-collapsible">
                                ${renderQuestionnaireProfile(profile)}
                                <p><strong>Social links</strong><span>${renderProfileLinkList(profile.socials)}</span></p>
                                <p><strong>Articles / media</strong><span>${renderProfileLinkList(profile.media)}</span></p>
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-projects">
                            <div class="personal-card-header">
                                <div class="profile-section-heading">
                                    <span>02</span>
                                    <h2>Projects</h2>
                                </div>
                                <button class="btn btn-outline btn-small" type="button" onclick="openPersonalProjectModal()">Add Project</button>
                            </div>
                            <div class="projects-grid">${projects.map(p => renderProjectCard(p, { deletable: true })).join('') || '<p class="muted-note">No projects yet. Add your first project.</p>'}</div>
                        </article>

                        <article class="profile-section-card" id="personal-opportunities">
                            <div class="profile-section-heading">
                                <span>03</span>
                                <h2>Opportunities & Applications</h2>
                            </div>
                            <div class="personal-list">
                                ${userApplications.length ? userApplications.map(renderApplicationCard).join('') : `
                                    <div class="empty-state compact-empty">
                                        <h3>No applications yet</h3>
                                        <p>Apply to opportunities or publish your own request for volunteers and collaborators.</p>
                                        <a href="volunteer-network.html" class="btn btn-primary btn-small">Open Volunteer Network</a>
                                    </div>
                                `}
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-needs">
                            <div class="personal-card-header">
                                <div class="profile-section-heading">
                                    <span>04</span>
                                    <h2>My Needs</h2>
                                </div>
                                <a class="btn btn-outline btn-small" href="wishing-well.html">Post a Need</a>
                            </div>
                            <div class="personal-list" id="my-needs-list" aria-live="polite">
                                ${renderMyNeedsList(myNeeds)}
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-posts">
                            <div class="personal-card-header">
                                <div class="profile-section-heading">
                                    <span>05</span>
                                    <h2>My Posts</h2>
                                </div>
                                <a class="btn btn-outline btn-small" href="community.html">Write Post</a>
                            </div>
                            <div class="personal-list" id="my-posts-list" aria-live="polite">
                                ${renderMyPostsList(myPosts)}
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-my-opportunities">
                            <div class="personal-card-header">
                                <div class="profile-section-heading">
                                    <span>06</span>
                                    <h2>My Opportunities</h2>
                                </div>
                                <a class="btn btn-outline btn-small" href="volunteer-network.html">Post Opportunity</a>
                            </div>
                            <div class="personal-list" id="my-opportunities-list" aria-live="polite">
                                ${renderMyOpportunitiesList(myOpportunities)}
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-offers">
                            <div class="personal-card-header">
                                <div class="profile-section-heading">
                                    <span>07</span>
                                    <h2>My Offers</h2>
                                </div>
                                <a class="btn btn-outline btn-small" href="wishing-well.html">Browse Wishes</a>
                            </div>
                            <div class="personal-list" id="my-offers-list" aria-live="polite">
                                ${renderMyOffersList(myOffers)}
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-events">
                            <div class="profile-section-heading">
                                <span>08</span>
                                <h2>My Events</h2>
                            </div>
                            <div class="personal-list" id="my-events-list" aria-live="polite">
                                <p class="muted-note">Loading your event registrations…</p>
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-saved">
                            <div class="profile-section-heading">
                                <span>09</span>
                                <h2>Saved</h2>
                            </div>
                            <div class="saved-mini-grid">
                                ${savedPreview.length ? savedPreview.map(item => `
                                    <article class="saved-mini-card">
                                        <span class="post-type-tag">${escapeHtml(gloweEnumLabel(GLOWE_SAVED_ITEM_TYPE_LABEL, item.type))}</span>
                                        <h3>${escapeHtml(item.title)}</h3>
                                        <p>${escapeHtml(item.meta || 'Saved from the GloWe community')}</p>
                                        <div class="saved-card-actions">
                                            ${item.href ? `<a class="btn btn-primary btn-small" href="${item.href}">Open</a>` : ''}
                                            <button class="btn btn-outline btn-small" type="button" onclick="removeSavedItem('${item.type}', '${item.id}')">Remove</button>
                                        </div>
                                    </article>
                                `).join('') : `
                                    <div class="empty-state compact-empty">
                                        <h3>No saved items yet</h3>
                                        <p>Save posts, profiles, wishes, and opportunities to return to them from here.</p>
                                        <a href="community.html" class="btn btn-primary btn-small">Explore Community</a>
                                    </div>
                                `}
                            </div>
                        </article>

                        <article class="profile-section-card" id="personal-activity">
                            <div class="profile-section-heading">
                                <span>10</span>
                                <h2>Recent Activity</h2>
                            </div>
                            <div class="profile-post-list">
                                ${savedPosts.length ? savedPosts.map(post => `
                                    <article>
                                        <span class="post-type-tag">${escapeHtml(glowePostTypeLabel(post.category))}</span>
                                        <h3>${post.title}</h3>
                                        <p>${post.text}</p>
                                    </article>
                                `).join('') : '<p class="muted-note">Posts you write in the community will appear here.</p>'}
                            </div>
                        </article>
                    </section>
                </div>
            </div>
        `;
        if (!showProfileSkeleton) {
            markProfileBioTranslation(document.getElementById('personal-profile'), profile);
        }
        translateGloweTree(container);
    }

    // FR-GLOWE-011 AC1 — a backend profile fetch will run only when signed in
    // against a configured backend; arm the skeleton for that first load.
    const profileBackend = window.gloweBackend;
    personalProfileLoading = Boolean(profileBackend && profileBackend.configured() && isLoggedIn());
    window.renderPersonalArea = renderPersonalArea;
    renderPersonalArea();
    loadMyEvents();
    loadPersonalProjects().then(() => renderPersonalArea());
    loadMyWishes().then(() => renderPersonalArea());
    loadMyPosts().then(() => renderPersonalArea());
    loadMyOpportunities().then(() => renderPersonalArea());
    loadMyOffers().then(() => renderPersonalArea());
    loadMyApplications().then(() => renderPersonalArea());
    loadFollowCounts().then(() => renderPersonalArea());
    // AC1 — clear the skeleton once the profile fetch settles (success or
    // failure) and always re-render so the real profile (or fallback) shows.
    syncPersonalDataFromBackend()
        .catch(() => null)
        .then(() => {
            personalProfileLoading = false;
            renderPersonalArea();
            loadMyEvents();
        });
}

// Populate the personal-area "My Events" list from the user's live event
// registrations (FR-GLOWE-007-F). Renders after the synchronous personal-area
// shell so a slow Supabase round-trip never blocks the page.
async function loadMyEvents() {
    const list = document.getElementById('my-events-list');
    if (!list) return;
    const backend = window.gloweBackend;
    const events = (typeof GloweEvents !== 'undefined') ? GloweEvents : null;
    if (!backend || !backend.configured() || !events) {
        list.innerHTML = emptyMyEventsHtml();
        return;
    }
    try {
        const [regs, opportunities] = await Promise.all([
            backend.listMyRegistrations(),
            backend.listAll('opportunities')
        ]);
        const rows = buildMyEventRows(regs || [], opportunities || [], events);
        list.innerHTML = rows.length
            ? rows.map(row => renderMyEventCard(row, events)).join('')
            : emptyMyEventsHtml();
    } catch (_e) {
        list.innerHTML = emptyMyEventsHtml();
    }
}

// Join registration rows to their event, newest event first, dropping rows
// whose opportunity is missing or is not an event.
function buildMyEventRows(registrations, opportunities, events) {
    const byId = new Map(opportunities.map(o => [o.id, mapOpportunityRow(o)]));
    return registrations
        .map(reg => ({ reg, event: byId.get(reg.opportunity_id || reg.opportunityId) }))
        .filter(row => row.event && events.isEvent(row.event))
        .sort((a, b) => Date.parse(b.event.startAt || 0) - Date.parse(a.event.startAt || 0));
}

function renderMyEventCard(row, events) {
    const { reg, event } = row;
    const cancelled = events.isEventCancelled(event);
    const statusLabel = cancelled ? 'Event cancelled' : events.registrationStatusLabel(reg.status);
    const badgeClass = cancelled ? 'status-cancelled' : `status-${reg.status.toLowerCase()}`;
    const canCancel = !cancelled && events.canCancelRegistration(reg.status);
    const detailHref = `opportunity.html?id=${encodeURIComponent(event.id)}`;
    return `
        <article class="personal-list-item my-event-item">
            <div>
                <a href="${detailHref}"><h3>${escapeHtml(event.title)}</h3></a>
                <p class="muted-note">${escapeHtml(event.organization || '')} · ${escapeHtml(events.formatEventDate(event, gloweLocaleTag()))}</p>
                <span class="status-badge ${badgeClass}">${escapeHtml(statusLabel)}</span>
            </div>
            ${canCancel ? `<button class="btn btn-outline btn-small" type="button" onclick="cancelMyEvent('${reg.id}')">Cancel</button>` : ''}
        </article>
    `;
}

function emptyMyEventsHtml() {
    return `
        <div class="empty-state compact-empty">
            <h3>No event registrations yet</h3>
            <p>Register for an event from the Volunteer Network and track it here.</p>
            <a href="volunteer-network.html" class="btn btn-primary btn-small">Browse events</a>
        </div>
    `;
}

// Cancel a registration from the My Events list, then reload the list.
async function cancelMyEvent(registrationId) {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    try {
        await backend.cancelRegistration(registrationId);
    } catch (_e) {
        /* leave the list as-is; a reload will reflect server truth */
    }
    loadMyEvents();
}

const GLOWE_LANG_KEY = 'gloweLang';

// FR-TRANSLATE-003 — interface languages GloWe offers. Single source of truth
// for the header picker and the Settings select. `native` is the endonym, so a
// speaker recognizes their language without having to read English first.
// Keep in sync with SUPPORTED_TARGET_LANGUAGES (supabase/functions/_shared/
// translation/supportedLanguages.ts), which gates UGC translation targets.
const GLOWE_LANGUAGES = [
    { code: 'en', native: 'English' },
    { code: 'he', native: 'עברית' },
    { code: 'ru', native: 'Русский' },
    { code: 'ar', native: 'العربية' },
    { code: 'am', native: 'አማርኛ' }
];

const GLOWE_RTL_LANGS = ['he', 'ar'];

function getGloweLanguage() {
    const stored = localStorage.getItem(GLOWE_LANG_KEY);
    return GLOWE_LANGUAGES.some(l => l.code === stored) ? stored : 'en';
}

// FR-GLOWE-004 — interface i18n. English is the base; only the chrome (nav,
// auth, footer, modals, settings) and the home page are localized for now.
// Untranslated copy intentionally falls back to English. Keys are the exact
// English text nodes / attribute values produced by the page or by app.js.
const GLOWE_TRANSLATIONS = {
    he: {
        "Can't follow this profile": "לא ניתן לעקוב אחרי הפרופיל הזה",
        "What's next": "מה הלאה",
        "Don't have an account?": "אין לכם חשבון?",
        "Active threads will appear here once community members start discussions.": "שרשורים פעילים יופיעו כאן ברגע שחברי הקהילה יתחילו דיונים.",
        "Activity": "פעילות",
        "Add Project": "הוספת פרויקט",
        "Advocacy": "סנגור",
        "All areas": "כל התחומים",
        "All Fields": "כל התחומים",
        "All Groups": "כל הקבוצות",
        "All Locations": "כל המיקומים",
        "All regions": "כל האזורים",
        "All types": "כל הסוגים",
        "All Types": "כל הסוגים",
        "All wishes": "כל המשאלות",
        "Applications": "מועמדויות",
        "Apply for This Opportunity": "הגשת מועמדות להזדמנות",
        "Apply Now": "להגשת מועמדות",
        "Apply to opportunities or publish your own request for volunteers and collaborators.": "הגישו מועמדות להזדמנויות או פרסמו בקשה משלכם למתנדבים ולשותפים.",
        "Apply with your availability and relevant skills.": "הגישו מועמדות עם הזמינות והכישורים הרלוונטיים שלכם.",
        "Approve": "אישור",
        "Approve profiles that are ready, or send them back for changes.": "אשרו פרופילים שמוכנים, או החזירו אותם לתיקונים.",
        "Arabic": "ערבית",
        "Articles / media": "מאמרים / מדיה",
        "As a member of the GloWe community, you agree not to:": "כחברי קהילת GloWe, אתם מסכימים שלא:",
        "Ask a real question, lead a focused space, share a file, or learn from people working through similar challenges.": "שאלו שאלה אמיתית, הובילו מרחב ממוקד, שתפו קובץ או למדו מאנשים שמתמודדים עם אתגרים דומים.",
        "Ask question": "שאלת שאלה",
        "Ask, advise, lead": "לשאול, לייעץ, להוביל",
        "Attach file": "צירוף קובץ",
        "Back to Community": "חזרה לקהילה",
        "Back to Feed": "חזרה לפיד",
        "Back to Wishing Well": "חזרה לבאר המשאלות",
        "Backend not configured": "הממשק האחורי אינו מוגדר",
        "Based on GloWe content types": "מבוסס על סוגי התוכן של GloWe",
        "Better matching": "התאמה טובה יותר",
        "Both belong here. GloWe is built for mutual support, respectful collaboration, and the quiet relief of finding people who understand the journey.": "לשניהם יש מקום כאן. GloWe בנויה לתמיכה הדדית, לשיתוף פעולה מכבד ולהקלה השקטה שבמציאת אנשים שמבינים את הדרך.",
        "Browse opportunities, save what matters, contact members, and offer your professional skills, time, resources, or lived experience.": "עיינו בהזדמנויות, שמרו את מה שחשוב, צרו קשר עם חברים והציעו את הכישורים המקצועיים, הזמן, המשאבים או הניסיון האישי שלכם.",
        "Browse Organizations": "עיון בארגונים",
        "Build trust through profiles, community review, and clear next steps": "בניית אמון דרך פרופילים, בקרת קהילה וצעדים הבאים ברורים",
        "Business-Social Collaboration": "שיתוף פעולה עסקי-חברתי",
        "Businesses / CSR teams": "עסקים / צוותי CSR",
        "Businesses and partners": "עסקים ושותפים",
        "By using the platform, you agree that:": "בשימוש בפלטפורמה, אתם מסכימים כי:",
        "Cancel": "ביטול",
        "Change": "שינוי",
        "Choose the right topic, add useful context, and publish it into the community feed.": "בחרו את הנושא הנכון, הוסיפו הקשר מועיל ופרסמו את זה בפיד הקהילה.",
        "Civic Innovation": "חדשנות אזרחית",
        "Cleanup days worth repeating": "ימי ניקיון ששווה לחזור עליהם",
        "Clear": "ניקוי",
        "Clear filters": "ניקוי מסננים",
        "Climate": "אקלים",
        "Close": "סגירה",
        "Comment": "תגובה",
        "comment": "תגובה",
        "comments": "תגובות",
        "Commitment:": "מחויבות:",
        "Community Activity": "פעילות הקהילה",
        "Community Building": "בניית קהילה",
        "Community feed": "פיד הקהילה",
        "Community Feed": "פיד הקהילה",
        "Community feed filters": "מסנני פיד הקהילה",
        "Community first, technology second.": "קהילה קודם, טכנולוגיה אחר כך.",
        "Community Forums": "פורומים קהילתיים",
        "Community home": "בית הקהילה",
        "Community integrity": "יושרה קהילתית",
        "Community interactions": "אינטראקציות קהילתיות",
        "Community managers": "מנהלי קהילה",
        "Community members with active contributions will be featured here.": "חברי קהילה עם תרומות פעילות יוצגו כאן.",
        "Community reinvestment": "השקעה חוזרת בקהילה",
        "Community reports": "דיווחי קהילה",
        "Community reports will appear here.": "דיווחי הקהילה יופיעו כאן.",
        "Community review": "בקרת קהילה",
        "Community support board": "לוח התמיכה הקהילתי",
        "Community wishes": "משאלות הקהילה",
        "Connect with social and environmental work through responsible collaboration, CSR, ESG, and shared value.": "התחברו לעבודה חברתית וסביבתית דרך שיתוף פעולה אחראי, CSR, ESG וערך משותף.",
        "Connection suggestions": "הצעות לחיבור",
        "connections": "חיבורים",
        "Consultation request": "בקשת ייעוץ",
        "Contact": "יצירת קשר",
        "Content": "תוכן",
        "Context": "הקשר",
        "Could not load queue": "טעינת התור נכשלה",
        "Create a password": "יצירת סיסמה",
        "Create a password (min 8 characters)": "יצירת סיסמה (לפחות 8 תווים)",
        "Create Account": "יצירת חשבון",
        "Create Your Profile": "יצירת הפרופיל שלכם",
        "Daily workspace": "מרחב עבודה יומי",
        "Describe your relevant skills and experience...": "תארו את הכישורים והניסיון הרלוונטיים שלכם...",
        "Direct conversations with volunteers, organizations, and partners live here once you are signed in.": "שיחות ישירות עם מתנדבים, ארגונים ושותפים יופיעו כאן לאחר הכניסה.",
        "Direct conversations with volunteers, organizations, and partners.": "שיחות ישירות עם מתנדבים, ארגונים ושותפים.",
        "Direct messaging is coming soon": "הודעות ישירות יגיעו בקרוב",
        "Discover organizations, initiatives, and partners sharing field knowledge and practical needs.": "גלו ארגונים, יוזמות ושותפים שחולקים ידע מהשטח וצרכים מעשיים.",
        "Discover People": "גלו אנשים",
        "Discussion group": "קבוצת דיון",
        "Discussion groups will appear here once they are set up.": "קבוצות דיון יופיעו כאן ברגע שיוגדרו.",
        "Discussion groups will appear here soon.": "קבוצות דיון יופיעו כאן בקרוב.",
        "Discussion Groups": "קבוצות דיון",
        "Dismiss": "סגירה",
        "Distribution": "הפצה",
        "Diverse people speaking around a round table at an impact community conference": "אנשים מגוונים משוחחים סביב שולחן עגול בכנס קהילת השפעה",
        "Document what happened after someone helped: what changed, what was learned, and what support is still needed.": "תעדו מה קרה אחרי שמישהו עזר: מה השתנה, מה נלמד ואיזו תמיכה עדיין נדרשת.",
        "Duration": "משך",
        "Duration:": "משך:",
        "Each community starts from its own reality: language, culture, needs, skills, and local leadership.": "כל קהילה מתחילה מהמציאות שלה: שפה, תרבות, צרכים, כישורים ומנהיגות מקומית.",
        "Each part of the system is here to help impact work become more visible, connected, and supported.": "כל חלק במערכת נועד לעזור לעבודת ההשפעה להיות נראית, מחוברת ונתמכת יותר.",
        "Edit profile": "עריכת פרופיל",
        "Edit Profile": "עריכת פרופיל",
        "Edit your profile, add projects, track opportunities, and manage your community activity in one place.": "ערכו את הפרופיל שלכם, הוסיפו פרויקטים, עקבו אחר הזדמנויות ונהלו את פעילות הקהילה שלכם במקום אחד.",
        "Education": "חינוך",
        "Education, Climate, Health, Funding": "חינוך, אקלים, בריאות, מימון",
        "Education, climate, mentors, Jerusalem...": "חינוך, אקלים, מנטורים, ירושלים...",
        "Effective Date: May 30, 2026": "תאריך תחולה: 30 במאי 2026",
        "Environment": "סביבה",
        "Equipment / Space": "ציוד / מרחב",
        "Evenings": "ערבים",
        "Events": "אירועים",
        "Every connection can end with a short outcome update.": "כל חיבור יכול להסתיים בעדכון תוצאה קצר.",
        "Everyone": "כולם",
        "Example: Grant proposal checklist for small NGOs": "לדוגמה: רשימת תיוג להגשת מענק לעמותות קטנות",
        "Explore Community": "גלו את הקהילה",
        "Explore possible collaborations": "גלו שיתופי פעולה אפשריים",
        "Explore possible connections between needs, skills, organizations, and people. Each suggestion is an invitation to read, ask, and decide together.": "גלו חיבורים אפשריים בין צרכים, כישורים, ארגונים ואנשים. כל הצעה היא הזמנה לקרוא, לשאול ולהחליט יחד.",
        "Fetching organizations awaiting verification.": "טוען ארגונים הממתינים לאימות.",
        "Field knowledge becomes easier to find, translate, discuss, and reuse across communities.": "ידע מהשטח נעשה קל יותר למצוא, לתרגם, לדון ולשימוש חוזר בין קהילות.",
        "Field stories, questions, support offers, updates, and open calls": "סיפורים מהשטח, שאלות, הצעות תמיכה, עדכונים וקריאות פתוחות",
        "Field update": "עדכון מהשטח",
        "Field wisdom, professional tools, lived experience, and multilingual learning all have value here.": "חוכמת שטח, כלים מקצועיים, ניסיון אישי ולמידה רב-לשונית — לכל אלה יש ערך כאן.",
        "Field:": "תחום:",
        "Filter by region, profile type, or keywords connected to mission, field, needs, and projects.": "סננו לפי אזור, סוג פרופיל או מילות מפתח הקשורות למשימה, לתחום, לצרכים ולפרויקטים.",
        "Find a Group": "מצאו קבוצה",
        "Find My Path": "מצאו את הדרך שלי",
        "Find or publish practical volunteer, work, and collaboration opportunities for social impact projects.": "מצאו או פרסמו הזדמנויות מעשיות להתנדבות, לעבודה ולשיתוף פעולה בפרויקטים של השפעה חברתית.",
        "Find people who understand your cause, help shape your next step, and make your work visible.": "מצאו אנשים שמבינים את המטרה שלכם, עוזרים לעצב את הצעד הבא ועושים את העבודה שלכם נראית.",
        "Find projects, organizations, volunteers, experts, and practical needs": "מצאו פרויקטים, ארגונים, מתנדבים, מומחים וצרכים מעשיים",
        "Find the right people": "מצאו את האנשים הנכונים",
        "Find the right request": "מצאו את הבקשה הנכונה",
        "Find where your skills can help.": "מצאו היכן הכישורים שלכם יכולים לעזור.",
        "Flexible": "גמיש",
        "Follow the work, ask, offer, and connect.": "עקבו אחר העבודה, שאלו, הציעו והתחברו.",
        "Follow updates": "עקבו אחר עדכונים",
        "Follow Updates": "עקבו אחר עדכונים",
        "Food Security": "ביטחון תזונתי",
        "For questions, support, or concerns, please reach out:": "לשאלות, תמיכה או פניות, אתם מוזמנים לפנות:",
        "For you": "עבורכם",
        "Forum Leaders": "מובילי פורום",
        "Forum leadership offer": "הצעה להובלת פורום",
        "Full Name": "שם מלא",
        "Full-time": "משרה מלאה",
        "Funding preparation": "הכנה לגיוס מימון",
        "Funding Support": "תמיכה במימון",
        "Global": "גלובלי",
        "GloWe - Global Collaboration for Social Impact": "GloWe - שיתוף פעולה גלובלי למען השפעה חברתית",
        "GloWe begins as a simple MVP: profiles, posts, wishes, opportunities, and conversations. From here, we want to grow carefully, with local communities, field knowledge, and technology that serves people.": "GloWe מתחילה כגרסת MVP פשוטה: פרופילים, פוסטים, משאלות, הזדמנויות ושיחות. מכאן נרצה לצמוח בזהירות, יחד עם קהילות מקומיות, ידע מהשטח וטכנולוגיה שמשרתת אנשים.",
        "GloWe community promise": "ההבטחה של קהילת GloWe",
        "GloWe community value system": "מערכת הערכים של קהילת GloWe",
        "GloWe does not guarantee uninterrupted access or availability.": "GloWe אינה מתחייבת לגישה או לזמינות רציפות.",
        "GloWe is built for people who meet, listen, offer, ask, and turn local experience into practical collaboration.": "GloWe בנויה לאנשים שנפגשים, מקשיבים, מציעים, שואלים והופכים ניסיון מקומי לשיתוף פעולה מעשי.",
        "GloWe is not liable for losses resulting from interruptions, errors, or misuse of the platform.": "GloWe אינה אחראית לנזקים הנובעים מהפרעות, משגיאות או משימוש לרעה בפלטפורמה.",
        "GloWe is open to all people and organizations, regardless of age, geography, identity, or legal status.": "GloWe פתוחה לכל האנשים והארגונים, ללא קשר לגיל, למיקום גאוגרפי, לזהות או למעמד משפטי.",
        "GloWe may include links to external platforms or tools. We are not responsible for the content, privacy, or reliability of third-party services. Use them at your discretion.": "GloWe עשויה לכלול קישורים לפלטפורמות או לכלים חיצוניים. איננו אחראים לתוכן, לפרטיות או לאמינות של שירותי צד שלישי. השתמשו בהם על פי שיקול דעתכם.",
        "GloWe may suspend or terminate accounts that violate these Terms or the Community Integrity Charter.": "GloWe רשאית להשעות או לסגור חשבונות המפרים את התנאים האלה או את אמנת היושרה הקהילתית.",
        "GloWe Member": "חבר/ת GloWe",
        "GloWe reserves the right to:": "GloWe שומרת לעצמה את הזכות:",
        "GloWe respects your privacy. Personal data will only be used to improve your experience and build relevant connections.": "GloWe מכבדת את פרטיותכם. בנתונים אישיים ייעשה שימוש רק כדי לשפר את החוויה שלכם וליצור חיבורים רלוונטיים.",
        "GloWe will not sell or license your content to external commercial entities without explicit consent.": "GloWe לא תמכור או תעניק רישיון לתוכן שלכם לגופים מסחריים חיצוניים ללא הסכמה מפורשת.",
        "GloWe works through local roots, professional support, and global exchange.": "GloWe פועלת דרך שורשים מקומיים, תמיכה מקצועית וחילופי ידע גלובליים.",
        "Good intentions become stronger when they are connected to clear needs, real people, and concrete next steps.": "כוונות טובות מתחזקות כשהן מחוברות לצרכים ברורים, לאנשים אמיתיים ולצעדים הבאים מוחשיים.",
        "Grant match": "התאמת מענק",
        "Grey knowledge library": "ספריית ידע אפור",
        "Group Actions": "פעולות קבוצה",
        "Groups": "קבוצות",
        "Groups that want to document their work, find collaborators, and ask for concrete support.": "קבוצות שרוצות לתעד את עבודתן, למצוא שותפים ולבקש תמיכה מוחשית.",
        "Haifa": "חיפה",
        "Health": "בריאות",
        "Healthy moderation rules": "כללי ניהול בריאים",
        "Help communities turn field experience into practical guides, short case studies, templates, and translated resources.": "עזרו לקהילות להפוך ניסיון מהשטח למדריכים מעשיים, מקרי בוחן קצרים, תבניות ומשאבים מתורגמים.",
        "Help shape what comes next.": "עזרו לעצב את מה שיבוא.",
        "Helpers explain what they can provide, availability, and conditions.": "העוזרים מסבירים מה הם יכולים לספק, מהי הזמינות שלהם ומהם התנאים.",
        "Hidden content": "תוכן מוסתר",
        "Hidden items": "פריטים מוסתרים",
        "Hide Item": "הסתרת פריט",
        "Hide Profile": "הסתרת פרופיל",
        "How success is understood": "איך מבינים הצלחה",
        "How the post will feel in the feed": "איך הפוסט ירגיש בפיד",
        "I am a": "אני",
        "I Can Help": "אני יכול/ה לעזור",
        "If you are under the legal age of majority in your country, you are using GloWe under the guidance of a mentor, parent, or educational framework.": "אם טרם הגעתם לגיל הבגרות החוקי במדינתכם, השימוש שלכם ב-GloWe נעשה בליווי מנטור, הורה או מסגרת חינוכית.",
        "If you witness misconduct, misinformation, or harm, report it. Use the Report button on profiles or reach out to us directly. All reports are reviewed with care and confidentiality.": "אם אתם נתקלים בהתנהגות פסולה, במידע מטעה או בפגיעה, דווחו על כך. השתמשו בכפתור הדיווח בפרופילים או פנו אלינו ישירות. כל הדיווחים נבדקים בקפידה ובסודיות.",
        "Impact approach": "גישת ההשפעה",
        "Impact area": "תחום השפעה",
        "Impact areas": "תחומי השפעה",
        "Impact Areas": "תחומי השפעה",
        "Impact field": "תחום השפעה",
        "Impact follow-up": "מעקב השפעה",
        "Impact Signals": "אותות השפעה",
        "Impact so far": "השפעה עד כה",
        "Impact stories": "סיפורי השפעה",
        "In cases of legal violations, authorities may be notified.": "במקרים של הפרות חוק, ניתן ליידע את הרשויות.",
        "Interaction": "אינטראקציה",
        "Israel": "ישראל",
        "Items hidden by admin review can be restored while this MVP uses local storage.": "פריטים שהוסתרו בבקרת מנהל ניתנים לשחזור כל עוד גרסת ה-MVP הזו משתמשת באחסון מקומי.",
        "Items removed by admin will be listed here.": "פריטים שהוסרו על ידי מנהל יופיעו כאן.",
        "Jerusalem": "ירושלים",
        "Join Group": "הצטרפות לקבוצה",
        "Join requests": "בקשות הצטרפות",
        "Join the MVP": "הצטרפו ל-MVP",
        "Join the Volunteer Network and find places where your skills, experience, language, or care can make someone else's work lighter.": "הצטרפו לרשת המתנדבים ומצאו מקומות שבהם הכישורים, הניסיון, השפה או האכפתיות שלכם יכולים להקל על עבודתו של מישהו אחר.",
        "Join with experience, questions, resources, or a willingness to help.": "הצטרפו עם ניסיון, שאלות, משאבים או נכונות לעזור.",
        "Keep the community safe and trustworthy.": "שמרו על הקהילה בטוחה ואמינה.",
        "Knowledge": "ידע",
        "Knowledge Seekers": "מחפשי ידע",
        "Knowledge Sharing": "שיתוף ידע",
        "Languages": "שפות",
        "Learn More": "מידע נוסף",
        "Like": "לייק",
        "Limit access or features in cases of harm, spam, or manipulation.": "להגביל גישה או תכונות במקרים של פגיעה, ספאם או מניפולציה.",
        "Live needs": "צרכים פעילים",
        "Loading...": "טוען...",
        "Loading…": "טוען…",
        "Loading your profile…": "טוען את הפרופיל שלך…",
        "Uploading image...": "מעלה תמונה...",
        "Please choose an image file.": "נא לבחור קובץ תמונה.",
        "Image must be under 5 MB.": "התמונה חייבת להיות עד 5 מגה-בייט.",
        "Optional. JPG, PNG or WebP, up to 5 MB.": "לא חובה. JPG, ‏PNG או WebP, עד 5 מגה-בייט.",
        "Applicants": "מועמדים",
        "Loading applicants…": "טוען מועמדים…",
        "Could not load applicants.": "לא ניתן לטעון את המועמדים.",
        "No applications yet.": "אין עדיין מועמדויות.",
        "Accept": "אישור",
        "Decline": "דחייה",
        "Could not update the application. Please try again.": "לא ניתן לעדכן את המועמדות. נסו שוב.",
        "Offers": "הצעות עזרה",
        "Loading offers…": "טוען הצעות…",
        "Could not load offers.": "לא ניתן לטעון את ההצעות.",
        "No offers yet.": "אין עדיין הצעות.",
        "Preferred contact:": "אופן יצירת קשר מועדף:",
        "Connect": "יצירת קשר",
        "Email copied to clipboard": "האימייל הועתק ללוח",
        "Could not copy the email.": "לא ניתן היה להעתיק את האימייל.",
        "GloWe volunteer": "מתנדב/ת GloWe",
        "Availability:": "זמינות:",
        "Skills:": "כישורים:",
        "Motivation:": "מוטיבציה:",
        "Local community circles": "מעגלי קהילה מקומיים",
        "Local organizations, initiatives, residents, volunteers, and partners bring the real context: what is needed, what already works, who should be involved, and what kind of support would actually help.": "ארגונים מקומיים, יוזמות, תושבים, מתנדבים ושותפים מביאים את ההקשר האמיתי: מה נדרש, מה כבר עובד, מי צריך להיות מעורב ואיזו תמיכה באמת תעזור.",
        "Local roots": "שורשים מקומיים",
        "Location": "מיקום",
        "Location:": "מיקום:",
        "Looking for Mentors": "מחפשים מנטורים",
        "Low-bandwidth friendly": "ידידותי לרוחב פס נמוך",
        "Make it easier to connect a need with the right volunteer, professional skill, organization, donor, or partner.": "להקל על חיבור צורך עם המתנדב, הכישור המקצועי, הארגון, התורם או השותף הנכונים.",
        "Mark Reviewed": "סימון כנבדק",
        "Measurement and learning": "מדידה ולמידה",
        "Members": "חברים",
        "Members will appear here once they join this group.": "חברים יופיעו כאן ברגע שיצטרפו לקבוצה הזו.",
        "Message": "הודעה",
        "Message author": "שליחת הודעה למחבר/ת",
        "Message publisher": "שליחת הודעה למפרסם/ת",
        "Message sent": "ההודעה נשלחה",
        "Your message was delivered. The organization can follow up with you.": "ההודעה נמסרה. הארגון יוכל לחזור אליכם.",
        "Could not send message": "לא ניתן היה לשלוח את ההודעה",
        "Something went wrong sending your message. Please try again.": "משהו השתבש בשליחת ההודעה. אנא נסו שוב.",
        "Reach Out": "יצירת קשר",
        "Send Message": "שליחת הודעה",
        "Send a short message to start a conversation with this organization.": "שלחו הודעה קצרה כדי לפתוח שיחה עם הארגון הזה.",
        "Introduce yourself and explain how you would like to collaborate.": "הציגו את עצמכם והסבירו כיצד תרצו לשתף פעולה.",
        "Sign in to reach out": "התחברו כדי ליצור קשר",
        "Please sign in or create a free account to message this organization.": "אנא התחברו או פתחו חשבון חינמי כדי לשלוח הודעה לארגון הזה.",
        "Messaging needs a live connection right now. Please try again shortly.": "שליחת הודעות דורשת חיבור פעיל כרגע. אנא נסו שוב בקרוב.",
        "Missing details": "חסרים פרטים",
        "Backend unavailable": "השירות אינו זמין כרגע",
        "Messages": "הודעות",
        "Methods / approaches": "שיטות / גישות",
        "Moderate discussions in order to keep the space constructive, safe, and impact-driven.": "נהלו דיונים כדי לשמור על מרחב בונה, בטוח ומונע השפעה.",
        "Multilingual": "רב-לשוני",
        "Needs": "צרכים",
        "Needs Changes": "דרושים שינויים",
        "New post": "פוסט חדש",
        "New submitted profiles will appear here for review.": "פרופילים חדשים שנשלחו יופיעו כאן לבדיקה.",
        "No applications yet": "אין עדיין מועמדויות",
        "No community posts yet.": "אין עדיין פוסטים בקהילה.",
        "No hidden items": "אין פריטים מוסתרים",
        "No matching opportunities yet. This is where open roles and collaboration requests will appear.": "אין עדיין הזדמנויות מתאימות. כאן יופיעו תפקידים פתוחים ובקשות לשיתוף פעולה.",
        "No matching profiles yet": "אין עדיין פרופילים מתאימים",
        "No opportunities found": "לא נמצאו הזדמנויות",
        "No pending organizations": "אין ארגונים ממתינים",
        "No pending profiles": "אין פרופילים ממתינים",
        "No posts match this view yet": "אין עדיין פוסטים שמתאימים לתצוגה הזו",
        "No projects listed yet.": "אין עדיין פרויקטים רשומים.",
        "No projects yet. Add your first project.": "אין עדיין פרויקטים. הוסיפו את הפרויקט הראשון שלכם.",
        "No replies yet. Be the first to respond.": "אין עדיין תגובות. היו הראשונים להגיב.",
        "None specified for this opportunity.": "לא צוינו עבור ההזדמנות הזו.",
        "No reports yet": "אין עדיין דיווחים",
        "No results": "אין תוצאות",
        "No saved items yet": "אין עדיין פריטים שמורים",
        "No threads yet": "אין עדיין שרשורים",
        "No wishes found": "לא נמצאו משאלות",
        "Notification Preferences": "העדפות התראות",
        "Offer skills, time, translation, mentoring, design, legal help, tech, research, or field knowledge.": "הציעו כישורים, זמן, תרגום, חונכות, עיצוב, סיוע משפטי, טכנולוגיה, מחקר או ידע מהשטח.",
        "Offer Support": "הציעו תמיכה",
        "Open": "פתוח",
        "Open a Question": "פתיחת שאלה",
        "Open Call": "קריאה פתוחה",
        "Open Forums": "פתחו את הפורומים",
        "Open Needs": "צרכים פתוחים",
        "Open Playbook": "פתחו את המדריך",
        "Open reports": "דיווחים פתוחים",
        "Open Volunteer Network": "פתחו את רשת המתנדבים",
        "Open wish details": "פתחו את פרטי המשאלה",
        "Open wishes": "משאלות פתוחות",
        "open wishes are waiting for the right support.": "משאלות פתוחות מחכות לתמיכה הנכונה.",
        "Open wishes, opportunities, posts, and discussions around real work": "משאלות, הזדמנויות, פוסטים ודיונים פתוחים סביב עבודה אמיתית",
        "Opportunities & Applications": "הזדמנויות ומועמדויות",
        "Opportunities & collaboration": "הזדמנויות ושיתופי פעולה",
        "Opportunity title": "כותרת ההזדמנות",
        "Opportunity type": "סוג ההזדמנות",
        "Optional link": "קישור (לא חובה)",
        "Organization filters": "מסנני ארגונים",
        "Organization or project": "ארגון או פרויקט",
        "Organization Representative": "נציג/ת ארגון",
        "Organization review is available once the shared backend is connected.": "בדיקת ארגונים תהיה זמינה לאחר חיבור הממשק האחורי המשותף.",
        "Organizations & Companies": "ארגונים וחברות",
        "Organizations and NGOs": "ארגונים ועמותות",
        "Organizations and partners are reviewed before sensitive actions.": "ארגונים ושותפים נבדקים לפני פעולות רגישות.",
        "Organizations awaiting verification. Approve serious requests; rejected ones stay view-only.": "ארגונים הממתינים לאימות. אשרו בקשות רציניות; בקשות שנדחו נשארות לצפייה בלבד.",
        "Organize possible grants and next steps": "ארגנו מענקים אפשריים וצעדים הבאים",
        "Overview": "סקירה",
        "Paid Full-time Role": "תפקיד בתשלום במשרה מלאה",
        "Part-time": "משרה חלקית",
        "Part-time Role": "תפקיד במשרה חלקית",
        "Participation signals": "אותות השתתפות",
        "Partnership Opportunity": "הזדמנות לשותפות",
        "Password": "סיסמה",
        "Pending organizations": "ארגונים ממתינים",
        "Pending profiles": "פרופילים ממתינים",
        "Pending verification": "ממתין לאימות",
        "People already acting in their communities and looking for allies, knowledge, or visibility.": "אנשים שכבר פועלים בקהילות שלהם ומחפשים בני ברית, ידע או נראות.",
        "People looking for practical examples, field lessons, and ways to learn from what already works.": "אנשים שמחפשים דוגמאות מעשיות, לקחים מהשטח ודרכים ללמוד ממה שכבר עובד.",
        "People who can offer time, translation, design, research, facilitation, mentoring, or professional skills.": "אנשים שיכולים להציע זמן, תרגום, עיצוב, מחקר, הנחיה, חונכות או כישורים מקצועיים.",
        "Please refresh and try again.": "רעננו ונסו שוב.",
        "Possible next steps": "צעדים הבאים אפשריים",
        "Post": "פרסום",
        "Post a clear need in the Wishing Well: volunteers, partners, knowledge, visibility, tools, space, or practical advice.": "פרסמו צורך ברור בבאר המשאלות: מתנדבים, שותפים, ידע, נראות, כלים, מרחב או עצה מעשית.",
        "Post a Need": "פרסום צורך",
        "Post a need. Find a helper. Build impact.": "פרסמו צורך. מצאו עוזר. בנו השפעה.",
        "Post false, misleading, discriminatory, hateful, or violent content.": "לפרסם תוכן שקרי, מטעה, מפלה, שטנתי או אלים.",
        "Post need": "פרסום צורך",
        "Post Opportunity": "פרסום הזדמנות",
        "Post title": "כותרת הפוסט",
        "Post Topics": "נושאי הפוסט",
        "Post type": "סוג הפוסט",
        "posts": "פוסטים",
        "Posts": "פוסטים",
        "Posts you write in the community will appear here.": "פוסטים שתכתבו בקהילה יופיעו כאן.",
        "Posts, profiles, wishes, and opportunities you want to return to later.": "פוסטים, פרופילים, משאלות והזדמנויות שתרצו לחזור אליהם מאוחר יותר.",
        "Practical guides and field lessons": "מדריכים מעשיים ולקחים מהשטח",
        "Prepare a clearer post or campaign draft": "הכינו טיוטת פוסט או קמפיין ברורה יותר",
        "Present your mission, projects, fields of action, SDGs, needs, and the kind of collaborations you are open to.": "הציגו את המשימה, הפרויקטים, תחומי הפעולה, יעדי הקיימות (SDGs), הצרכים וסוגי שיתופי הפעולה שאתם פתוחים אליהם.",
        "Pretend to be someone else.": "להתחזות לאדם אחר.",
        "Preview": "תצוגה מקדימה",
        "Private conversations between volunteers, organizations, and partners are on the way. In the meantime, you can reach an organization from its profile.": "שיחות פרטיות בין מתנדבים, ארגונים ושותפים בדרך. בינתיים, אפשר לפנות לארגון דרך הפרופיל שלו.",
        "Professionals, mentors, facilitators, service providers, and experienced practitioners can offer advice, services, office hours, forum leadership, tools, and practical guidance.": "אנשי מקצוע, מנטורים, מנחים, נותני שירות ובעלי ניסיון יכולים להציע ייעוץ, שירותים, שעות קבלה, הובלת פורומים, כלים והכוונה מעשית.",
        "Profile actions": "פעולות פרופיל",
        "Profile From Questionnaire": "פרופיל מתוך שאלון",
        "Profile not found": "הפרופיל לא נמצא",
        "Profile snapshot": "תמונת מצב של הפרופיל",
        "Profile summary": "תקציר פרופיל",
        "Profiles": "פרופילים",
        "Profiles, posts, messages, and collaborations should support dignity, transparency, and responsible community care.": "פרופילים, פוסטים, הודעות ושיתופי פעולה צריכים לתמוך בכבוד, בשקיפות ובאכפתיות קהילתית אחראית.",
        "Project-based": "מבוסס פרויקט",
        "Project-based Collaboration": "שיתוף פעולה מבוסס פרויקט",
        "Projects": "פרויקטים",
        "My Needs": "הצרכים שלי",
        "No needs yet. Share what would help on the Wishing Well.": "אין עדיין צרכים. שתפו מה יעזור לכם בבאר המשאלות.",
        "My Posts": "הפוסטים שלי",
        "No posts yet. Share an update with the community.": "אין עדיין פוסטים. שתפו עדכון עם הקהילה.",
        "My Opportunities": "ההזדמנויות שלי",
        "No opportunities yet. Publish one on the Volunteer Network.": "אין עדיין הזדמנויות. פרסמו הזדמנות ברשת המתנדבים.",
        "My Offers": "ההצעות שלי",
        "No offers yet. Help someone by responding to a wish.": "אין עדיין הצעות. עזרו למישהו על ידי מענה למשאלה.",
        "Browse Wishes": "עיון במשאלות",
        "Public links": "קישורים ציבוריים",
        "Publish a volunteer role": "פרסמו תפקיד התנדבות",
        "Publish an opportunity": "פרסמו הזדמנות",
        "Publish Opportunity": "פרסום הזדמנות",
        "Publish Thread": "פרסום שרשור",
        "Publish to Community Feed": "פרסום לפיד הקהילה",
        "Publish to Feed": "פרסום לפיד",
        "Publish to Forum": "פרסום לפורום",
        "Question": "שאלה",
        "Question title": "כותרת השאלה",
        "Questions": "שאלות",
        "Ramat Gan, Israel": "רמת גן, ישראל",
        "Read posts, ask questions, respond with care, and meet others who are also building social and environmental change.": "קראו פוסטים, שאלו שאלות, הגיבו באכפתיות ופגשו אנשים אחרים שגם בונים שינוי חברתי וסביבתי.",
        "Ready to Make an Impact?": "מוכנים ליצור השפעה?",
        "Ready to offer your time, skills, mentoring, translation, design, legal help, or field knowledge? Enter the volunteer space and find the right role.": "מוכנים להציע מהזמן, מהכישורים, מהחונכות, מהתרגום, מהעיצוב, מהסיוע המשפטי או מהידע שלכם מהשטח? היכנסו למרחב המתנדבים ומצאו את התפקיד הנכון.",
        "Recent Activity": "פעילות אחרונה",
        "Recognition in GloWe is about visible contribution, not empty ranking. Signals stay tied to documented activity, trust, and community review.": "ההכרה ב-GloWe עוסקת בתרומה נראית, לא בדירוג ריק. האותות נשארים קשורים לפעילות מתועדת, לאמון ולבקרת קהילה.",
        "Recognize visible contribution": "הכירו בתרומה נראית",
        "Refine": "חידוד",
        "Region": "אזור",
        "Registration, article, drive folder, or resource link": "הרשמה, מאמר, תיקיית דרייב או קישור למשאב",
        "Reject": "דחייה",
        "Relevant Skills & Experience": "כישורים וניסיון רלוונטיים",
        "Remote": "מרחוק",
        "Remote tutors and safety": "מורים פרטיים מרחוק ובטיחות",
        "Remove": "הסרה",
        "Remove content that violates these terms or values.": "להסיר תוכן שמפר את התנאים או הערכים האלה.",
        "Reply": "תגובה",
        "Report": "דיווח",
        "Reports from users who saw something inaccurate, harmful, or inappropriate.": "דיווחים ממשתמשים שראו משהו לא מדויק, מזיק או לא הולם.",
        "Repost": "שיתוף מחדש",
        "Requirements": "דרישות",
        "Resource / file": "משאב / קובץ",
        "Resource Request": "בקשת משאב",
        "Responsibilities": "תחומי אחריות",
        "Responsible tools": "כלים אחראיים",
        "Restore": "שחזור",
        "Review Impact": "בדיקת השפעה",
        "Review new profile submissions, respond to reports, and hide content that does not fit the GloWe community standards.": "בדקו הגשות פרופיל חדשות, הגיבו לדיווחים והסתירו תוכן שאינו תואם את אמות המידה של קהילת GloWe.",
        "Reviewers only": "לבודקים בלבד",
        "Round tables, shared knowledge.": "שולחנות עגולים, ידע משותף.",
        "Save": "שמירה",
        "Save Draft": "שמירת טיוטה",
        "Save opportunity": "שמירת הזדמנות",
        "Save Opportunity": "שמירת הזדמנות",
        "Delete post": "מחיקת פוסט",
        "Delete": "מחיקה",
        "Post deleted": "הפוסט נמחק",
        "Your post was removed from the community feed.": "הפוסט שלכם הוסר מפיד הקהילה.",
        "Could not delete": "לא ניתן למחוק",
        "Something went wrong deleting your post. Please try again.": "משהו השתבש במחיקת הפוסט. נסו שוב.",
        "Copy link": "העתקת קישור",
        "Link copied": "הקישור הועתק",
        "The post link is on your clipboard — share it anywhere.": "קישור הפוסט נמצא בלוח שלכם — שתפו אותו בכל מקום.",
        "Copy this link": "העתיקו את הקישור",
        "Save post": "שמירת פוסט",
        "Save posts, profiles, and opportunities to return to them from this screen.": "שמרו פוסטים, פרופילים והזדמנויות כדי לחזור אליהם מהמסך הזה.",
        "Save posts, profiles, wishes, and opportunities to return to them from here.": "שמרו פוסטים, פרופילים, משאלות והזדמנויות כדי לחזור אליהם מכאן.",
        "Save profile": "שמירת פרופיל",
        "Save Profile": "שמירת פרופיל",
        "Save the opportunity if you want to compare it later.": "שמרו את ההזדמנות אם תרצו להשוות אותה מאוחר יותר.",
        "Save wish": "שמירת משאלה",
        "Saved": "נשמר",
        "Sign in with your Google account to continue.": "התחברו עם חשבון Google כדי להמשיך.",
        "Sign in or create a free account to save items to your area.": "התחברו או צרו חשבון חינם כדי לשמור פריטים לאזור שלכם.",
        "Saved items": "פריטים שמורים",
        "Saved Items": "פריטים שמורים",
        "Scope": "היקף",
        "SDG focus areas": "תחומי מיקוד של יעדי הקיימות",
        "Search": "חיפוש",
        "Search by city or region": "חיפוש לפי עיר או אזור",
        "Search keywords": "חיפוש מילות מפתח",
        "Search opportunities...": "חיפוש הזדמנויות...",
        "Search organizations, companies, and initiatives": "חיפוש ארגונים, חברות ויוזמות",
        "Search posts, topics, people, or needs...": "חיפוש פוסטים, נושאים, אנשים או צרכים...",
        "Search volunteer roles...": "חיפוש תפקידי התנדבות...",
        "See how members participate": "ראו איך חברים משתתפים",
        "See where help is needed": "ראו היכן נדרשת עזרה",
        "Select your availability": "בחרו את הזמינות שלכם",
        "Select your role": "בחרו את התפקיד שלכם",
        "Send": "שליחה",
        "Share": "שיתוף",
        "Share a volunteer role, paid role, mentorship request, or project-based collaboration with the GloWe community.": "שתפו תפקיד התנדבות, תפקיד בתשלום, בקשת חונכות או שיתוף פעולה מבוסס פרויקט עם קהילת GloWe.",
        "Share applied field knowledge in a format others can understand and use": "שתפו ידע יישומי מהשטח בפורמט שאחרים יכולים להבין ולהשתמש בו",
        "Share enough context so others can give useful, respectful advice.": "שתפו מספיק הקשר כדי שאחרים יוכלו לתת עצה מועילה ומכבדת.",
        "Share private or sensitive information without consent.": "לשתף מידע פרטי או רגיש ללא הסכמה.",
        "Share your motivation for applying...": "שתפו את המוטיבציה שלכם להגשת המועמדות...",
        "Shared knowledge": "ידע משותף",
        "Shared learning": "למידה משותפת",
        "Sharing tools": "כלי שיתוף",
        "Short description": "תיאור קצר",
        "Show your mission, projects, needs, opportunities, and the impact areas you work in.": "הציגו את המשימה, הפרויקטים, הצרכים, ההזדמנויות ותחומי ההשפעה שבהם אתם פועלים.",
        "Sign in to see your messages": "התחברו כדי לראות את ההודעות שלכם",
        "Skills Needed": "כישורים נדרשים",
        "Skills or tags": "כישורים או תגיות",
        "Social Activists": "פעילים חברתיים",
        "Social initiatives": "יוזמות חברתיות",
        "Social Justice": "צדק חברתי",
        "Social links": "קישורים חברתיים",
        "Sometimes you give. Sometimes you need help.": "לפעמים נותנים. לפעמים זקוקים לעזרה.",
        "Spam the platform or use it for purely promotional or exploitative purposes.": "להציף את הפלטפורמה בספאם או להשתמש בה למטרות פרסומיות או נצלניות בלבד.",
        "Start a practical consultation": "התחילו ייעוץ מעשי",
        "Start a thread": "פתיחת שרשור",
        "Start Conversation": "התחלת שיחה",
        "Start the first conversation in this group.": "התחילו את השיחה הראשונה בקבוצה הזו.",
        "Start from one useful action": "התחילו מפעולה מועילה אחת",
        "Start with one useful post, one profile, one wish, or one opportunity.": "התחילו מפוסט מועיל אחד, פרופיל אחד, משאלה אחת או הזדמנות אחת.",
        "Structured offers": "הצעות מסודרות",
        "Submit Application": "שליחת מועמדות",
        "Support groups around a city, village, school, organization, or SDG topic. Each circle can gather needs, resources, events, and trusted members.": "קבוצות תמיכה סביב עיר, כפר, בית ספר, ארגון או נושא של יעדי הקיימות. כל מעגל יכול לאסוף צרכים, משאבים, אירועים וחברים מהימנים.",
        "Support multilingual access so knowledge is not limited to English-speaking spaces": "תמכו בגישה רב-לשונית כדי שהידע לא יוגבל למרחבים דוברי אנגלית",
        "Suspend or block users who repeatedly abuse the platform.": "להשעות או לחסום משתמשים שמנצלים לרעה את הפלטפורמה שוב ושוב.",
        "Tags": "תגיות",
        "Tech for Good": "טכנולוגיה למען הטוב",
        "Technology": "טכנולוגיה",
        "Technology for good": "טכנולוגיה למען הטוב",
        "Technology should reduce friction, not create distance. It should help people act with more clarity, trust, and care.": "טכנולוגיה צריכה להפחית חיכוך, לא ליצור מרחק. היא צריכה לעזור לאנשים לפעול מתוך יותר בהירות, אמון ואכפתיות.",
        "Tel Aviv": "תל אביב",
        "Terms of Use - GloWe": "תנאי שימוש - GloWe",
        "Terms of Use & Community Integrity Charter": "תנאי שימוש ואמנת יושרה קהילתית",
        "The information you provide is accurate and honest.": "המידע שאתם מספקים מדויק וכן.",
        "The MVP is here so we can learn with you: what helps, what is missing, and what should be built with care.": "ה-MVP כאן כדי שנוכל ללמוד יחד אתכם: מה עוזר, מה חסר ומה כדאי לבנות בזהירות.",
        "The next versions of GloWe should support local circles: people who meet around a real place, a real need, and a shared SDG challenge. Each local community can gather stories, tools, resources, and lessons that others may adapt.": "הגרסאות הבאות של GloWe יתמכו במעגלים מקומיים: אנשים שנפגשים סביב מקום אמיתי, צורך אמיתי ואתגר משותף מיעדי הקיימות. כל קהילה מקומית יכולה לאסוף סיפורים, כלים, משאבים ולקחים שאחרים יוכלו להתאים לעצמם.",
        "The organization receives your message and can continue in GloWe messages.": "הארגון מקבל את ההודעה שלכם ויכול להמשיך בהודעות GloWe.",
        "The topic tag will appear next to your name in the feed, and the post is saved into the community stream.": "תגית הנושא תופיע לצד שמכם בפיד, והפוסט יישמר בזרם הקהילה.",
        "The Wishing Well is the action layer of GloWe: verified requests, relevant helpers, and clear next steps after someone offers support.": "באר המשאלות היא שכבת הפעולה של GloWe: בקשות מאומתות, עוזרים רלוונטיים וצעדים הבאים ברורים אחרי שמישהו מציע תמיכה.",
        "These are directions, not promises. We will build them gradually, with community feedback.": "אלה כיוונים, לא הבטחות. נבנה אותם בהדרגה, יחד עם משוב מהקהילה.",
        "These Terms of Use & Community Integrity Charter may be updated occasionally. We will notify users of significant changes via email or platform notifications. Continued use signifies your agreement to the latest version.": "תנאי השימוש ואמנת היושרה הקהילתית האלה עשויים להתעדכן מדי פעם. נודיע למשתמשים על שינויים משמעותיים בדוא\"ל או בהתראות בפלטפורמה. המשך השימוש מהווה הסכמה לגרסה העדכנית ביותר.",
        "This includes use in personalization, recommendation systems, and platform features built to enhance the GloWe user experience only.": "זה כולל שימוש בהתאמה אישית, במערכות המלצה ובתכונות פלטפורמה שנבנו אך ורק כדי לשפר את חוויית המשתמש ב-GloWe.",
        "This is not a marketplace. It is a shared space. Ask for help. Offer help. Celebrate others' work. Seek connection, not extraction.": "זה לא שוק. זה מרחב משותף. בקשו עזרה. הציעו עזרה. חגגו את עבודתם של אחרים. חפשו חיבור, לא ניצול.",
        "This profile is not available yet, or the link points to an older demo profile.": "הפרופיל הזה עדיין לא זמין, או שהקישור מפנה לפרופיל הדגמה ישן.",
        "This queue is visible to GloWe reviewers. Ask an administrator for access.": "התור הזה גלוי לבודקים של GloWe. בקשו גישה ממנהל המערכת.",
        "Threads": "שרשורים",
        "Title": "כותרת",
        "To the fullest extent permitted by law:": "במידה המרבית המותרת על פי חוק:",
        "Tone, humor, and expression vary across regions. Be mindful. Use inclusive language. If you are unsure, ask.": "טון, הומור והבעה משתנים בין אזורים. היו קשובים. השתמשו בשפה מכלילה. אם אינכם בטוחים, שאלו.",
        "Topic": "נושא",
        "Topic group": "קבוצת נושא",
        "Topic Groups": "קבוצות נושא",
        "Treat every member with dignity. Do not post or endorse any form of discrimination, harassment, or exclusion. Listen to diverse voices and experiences.": "התייחסו לכל חבר בכבוד. אל תפרסמו ואל תתמכו בשום צורה של אפליה, הטרדה או הדרה. הקשיבו לקולות ולחוויות מגוונים.",
        "Trending Discussions": "דיונים חמים",
        "Trust & status": "אמון וסטטוס",
        "Try a broader keyword, clear one filter, or search by impact area, location, or support need.": "נסו מילת מפתח רחבה יותר, נקו מסנן אחד, או חפשו לפי תחום השפעה, מיקום או צורך בתמיכה.",
        "Try a different tab, search a broader word, or start the next conversation.": "נסו לשונית אחרת, חפשו מילה רחבה יותר, או פתחו את השיחה הבאה.",
        "Try adjusting your filters or search terms.": "נסו לשנות את המסננים או את מונחי החיפוש.",
        "Try clearing one of the filters.": "נסו לנקות אחד מהמסננים.",
        "Try Flow": "נסו את התהליך",
        "Turn a real need into a clear call for support: volunteers, partners, knowledge, visibility, space, tools, or funding support.": "הפכו צורך אמיתי לקריאה ברורה לתמיכה: מתנדבים, שותפים, ידע, נראות, מרחב, כלים או תמיכה במימון.",
        "Type": "סוג",
        "Updated today": "עודכן היום",
        "Upload copyrighted or third-party content without permission.": "להעלות תוכן המוגן בזכויות יוצרים או תוכן של צד שלישי ללא רשות.",
        "Use digital tools to make knowledge more accessible, reduce language barriers, and support ethical collaboration.": "השתמשו בכלים דיגיטליים כדי להנגיש ידע, להפחית מחסומי שפה ולתמוך בשיתוף פעולה אתי.",
        "Use example grant cards and a funding-brief flow to turn a real need into a clearer request, budget story, and next step.": "השתמשו בכרטיסי מענק לדוגמה ובתהליך תקציר מימון כדי להפוך צורך אמיתי לבקשה ברורה יותר, לסיפור תקציבי ולצעד הבא.",
        "Use the forums for focused questions, peer advice, templates, field lessons, and professional guidance. Professionals can also lead topic spaces and offer office hours.": "השתמשו בפורומים לשאלות ממוקדות, לעצות עמיתים, לתבניות, ללקחים מהשטח ולהכוונה מקצועית. אנשי מקצוע יכולים גם להוביל מרחבי נושא ולהציע שעות קבלה.",
        "Usually replies within 3-5 days": "בדרך כלל משיב/ה תוך 3-5 ימים",
        "Verified organizations will publish freely; new submissions show up here.": "ארגונים מאומתים יפרסמו בחופשיות; הגשות חדשות יופיעו כאן.",
        "Verified profiles": "פרופילים מאומתים",
        "View Details": "צפייה בפרטים",
        "View Personal Area": "מעבר לאזור האישי",
        "View Profile": "צפייה בפרופיל",
        "Visibility / Media": "נראות / מדיה",
        "Volunteer": "התנדבות",
        "Volunteer / Mentor": "מתנדב/ת / מנטור/ית",
        "Volunteer Opportunities": "הזדמנויות התנדבות",
        "Volunteer Opportunity": "הזדמנות התנדבות",
        "Volunteers": "מתנדבים",
        "volunteers joined new projects this week.": "מתנדבים הצטרפו לפרויקטים חדשים השבוע.",
        "Volunteers and professionals": "מתנדבים ואנשי מקצוע",
        "Volunteers Needed": "דרושים מתנדבים",
        "We are not just a platform. We are a community built on trust and shared purpose. By joining GloWe, you commit to these core values:": "אנחנו לא רק פלטפורמה. אנחנו קהילה הבנויה על אמון ומטרה משותפת. בהצטרפות ל-GloWe, אתם מתחייבים לערכי הליבה האלה:",
        "We are not responsible for actions or content posted by users.": "איננו אחראים לפעולות או לתוכן שמפורסמים על ידי משתמשים.",
        "We are starting with a focused community space. Next, we want to grow local community circles, a practical knowledge library, and technology that helps people use knowledge for good.": "אנחנו מתחילים ממרחב קהילתי ממוקד. בהמשך נרצה להצמיח מעגלי קהילה מקומיים, ספריית ידע מעשית וטכנולוגיה שעוזרת לאנשים להשתמש בידע למען הטוב.",
        "We believe impact grows when people stand with each other, listen deeply, and act with care.": "אנחנו מאמינים שהשפעה צומחת כשאנשים עומדים זה לצד זה, מקשיבים לעומק ופועלים באכפתיות.",
        "We do not look down or preach. We stand next to each other, listen, learn, and act together. Sometimes you give; sometimes you need help. Both are part of a healthy community.": "אנחנו לא מתנשאים ולא מטיפים. אנחנו עומדים זה לצד זה, מקשיבים, לומדים ופועלים יחד. לפעמים נותנים; לפעמים זקוקים לעזרה. שני אלה חלק מקהילה בריאה.",
        "We do not sell, rent, or trade your data to advertisers.": "איננו מוכרים, משכירים או סוחרים בנתונים שלכם למפרסמים.",
        "We do not want technology to replace relationships. We want it to help people find each other, document what they already know, and turn care into practical action.": "איננו רוצים שטכנולוגיה תחליף קשרים. אנחנו רוצים שהיא תעזור לאנשים למצוא זה את זה, לתעד את מה שהם כבר יודעים ולהפוך אכפתיות לפעולה מעשית.",
        "We reserve the right to moderate, remove, or report inappropriate content.": "אנו שומרים את הזכות לנהל, להסיר או לדווח על תוכן לא הולם.",
        "Weekdays": "ימי חול",
        "Weekends": "סופי שבוע",
        "Welcome,": "ברוכים הבאים,",
        "What comes after the MVP?": "מה בא אחרי ה-MVP?",
        "What do you need help thinking through?": "במה תרצו עזרה לחשוב?",
        "What do you want to share, ask, or offer today?": "מה תרצו לשתף, לשאול או להציע היום?",
        "What GloWe makes possible": "מה GloWe מאפשרת",
        "What happens next": "מה קורה עכשיו",
        "What is open now": "מה פתוח עכשיו",
        "What we are learning": "מה אנחנו לומדים",
        "What we believe": "במה אנחנו מאמינים",
        "What we want to build next": "מה נרצה לבנות בהמשך",
        "When GloWe grows, one-third of future revenues will return to local communities.": "כש-GloWe תצמח, שליש מההכנסות העתידיות יחזרו לקהילות מקומיות.",
        "When you publish content, such as text, images, links, or project descriptions, on GloWe:": "כאשר אתם מפרסמים תוכן ב-GloWe, כגון טקסט, תמונות, קישורים או תיאורי פרויקטים:",
        "Who is this for?": "למי זה מיועד?",
        "Who We Serve": "את מי אנחנו משרתים",
        "Why do you want to volunteer?": "למה אתם רוצים להתנדב?",
        "Why GloWe exists": "למה GloWe קיימת",
        "Wish filters": "מסנני משאלות",
        "Wish Type": "סוג משאלה",
        "Write a Community Post": "כתיבת פוסט קהילתי",
        "Write a reply": "כתבו תגובה",
        "Write Post": "כתיבת פוסט",
        "Write posts, ask questions, share field knowledge, publish updates, and join topic-based discussions.": "כתבו פוסטים, שאלו שאלות, שתפו ידע מהשטח, פרסמו עדכונים והצטרפו לדיונים לפי נושא.",
        "Write the story, request, guide, event details, or question you want the community to see.": "כתבו את הסיפור, הבקשה, המדריך, פרטי האירוע או השאלה שתרצו שהקהילה תראה.",
        "Write to the community": "כתבו לקהילה",
        "You are acting in good faith and with respect for others.": "אתם פועלים בתום לב ומתוך כבוד לאחרים.",
        "You are not alone here": "אתם לא לבד כאן",
        "You are part of a community where people can ask, offer, learn, and keep going together.": "אתם חלק מקהילה שבה אנשים יכולים לשאול, להציע, ללמוד ולהמשיך יחד.",
        "You confirm that you have the legal right to publish what you upload and assume full responsibility for it.": "אתם מאשרים שיש לכם הזכות החוקית לפרסם את מה שאתם מעלים, ולוקחים עליו אחריות מלאה.",
        "You grant GloWe a non-exclusive, royalty-free, worldwide, perpetual license to host, translate, display, analyze, and distribute your content within the platform.": "אתם מעניקים ל-GloWe רישיון לא בלעדי, ללא תמלוגים, עולמי וצמית לאחסן, לתרגם, להציג, לנתח ולהפיץ את התוכן שלכם בתוך הפלטפורמה.",
        "You may close your account at any time.": "תוכלו לסגור את החשבון שלכם בכל עת.",
        "You may request deletion of your account or data at any time.": "תוכלו לבקש את מחיקת החשבון או הנתונים שלכם בכל עת.",
        "You retain full ownership of your intellectual property.": "אתם שומרים על בעלות מלאה על הקניין הרוחני שלכם.",
        "You've got something the world needs.": "יש לכם משהו שהעולם זקוק לו.",
        "You're already part of GloWe.": "אתם כבר חלק מ-GloWe.",
        "Explore the community, share what you know, or pick up where you left off.": "גלו את הקהילה, שתפו את מה שאתם יודעים, או המשיכו מאיפה שהפסקתם.",
        "Your Availability": "הזמינות שלכם",
        "Your Community Home": "בית הקהילה שלכם",
        "Your full name": "השם המלא שלכם",
        "Your password": "הסיסמה שלכם",
        "About - GloWe": "אודות - GloWe",
        "About GloWe": "אודות GloWe",
        "About the Organization": "אודות הארגון",
        "About This Opportunity": "אודות ההזדמנות",
        "Across countries, languages, and fields, members can learn from each other, translate field wisdom, adapt proven solutions, and connect local action to global SDG challenges.": "מעבר למדינות, לשפות ולתחומים, חברים יכולים ללמוד זה מזה, לתרגם חוכמת שטח, להתאים פתרונות מוכחים ולחבר פעולה מקומית לאתגרים גלובליים של יעדי הקיימות.",
        "Act honestly. Share real experiences. Credit others' work where due. Information shared on GloWe should be accurate, current, and shared with intention.": "פעלו ביושר. שתפו ניסיון אמיתי. תנו קרדיט לעבודתם של אחרים במקום הראוי. מידע שמשותף ב-GloWe צריך להיות מדויק, עדכני ומשותף בכוונה.",
        "Active Members": "חברים פעילים",
        "Active projects": "פרויקטים פעילים",
        "Active Threads": "שרשורים פעילים",
        "Admin review": "בקרת מנהל",
        "Admin Review - GloWe": "ניהול ובקרה - GloWe",
        "A digital-human space for shared knowledge, practical connection, and gradual community growth.": "מרחב דיגיטלי-אנושי לידע משותף, לחיבור מעשי ולצמיחה קהילתית הדרגתית.",
        "A living feed for field updates, practical questions, needs, resources, and people building impact together.": "פיד חי לעדכונים מהשטח, לשאלות מעשיות, לצרכים, למשאבים ולאנשים שבונים השפעה יחד.",
        "A practical space for volunteers, mentors, professionals, and organizations to meet around real needs, clear roles, and shared impact.": "מרחב מעשי שבו מתנדבים, מנטורים, אנשי מקצוע וארגונים נפגשים סביב צרכים אמיתיים, תפקידים ברורים והשפעה משותפת.",
        "A full Privacy Policy will be published separately.": "מדיניות פרטיות מלאה תפורסם בנפרד.",
        "Community - GloWe": "קהילה - GloWe",
        "Discussion Group - GloWe": "קבוצת דיון - GloWe",
        "Forums - GloWe": "פורומים - GloWe",
        "Messages - GloWe": "הודעות - GloWe",
        "Opportunity Details - GloWe": "פרטי הזדמנות - GloWe",
        "Organizations - GloWe": "ארגונים - GloWe",
        "Personal Area - GloWe": "האזור האישי - GloWe",
        "Profile - GloWe": "פרופיל - GloWe",
        "Saved - GloWe": "פריטים שמורים - GloWe",
        "Settings - GloWe": "הגדרות - GloWe",
        "Volunteer Network - GloWe": "רשת המתנדבים - GloWe",
        "Volunteer Opportunities - GloWe": "הזדמנויות התנדבות - GloWe",
        "What's Next - GloWe": "מה הלאה - GloWe",
        "Wishing Well - GloWe": "באר המשאלות - GloWe",
        "Write Post - GloWe": "כתיבת פוסט - GloWe",
        "1. About GloWe": "1. אודות GloWe",
        "2. Who Can Use GloWe": "2. מי יכול להשתמש ב-GloWe",
        "3. Acceptable Use & Responsibilities": "3. שימוש מקובל ואחריות",
        "4. Content Rights & Licensing": "4. זכויות תוכן ורישוי",
        "5. Privacy & Data": "5. פרטיות ונתונים",
        "6. Community Integrity Charter": "6. אמנת יושרה קהילתית",
        "6.1 Transparency": "6.1 שקיפות",
        "6.2 Respect & Inclusion": "6.2 כבוד והכלה",
        "6.3 Collaboration Over Competition": "6.3 שיתוף פעולה לפני תחרות",
        "6.4 Cultural Sensitivity": "6.4 רגישות תרבותית",
        "6.5 Community Responsibility": "6.5 אחריות קהילתית",
        "7. Moderation & Enforcement": "7. ניהול ואכיפה",
        "8. External Links & Third-Party Services": "8. קישורים חיצוניים ושירותי צד שלישי",
        "9. Termination": "9. סיום שימוש",
        "10. Liability Disclaimer": "10. הגבלת אחריות",
        "11. Updates to Terms": "11. עדכונים לתנאים",
        "12. Contact Us": "12. יצירת קשר",
        "2026 GloWe. Built for shared knowledge, mutual support, and action that lasts.": "2026 GloWe. נבנתה למען ידע משותף, תמיכה הדדית ופעולה שנשארת.",
        "Local communities already hold practical knowledge about education, health, climate, food, rights, resilience, and care. Too often, that knowledge stays locked inside one place, one language, one report, or one organization. GloWe is being built to help field-based knowledge travel: clearly, respectfully, and in ways other people can adapt.": "קהילות מקומיות כבר מחזיקות בידע מעשי על חינוך, בריאות, אקלים, מזון, זכויות, חוסן ואכפתיות. לעיתים קרובות מדי הידע הזה נשאר נעול במקום אחד, בשפה אחת, בדוח אחד או בארגון אחד. GloWe נבנית כדי לעזור לידע מהשטח לנדוד: בבהירות, בכבוד ובדרכים שאחרים יכולים להתאים לעצמם.",
        "Sign in with your Google account to get started. You can complete your profile after signing in.": "התחברו עם חשבון Google כדי להתחיל. תוכלו להשלים את הפרופיל שלכם לאחר הכניסה.",
        "Share a Wish": "שיתוף משאלה",
        "A good wish is specific enough for the right helper to say yes.": "משאלה טובה ספציפית מספיק כדי שהעוזר הנכון יאמר כן.",
        "What do you need?": "למה אתם זקוקים?",
        "Wish type": "סוג המשאלה",
        "Select a type": "בחרו סוג",
        "Urgency": "דחיפות",
        "Choose urgency": "בחרו דחיפות",
        "This week": "השבוע",
        "This month": "החודש",
        "Flexible timeline": "לוח זמנים גמיש",
        "What would success look like?": "איך תיראה הצלחה?",
        "Publish Wish": "פרסום משאלה",
        "Send a clear, trusted offer so the organization can decide quickly.": "שלחו הצעה ברורה ואמינה כדי שהארגון יוכל להחליט במהירות.",
        "What can you offer?": "מה תוכלו להציע?",
        "Choose support type": "בחרו סוג תמיכה",
        "Professional volunteering": "התנדבות מקצועית",
        "Funding or grant help": "סיוע במימון או במענקים",
        "Space or equipment": "מרחב או ציוד",
        "Business partnership": "שותפות עסקית",
        "Media or distribution": "מדיה או הפצה",
        "Availability": "זמינות",
        "Choose availability": "בחרו זמינות",
        "Within 2 weeks": "בתוך שבועיים",
        "Send Offer": "שליחת הצעה",
        "Update the public information that helps others understand who you are and how to collaborate.": "עדכנו את המידע הציבורי שעוזר לאחרים להבין מי אתם ואיך אפשר לשתף פעולה.",
        "Display name": "שם תצוגה",
        "Profile type": "סוג הפרופיל",
        "Country / region": "מדינה / אזור",
        "Website / public link": "אתר / קישור ציבורי",
        "Interest areas": "תחומי עניין",
        "SDGs": "יעדי קיימות",
        "Short public line": "משפט ציבורי קצר",
        "Mission / story": "משימה / סיפור",
        "Values and goals": "ערכים ומטרות",
        "Community / audience": "קהילה / קהל",
        "Problem addressed": "הבעיה שמטופלת",
        "Solution / method": "פתרון / שיטה",
        "Geographic activity": "פעילות גאוגרפית",
        "Open actions / looking for": "פעולות פתוחות / מה מחפשים",
        "Articles / videos / reports": "מאמרים / סרטונים / דוחות",
        "Profile image": "תמונת פרופיל",
        "Optional. When Cloudinary keys are configured, this uploads to Cloudinary.": "לא חובה. כאשר מפתחות Cloudinary מוגדרים, הקובץ יועלה ל-Cloudinary.",
        "Save Profile Draft": "שמירת טיוטת פרופיל",
        "Welcome to GloWe 👋": "ברוכים הבאים ל-GloWe 👋",
        "Tell us a little about you so the community knows who they're collaborating with. It only takes a minute.": "ספרו לנו קצת על עצמכם כדי שהקהילה תדע עם מי היא משתפת פעולה. זה לוקח רק דקה.",
        "Your name": "השם שלכם",
        "A short line about you": "משפט קצר עליכם",
        "I'm joining as": "אני מצטרף/ת בתור",
        "Private individual": "אדם פרטי",
        "Volunteer, donor, or community member. Full access right away.": "מתנדב, תורם או חבר קהילה. גישה מלאה באופן מיידי.",
        "Organization": "ארגון",
        "NGO, nonprofit, or initiative. Reviewed before you can publish — only serious applications are accepted.": "עמותה, מלכ\"ר או יוזמה. נבדק לפני שתוכלו לפרסם — מתקבלות רק בקשות רציניות.",
        "Organizations are reviewed by the GloWe team. Until you're approved you can browse everything, but posting opportunities, events, and needs stays locked. Please give us enough to take your application seriously.": "ארגונים נבדקים על ידי צוות GloWe. עד לאישור תוכלו לעיין בכול, אך פרסום הזדמנויות, אירועים וצרכים יישאר נעול. אנא ספקו מספיק מידע כדי שנוכל להתייחס לבקשתכם ברצינות.",
        "Organization name *": "שם הארגון *",
        "Registration / NGO number": "מספר רישום / עמותה",
        "Country of operation": "מדינת הפעילות",
        "Cause / field": "מטרה / תחום",
        "Organization size": "גודל הארגון",
        "About the organization *": "אודות הארגון *",
        "Contact person *": "איש קשר *",
        "Contact email *": "דוא\"ל ליצירת קשר *",
        "Contact phone": "טלפון ליצירת קשר",
        "Save and continue": "שמירה והמשך",
        "Maybe later": "אולי מאוחר יותר",
        "Add project": "הוספת פרויקט",
        "Add a project that can appear in your personal area and help others understand what you are building.": "הוסיפו פרויקט שיכול להופיע באזור האישי שלכם ולעזור לאחרים להבין מה אתם בונים.",
        "Project title": "כותרת הפרויקט",
        "Status": "סטטוס",
        "Draft": "טיוטה",
        "Active": "פעיל",
        "Recruiting partners": "מגייסים שותפים",
        "Needs volunteers": "דרושים מתנדבים",
        "Ready to share": "מוכן לשיתוף",
        "Description": "תיאור",
        "Save Project": "שמירת פרויקט",
        "Edit": "עריכה",
        "Edit project": "עריכת פרויקט",
        "Update Project": "עדכון פרויקט",
        "Project updated": "הפרויקט עודכן",
        "Your project changes were saved.": "השינויים בפרויקט נשמרו.",
        "Project added": "הפרויקט נוסף",
        "The project now appears in your personal area.": "הפרויקט מופיע כעת באזור האישי שלך.",
        "My Events": "האירועים שלי",
        "Loading your event registrations…": "טוען את ההרשמות שלך לאירועים…",
        "No event registrations yet": "אין עדיין הרשמות לאירועים",
        "Register for an event from the Volunteer Network and track it here.": "הירשמו לאירוע מרשת ההתנדבות ועקבו אחריו כאן.",
        "Browse events": "עיון באירועים",
        "Event cancelled": "האירוע בוטל",
        "Registered": "רשום",
        "Pending approval": "ממתין לאישור",
        "Waitlisted": "ברשימת המתנה",
        "Not accepted": "לא התקבל",
        "Cancelled": "בוטל",
        "Report a concern": "דיווח על בעיה",
        "We review every report carefully and confidentially to keep GloWe safe and professional.": "אנחנו בודקים כל דיווח בקפידה ובסודיות כדי לשמור על GloWe בטוחה ומקצועית.",
        "Reporting": "דיווח",
        "General concern": "בעיה כללית",
        "What should we look at?": "על מה כדאי שנסתכל?",
        "Choose a reason": "בחרו סיבה",
        "Inaccurate information": "מידע לא מדויק",
        "Disrespectful or discriminatory content": "תוכן לא מכבד או מפלה",
        "Misleading promotion": "קידום מטעה",
        "Human rights concern": "חשש לפגיעה בזכויות אדם",
        "Other": "אחר",
        "Details": "פרטים",
        "Submit Report": "שליחת דיווח",
        "Choose a rhythm that keeps GloWe useful without creating digital fatigue.": "בחרו קצב שמשאיר את GloWe מועילה בלי ליצור עומס דיגיטלי.",
        "Opportunity of the week": "הזדמנות השבוע",
        "High-match connection proposals": "הצעות חיבור בהתאמה גבוהה",
        "Deadline reminders": "תזכורות למועדי הגשה",
        "Crisis-response playbooks for my region": "מדריכי תגובה למשבר באזור שלי",
        "Preferred cadence": "תדירות מועדפת",
        "Weekly digest": "תקציר שבועי",
        "Only urgent actions": "רק פעולות דחופות",
        "Daily 5-minute brief": "תקציר יומי של 5 דקות",
        "Save Preferences": "שמירת העדפות",
        "Mentors, space, visibility...": "מנטורים, מרחב, נראות...",
        "City, region, remote, or hybrid": "עיר, אזור, מרחוק או היברידי",
        "Tell the community what would help.": "ספרו לקהילה מה יעזור.",
        "Example: 3 mentors matched, one grant draft completed, 50 families reached...": "לדוגמה: 3 מנטורים הותאמו, טיוטת מענק אחת הושלמה, 50 משפחות נעזרו...",
        "Briefly explain your relevant experience, what you can offer, and what you need to know next.": "הסבירו בקצרה את הניסיון הרלוונטי שלכם, מה אתם יכולים להציע ומה תרצו לדעת בהמשך.",
        "Organization or person name": "שם הארגון או האדם",
        "NGO, business, volunteer, initiative...": "עמותה, עסק, מתנדב, יוזמה...",
        "Education, health, climate...": "חינוך, בריאות, אקלים...",
        "Quality Education, Climate Action...": "חינוך איכותי, פעולה למען האקלים...",
        "One clear sentence people can understand quickly": "משפט ברור אחד שאנשים יכולים להבין במהירות",
        "Mission, current work, or what you offer.": "משימה, עבודה נוכחית או מה שאתם מציעים.",
        "Values, goals, leadership, or principles": "ערכים, מטרות, מנהיגות או עקרונות",
        "Who do you serve, support, work with, or hope to reach?": "את מי אתם משרתים, תומכים, עובדים איתו או מקווים להגיע אליו?",
        "What problem or need are you working on?": "על איזו בעיה או צורך אתם עובדים?",
        "What do you do in practice?": "מה אתם עושים בפועל?",
        "Advocacy, education, field work, research...": "סנגור, חינוך, עבודת שטח, מחקר...",
        "Local / regional / global / remote": "מקומי / אזורי / גלובלי / מרחוק",
        "Partners, volunteers, funding, knowledge, visibility...": "שותפים, מתנדבים, מימון, ידע, נראות...",
        "Useful public links": "קישורים ציבוריים מועילים",
        "Full name": "שם מלא",
        "One sentence people grasp quickly": "משפט אחד שאנשים קולטים במהירות",
        "Registered / public name": "שם רשום / ציבורי",
        "Legal registration number": "מספר רישום משפטי",
        "Where you operate": "היכן אתם פועלים",
        "Volunteers / staff, approx.": "מתנדבים / צוות, בקירוב",
        "Mission, who you serve, and what you'd do on GloWe.": "המשימה, את מי אתם משרתים ומה תעשו ב-GloWe.",
        "Who we should talk to": "עם מי כדאי שנדבר",
        "Optional": "לא חובה",
        "Community resource map": "מפת משאבים קהילתית",
        "What is the project, who does it support, and what kind of help would move it forward?": "מהו הפרויקט, את מי הוא תומך, ואיזו עזרה תקדם אותו?",
        "Add context that can help our review.": "הוסיפו הקשר שיכול לעזור לבדיקה שלנו.",
        "Switch to English": "מעבר לאנגלית",
        "This page outlines the terms, responsibilities, and community standards that guide your use of the GloWe platform. By accessing or interacting with this site, you agree to abide by the Terms of Use and our Community Integrity Charter. GloWe is committed to building a safe, inclusive, and impact-driven space.": "עמוד זה מתאר את התנאים, האחריות ואמות המידה הקהילתיות שמנחים את השימוש שלכם בפלטפורמת GloWe. בגישה לאתר זה או באינטראקציה איתו, אתם מסכימים לפעול לפי תנאי השימוש ואמנת היושרה הקהילתית שלנו. GloWe מחויבת לבניית מרחב בטוח, מכליל ומונע השפעה.",
        "GloWe is a global platform connecting individuals, organizations, and initiatives working to create social and environmental change. We facilitate knowledge-sharing, collaboration, and visibility for solutions that matter across languages, sectors, and geographies.": "GloWe היא פלטפורמה גלובלית שמחברת אנשים, ארגונים ויוזמות שפועלים ליצירת שינוי חברתי וסביבתי. אנחנו מאפשרים שיתוף ידע, שיתוף פעולה ונראות לפתרונות שחשובים, מעבר לשפות, למגזרים ולמיקומים גאוגרפיים.",
        "Share knowledge, ask for support, and build practical impact with the community.": "שתפו ידע, בקשו תמיכה ובנו השפעה מעשית יחד עם הקהילה.",
        "More post actions": "פעולות נוספות לפוסט",
        "More wish actions": "פעולות נוספות למשאלה",
        "More opportunity actions": "פעולות נוספות להזדמנות",
        "More profile actions": "פעולות נוספות לפרופיל",
        "Write a thoughtful comment...": "כתבו תגובה מכובדת...",
        "Ask a focused question for this group": "שאלו שאלה ממוקדת לקבוצה הזו",
        "What do you need input on, and what kind of answers would help?": "על מה תרצו לקבל משוב, ואיזה סוג תשובות יעזור?",
        "Personal workspace": "מרחב עבודה אישי",
        "Your GloWe profile is ready to be completed.": "הפרופיל שלכם ב-GloWe מוכן להשלמה.",
        "Community collaboration": "שיתוף פעולה קהילתי",
        "Location not added yet": "מיקום טרם נוסף",
        "Team size not added yet": "גודל הצוות טרם נוסף",
        "Not added yet": "טרם נוסף",
        "Title / role": "תפקיד",
        "Organization name": "שם הארגון",
        "Email verified": "דוא\"ל מאומת",
        "Pending": "ממתין",
        "Accepted": "התקבל",
        "Declined": "נדחה",
        "Public link": "קישור ציבורי",
        "Public line": "משפט ציבורי",
        "Open to volunteers, donations, or partnerships?": "פתוחים למתנדבים, לתרומות או לשותפויות?",
        "Funding / support sources": "מקורות מימון / תמיכה",
        "Annual budget / support context": "תקציב שנתי / הקשר תמיכה",
        "Profile status": "סטטוס הפרופיל",
        "Personal area sections": "מקטעי האזור האישי",
        "Welcome — you're browsing as a guest. Sign in with Google anytime to participate.": "ברוכים הבאים — אתם גולשים כאורח. התחברו עם גוגל בכל רגע כדי להשתתף.",
        "Mark as fulfilled": "סמנו כמומש",
        "No wishes yet": "עדיין אין משאלות",
        "Post a wish": "פרסמו משאלה",
        "The Wishing Well fills up as community members post support requests, calls for volunteers, and collaboration opportunities. Be the first to share what your project needs.": "באר המשאלות מתמלאת כשחברי הקהילה מפרסמים בקשות תמיכה, קריאות למתנדבים והזדמנויות לשיתוף פעולה. היו הראשונים לשתף מה הפרויקט שלכם צריך.",
        "Back to wishes": "חזרה למשאלות",
        "No opportunities posted yet": "עדיין לא פורסמו הזדמנויות",
        "No organizations yet": "עדיין אין ארגונים",
        "No matching profiles": "אין פרופילים תואמים",
        "No posts yet — share knowledge, ask for support, or open a discussion to get things going.": "עדיין אין פוסטים — שתפו ידע, בקשו תמיכה, או פתחו דיון כדי להניע דברים.",
        "No registrations yet.": "עדיין אין הרשמות.",
        "Could not load registrations.": "לא ניתן לטעון הרשמות.",
        "Be the first to share a volunteer role or collaboration request with the GloWe community.": "היו הראשונים לשתף תפקיד התנדבות או בקשת שיתוף פעולה עם קהילת GloWe.",
        "Be the first to share a volunteer role or collaboration request with the community.": "היו הראשונים לשתף תפקיד התנדבות או בקשת שיתוף פעולה עם הקהילה.",
        "Members will appear here once they join the community.": "חברים יופיעו כאן ברגע שיצטרפו לקהילה.",
        "Organizations join GloWe by creating a profile and completing verification. The first approved profiles will appear here.": "ארגונים מצטרפים ל-GloWe על ידי יצירת פרופיל והשלמת אימות. הפרופילים הראשונים שיאושרו יופיעו כאן.",
        "The community is just getting started. Post a wish, share what you know, or reach out to someone who is working on what you care about.": "הקהילה רק מתחילה. פרסמו משאלה, שתפו את מה שאתם יודעים, או פנו למישהו שעובד על מה שחשוב לכם.",
        "This section will come alive as the community grows.": "החלק הזה יתעורר לחיים ככל שהקהילה תגדל.",
        "Try a broader keyword or clear a filter.": "נסו מילת מפתח רחבה יותר או נקו סינון.",
        "Write the first post": "כתבו את הפוסט הראשון",
        "Write a message": "כתבו הודעה",
        "Loading opportunities…": "טוען הזדמנויות…",
        "Loading organizations…": "טוען ארגונים…",
        "Loading posts…": "טוען פוסטים…",
        "Loading profile…": "טוען פרופיל…",
        "Loading registrations…": "טוען הרשמות…",
        "Loading wishes…": "טוען משאלות…",
        "Fetching from the community directory.": "מביא מספריית הקהילה.",
        "Back": "חזרה",
        "Next": "הבא",
        "Register for event": "הרשמה לאירוע",
        "Sign in to register": "התחברו כדי להירשם",
        "Cancel registration": "ביטול הרשמה",
        "Cancel event": "ביטול אירוע",
        "Manage registrations": "ניהול הרשמות",
        "Event registration": "הרשמה לאירוע",
        "Message to the organizer (optional)": "הודעה למארגן (אופציונלי)",
        "This event has been cancelled by the organizer.": "האירוע בוטל על ידי המארגן.",
        "This event has ended.": "האירוע הסתיים.",
        "This event is cancelled.": "האירוע בוטל.",
        "This event is no longer open for registration.": "האירוע כבר אינו פתוח להרשמה.",
        "Registration:": "הרשמה:",
        "Status:": "סטטוס:",
        "Type:": "סוג:",
        "When:": "מתי:",
        "Join link:": "קישור הצטרפות:",
        "Offer sent": "ההצעה נשלחה",
        "Structured support offer submitted.": "הצעת תמיכה מובנית נשלחה.",
        "Save as draft": "שמירה כטיוטה",
        "Submit for review": "שליחה לסקירה",
        "Send code": "שליחת קוד",
        "Select an area": "בחרו תחום",
        "Choose if relevant": "בחרו אם רלוונטי",
        "Preferred contact": "אמצעי קשר מועדף",
        "In-app message": "הודעה באפליקציה",
        "Location (optional)": "מיקום (אופציונלי)",
        "Phone": "טלפון",
        "Phone (optional)": "טלפון (אופציונלי)",
        "WhatsApp": "וואטסאפ",
        "Public": "ציבורי",
        "Public actions": "פעולות ציבוריות",
        "Public profile and media": "פרופיל ציבורי ומדיה",
        "Basic account": "חשבון בסיסי",
        "Looking for": "מחפש",
        "Impact": "השפעה",
        "Impact update": "עדכון השפעה",
        "Draft impact update": "טיוטת עדכון השפעה",
        "Draft Update": "טיוטת עדכון",
        "Impact, interests and methods": "השפעה, תחומי עניין ושיטות",
        "Mentoring": "מנטורינג",
        "Trust": "אמון",
        "Trust, contact and review": "אמון, קשר וסקירה",
        "Story": "סיפור",
        "Story and purpose": "סיפור ומטרה",
        "The dream": "החלום",
        "The conversation starts here": "השיחה מתחילה כאן",
        "Connection workspace": "מרחב עבודה לחיבורים",
        "Profile onboarding": "הקמת פרופיל",
        "Organization review": "סקירת ארגון",
        "Review note": "הערת סקירה",
        "Relevant SDGs": "יעדי פיתוח בר-קיימא רלוונטיים",
        "Size / team": "גודל / צוות",
        "Annual budget": "תקציב שנתי",
        "First coordination call": "שיחת תיאום ראשונה",
        "Both sides confirm scope, timeline, and ownership.": "שני הצדדים מאשרים היקף, לוח זמנים ובעלות.",
        "A short outcome note documents what changed.": "פתק תוצאה קצר מתעד מה השתנה.",
        "When work is complete, this becomes a short public note: what was needed, who helped, what happened, and what is still needed.": "כשהעבודה מסתיימת, זה הופך לפתק ציבורי קצר: מה נדרש, מי עזר, מה קרה, ומה עדיין נדרש.",
        "To turn a local need into a shared action that others can join, support, or learn from.": "להפוך צורך מקומי לפעולה משותפת שאחרים יכולים להצטרף אליה, לתמוך בה, או ללמוד ממנה.",
        "Build a useful profile step by step. You can save a draft now and complete more details later.": "בנו פרופיל שימושי שלב אחר שלב. אפשר לשמור טיוטה עכשיו ולהשלים פרטים נוספים מאוחר יותר.",
        "Choose the profile that best describes you. This changes the questions and future profile layout.": "בחרו את הפרופיל שמתאר אתכם בצורה הטובה ביותר. זה משנה את השאלות ואת מבנה הפרופיל העתידי.",
        "For this MVP, the code is shown on screen and stored locally.": "בגרסת ה-MVP הזו, הקוד מוצג על המסך ונשמר מקומית.",
        "I agree to keep GloWe professional, respectful, transparent, and aligned with human rights.": "אני מסכים לשמור על GloWe מקצועי, מכבד, שקוף ותואם לזכויות אדם.",
        "Logo or profile image": "לוגו או תמונת פרופיל",
        "Website / LinkedIn / Facebook": "אתר / LinkedIn / Facebook",
        "1 person": "אדם אחד",
        "2-5 people": "2-5 אנשים",
        "6-20 people": "6-20 אנשים",
        "20+ people": "20+ אנשים",
        "(required for rejection)": "(נדרש לדחייה)",
        "First name *": "שם פרטי *",
        "Last name *": "שם משפחה *",
        "Email *": "אימייל *",
        "Password *": "סיסמה *",
        "Confirm password *": "אימות סיסמה *",
        "Email verification code *": "קוד אימות אימייל *",
        "Country *": "מדינה *",
        "Community / audience *": "קהילה / קהל *",
        "Geographic activity *": "פעילות גיאוגרפית *",
        "Main interest areas *": "תחומי עניין עיקריים *",
        "Organization mission *": "משימת הארגון *",
        "Problem you address *": "הבעיה שאתם מטפלים בה *",
        "Solution or method *": "פתרון או שיטה *",
        "Values and goals *": "ערכים ומטרות *",
        "Short public line *": "שורה ציבורית קצרה *",
        "Title / role *": "כותרת / תפקיד *",
        "All listings": "כל הרשומות",
        "Events only": "אירועים בלבד",
        "Events:": "אירועים:",
        "In-person events": "אירועים פיזיים",
        "Online events": "אירועים מקוונים",
        "Upcoming events": "אירועים קרובים",
        "Registered members": "חברים רשומים",
        "Registered organizations": "ארגונים רשומים",
        "+ Create": "+ יצירה",
        "Create": "יצירה",
        "What would you like to create?": "מה תרצו ליצור?",
        "Share an update, a story, or knowledge with the community.": "שתפו עדכון, סיפור או ידע עם הקהילה.",
        "Publish a volunteering event with a date and registration.": "פרסמו אירוע התנדבות עם תאריך והרשמה.",
        "Recruit volunteers for an ongoing role or project.": "גייסו מתנדבים לתפקיד מתמשך או לפרויקט.",
        "Ask the community for help, resources, or partners.": "בקשו מהקהילה עזרה, משאבים או שותפים.",
        "Offer your time and skills so organizations can find you.": "הציעו את הזמן והכישורים שלכם כדי שארגונים ימצאו אתכם.",
        "Event": "אירוע",
        "Need": "בקשת עזרה",
        "Volunteer Offer": "הצעת התנדבות",
        "Publish an event": "פרסום אירוע",
        "Events appear on the Volunteer Network with a date and registration.": "אירועים מופיעים ברשת ההתנדבות עם תאריך והרשמה.",
        "Event title": "כותרת האירוע",
        "e.g. Community beach cleanup": "לדוגמה: ניקיון חוף קהילתי",
        "What happens at the event, and who should come?": "מה קורה באירוע ולמי הוא מתאים?",
        "Starts": "מתחיל",
        "Ends (optional)": "מסתיים (לא חובה)",
        "Format": "פורמט",
        "Location / link": "מיקום / קישור",
        "Address, city, or meeting link": "כתובת, עיר או קישור למפגש",
        "Capacity (optional)": "מכסת משתתפים (לא חובה)",
        "Leave empty for unlimited": "השאירו ריק ללא הגבלה",
        "Registration": "הרשמה",
        "Organizer approves each registration": "המארגן מאשר כל הרשמה",
        "Open — instant confirmation": "פתוח — אישור מיידי",
        "Publish Event": "פרסום אירוע",
        "Event published": "האירוע פורסם",
        "Your event is now live on the Volunteer Network.": "האירוע שלכם עלה לרשת ההתנדבות.",
        "Offer your help": "הציעו עזרה",
        "Your offer appears on the Wishing Well so organizations and members can find you.": "ההצעה שלכם מופיעה בבאר המשאלות כדי שארגונים וחברים ימצאו אתכם.",
        "Headline": "כותרת",
        "e.g. Graphic designer offering 3 hours a week": "לדוגמה: מעצב גרפי מציע 3 שעות בשבוע",
        "Skills, time, equipment — anything that could help.": "כישורים, זמן, ציוד — כל דבר שיכול לעזור.",
        "Impact area (optional)": "תחום השפעה (לא חובה)",
        "Publish Offer": "פרסום הצעה",
        "Offer published": "ההצעה פורסמה",
        "Your offer is now live on the Wishing Well.": "ההצעה שלכם עלתה לבאר המשאלות.",
        "Fetching your conversations.": "טוענים את השיחות שלכם.",
        "No conversations yet": "אין שיחות עדיין",
        "Reach out to an organization, offer help on a need, or message a community member — conversations will appear here.": "פנו לארגון, הציעו עזרה לבקשה או שלחו הודעה לחבר קהילה — השיחות יופיעו כאן.",
        "Open the Wishing Well": "לבאר המשאלות",
        "Opening the conversation.": "פותחים את השיחה.",
        "Conversation unavailable": "השיחה אינה זמינה",
        "This conversation could not be opened.": "לא הצלחנו לפתוח את השיחה הזו.",
        "Back to messages": "חזרה להודעות",
        "No messages yet. Say hello!": "אין הודעות עדיין. אמרו שלום!",
        "Write a message...": "כתבו הודעה...",
        "Could not send": "השליחה נכשלה",
        "Messaging unavailable": "שליחת הודעות אינה זמינה",
        "This member cannot receive direct messages yet.": "החבר הזה עדיין לא יכול לקבל הודעות ישירות.",
        "Messages are unavailable": "ההודעות אינן זמינות",
        "Start the conversation": "התחילו את השיחה",
        "Spam or misleading promotion": "ספאם או קידום מטעה",
        "Harassment or hate": "הטרדה או שנאה",
        "False or misleading information": "מידע כוזב או מטעה",
        "Inappropriate content": "תוכן לא הולם",
        "Fake profile or impersonation": "פרופיל מזויף או התחזות",
        "Already reported": "כבר דיווחתם",
        "You already reported this. Our team will review it.": "כבר דיווחתם על הפריט הזה. הצוות שלנו יבדוק אותו.",
        "Could not send report": "שליחת הדיווח נכשלה",
        "Something went wrong sending your report. Please try again.": "משהו השתבש בשליחת הדיווח. נסו שוב.",
        "Reporting needs a live connection right now. Please try again shortly.": "הדיווח דורש חיבור פעיל כרגע. נסו שוב בעוד רגע.",
        "Sign in to report": "התחברו כדי לדווח",
        "Sign in with Google to report this content so our team can review it.": "התחברו עם Google כדי לדווח על התוכן כדי שהצוות שלנו יבדוק אותו.",
        "Fetching community reports.": "טוענים דיווחים מהקהילה.",
        "Could not load reports": "טעינת הדיווחים נכשלה",
        "Remove content": "הסרת תוכן",
        "Content removed": "התוכן הוסר",
        "The reported content is no longer publicly visible.": "התוכן שדווח כבר אינו גלוי לציבור.",
        "Report dismissed": "הדיווח נדחה",
        "The report was closed with no action.": "הדיווח נסגר ללא פעולה.",
        "Only GloWe reviewers can act on reports.": "רק בודקים של GloWe יכולים לטפל בדיווחים.",
        "Open reported item": "פתיחת הפריט שדווח",
        "+ Follow": "+ עקבו",
        "A focused group for learning spaces, youth programs, multilingual knowledge sharing, and practical education tools.": "קבוצה ממוקדת למרחבי למידה, תוכניות נוער, שיתוף ידע רב-לשוני וכלים חינוכיים מעשיים.",
        "A glimpse into the community": "הצצה אל הקהילה",
        "A home for people building impact together": "בית לאנשים שיוצרים השפעה ביחד",
        "A moderated space for wellbeing, preventive health, emergency response, and community care methods.": "מרחב מנוהל לרווחה, בריאות מונעת, מענה לחירום ושיטות טיפול קהילתי.",
        "About": "אודות",
        "About Us": "עלינו",
        "Account": "חשבון",
        "Account type": "סוג חשבון",
        "Admin Review": "ניהול ובקרה",
        "Already have an account?": "כבר יש לכם חשבון?",
        "An MVP by the GloWe community, with product and implementation support by Topaz.": "גרסת MVP של קהילת GloWe, בליווי מוצר ופיתוח של Topaz.",
        "Ask for support": "בקשת תמיכה",
        "Ask for Support": "בקשו תמיכה",
        "Ask with honesty": "לבקש בכנות",
        "Audience": "קהל יעד",
        "Be the first to share a post or an opportunity others can join.": "היו הראשונים לשתף פוסט או הזדמנות שאחרים יוכלו להצטרף אליהם.",
        "Bridging local solutions to global challenges through shared knowledge, solidarity, and practical action.": "מחברים פתרונות מקומיים לאתגרים גלובליים דרך ידע משותף, סולידריות ופעולה מעשית.",
        "Bring what you know. Ask for what you need. Meet people who are working, learning, building, and caring around the SDGs.": "הביאו את מה שאתם יודעים. בקשו את מה שאתם צריכים. פגשו אנשים שעובדים, לומדים, בונים ואכפת להם, סביב יעדי הקיימות.",
        "Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.": "הגלישה ב-GloWe פתוחה לכולם. התחברו עם גוגל כדי לפרסם צורך ולהגיע לאנשים שמוכנים לעזור.",
        "Build with solidarity": "לבנות מתוך סולידריות",
        "Built With Care": "נבנה באהבה",
        "Business Model": "מודל עסקי",
        "Change cover photo": "שינוי תמונת נושא",
        "Change profile photo": "שינוי תמונת פרופיל",
        "Choose the doorway that feels right today": "בחרו את הדלת שמרגישה נכונה היום",
        "Choose the language for the GloWe interface. Hebrew and Arabic are shown in a right-to-left (RTL) layout.": "בחרו את שפת הממשק של GloWe. עברית וערבית מוצגות בפריסת ימין-לשמאל (RTL).",
        "Choose the path that matches what you want to do first.": "בחרו את הדרך שמתאימה למה שתרצו לעשות קודם.",
        "Civic Action": "פעולה אזרחית",
        "Community": "קהילה",
        "Community Discussion": "דיון קהילתי",
        "Community member": "חבר/ת קהילה",
        "Community Member": "חבר/ת קהילה",
        "Community post": "פוסט קהילתי",
        "Complete profile": "השלם פרופיל",
        "Connection Request": "בקשת קשר",
        "Connections": "קשרים",
        "Continue": "המשך",
        "Continue with Google": "המשך עם Google",
        "Could not compress image.": "לא ניתן לדחוס את התמונה.",
        "Could not delete account": "לא ניתן למחוק את החשבון",
        "Could not follow": "לא ניתן לעקוב",
        "Could not read image.": "לא ניתן לקרוא את התמונה.",
        "Could not save photo.": "לא ניתן לשמור את התמונה.",
        "Could not save profile.": "לא ניתן לשמור את הפרופיל.",
        "Could not unfollow": "לא ניתן להפסיק לעקוב",
        "Cover will be removed when you save.": "תמונת הנושא תוסר לאחר השמירה.",
        "Create a profile": "יצירת פרופיל",
        "Create a profile, post a need, and receive structured offers.": "יצירת פרופיל, פרסום צורך וקבלת הצעות מסודרות.",
        "Crisis Response": "מענה לחירום",
        "Deadline": "מועד אחרון",
        "Delete Account": "מחיקת חשבון",
        "Development Roadmap": "מפת דרכים לפיתוח",
        "Discussion": "דיון",
        "Education & Knowledge": "חינוך וידע",
        "Email": "דוא\"ל",
        "End your session on this device. You can sign back in any time with Google.": "סיום ההתחברות במכשיר זה. תוכלו להתחבר מחדש בכל עת באמצעות Google.",
        "English": "אנגלית",
        "English org name — auto-filled if blank": "שם הארגון באנגלית — ימולא אוטומטית אם ריק",
        "Enter Community": "כניסה לקהילה",
        "Enter the Community": "כניסה לקהילה",
        "Environment & Climate Action": "סביבה ופעולה אקלימית",
        "Event / Webinar": "אירוע / וובינר",
        "Expert Community": "קהילת מומחים",
        "Explore": "ניווט",
        "Filters": "מסננים",
        "Find ways to help": "מצאו דרכים לעזור",
        "Find wishes that match your skills, language, location, and time.": "איתור משאלות שמתאימות לכישורים, לשפה, למיקום ולזמן שלכם.",
        "Find your GloWe path": "מצאו את הדרך שלכם ב-GloWe",
        "Find Your Place": "מצאו את מקומכם",
        "Focus not added yet": "תחום מיקוד טרם נוסף",
        "Followers": "עוקבים",
        "Following": "במעקב",
        "Forum": "פורום",
        "Join GloWe to see more and take part.": "הצטרפו ל-GloWe כדי לראות עוד ולהשתתף.",
        "You're caught up": "סיימתם לעבור על הכל",
        "Following ✓": "עוקבים ✓",
        "For climate, food systems, waste, restoration, repair, and local environmental action.": "לאקלים, מערכות מזון, פסולת, שיקום, תיקון ופעולה סביבתית מקומית.",
        "For Organizations": "לארגונים",
        "For rights-based action, civic participation, safe moderation, and community trust.": "לפעולה מבוססת זכויות, השתתפות אזרחית, ניהול שיח בטוח ואמון קהילתי.",
        "Forums": "פורומים",
        "Global Community": "קהילה גלובלית",
        "Global Learning, Open Knowledge & Wisdom Exchange.": "למידה גלובלית, ידע פתוח וחילופי חוכמה.",
        "GloWe is a warm, professional community for people, organizations, initiatives, volunteers, and partners working around the SDGs. Here you can ask for support, offer what you know, share field wisdom, and meet people who walk beside you in the work.": "GloWe היא קהילה חמה ומקצועית לאנשים, ארגונים, יוזמות, מתנדבים ושותפים שפועלים סביב יעדי הקיימות (SDGs). כאן אפשר לבקש תמיכה, להציע את הידע שלכם, לחלוק חוכמת שטח ולפגוש אנשים שצועדים לצידכם בעבודה.",
        "Grant / Open Call": "מענק / קול קורא",
        "Health & Community Care": "בריאות וטיפול קהילתי",
        "Hebrew": "עברית",
        "Hi,": "שלום,",
        "Hide details": "הסתר פרטים",
        "Home": "בית",
        "How GloWe is structured": "איך GloWe בנויה",
        "I am a business partner": "אני שותף/ה עסקי/ת",
        "I can help": "אני יכול/ה לעזור",
        "I represent an organization": "אני מייצג/ת ארגון",
        "Image is too large even after compression. Try a smaller photo.": "התמונה גדולה מדי גם אחרי דחיסה. נסו תמונה קטנה יותר.",
        "Image is too large. Try a smaller photo.": "התמונה גדולה מדי. נסו תמונה קטנה יותר.",
        "Individual": "פרטי",
        "Interface language": "שפת הממשק",
        "Join a discussion": "הצטרפו לדיון",
        "Join GloWe": "הצטרפו ל-GloWe",
        "Join our community": "הצטרפו לקהילה",
        "Join the GloWe Community": "הצטרפו לקהילת GloWe",
        "Justice": "צדק",
        "Keep this for later": "שמרו לאחר כך",
        "Knowledge Share": "שיתוף ידע",
        "Language": "שפה",
        "Latin / English display name": "שם תצוגה באנגלית / לטינית",
        "Latin / English name — auto-filled if left blank": "שם באנגלית / לטינית — ימולא אוטומטית אם יישאר ריק",
        "Loading your GloWe home…": "טוען את ה-GloWe שלכם…",
        "Local Community": "קהילה מקומית",
        "Log in": "כניסה",
        "Log In": "כניסה",
        "Log Out": "התנתקות",
        "Looking for people": "מחפשים אנשים",
        "Manage your account, language, and session preferences.": "ניהול החשבון, השפה והעדפות ההתחברות שלכם.",
        "Match CSR teams, logistics, funding, or services with verified needs.": "התאמת צוותי CSR, לוגיסטיקה, מימון או שירותים לצרכים מאומתים.",
        "Meet the Community": "הכירו את הקהילה",
        "Name": "שם",
        "Name in English (optional)": "שם באנגלית (אופציונלי)",
        "Need support": "זקוקים לתמיכה",
        "Needs changes": "דרושים שינויים",
        "Newest first": "חדשים קודם",
        "No followers yet": "אין עוקבים עדיין",
        "No wishes match your filters": "אין משאלות שמתאימות למסננים",
        "Not following anyone yet": "לא עוקבים אחרי אף אחד עדיין",
        "Offer Help": "הצעת עזרה",
        "Offer with care": "להציע באכפתיות",
        "Offer your expertise": "הציעו את המומחיות שלכם",
        "Offer your time or expertise": "הציעו מהזמן או מהמומחיות שלכם",
        "Oldest first": "ישנים קודם",
        "Open Community": "פתחו את הקהילה",
        "Open Personal Area": "מעבר לאזור האישי",
        "Opportunities": "הזדמנויות",
        "Organization name in English": "שם הארגון באנגלית",
        "Organization name in English (optional)": "שם הארגון באנגלית (אופציונלי)",
        "Organizations": "ארגונים",
        "Participate": "להשתתף",
        "Pending review": "ממתין לאישור",
        "People who can strengthen the work": "אנשים שיכולים לחזק את העבודה",
        "People who help knowledge travel": "אנשים שעוזרים לידע לנדוד",
        "People who know the place": "אנשים שמכירים את המקום",
        "Permanently delete your GloWe profile from this community. This removes your profile details; your Google sign-in itself is not deleted, so you can sign up again later.": "מחיקה לצמיתות של פרופיל GloWe שלכם מהקהילה. פעולה זו מסירה את פרטי הפרופיל; חשבון ההתחברות של Google עצמו אינו נמחק, כך שתוכלו להירשם מחדש בעתיד.",
        "Personal Area": "האזור האישי",
        "Photo optimized for upload.": "התמונה עברה אופטימיזציה להעלאה.",
        "Photo will be removed when you save.": "התמונה תוסר בעת השמירה.",
        "Post an opportunity": "פרסום הזדמנות",
        "Post an Opportunity": "פרסום הזדמנות",
        "Practical Action": "פעולה מעשית",
        "Preparing photo...": "מכין את התמונה...",
        "Professional Guide": "מדריך מקצועי",
        "Profile": "פרופיל",
        "Profile saved": "הפרופיל נשמר",
        "Quick Links": "קישורים מהירים",
        "Read Community": "קראו את הקהילה",
        "Read Community Posts": "קראו פוסטים מהקהילה",
        "Read What's Next": "קראו מה הלאה",
        "Ready to lend a hand?": "מוכנים לעזור?",
        "Reason": "סיבה",
        "Register Your Organization": "רישום הארגון שלכם",
        "Remove cover": "הסרת תמונת נושא",
        "Remove photo": "הסרת תמונה",
        "Repair": "תיקון",
        "Replace": "החלפה",
        "Reporter": "מדווח",
        "Rights, Safety & Civic Power": "זכויות, בטיחות וכוח אזרחי",
        "Safety": "בטיחות",
        "Save cover": "שמירת תמונת נושא",
        "Save photo": "שמירת תמונה",
        "Save your spot": "שמרו את מקומכם",
        "Saved from the GloWe community": "נשמר מקהילת GloWe",
        "Saving...": "שומר...",
        "Search by title, author, city, or topic": "חיפוש לפי כותרת, מחבר/ת, עיר או נושא",
        "Search wishes": "חיפוש משאלות",
        "Search, filter, and sort open needs from across the community.": "חפשו, סננו ומיינו צרכים פתוחים מכל הקהילה.",
        "See all": "הצגת הכול",
        "See all comments": "הצגת כל התגובות",
        "See How This Could Grow": "ראו איך זה יכול לצמוח",
        "Session": "התנתקות",
        "Settings": "הגדרות",
        "Share a local need": "שיתוף צורך מקומי",
        "Share a post": "שיתוף פוסט",
        "Share what would help": "שתפו במה שיעזור",
        "Share with the community": "שיתוף עם הקהילה",
        "Shared Knowledge": "ידע משותף",
        "Show details": "הצג פרטים",
        "Show original": "הצג מקור",
        "Show translation": "הצג תרגום",
        "Sign in to apply": "התחברו כדי להגיש מועמדות",
        "Sign in to continue": "התחברו כדי להמשיך",
        "Sign in to follow": "התחברו כדי לעקוב",
        "Sign in to manage settings": "התחברו כדי לנהל הגדרות",
        "Sign in to open your personal area": "התחברו כדי לפתוח את האזור האישי",
        "Sign in to post": "התחברו כדי לפרסם",
        "Sign in to post a need": "התחברו כדי לפרסם צורך",
        "Sign in to publish": "התחברו כדי לפרסם",
        "Sign in to reply": "התחברו כדי להשיב",
        "Sign in to see connections": "התחברו כדי לראות קשרים",
        "Sign in to start a discussion": "התחברו כדי לפתוח דיון",
        "Sign in with Google to do this on GloWe.": "התחברו עם גוגל כדי לעשות זאת ב-GloWe.",
        "Sign in with Google to follow profiles and stay updated on their work.": "התחברו עם Google כדי לעקוב אחרי פרופילים ולהישאר מעודכנים בעבודתם.",
        "Sign in with Google to join this discussion.": "התחברו עם גוגל כדי להצטרף לדיון.",
        "Sign in with Google to open a new discussion thread.": "התחברו עם גוגל כדי לפתוח שרשור דיון חדש.",
        "Sign in with Google to open your personal area.": "התחברו עם גוגל כדי לפתוח את האזור האישי שלכם.",
        "Sign in with Google to publish this opportunity and start receiving applications.": "התחברו עם גוגל כדי לפרסם את ההזדמנות ולהתחיל לקבל מועמדויות.",
        "Sign in with Google to save it to your list.": "התחברו עם גוגל כדי לשמור לרשימה שלכם.",
        "Sign in with Google to share a post with the GloWe community.": "התחברו עם גוגל כדי לשתף פוסט עם קהילת GloWe.",
        "Sign in with your Google account to get started.": "התחברו עם חשבון Google כדי להתחיל.",
        "Sign up / Sign in": "הרשמה / כניסה",
        "Solidarity": "סולידריות",
        "Something went wrong deleting your profile. Please try again.": "משהו השתבש במחיקת הפרופיל. אנא נסו שוב.",
        "Sort": "מיון",
        "Sort wishes": "מיון משאלות",
        "Start where you are": "התחילו מהמקום שבו אתם נמצאים",
        "Step into the community": "היכנסו לקהילה",
        "Stop following": "הפסק לעקוב",
        "Success": "הצלחה",
        "Success Story": "סיפור הצלחה",
        "Terms & Community Charter": "תנאים ואמנת קהילה",
        "The community is just getting started": "הקהילה רק מתחילה",
        "The GloWe ecosystem": "המערכת האקולוגית של GloWe",
        "The Wishing Well": "באר המשאלות",
        "there": "חבר/ה",
        "This account requires approval to follow.": "חשבון זה דורש אישור כדי לעקוב.",
        "Three communities, one living network": "שלוש קהילות, רשת חיה אחת",
        "Title A–Z": "כותרת א–ת",
        "Translating…": "מתרגם…",
        "Trust and Respect": "אמון וכבוד",
        "Trusted by the GloWe Community": "זוכה לאמון קהילת GloWe",
        "Type DELETE to confirm": "הקלידו DELETE לאישור",
        "Uploading...": "מעלה...",
        "Use the Wishing Well": "שימוש בבאר המשאלות",
        "User Roles": "תפקידי משתמשים",
        "Values that guide the space": "הערכים שמנחים את המרחב",
        "Verified": "מאומת",
        "Volunteer Network": "רשת המתנדבים",
        "volunteers": "מתנדבים",
        "Want to contribute": "רוצים לתרום",
        "Welcome Back": "ברוכים השבים",
        "Welcome back,": "ברוכים השבים,",
        "Welcome Back!": "ברוכים השבים!",
        "Welcome to GloWe": "ברוכים הבאים ל-GloWe",
        "Wellbeing": "רווחה",
        "What Comes Next": "מה צופן העתיד",
        "What is happening on GloWe": "מה קורה ב-GloWe",
        "What would you like to do today? Share knowledge, post an opportunity, or ask the community for support.": "מה תרצו לעשות היום? לשתף ידע, לפרסם הזדמנות, או לבקש תמיכה מהקהילה.",
        "What you can do in GloWe now": "מה אפשר לעשות ב-GloWe עכשיו",
        "Who is invited?": "מי מוזמן?",
        "wish shown": "משאלה מוצגת",
        "Wishes": "משאלות",
        "wishes shown": "משאלות מוצגות",
        "Wishing Well": "באר המשאלות",
        "Write a post": "כתיבת פוסט",
        "Write your first post": "כתבו את הפוסט הראשון שלכם",
        "You can ask": "אפשר לבקש",
        "You can belong": "אפשר להשתייך",
        "You can connect": "אפשר להתחבר",
        "You can learn": "אפשר ללמוד",
        "You can offer": "אפשר להציע",
        "You do not have to carry the work alone.": "אתם לא צריכים לשאת את העבודה לבד.",
        "You have a place in this community.": "יש לכם מקום בקהילה הזו.",
        "You have not shared anything yet": "עדיין לא שיתפתם דבר",
        "You have something to give, and something to receive.": "יש לכם מה לתת, ויש לכם מה לקבל.",
        "Your account, language, and session options live here once you are signed in.": "החשבון, השפה ואפשרויות ההתחברות יופיעו כאן לאחר הכניסה.",
        "Your action was completed successfully.": "הפעולה הושלמה בהצלחה.",
        "Your activity": "הפעילות שלכם",
        "Your GloWe": "ה-GloWe שלכם",
        "Your posts, opportunities, and requests will gather here.": "הפוסטים, ההזדמנויות והבקשות שלכם יופיעו כאן.",
        "Your profile, applications, needs, and saved items live here once you are signed in.": "הפרופיל, הבקשות, הצרכים והפריטים השמורים שלכם יופיעו כאן לאחר הכניסה.",
        "Youth": "נוער",
        "Values": "ערכים",
        "Problem": "בעיה",
        "Solution": "פתרון",
        "Size / availability": "גודל / זמינות",
        "Not specified yet": "טרם צוין",
        "Through participation, useful connections, project progress, and community feedback.": "דרך השתתפות, קשרים מועילים, התקדמות בפרויקטים ומשוב מהקהילה.",
        "Contact through GloWe messages": "יצירת קשר דרך הודעות GloWe",
        "Community impact": "השפעה קהילתית",
        "Open to coordination": "פתוחים לתיאום",
        "Impact signals": "סימני השפעה",
        "What I offer": "מה אני מציע/ה",
        "Bio": "ביוגרפיה",
        "Size": "גודל",
        "Country": "מדינה",
        "Website": "אתר אינטרנט",
        "Field / sector": "תחום / מגזר",
        "Size (optional)": "גודל (אופציונלי)",
        "Contact name": "שם איש קשר",
        "Contact email": "אימייל ליצירת קשר",
        "Contact phone (optional)": "טלפון ליצירת קשר (אופציונלי)",
        "A few words about you and what you're working on": "כמה מילים עליכם ועל מה שאתם עובדים עליו",
        "Education, health, environment...": "חינוך, בריאות, סביבה...",
        "What does your organization do?": "מה הארגון שלכם עושה?",
        "e.g. 1-10, 11-50": "לדוגמה 1-10, 11-50",
        "Contact person": "איש קשר",
        "Dev sign in": "כניסת פיתוח",
        "Local dev sign-in": "כניסת פיתוח מקומית",
        "Google OAuth is disabled on the local Supabase stack. Pick a test persona below — each option mints a real Supabase session (same as production after sign-in).": "Google OAuth מושבת בסביבת ה-Supabase המקומית. בחרו דמות בדיקה למטה — כל אפשרות יוצרת סשן Supabase אמיתי (כמו בסביבת הייצור לאחר כניסה).",
        "Generated automatically — change if you like": "נוצר אוטומטית — אפשר לשנות אם תרצו",
        "Organization mission": "משימת הארגון",
        "Community you serve": "הקהילה שאתם משרתים",
        "Problem you address": "הבעיה שאתם מטפלים בה",
        "Solution or method": "פתרון או שיטה",
        "Business purpose": "מטרת העסק",
        "Business values": "ערכי העסק",
        "Customers / community": "לקוחות / קהילה",
        "Social or environmental problem": "בעיה חברתית או סביבתית",
        "Product, service, or impact model": "מוצר, שירות או מודל השפעה",
        "Team / company size": "גודל הצוות / החברה",
        "Initiative story": "סיפור היוזמה",
        "Values and people behind it": "ערכים והאנשים מאחורי היוזמה",
        "Problem or need": "בעיה או צורך",
        "What you do in practice": "מה אתם עושים בפועל",
        "People involved": "אנשים מעורבים",
        "Volunteer introduction": "הצגה עצמית של המתנדב/ת",
        "How you like to volunteer": "איך אתם אוהבים להתנדב",
        "Preferred causes / communities": "מטרות / קהילות מועדפות",
        "Causes close to your heart": "מטרות שקרובות ללבכם",
        "Support you can offer": "תמיכה שאתם יכולים להציע",
        "Monthly availability": "זמינות חודשית",
        "Professional background": "רקע מקצועי",
        "Professional values": "ערכים מקצועיים",
        "Who you can support": "את מי אתם יכולים לתמוך",
        "Challenges you can help solve": "אתגרים שאתם יכולים לעזור לפתור",
        "Services, volunteering, or forum leadership": "שירותים, התנדבות או הובלת פורום",
        "Availability / service model": "זמינות / מודל שירות",
        "Collaboration": "שיתוף פעולה",
        "Joint Projects": "פרויקטים משותפים",
        "Active Account": "חשבון פעיל",
        "Shared Content": "תוכן משותף",
        "Expert Writer": "כותב/ת מומחה/ית",
        "Professional Knowledge": "ידע מקצועי",
        "Leading Volunteer": "מתנדב/ת מוביל/ה",
        "Volunteer Hours": "שעות התנדבות",
        "Active Learner": "לומד/ת פעיל/ה",
        "Knowledge Discovery": "גילוי ידע",
        "Community Bridge": "גשר קהילתי",
        "Connections Made": "קשרים שנוצרו",
        "Documented Impact": "השפעה מתועדת",
        "Case Studies": "מקרי בוחן",
        "Diversity & Inclusion": "גיוון והכלה",
        "Diverse Collaborations": "שיתופי פעולה מגוונים",
        "Projects created or managed in partnership": "פרויקטים שנוצרו או נוהלו בשותפות",
        "Posts, articles, videos, and comments published": "פוסטים, מאמרים, סרטונים ותגובות שפורסמו",
        "Professional posts or articles shared": "פוסטים או מאמרים מקצועיים ששותפו",
        "Hours of consulting, mentoring, or activity": "שעות של ייעוץ, חונכות או פעילות",
        "Articles, pages, and projects explored": "מאמרים, עמודים ופרויקטים שנחקרו",
        "People and organizations introduced to one another": "אנשים וארגונים שחוברו זה לזה",
        "Success stories with impact evidence": "סיפורי הצלחה עם עדויות להשפעה",
        "Cross-community, cross-country, or cross-sector collaborations": "שיתופי פעולה בין-קהילתיים, בין-ארציים או בין-מגזריים",
        "volunteers connected": "מתנדבים מחוברים",
        "projects listed": "פרויקטים רשומים",
        // Profile-view fallback sentences (fix/language-gap-sweep, round 2)
        "Verified organization": "ארגון מאומת",
        "community impact": "השפעה קהילתית",
        "This profile can add more field insights, measurement notes, and lessons learned as the work develops.": "ניתן להוסיף לפרופיל הזה עוד תובנות מהשטח, הערות מדידה ולקחים שנלמדו ככל שהעבודה מתפתחת.",
        "Community work, partnerships, shared knowledge, and practical field-based action.": "עבודה קהילתית, שותפויות, ידע משותף ופעולה מעשית בשטח.",
        "Open to relevant conversations and collaboration through GloWe.": "פתוחים לשיחות רלוונטיות ולשיתופי פעולה דרך GloWe.",
        "people connected through projects, opportunities, or community activity.": "אנשים שהתחברו דרך פרויקטים, הזדמנויות או פעילות קהילתית.",
        "The work responds to needs connected to ": "העבודה נענית לצרכים הקשורים ל",
        " and helps make local knowledge easier to access and act on.": " ומסייעת להנגיש ידע מקומי ולפעול על פיו.",
        // wishTypeStyles labels (data.js) missing from an earlier partial harvest
        "Call for Help": "קריאה לעזרה",
        "Looking for Collaboration": "מחפשים שיתוף פעולה",
        "Support Needed": "נדרשת תמיכה",
        "Sharing Knowledge": "שיתוף ידע",
        "Call for Collaboration": "קריאה לשיתוף פעולה",
        "Media & Visibility": "מדיה וחשיפה",
        "Project Spotlight": "זרקור על פרויקט",
        "We're Hiring": "אנחנו מגייסים",
        // Date-locale-bug follow-up (event type + relative-time + applied/offered labels)
        "Online": "מקוון",
        "In person": "פרונטלי",
        "now": "עכשיו",
        "Offered": "הוצע",
        "Applied": "הוגשה מועמדות",
        "Applied on": "הוגש בתאריך",
        // index.html home-page marketing copy + member-feed Opportunity badge
        "Opportunity": "הזדמנות",
        "Your GloWe home": "העמוד הביתי שלכם ב-GloWe",
        "GloWe was created as a home for impact communities: a place to make work visible, build trust, share multilingual knowledge, and turn local needs into collaborative action. You can arrive with a project, a question, a skill, a story, or a need. There is room for all of it.": "GloWe נוצר כבית לקהילות השפעה: מקום להפוך עבודה לגלויה, לבנות אמון, לשתף ידע רב-לשוני ולהפוך צרכים מקומיים לפעולה משותפת. אפשר להגיע עם פרויקט, שאלה, מיומנות, סיפור או צורך. יש מקום לכל זה.",
        "Our community is built around practical exchange: professional volunteers, proven solutions, multilingual knowledge, local and global collaboration, tools and resources, donor and client access, social-business integration, and peer-to-peer inspiration.": "הקהילה שלנו בנויה סביב חילופין מעשיים: מתנדבים מקצועיים, פתרונות מוכחים, ידע רב-לשוני, שיתוף פעולה מקומי וגלובלי, כלים ומשאבים, גישה לתורמים וללקוחות, שילוב עסקים-חברתיים והשראה מעמית לעמית.",
        // TD-141 — report/saved-item target-type + status enum labels
        "Wish": "משאלה",
        "Thread": "דיון",
        "General": "כללי",
        "Dismissed": "נדחה",
        "Actioned": "טופל",
        // Forums page welded counts (members/posts/replies/Last active)
        "members": "חברים",
        "replies": "תגובות",
        "Last active": "פעילות אחרונה",
        "Discussion from members of ": "דיון מחברי ",
        // discussion-group.html group-stats row
        "active threads": "דיונים פעילים",
        // opportunity.html org-mission fallback text
        "This local opportunity was published by a GloWe community member and is ready for interested volunteers or collaborators.": "ההזדמנות המקומית הזו פורסמה על ידי חבר קהילת GloWe ומוכנה למתנדבים או שותפים מעוניינים.",
        // connections.html title + intro + follow-ui error state
        "Connections - GloWe": "קשרים - GloWe",
        "Followers and people this profile follows on GloWe.": "עוקבים ואנשים שהפרופיל הזה עוקב אחריהם ב-GloWe.",
        "Missing user id.": "חסר מזהה משתמש.",
        // admin.html — never previously translated (moderation + health tabs)
        "Review new profile submissions, respond to reports, and monitor production health from one place.": "סקרו הגשות פרופיל חדשות, הגיבו לדיווחים ועקבו אחר בריאות המערכת ממקום אחד.",
        "Moderation": "פיקוח",
        "System health": "תקינות המערכת",
        "Field": "תחום",
        "Submitted": "הוגש",
        "Production probes": "בדיקות ייצור",
        "Read-only checks against the live GloWe site. Refreshed after each deploy and every 15 minutes.": "בדיקות לקריאה בלבד מול אתר GloWe החי. מתעדכן אחרי כל פריסה וכל 15 דקות.",
        "No data": "אין נתונים",
        "Refresh": "רענון",
        "Open this tab to load probes": "פתחו את הכרטיסייה הזו כדי לטעון את הבדיקות",
        "Health data loads on demand so moderation stays fast.": "נתוני התקינות נטענים לפי דרישה כדי שהפיקוח יישאר מהיר.",
        "Recent probe history": "היסטוריית בדיקות אחרונה",
        "Check": "בדיקה",
        "Latency": "זמן תגובה",
        "Version": "גרסה",
        "Checked at": "נבדק בשעה",
        "Detail": "פרטים",
        "Admin sections": "אזורי ניהול",
        "Explain the decision — especially required when rejecting": "הסבירו את ההחלטה — נדרש במיוחד בעת דחייה",
        // registrationProfileFields publicPrompt/fundingLabel/budgetLabel for
        // business/initiative/volunteer/professional — reachable via
        // renderQuestionnaireProfile() on the Personal Area page (ngo's were
        // already covered by an earlier harvest, the other 4 types were not)
        "Open to collaborations, products, services, or CSR partnerships?": "פתוחים לשיתופי פעולה, מוצרים, שירותים או שותפויות CSR?",
        "Business model / support sources": "מודל עסקי / מקורות תמיכה",
        "Looking for volunteers, mentors, partners, or visibility?": "מחפשים מתנדבים, מנטורים, שותפים או חשיפה?",
        "Current support / resources": "תמיכה / משאבים נוכחיים",
        "Can people contact you directly through GloWe?": "אפשר ליצור איתכם קשר ישירות דרך GloWe?",
        "Preferred communication": "אופן תקשורת מועדף",
        "Support needs / accessibility notes": "צרכי תמיכה / הערות נגישות",
        "Open to volunteering, paid services, forum leadership, or community support?": "פתוחים להתנדבות, שירותים בתשלום, הובלת פורום או תמיכה קהילתית?",
        "Preferred engagement": "אופן מעורבות מועדף",
        "Rates / pro-bono policy": "תעריפים / מדיניות פרו-בונו",
    },
    ru: {
        "Show original": "Показать оригинал",
        "Show translation": "Показать перевод",
        "Translating…": "Перевод…",
        "Name in English (optional)": "Имя на английском (необязательно)",
        "Latin / English display name": "Отображаемое имя латиницей / на английском",
        "Latin / English name — auto-filled if left blank": "Имя латиницей / на английском — заполнится автоматически, если оставить пустым",
        "Organization name in English (optional)": "Название организации на английском (необязательно)",
        "Organization name in English": "Название организации на английском",
        "English org name — auto-filled if blank": "Название организации на английском — заполнится автоматически, если оставить пустым",
        "Complete profile": "Заполнить профиль",
        "Pending review": "На рассмотрении",
        "Needs changes": "Требуются изменения",
        "Save profile": "Сохранить профиль",
        "Change profile photo": "Изменить фото профиля",
        "Change cover photo": "Изменить обложку",
        "Remove cover": "Удалить обложку",
        "Save cover": "Сохранить обложку",
        "Cover will be removed when you save.": "Обложка будет удалена при сохранении.",
        "Remove photo": "Удалить фото",
        "Save photo": "Сохранить фото",
        "Profile saved": "Профиль сохранён",
        "Could not save profile.": "Не удалось сохранить профиль.",
        "Replace": "Заменить",
        "Cancel": "Отмена",
        "Photo will be removed when you save.": "Фото будет удалено при сохранении.",
        "Saving...": "Сохранение...",
        "Uploading...": "Загрузка...",
        "Preparing photo...": "Подготовка фото...",
        "Photo optimized for upload.": "Фото оптимизировано для загрузки.",
        "Could not read image.": "Не удалось прочитать изображение.",
        "Could not compress image.": "Не удалось сжать изображение.",
        "Image is too large. Try a smaller photo.": "Изображение слишком большое. Попробуйте фото меньшего размера.",
        "Image is too large even after compression. Try a smaller photo.": "Изображение слишком большое даже после сжатия. Попробуйте фото меньшего размера.",
        "Could not save photo.": "Не удалось сохранить фото.",
        "Followers": "Подписчики",
        "Following": "Подписки",
        "Forum": "Форум",
        "Join GloWe to see more and take part.": "Присоединяйтесь к GloWe, чтобы увидеть больше и участвовать.",
        "You're caught up": "Вы всё просмотрели",
        "+ Follow": "+ Подписаться",
        "Following ✓": "Вы подписаны ✓",
        "Stop following": "Отписаться",
        "This account requires approval to follow.": "Для подписки на этот аккаунт требуется одобрение.",
        "No followers yet": "Пока нет подписчиков",
        "Not following anyone yet": "Вы пока ни на кого не подписаны",
        "Sign in to follow": "Войдите, чтобы подписаться",
        "Sign in with Google to follow profiles and stay updated on their work.": "Войдите через Google, чтобы подписываться на профили и следить за их работой.",
        "Can't follow this profile": "Невозможно подписаться на этот профиль",
        "Could not follow": "Не удалось подписаться",
        "Could not unfollow": "Не удалось отписаться",
        "Connections": "Связи",
        "Sign in to see connections": "Войдите, чтобы увидеть связи",
        "Show details": "Показать подробности",
        "Hide details": "Скрыть подробности",
        "Individual": "Частное лицо",
        "Settings": "Настройки",
        "Opportunities": "Возможности",
        "My Events": "Мои мероприятия",
        "Focus not added yet": "Направление ещё не добавлено",
        "Saved from the GloWe community": "Сохранено из сообщества GloWe",
        "Loading your event registrations…": "Загружаем ваши регистрации на мероприятия…",
        "Education & Knowledge": "Образование и знания",
        "Environment & Climate Action": "Экология и климатические действия",
        "Health & Community Care": "Здоровье и забота о сообществе",
        "Rights, Safety & Civic Power": "Права, безопасность и гражданская сила",
        "A focused group for learning spaces, youth programs, multilingual knowledge sharing, and practical education tools.": "Тематическая группа для образовательных пространств, молодёжных программ, многоязычного обмена знаниями и практических учебных инструментов.",
        "For climate, food systems, waste, restoration, repair, and local environmental action.": "Для климата, продовольственных систем, отходов, восстановления, ремонта и местных экологических инициатив.",
        "A moderated space for wellbeing, preventive health, emergency response, and community care methods.": "Модерируемое пространство для благополучия, профилактики здоровья, реагирования на чрезвычайные ситуации и методов заботы о сообществе.",
        "For rights-based action, civic participation, safe moderation, and community trust.": "Для правозащитной деятельности, гражданского участия, безопасной модерации и доверия в сообществе.",
        "Youth": "Молодёжь",
        "Repair": "Ремонт",
        "Wellbeing": "Благополучие",
        "Crisis Response": "Реагирование на кризис",
        "Justice": "Справедливость",
        "Safety": "Безопасность",
        "Civic Action": "Гражданские действия",
        "Home": "Главная",
        "Personal Area": "Личный кабинет",
        "Wishing Well": "Колодец желаний",
        "The Wishing Well": "Колодец желаний",
        "Wishes": "Желания",
        "Organizations": "Организации",
        "Community": "Сообщество",
        "Forums": "Форумы",
        "About": "О нас",
        "About Us": "О нас",
        "Profile": "Профиль",
        "Sign up / Sign in": "Регистрация / Вход",
        "Log In": "Войти",
        "Log in": "Войти",
        "Join GloWe": "Присоединиться к GloWe",
        "Log Out": "Выйти",
        "Hi,": "Привет,",
        "there": "друг",
        "Global Learning, Open Knowledge & Wisdom Exchange.": "Глобальное обучение, открытые знания и обмен мудростью.",
        "Bridging local solutions to global challenges through shared knowledge, solidarity, and practical action.": "Соединяем локальные решения с глобальными вызовами через общие знания, солидарность и практические действия.",
        "Quick Links": "Быстрые ссылки",
        "Explore": "Обзор",
        "Participate": "Участвовать",
        "Write a post": "Написать пост",
        "Volunteer Network": "Сеть волонтёров",
        "What's next": "Что дальше",
        "What Comes Next": "Что будет дальше",
        "Built With Care": "Создано с заботой",
        "An MVP by the GloWe community, with product and implementation support by Topaz.": "MVP-версия сообщества GloWe при продуктовой и технической поддержке Topaz.",
        "Admin Review": "Администрирование",
        "Terms & Community Charter": "Условия и устав сообщества",
        "For Organizations": "Для организаций",
        "Register Your Organization": "Зарегистрируйте вашу организацию",
        "Post an Opportunity": "Опубликовать возможность",
        "Connect": "Связаться",
        "Welcome Back": "С возвращением",
        "Welcome Back!": "С возвращением!",
        "Sign in with your Google account to continue.": "Войдите через аккаунт Google, чтобы продолжить.",
        "Continue with Google": "Продолжить с Google",
        "Don't have an account?": "Нет аккаунта?",
        "Join our community": "Присоединяйтесь к нашему сообществу",
        "Join the GloWe Community": "Присоединяйтесь к сообществу GloWe",
        "Sign in with your Google account to get started.": "Войдите через аккаунт Google, чтобы начать.",
        "Already have an account?": "Уже есть аккаунт?",
        "Success": "Готово",
        "Your action was completed successfully.": "Действие успешно выполнено.",
        "Continue": "Продолжить",
        "Find your GloWe path": "Найдите свой путь в GloWe",
        "Choose the path that matches what you want to do first.": "Выберите путь, который соответствует тому, с чего вы хотите начать.",
        "I represent an organization": "Я представляю организацию",
        "Create a profile, post a need, and receive structured offers.": "Создайте профиль, опубликуйте запрос и получайте структурированные предложения.",
        "I can help": "Я могу помочь",
        "Find wishes that match your skills, language, location, and time.": "Найдите желания, которые подходят под ваши навыки, язык, местоположение и время.",
        "I am a business partner": "Я бизнес-партнёр",
        "Match CSR teams, logistics, funding, or services with verified needs.": "Соединяйте команды CSR, логистику, финансирование или услуги с проверенными запросами.",
        "Manage your account, language, and session preferences.": "Управляйте аккаунтом, языком и настройками сеанса.",
        "Account": "Аккаунт",
        "Name": "Имя",
        "Email": "Эл. почта",
        "Account type": "Тип аккаунта",
        "Community member": "Участник сообщества",
        "Open Personal Area": "Открыть личный кабинет",
        "Language": "Язык",
        "Interface language": "Язык интерфейса",
        "Choose the language for the GloWe interface. Hebrew and Arabic are shown in a right-to-left (RTL) layout.": "Выберите язык интерфейса GloWe. Иврит и арабский отображаются в макете справа налево (RTL).",
        "English": "Английский",
        "Hebrew": "Иврит",
        "Session": "Сеанс",
        "End your session on this device. You can sign back in any time with Google.": "Завершите сеанс на этом устройстве. Вы сможете войти снова в любой момент через Google.",
        "Delete Account": "Удалить аккаунт",
        "Permanently delete your GloWe profile from this community. This removes your profile details; your Google sign-in itself is not deleted, so you can sign up again later.": "Безвозвратно удалить ваш профиль GloWe из этого сообщества. Это удалит данные профиля; сам вход через Google не удаляется, поэтому вы сможете зарегистрироваться снова позже.",
        "Type DELETE to confirm": "Введите DELETE для подтверждения",
        "Could not delete account": "Не удалось удалить аккаунт",
        "Something went wrong deleting your profile. Please try again.": "При удалении профиля произошла ошибка. Пожалуйста, попробуйте снова.",
        "Sign in to manage settings": "Войдите, чтобы управлять настройками",
        "Your account, language, and session options live here once you are signed in.": "Настройки аккаунта, языка и сеанса появятся здесь после входа.",
        "Sign in to open your personal area": "Войдите, чтобы открыть личный кабинет",
        "Your profile, applications, needs, and saved items live here once you are signed in.": "Ваш профиль, заявки, запросы и сохранённые элементы появятся здесь после входа.",
        "Your GloWe": "Ваш GloWe",
        "Welcome back,": "С возвращением,",
        "What would you like to do today? Share knowledge, post an opportunity, or ask the community for support.": "Что вы хотите сделать сегодня? Поделиться знаниями, опубликовать возможность или попросить поддержки у сообщества.",
        "Share a post": "Поделиться постом",
        "Post an opportunity": "Опубликовать возможность",
        "Ask for support": "Попросить поддержки",
        "Your activity": "Ваша активность",
        "What is happening on GloWe": "Что происходит в GloWe",
        "See all": "Показать всё",
        "See all comments": "Показать все комментарии",
        "Loading your GloWe home…": "Загружаем вашу главную страницу GloWe…",
        "You have not shared anything yet": "Вы пока ничем не поделились",
        "Your posts, opportunities, and requests will gather here.": "Ваши посты, возможности и запросы будут собираться здесь.",
        "Write your first post": "Напишите свой первый пост",
        "The community is just getting started": "Сообщество только начинает свой путь",
        "Be the first to share a post or an opportunity others can join.": "Станьте первым, кто поделится постом или возможностью, к которой смогут присоединиться другие.",
        "Start the conversation": "Начните разговор",
        "Community post": "Пост сообщества",
        "Community Member": "Участник сообщества",
        "A home for people building impact together": "Дом для тех, кто вместе создаёт перемены",
        "You do not have to carry the work alone.": "Вам не нужно нести эту работу в одиночку.",
        "GloWe is a warm, professional community for people, organizations, initiatives, volunteers, and partners working around the SDGs. Here you can ask for support, offer what you know, share field wisdom, and meet people who walk beside you in the work.": "GloWe — это тёплое профессиональное сообщество для людей, организаций, инициатив, волонтёров и партнёров, работающих вокруг Целей устойчивого развития (ЦУР). Здесь вы можете попросить поддержки, предложить свои знания, поделиться опытом с мест и встретить людей, которые идут рядом с вами в этой работе.",
        "Find Your Place": "Найдите своё место",
        "Meet the Community": "Познакомьтесь с сообществом",
        "Ask for Support": "Попросите поддержки",
        "You have something to give, and something to receive.": "Вам есть что дать и что получить.",
        "You can ask": "Можно попросить",
        "You can offer": "Можно предложить",
        "You can learn": "Можно учиться",
        "You can connect": "Можно объединяться",
        "You can belong": "Можно быть своим",
        "Three communities, one living network": "Три сообщества, одна живая сеть",
        "Enter the Community": "Войти в сообщество",
        "Local Community": "Местное сообщество",
        "People who know the place": "Люди, которые знают это место",
        "Share a local need": "Поделиться местным запросом",
        "Expert Community": "Сообщество экспертов",
        "People who can strengthen the work": "Люди, которые могут усилить работу",
        "Offer your expertise": "Предложите свою экспертизу",
        "Global Community": "Глобальное сообщество",
        "People who help knowledge travel": "Люди, которые помогают знаниям путешествовать",
        "Join a discussion": "Присоединиться к обсуждению",
        "Ask with honesty": "Просить честно",
        "Offer with care": "Предлагать с заботой",
        "Build with solidarity": "Строить в солидарности",
        "Start where you are": "Начните с того места, где вы есть",
        "Choose the doorway that feels right today": "Выберите дверь, которая кажется правильной сегодня",
        "Need support": "Нужна поддержка",
        "Share what would help": "Расскажите, что помогло бы",
        "Want to contribute": "Хочу внести вклад",
        "Offer your time or expertise": "Предложите своё время или экспертизу",
        "Offer Help": "Предложить помощь",
        "Looking for people": "Ищу людей",
        "Step into the community": "Войдите в сообщество",
        "Enter Community": "Войти в сообщество",
        "What you can do in GloWe now": "Что можно делать в GloWe уже сейчас",
        "Create a profile": "Создать профиль",
        "Share with the community": "Поделиться с сообществом",
        "Use the Wishing Well": "Использовать Колодец желаний",
        "Find ways to help": "Найти способы помочь",
        "Values that guide the space": "Ценности, которые направляют это пространство",
        "Solidarity": "Солидарность",
        "Shared Knowledge": "Общие знания",
        "Practical Action": "Практическое действие",
        "Trust and Respect": "Доверие и уважение",
        "The GloWe ecosystem": "Экосистема GloWe",
        "A glimpse into the community": "Взгляд на сообщество",
        "Read Community Posts": "Читать посты сообщества",
        "Who is invited?": "Кто приглашён?",
        "How GloWe is structured": "Как устроен GloWe",
        "User Roles": "Роли пользователей",
        "Business Model": "Бизнес-модель",
        "Development Roadmap": "Дорожная карта развития",
        "Trusted by the GloWe Community": "Нам доверяет сообщество GloWe",
        "You have a place in this community.": "В этом сообществе есть место и для вас.",
        "Bring what you know. Ask for what you need. Meet people who are working, learning, building, and caring around the SDGs.": "Принесите то, что вы знаете. Попросите то, что вам нужно. Встретьте людей, которые работают, учатся, строят и заботятся вокруг Целей устойчивого развития.",
        "Read Community": "Читать сообщество",
        "Open Community": "Открыть сообщество",
        "Read What's Next": "Читать «Что дальше»",
        "See How This Could Grow": "Посмотрите, как это может вырасти",
        "Active threads will appear here once community members start discussions.": "Активные обсуждения появятся здесь, когда участники сообщества их начнут.",
        "Activity": "Активность",
        "Add Project": "Добавить проект",
        "Advocacy": "Правозащита",
        "All areas": "Все направления",
        "All Fields": "Все сферы",
        "All Groups": "Все группы",
        "All Locations": "Все местоположения",
        "All regions": "Все регионы",
        "All types": "Все типы",
        "All Types": "Все типы",
        "All wishes": "Все желания",
        "Applications": "Заявки",
        "Apply for This Opportunity": "Откликнуться на эту возможность",
        "Apply Now": "Откликнуться",
        "Apply to opportunities or publish your own request for volunteers and collaborators.": "Откликайтесь на возможности или опубликуйте собственный запрос на волонтёров и партнёров.",
        "Apply with your availability and relevant skills.": "Откликнитесь, указав свою доступность и подходящие навыки.",
        "Approve": "Одобрить",
        "Approve profiles that are ready, or send them back for changes.": "Одобряйте готовые профили или отправляйте их на доработку.",
        "Arabic": "Арабский",
        "Articles / media": "Статьи / медиа",
        "As a member of the GloWe community, you agree not to:": "Как участник сообщества GloWe вы обязуетесь не:",
        "Ask a real question, lead a focused space, share a file, or learn from people working through similar challenges.": "Задайте настоящий вопрос, ведите тематическое пространство, поделитесь файлом или учитесь у людей, решающих похожие задачи.",
        "Ask question": "Задать вопрос",
        "Ask, advise, lead": "Спрашивайте, советуйте, ведите",
        "Attach file": "Прикрепить файл",
        "Back to Community": "Назад в сообщество",
        "Back to Feed": "Назад в ленту",
        "Back to Wishing Well": "Назад в Колодец желаний",
        "Backend not configured": "Бэкенд не настроен",
        "Based on GloWe content types": "На основе типов контента GloWe",
        "Better matching": "Более точное соответствие",
        "Both belong here. GloWe is built for mutual support, respectful collaboration, and the quiet relief of finding people who understand the journey.": "Здесь есть место и тому, и другому. GloWe создан для взаимной поддержки, уважительного сотрудничества и тихого облегчения от встречи с людьми, которые понимают этот путь.",
        "Browse opportunities, save what matters, contact members, and offer your professional skills, time, resources, or lived experience.": "Просматривайте возможности, сохраняйте важное, связывайтесь с участниками и предлагайте свои профессиональные навыки, время, ресурсы или личный опыт.",
        "Browse Organizations": "Просмотр организаций",
        "Build trust through profiles, community review, and clear next steps": "Стройте доверие через профили, проверку сообществом и понятные следующие шаги",
        "Business-Social Collaboration": "Бизнес-социальное сотрудничество",
        "Businesses / CSR teams": "Бизнес / команды CSR",
        "Businesses and partners": "Бизнес и партнёры",
        "By using the platform, you agree that:": "Используя платформу, вы соглашаетесь, что:",
        "Change": "Изменить",
        "Choose the right topic, add useful context, and publish it into the community feed.": "Выберите подходящую тему, добавьте полезный контекст и опубликуйте это в ленте сообщества.",
        "Civic Innovation": "Гражданские инновации",
        "Cleanup days worth repeating": "Дни уборки, которые стоит повторить",
        "Clear": "Очистить",
        "Clear filters": "Сбросить фильтры",
        "Climate": "Климат",
        "Close": "Закрыть",
        "Comment": "Комментарий",
        "comment": "комментарий",
        "comments": "комментарии",
        "Commitment:": "Вовлечённость:",
        "Community Activity": "Активность сообщества",
        "Community Building": "Развитие сообщества",
        "Community feed": "Лента сообщества",
        "Community Feed": "Лента сообщества",
        "Community feed filters": "Фильтры ленты сообщества",
        "Community first, technology second.": "Сначала сообщество, потом технологии.",
        "Community Forums": "Форумы сообщества",
        "Community home": "Главная сообщества",
        "Community integrity": "Целостность сообщества",
        "Community interactions": "Взаимодействия в сообществе",
        "Community managers": "Менеджеры сообщества",
        "Community members with active contributions will be featured here.": "Здесь будут показаны участники сообщества с активным вкладом.",
        "Community reinvestment": "Реинвестирование в сообщество",
        "Community reports": "Жалобы сообщества",
        "Community reports will appear here.": "Жалобы сообщества появятся здесь.",
        "Community review": "Проверка сообществом",
        "Community support board": "Доска поддержки сообщества",
        "Community wishes": "Желания сообщества",
        "Connect with social and environmental work through responsible collaboration, CSR, ESG, and shared value.": "Подключайтесь к социальной и экологической работе через ответственное сотрудничество, CSR, ESG и общую ценность.",
        "Connection suggestions": "Предложения связей",
        "connections": "связи",
        "Consultation request": "Запрос на консультацию",
        "Contact": "Контакт",
        "Content": "Контент",
        "Context": "Контекст",
        "Could not load queue": "Не удалось загрузить очередь",
        "Create a password": "Создайте пароль",
        "Create a password (min 8 characters)": "Создайте пароль (минимум 8 символов)",
        "Create Account": "Создать аккаунт",
        "Create Your Profile": "Создайте свой профиль",
        "Daily workspace": "Ежедневное рабочее пространство",
        "Describe your relevant skills and experience...": "Опишите свои подходящие навыки и опыт...",
        "Direct conversations with volunteers, organizations, and partners live here once you are signed in.": "Личные переписки с волонтёрами, организациями и партнёрами появятся здесь после входа.",
        "Direct conversations with volunteers, organizations, and partners.": "Личные переписки с волонтёрами, организациями и партнёрами.",
        "Direct messaging is coming soon": "Личные сообщения скоро появятся",
        "Discover organizations, initiatives, and partners sharing field knowledge and practical needs.": "Откройте для себя организации, инициативы и партнёров, которые делятся знаниями с мест и практическими запросами.",
        "Discover People": "Найти людей",
        "Discussion group": "Дискуссионная группа",
        "Discussion groups will appear here once they are set up.": "Дискуссионные группы появятся здесь после их создания.",
        "Discussion groups will appear here soon.": "Дискуссионные группы скоро появятся здесь.",
        "Discussion Groups": "Дискуссионные группы",
        "Dismiss": "Закрыть",
        "Distribution": "Распространение",
        "Diverse people speaking around a round table at an impact community conference": "Разные люди беседуют за круглым столом на конференции сообщества перемен",
        "Document what happened after someone helped: what changed, what was learned, and what support is still needed.": "Опишите, что произошло после того, как кто-то помог: что изменилось, чему научились и какая поддержка ещё нужна.",
        "Duration": "Длительность",
        "Duration:": "Длительность:",
        "Each community starts from its own reality: language, culture, needs, skills, and local leadership.": "Каждое сообщество начинается со своей реальности: языка, культуры, потребностей, навыков и местного лидерства.",
        "Each part of the system is here to help impact work become more visible, connected, and supported.": "Каждая часть системы существует, чтобы работа над переменами становилась заметнее, связаннее и получала больше поддержки.",
        "Edit profile": "Редактировать профиль",
        "Edit Profile": "Редактировать профиль",
        "Edit your profile, add projects, track opportunities, and manage your community activity in one place.": "Редактируйте профиль, добавляйте проекты, отслеживайте возможности и управляйте своей активностью в сообществе в одном месте.",
        "Education": "Образование",
        "Education, Climate, Health, Funding": "Образование, климат, здоровье, финансирование",
        "Education, climate, mentors, Jerusalem...": "Образование, климат, менторы, Иерусалим...",
        "Effective Date: May 30, 2026": "Дата вступления в силу: 30 мая 2026 г.",
        "Environment": "Экология",
        "Equipment / Space": "Оборудование / помещение",
        "Evenings": "Вечера",
        "Events": "Мероприятия",
        "Every connection can end with a short outcome update.": "Каждая связь может завершиться коротким отчётом о результате.",
        "Everyone": "Все",
        "Example: Grant proposal checklist for small NGOs": "Например: чек-лист заявки на грант для небольших НКО",
        "Explore Community": "Изучить сообщество",
        "Explore possible collaborations": "Изучите возможные сотрудничества",
        "Explore possible connections between needs, skills, organizations, and people. Each suggestion is an invitation to read, ask, and decide together.": "Изучайте возможные связи между запросами, навыками, организациями и людьми. Каждое предложение — это приглашение прочитать, спросить и решить вместе.",
        "Fetching organizations awaiting verification.": "Загружаем организации, ожидающие проверки.",
        "Field knowledge becomes easier to find, translate, discuss, and reuse across communities.": "Знания с мест становится легче находить, переводить, обсуждать и повторно использовать в разных сообществах.",
        "Field stories, questions, support offers, updates, and open calls": "Истории с мест, вопросы, предложения поддержки, обновления и открытые призывы",
        "Field update": "Обновление с места",
        "Field wisdom, professional tools, lived experience, and multilingual learning all have value here.": "Опыт с мест, профессиональные инструменты, личный опыт и многоязычное обучение — всё это здесь ценно.",
        "Field:": "Сфера:",
        "Filter by region, profile type, or keywords connected to mission, field, needs, and projects.": "Фильтруйте по региону, типу профиля или ключевым словам, связанным с миссией, сферой, запросами и проектами.",
        "Find a Group": "Найти группу",
        "Find My Path": "Найти мой путь",
        "Find or publish practical volunteer, work, and collaboration opportunities for social impact projects.": "Находите или публикуйте практические волонтёрские, рабочие и партнёрские возможности для проектов социальных перемен.",
        "Find people who understand your cause, help shape your next step, and make your work visible.": "Найдите людей, которые понимают ваше дело, помогут определить следующий шаг и сделают вашу работу заметной.",
        "Find projects, organizations, volunteers, experts, and practical needs": "Находите проекты, организации, волонтёров, экспертов и практические запросы",
        "Find the right people": "Найдите нужных людей",
        "Find the right request": "Найдите подходящий запрос",
        "Find where your skills can help.": "Найдите, где ваши навыки могут пригодиться.",
        "Flexible": "Гибкий график",
        "Follow the work, ask, offer, and connect.": "Следите за работой, спрашивайте, предлагайте и объединяйтесь.",
        "Follow updates": "Следить за обновлениями",
        "Follow Updates": "Следить за обновлениями",
        "Food Security": "Продовольственная безопасность",
        "For questions, support, or concerns, please reach out:": "По вопросам, за поддержкой или с замечаниями обращайтесь:",
        "For you": "Для вас",
        "Forum Leaders": "Ведущие форумов",
        "Forum leadership offer": "Предложение вести форум",
        "Full Name": "Полное имя",
        "Full-time": "Полная занятость",
        "Funding preparation": "Подготовка к финансированию",
        "Funding Support": "Поддержка в финансировании",
        "Global": "Глобальный",
        "GloWe - Global Collaboration for Social Impact": "GloWe — глобальное сотрудничество ради социальных перемен",
        "GloWe begins as a simple MVP: profiles, posts, wishes, opportunities, and conversations. From here, we want to grow carefully, with local communities, field knowledge, and technology that serves people.": "GloWe начинается как простой MVP: профили, посты, желания, возможности и разговоры. Дальше мы хотим расти бережно — вместе с местными сообществами, знаниями с мест и технологиями, которые служат людям.",
        "GloWe community promise": "Обещание сообщества GloWe",
        "GloWe community value system": "Система ценностей сообщества GloWe",
        "GloWe does not guarantee uninterrupted access or availability.": "GloWe не гарантирует бесперебойный доступ или доступность.",
        "GloWe is built for people who meet, listen, offer, ask, and turn local experience into practical collaboration.": "GloWe создан для людей, которые встречаются, слушают, предлагают, спрашивают и превращают местный опыт в практическое сотрудничество.",
        "GloWe is not liable for losses resulting from interruptions, errors, or misuse of the platform.": "GloWe не несёт ответственности за убытки, вызванные перебоями, ошибками или неправомерным использованием платформы.",
        "GloWe is open to all people and organizations, regardless of age, geography, identity, or legal status.": "GloWe открыт для всех людей и организаций независимо от возраста, географии, идентичности или правового статуса.",
        "GloWe may include links to external platforms or tools. We are not responsible for the content, privacy, or reliability of third-party services. Use them at your discretion.": "GloWe может содержать ссылки на внешние платформы или инструменты. Мы не несём ответственности за содержание, конфиденциальность или надёжность сторонних сервисов. Используйте их на своё усмотрение.",
        "GloWe may suspend or terminate accounts that violate these Terms or the Community Integrity Charter.": "GloWe может приостановить или закрыть аккаунты, нарушающие настоящие Условия или Устав целостности сообщества.",
        "GloWe Member": "Участник GloWe",
        "GloWe reserves the right to:": "GloWe оставляет за собой право:",
        "GloWe respects your privacy. Personal data will only be used to improve your experience and build relevant connections.": "GloWe уважает вашу приватность. Персональные данные используются только для улучшения вашего опыта и создания релевантных связей.",
        "GloWe will not sell or license your content to external commercial entities without explicit consent.": "GloWe не будет продавать или лицензировать ваш контент внешним коммерческим структурам без явного согласия.",
        "GloWe works through local roots, professional support, and global exchange.": "GloWe работает через местные корни, профессиональную поддержку и глобальный обмен.",
        "Good intentions become stronger when they are connected to clear needs, real people, and concrete next steps.": "Добрые намерения становятся сильнее, когда они связаны с ясными запросами, реальными людьми и конкретными следующими шагами.",
        "Grant match": "Подбор гранта",
        "Grey knowledge library": "Библиотека «серых» знаний",
        "Group Actions": "Действия группы",
        "Groups": "Группы",
        "Groups that want to document their work, find collaborators, and ask for concrete support.": "Группы, которые хотят документировать свою работу, находить партнёров и просить конкретную поддержку.",
        "Haifa": "Хайфа",
        "Health": "Здоровье",
        "Healthy moderation rules": "Здоровые правила модерации",
        "Help communities turn field experience into practical guides, short case studies, templates, and translated resources.": "Помогайте сообществам превращать опыт с мест в практические руководства, короткие кейсы, шаблоны и переведённые материалы.",
        "Help shape what comes next.": "Помогите определить, что будет дальше.",
        "Helpers explain what they can provide, availability, and conditions.": "Помогающие описывают, что они могут предоставить, свою доступность и условия.",
        "Hidden content": "Скрытый контент",
        "Hidden items": "Скрытые элементы",
        "Hide Item": "Скрыть элемент",
        "Hide Profile": "Скрыть профиль",
        "How success is understood": "Как понимается успех",
        "How the post will feel in the feed": "Как пост будет выглядеть в ленте",
        "I am a": "Я —",
        "I Can Help": "Я могу помочь",
        "If you are under the legal age of majority in your country, you are using GloWe under the guidance of a mentor, parent, or educational framework.": "Если вы не достигли совершеннолетия в своей стране, вы пользуетесь GloWe под руководством наставника, родителя или образовательного учреждения.",
        "If you witness misconduct, misinformation, or harm, report it. Use the Report button on profiles or reach out to us directly. All reports are reviewed with care and confidentiality.": "Если вы столкнулись с недопустимым поведением, дезинформацией или вредом — сообщите об этом. Используйте кнопку «Пожаловаться» в профилях или напишите нам напрямую. Все обращения рассматриваются внимательно и конфиденциально.",
        "Impact approach": "Подход к переменам",
        "Impact area": "Сфера влияния",
        "Impact areas": "Сферы влияния",
        "Impact Areas": "Сферы влияния",
        "Impact field": "Сфера влияния",
        "Impact follow-up": "Отслеживание результата",
        "Impact Signals": "Сигналы влияния",
        "Impact so far": "Результаты на данный момент",
        "Impact stories": "Истории перемен",
        "In cases of legal violations, authorities may be notified.": "В случае нарушений закона могут быть уведомлены компетентные органы.",
        "Interaction": "Взаимодействие",
        "Israel": "Израиль",
        "Items hidden by admin review can be restored while this MVP uses local storage.": "Элементы, скрытые администратором, можно восстановить, пока эта MVP-версия использует локальное хранилище.",
        "Items removed by admin will be listed here.": "Элементы, удалённые администратором, будут перечислены здесь.",
        "Jerusalem": "Иерусалим",
        "Join Group": "Вступить в группу",
        "Join requests": "Заявки на вступление",
        "Join the MVP": "Присоединиться к MVP",
        "Join the Volunteer Network and find places where your skills, experience, language, or care can make someone else's work lighter.": "Присоединяйтесь к Сети волонтёров и найдите места, где ваши навыки, опыт, язык или забота могут облегчить чью-то работу.",
        "Join with experience, questions, resources, or a willingness to help.": "Присоединяйтесь с опытом, вопросами, ресурсами или готовностью помочь.",
        "Keep the community safe and trustworthy.": "Сохраняйте сообщество безопасным и заслуживающим доверия.",
        "Knowledge": "Знания",
        "Knowledge Seekers": "Искатели знаний",
        "Knowledge Sharing": "Обмен знаниями",
        "Languages": "Языки",
        "Learn More": "Подробнее",
        "Like": "Нравится",
        "Limit access or features in cases of harm, spam, or manipulation.": "Ограничивать доступ или функции в случаях вреда, спама или манипуляций.",
        "Live needs": "Актуальные запросы",
        "Loading...": "Загрузка...",
        "Loading…": "Загрузка…",
        "Loading your profile…": "Загружаем ваш профиль…",
        "Uploading image...": "Загрузка изображения...",
        "Please choose an image file.": "Пожалуйста, выберите файл изображения.",
        "Image must be under 5 MB.": "Изображение должно быть меньше 5 МБ.",
        "Optional. JPG, PNG or WebP, up to 5 MB.": "Необязательно. JPG, PNG или WebP, до 5 МБ.",
        "Applicants": "Кандидаты",
        "Loading applicants…": "Загружаем кандидатов…",
        "Could not load applicants.": "Не удалось загрузить кандидатов.",
        "No applications yet.": "Заявок пока нет.",
        "Accept": "Принять",
        "Decline": "Отклонить",
        "Could not update the application. Please try again.": "Не удалось обновить заявку. Пожалуйста, попробуйте снова.",
        "Offers": "Предложения помощи",
        "Loading offers…": "Загружаем предложения…",
        "Could not load offers.": "Не удалось загрузить предложения.",
        "No offers yet.": "Предложений пока нет.",
        "Preferred contact:": "Предпочтительный способ связи:",
        "Email copied to clipboard": "Эл. почта скопирована в буфер обмена",
        "Could not copy the email.": "Не удалось скопировать адрес эл. почты.",
        "GloWe volunteer": "Волонтёр GloWe",
        "Availability:": "Доступность:",
        "Skills:": "Навыки:",
        "Motivation:": "Мотивация:",
        "Local community circles": "Местные круги сообщества",
        "Local organizations, initiatives, residents, volunteers, and partners bring the real context: what is needed, what already works, who should be involved, and what kind of support would actually help.": "Местные организации, инициативы, жители, волонтёры и партнёры привносят реальный контекст: что нужно, что уже работает, кого стоит вовлечь и какая поддержка действительно поможет.",
        "Local roots": "Местные корни",
        "Location": "Местоположение",
        "Location:": "Местоположение:",
        "Looking for Mentors": "Ищем менторов",
        "Low-bandwidth friendly": "Работает при слабом интернете",
        "Make it easier to connect a need with the right volunteer, professional skill, organization, donor, or partner.": "Упростить связь запроса с подходящим волонтёром, профессиональным навыком, организацией, донором или партнёром.",
        "Mark Reviewed": "Отметить как проверенное",
        "Measurement and learning": "Измерение и обучение",
        "Members": "Участники",
        "Members will appear here once they join this group.": "Участники появятся здесь, когда вступят в эту группу.",
        "Message": "Сообщение",
        "Message author": "Написать автору",
        "Message publisher": "Написать публикатору",
        "Message sent": "Сообщение отправлено",
        "Your message was delivered. The organization can follow up with you.": "Ваше сообщение доставлено. Организация сможет с вами связаться.",
        "Could not send message": "Не удалось отправить сообщение",
        "Something went wrong sending your message. Please try again.": "При отправке сообщения произошла ошибка. Пожалуйста, попробуйте снова.",
        "Reach Out": "Связаться",
        "Send Message": "Отправить сообщение",
        "Send a short message to start a conversation with this organization.": "Отправьте короткое сообщение, чтобы начать разговор с этой организацией.",
        "Introduce yourself and explain how you would like to collaborate.": "Представьтесь и объясните, как вы хотели бы сотрудничать.",
        "Sign in to reach out": "Войдите, чтобы связаться",
        "Please sign in or create a free account to message this organization.": "Пожалуйста, войдите или создайте бесплатный аккаунт, чтобы написать этой организации.",
        "Messaging needs a live connection right now. Please try again shortly.": "Для отправки сообщений сейчас нужно активное подключение. Пожалуйста, попробуйте снова через некоторое время.",
        "Missing details": "Не хватает данных",
        "Backend unavailable": "Сервис недоступен",
        "Messages": "Сообщения",
        "Methods / approaches": "Методы / подходы",
        "Moderate discussions in order to keep the space constructive, safe, and impact-driven.": "Модерируйте обсуждения, чтобы пространство оставалось конструктивным, безопасным и нацеленным на результат.",
        "Multilingual": "Многоязычный",
        "Needs": "Запросы",
        "Needs Changes": "Требуются изменения",
        "New post": "Новый пост",
        "New submitted profiles will appear here for review.": "Новые присланные профили появятся здесь для проверки.",
        "No applications yet": "Заявок пока нет",
        "No community posts yet.": "Постов сообщества пока нет.",
        "No hidden items": "Нет скрытых элементов",
        "No matching opportunities yet. This is where open roles and collaboration requests will appear.": "Подходящих возможностей пока нет. Здесь появятся открытые роли и запросы на сотрудничество.",
        "No matching profiles yet": "Подходящих профилей пока нет",
        "No opportunities found": "Возможности не найдены",
        "No pending organizations": "Нет организаций на рассмотрении",
        "No pending profiles": "Нет профилей на рассмотрении",
        "No posts match this view yet": "Пока нет постов, подходящих под этот вид",
        "No projects listed yet.": "Проекты пока не добавлены.",
        "No projects yet. Add your first project.": "Проектов пока нет. Добавьте свой первый проект.",
        "No replies yet. Be the first to respond.": "Ответов пока нет. Ответьте первым.",
        "None specified for this opportunity.": "Для этой возможности не указано.",
        "No reports yet": "Жалоб пока нет",
        "No results": "Нет результатов",
        "No saved items yet": "Сохранённых элементов пока нет",
        "No threads yet": "Обсуждений пока нет",
        "No wishes found": "Желания не найдены",
        "Notification Preferences": "Настройки уведомлений",
        "Offer skills, time, translation, mentoring, design, legal help, tech, research, or field knowledge.": "Предложите навыки, время, перевод, наставничество, дизайн, юридическую помощь, технологии, исследования или знания с мест.",
        "Offer Support": "Предложить поддержку",
        "Open": "Открыто",
        "Open a Question": "Задать вопрос",
        "Open Call": "Открытый призыв",
        "Open Forums": "Открыть форумы",
        "Open Needs": "Открытые запросы",
        "Open Playbook": "Открыть руководство",
        "Open reports": "Открытые жалобы",
        "Open Volunteer Network": "Открыть Сеть волонтёров",
        "Open wish details": "Открыть детали желания",
        "Open wishes": "Открытые желания",
        "open wishes are waiting for the right support.": "открытых желаний ждут нужной поддержки.",
        "Open wishes, opportunities, posts, and discussions around real work": "Открытые желания, возможности, посты и обсуждения вокруг реальной работы",
        "Opportunities & Applications": "Возможности и заявки",
        "Opportunities & collaboration": "Возможности и сотрудничество",
        "Opportunity title": "Название возможности",
        "Opportunity type": "Тип возможности",
        "Optional link": "Ссылка (необязательно)",
        "Organization filters": "Фильтры организаций",
        "Organization or project": "Организация или проект",
        "Organization Representative": "Представитель организации",
        "Organization review is available once the shared backend is connected.": "Проверка организаций станет доступна после подключения общего бэкенда.",
        "Organizations & Companies": "Организации и компании",
        "Organizations and NGOs": "Организации и НКО",
        "Organizations and partners are reviewed before sensitive actions.": "Организации и партнёры проходят проверку перед чувствительными действиями.",
        "Organizations awaiting verification. Approve serious requests; rejected ones stay view-only.": "Организации, ожидающие проверки. Одобряйте серьёзные заявки; отклонённые остаются в режиме просмотра.",
        "Organize possible grants and next steps": "Организуйте возможные гранты и следующие шаги",
        "Overview": "Обзор",
        "Paid Full-time Role": "Оплачиваемая роль с полной занятостью",
        "Part-time": "Частичная занятость",
        "Part-time Role": "Роль с частичной занятостью",
        "Participation signals": "Сигналы участия",
        "Partnership Opportunity": "Возможность партнёрства",
        "Password": "Пароль",
        "Pending organizations": "Организации на рассмотрении",
        "Pending profiles": "Профили на рассмотрении",
        "Pending verification": "Ожидает проверки",
        "People already acting in their communities and looking for allies, knowledge, or visibility.": "Люди, которые уже действуют в своих сообществах и ищут союзников, знания или видимость.",
        "People looking for practical examples, field lessons, and ways to learn from what already works.": "Люди, которые ищут практические примеры, уроки с мест и способы учиться у того, что уже работает.",
        "People who can offer time, translation, design, research, facilitation, mentoring, or professional skills.": "Люди, которые могут предложить время, перевод, дизайн, исследования, фасилитацию, наставничество или профессиональные навыки.",
        "Please refresh and try again.": "Обновите страницу и попробуйте снова.",
        "Possible next steps": "Возможные следующие шаги",
        "Post": "Опубликовать",
        "Post a clear need in the Wishing Well: volunteers, partners, knowledge, visibility, tools, space, or practical advice.": "Опубликуйте ясный запрос в Колодце желаний: волонтёры, партнёры, знания, видимость, инструменты, помещение или практический совет.",
        "Post a Need": "Опубликовать запрос",
        "Post a need. Find a helper. Build impact.": "Опубликуйте запрос. Найдите помощника. Создавайте перемены.",
        "Post false, misleading, discriminatory, hateful, or violent content.": "Публиковать ложный, вводящий в заблуждение, дискриминационный, разжигающий ненависть или жестокий контент.",
        "Post need": "Опубликовать запрос",
        "Post Opportunity": "Опубликовать возможность",
        "Post title": "Заголовок поста",
        "Post Topics": "Темы поста",
        "Post type": "Тип поста",
        "posts": "посты",
        "Posts": "Посты",
        "Posts you write in the community will appear here.": "Посты, которые вы напишете в сообществе, появятся здесь.",
        "Posts, profiles, wishes, and opportunities you want to return to later.": "Посты, профили, желания и возможности, к которым вы хотите вернуться позже.",
        "Practical guides and field lessons": "Практические руководства и уроки с мест",
        "Prepare a clearer post or campaign draft": "Подготовьте более ясный черновик поста или кампании",
        "Present your mission, projects, fields of action, SDGs, needs, and the kind of collaborations you are open to.": "Представьте свою миссию, проекты, направления работы, ЦУР, запросы и виды сотрудничества, к которым вы открыты.",
        "Pretend to be someone else.": "Выдавать себя за другого человека.",
        "Preview": "Предпросмотр",
        "Private conversations between volunteers, organizations, and partners are on the way. In the meantime, you can reach an organization from its profile.": "Личные переписки между волонтёрами, организациями и партнёрами скоро появятся. А пока вы можете связаться с организацией через её профиль.",
        "Professionals, mentors, facilitators, service providers, and experienced practitioners can offer advice, services, office hours, forum leadership, tools, and practical guidance.": "Специалисты, менторы, фасилитаторы, поставщики услуг и опытные практики могут предложить консультации, услуги, приёмные часы, ведение форумов, инструменты и практические рекомендации.",
        "Profile actions": "Действия с профилем",
        "Profile From Questionnaire": "Профиль из анкеты",
        "Profile not found": "Профиль не найден",
        "Profile snapshot": "Краткий обзор профиля",
        "Profile summary": "Сводка профиля",
        "Profiles": "Профили",
        "Profiles, posts, messages, and collaborations should support dignity, transparency, and responsible community care.": "Профили, посты, сообщения и сотрудничество должны поддерживать достоинство, прозрачность и ответственную заботу о сообществе.",
        "Project-based": "Проектная работа",
        "Project-based Collaboration": "Проектное сотрудничество",
        "Projects": "Проекты",
        "My Needs": "Мои запросы",
        "No needs yet. Share what would help on the Wishing Well.": "Запросов пока нет. Расскажите в Колодце желаний, что помогло бы.",
        "My Posts": "Мои посты",
        "No posts yet. Share an update with the community.": "Постов пока нет. Поделитесь обновлением с сообществом.",
        "My Opportunities": "Мои возможности",
        "No opportunities yet. Publish one on the Volunteer Network.": "Возможностей пока нет. Опубликуйте одну в Сети волонтёров.",
        "My Offers": "Мои предложения",
        "No offers yet. Help someone by responding to a wish.": "Предложений пока нет. Помогите кому-то, откликнувшись на желание.",
        "Browse Wishes": "Просмотр желаний",
        "Public links": "Публичные ссылки",
        "Publish a volunteer role": "Опубликовать волонтёрскую роль",
        "Publish an opportunity": "Опубликовать возможность",
        "Publish Opportunity": "Опубликовать возможность",
        "Publish Thread": "Опубликовать обсуждение",
        "Publish to Community Feed": "Опубликовать в ленте сообщества",
        "Publish to Feed": "Опубликовать в ленте",
        "Publish to Forum": "Опубликовать на форуме",
        "Question": "Вопрос",
        "Question title": "Заголовок вопроса",
        "Questions": "Вопросы",
        "Ramat Gan, Israel": "Рамат-Ган, Израиль",
        "Read posts, ask questions, respond with care, and meet others who are also building social and environmental change.": "Читайте посты, задавайте вопросы, отвечайте с заботой и знакомьтесь с теми, кто тоже создаёт социальные и экологические перемены.",
        "Ready to Make an Impact?": "Готовы менять мир к лучшему?",
        "Ready to offer your time, skills, mentoring, translation, design, legal help, or field knowledge? Enter the volunteer space and find the right role.": "Готовы предложить своё время, навыки, наставничество, перевод, дизайн, юридическую помощь или знания с мест? Войдите в волонтёрское пространство и найдите подходящую роль.",
        "Recent Activity": "Недавняя активность",
        "Recognition in GloWe is about visible contribution, not empty ranking. Signals stay tied to documented activity, trust, and community review.": "Признание в GloWe — это о заметном вкладе, а не о пустых рейтингах. Сигналы остаются привязанными к задокументированной активности, доверию и проверке сообществом.",
        "Recognize visible contribution": "Признавайте заметный вклад",
        "Refine": "Уточнить",
        "Region": "Регион",
        "Registration, article, drive folder, or resource link": "Регистрация, статья, папка на диске или ссылка на ресурс",
        "Reject": "Отклонить",
        "Relevant Skills & Experience": "Подходящие навыки и опыт",
        "Remote": "Удалённо",
        "Remote tutors and safety": "Удалённые репетиторы и безопасность",
        "Remove": "Удалить",
        "Remove content that violates these terms or values.": "Удалять контент, нарушающий эти условия или ценности.",
        "Reply": "Ответить",
        "Report": "Пожаловаться",
        "Reports from users who saw something inaccurate, harmful, or inappropriate.": "Обращения от пользователей, которые увидели что-то неточное, вредное или неуместное.",
        "Repost": "Поделиться",
        "Requirements": "Требования",
        "Resource / file": "Ресурс / файл",
        "Resource Request": "Запрос ресурса",
        "Responsibilities": "Обязанности",
        "Responsible tools": "Ответственные инструменты",
        "Restore": "Восстановить",
        "Review Impact": "Оценить результат",
        "Review new profile submissions, respond to reports, and hide content that does not fit the GloWe community standards.": "Проверяйте новые профили, реагируйте на жалобы и скрывайте контент, который не соответствует стандартам сообщества GloWe.",
        "Reviewers only": "Только для проверяющих",
        "Round tables, shared knowledge.": "Круглые столы, общие знания.",
        "Save": "Сохранить",
        "Save Draft": "Сохранить черновик",
        "Save opportunity": "Сохранить возможность",
        "Save Opportunity": "Сохранить возможность",
        "Delete post": "Удалить пост",
        "Delete": "Удалить",
        "Post deleted": "Пост удалён",
        "Your post was removed from the community feed.": "Ваш пост удалён из ленты сообщества.",
        "Could not delete": "Не удалось удалить",
        "Something went wrong deleting your post. Please try again.": "При удалении поста произошла ошибка. Пожалуйста, попробуйте снова.",
        "Copy link": "Копировать ссылку",
        "Link copied": "Ссылка скопирована",
        "The post link is on your clipboard — share it anywhere.": "Ссылка на пост в буфере обмена — делитесь ею где угодно.",
        "Copy this link": "Скопируйте эту ссылку",
        "Save post": "Сохранить пост",
        "Save posts, profiles, and opportunities to return to them from this screen.": "Сохраняйте посты, профили и возможности, чтобы возвращаться к ним с этого экрана.",
        "Save posts, profiles, wishes, and opportunities to return to them from here.": "Сохраняйте посты, профили, желания и возможности, чтобы возвращаться к ним отсюда.",
        "Save Profile": "Сохранить профиль",
        "Save the opportunity if you want to compare it later.": "Сохраните возможность, если хотите сравнить её позже.",
        "Save wish": "Сохранить желание",
        "Saved": "Сохранено",
        "Sign in or create a free account to save items to your area.": "Войдите или создайте бесплатный аккаунт, чтобы сохранять элементы в свой раздел.",
        "Saved items": "Сохранённые элементы",
        "Saved Items": "Сохранённые элементы",
        "Scope": "Объём",
        "SDG focus areas": "Приоритетные ЦУР",
        "Search": "Поиск",
        "Search by city or region": "Поиск по городу или региону",
        "Search keywords": "Поиск по ключевым словам",
        "Search opportunities...": "Поиск возможностей...",
        "Search organizations, companies, and initiatives": "Поиск организаций, компаний и инициатив",
        "Search posts, topics, people, or needs...": "Поиск постов, тем, людей или запросов...",
        "Search volunteer roles...": "Поиск волонтёрских ролей...",
        "See how members participate": "Посмотрите, как участвуют участники",
        "See where help is needed": "Посмотрите, где нужна помощь",
        "Select your availability": "Выберите свою доступность",
        "Select your role": "Выберите свою роль",
        "Send": "Отправить",
        "Share": "Поделиться",
        "Share a volunteer role, paid role, mentorship request, or project-based collaboration with the GloWe community.": "Поделитесь волонтёрской ролью, оплачиваемой позицией, запросом на наставничество или проектным сотрудничеством с сообществом GloWe.",
        "Share applied field knowledge in a format others can understand and use": "Делитесь прикладными знаниями с мест в формате, понятном и полезном для других",
        "Share enough context so others can give useful, respectful advice.": "Дайте достаточно контекста, чтобы другие могли дать полезный и уважительный совет.",
        "Share private or sensitive information without consent.": "Делиться личной или конфиденциальной информацией без согласия.",
        "Share your motivation for applying...": "Расскажите о своей мотивации...",
        "Shared knowledge": "Общие знания",
        "Shared learning": "Совместное обучение",
        "Sharing tools": "Инструменты обмена",
        "Short description": "Краткое описание",
        "Show your mission, projects, needs, opportunities, and the impact areas you work in.": "Покажите свою миссию, проекты, запросы, возможности и сферы, в которых вы работаете.",
        "Sign in to see your messages": "Войдите, чтобы увидеть свои сообщения",
        "Skills Needed": "Необходимые навыки",
        "Skills or tags": "Навыки или теги",
        "Social Activists": "Общественные активисты",
        "Social initiatives": "Социальные инициативы",
        "Social Justice": "Социальная справедливость",
        "Social links": "Ссылки на соцсети",
        "Sometimes you give. Sometimes you need help.": "Иногда вы даёте. Иногда вам нужна помощь.",
        "Spam the platform or use it for purely promotional or exploitative purposes.": "Спамить на платформе или использовать её исключительно в рекламных или эксплуататорских целях.",
        "Start a practical consultation": "Начните практическую консультацию",
        "Start a thread": "Начать обсуждение",
        "Start Conversation": "Начать разговор",
        "Start the first conversation in this group.": "Начните первый разговор в этой группе.",
        "Start from one useful action": "Начните с одного полезного действия",
        "Start with one useful post, one profile, one wish, or one opportunity.": "Начните с одного полезного поста, одного профиля, одного желания или одной возможности.",
        "Structured offers": "Структурированные предложения",
        "Submit Application": "Отправить заявку",
        "Support groups around a city, village, school, organization, or SDG topic. Each circle can gather needs, resources, events, and trusted members.": "Группы поддержки вокруг города, села, школы, организации или темы ЦУР. Каждый круг может собирать запросы, ресурсы, мероприятия и надёжных участников.",
        "Support multilingual access so knowledge is not limited to English-speaking spaces": "Поддерживайте многоязычный доступ, чтобы знания не ограничивались англоязычными пространствами",
        "Suspend or block users who repeatedly abuse the platform.": "Приостанавливать или блокировать пользователей, которые систематически злоупотребляют платформой.",
        "Tags": "Теги",
        "Tech for Good": "Технологии во благо",
        "Technology": "Технологии",
        "Technology for good": "Технологии во благо",
        "Technology should reduce friction, not create distance. It should help people act with more clarity, trust, and care.": "Технологии должны снижать трение, а не создавать дистанцию. Они должны помогать людям действовать яснее, с большим доверием и заботой.",
        "Tel Aviv": "Тель-Авив",
        "Terms of Use - GloWe": "Условия использования — GloWe",
        "Terms of Use & Community Integrity Charter": "Условия использования и Устав целостности сообщества",
        "The information you provide is accurate and honest.": "Информация, которую вы предоставляете, точна и честна.",
        "The MVP is here so we can learn with you: what helps, what is missing, and what should be built with care.": "MVP существует, чтобы мы могли учиться вместе с вами: что помогает, чего не хватает и что стоит строить бережно.",
        "The next versions of GloWe should support local circles: people who meet around a real place, a real need, and a shared SDG challenge. Each local community can gather stories, tools, resources, and lessons that others may adapt.": "Следующие версии GloWe будут поддерживать местные круги: людей, которые собираются вокруг реального места, реального запроса и общей задачи ЦУР. Каждое местное сообщество может собирать истории, инструменты, ресурсы и уроки, которые другие смогут адаптировать.",
        "The organization receives your message and can continue in GloWe messages.": "Организация получает ваше сообщение и может продолжить общение в сообщениях GloWe.",
        "The topic tag will appear next to your name in the feed, and the post is saved into the community stream.": "Тег темы появится рядом с вашим именем в ленте, а пост сохранится в потоке сообщества.",
        "The Wishing Well is the action layer of GloWe: verified requests, relevant helpers, and clear next steps after someone offers support.": "Колодец желаний — это слой действия в GloWe: проверенные запросы, подходящие помощники и понятные следующие шаги после того, как кто-то предложил поддержку.",
        "These are directions, not promises. We will build them gradually, with community feedback.": "Это направления, а не обещания. Мы будем строить их постепенно, с учётом отзывов сообщества.",
        "These Terms of Use & Community Integrity Charter may be updated occasionally. We will notify users of significant changes via email or platform notifications. Continued use signifies your agreement to the latest version.": "Настоящие Условия использования и Устав целостности сообщества могут время от времени обновляться. Мы уведомим пользователей о существенных изменениях по электронной почте или через уведомления платформы. Продолжение использования означает ваше согласие с последней версией.",
        "This includes use in personalization, recommendation systems, and platform features built to enhance the GloWe user experience only.": "Это включает использование в персонализации, рекомендательных системах и функциях платформы, созданных исключительно для улучшения пользовательского опыта GloWe.",
        "This is not a marketplace. It is a shared space. Ask for help. Offer help. Celebrate others' work. Seek connection, not extraction.": "Это не маркетплейс. Это общее пространство. Просите помощи. Предлагайте помощь. Отмечайте работу других. Ищите связь, а не выгоду.",
        "This profile is not available yet, or the link points to an older demo profile.": "Этот профиль пока недоступен, или ссылка ведёт на старый демонстрационный профиль.",
        "This queue is visible to GloWe reviewers. Ask an administrator for access.": "Эта очередь видна проверяющим GloWe. Запросите доступ у администратора.",
        "Threads": "Обсуждения",
        "Title": "Заголовок",
        "To the fullest extent permitted by law:": "В максимальной степени, разрешённой законом:",
        "Tone, humor, and expression vary across regions. Be mindful. Use inclusive language. If you are unsure, ask.": "Тон, юмор и способы выражения различаются в разных регионах. Будьте внимательны. Используйте инклюзивный язык. Если сомневаетесь — спросите.",
        "Topic": "Тема",
        "Topic group": "Тематическая группа",
        "Topic Groups": "Тематические группы",
        "Treat every member with dignity. Do not post or endorse any form of discrimination, harassment, or exclusion. Listen to diverse voices and experiences.": "Относитесь к каждому участнику с достоинством. Не публикуйте и не поддерживайте любые формы дискриминации, преследования или исключения. Прислушивайтесь к разным голосам и опыту.",
        "Trending Discussions": "Популярные обсуждения",
        "Trust & status": "Доверие и статус",
        "Try a broader keyword, clear one filter, or search by impact area, location, or support need.": "Попробуйте более широкое ключевое слово, снимите один фильтр или ищите по сфере влияния, местоположению или типу нужной поддержки.",
        "Try a different tab, search a broader word, or start the next conversation.": "Попробуйте другую вкладку, поищите по более общему слову или начните следующий разговор.",
        "Try adjusting your filters or search terms.": "Попробуйте изменить фильтры или поисковый запрос.",
        "Try clearing one of the filters.": "Попробуйте снять один из фильтров.",
        "Try Flow": "Попробовать сценарий",
        "Turn a real need into a clear call for support: volunteers, partners, knowledge, visibility, space, tools, or funding support.": "Превратите реальный запрос в ясный призыв к поддержке: волонтёры, партнёры, знания, видимость, помещение, инструменты или помощь с финансированием.",
        "Type": "Тип",
        "Updated today": "Обновлено сегодня",
        "Upload copyrighted or third-party content without permission.": "Загружать защищённый авторским правом или чужой контент без разрешения.",
        "Use digital tools to make knowledge more accessible, reduce language barriers, and support ethical collaboration.": "Используйте цифровые инструменты, чтобы сделать знания доступнее, снизить языковые барьеры и поддержать этичное сотрудничество.",
        "Use example grant cards and a funding-brief flow to turn a real need into a clearer request, budget story, and next step.": "Используйте примеры грантовых карточек и сценарий подготовки заявки, чтобы превратить реальный запрос в более ясную просьбу, бюджетную историю и следующий шаг.",
        "Use the forums for focused questions, peer advice, templates, field lessons, and professional guidance. Professionals can also lead topic spaces and offer office hours.": "Используйте форумы для конкретных вопросов, советов коллег, шаблонов, уроков с мест и профессиональных рекомендаций. Специалисты также могут вести тематические пространства и проводить приёмные часы.",
        "Usually replies within 3-5 days": "Обычно отвечает в течение 3–5 дней",
        "Verified organizations will publish freely; new submissions show up here.": "Проверенные организации публикуют свободно; новые заявки появляются здесь.",
        "Verified profiles": "Проверенные профили",
        "View Details": "Подробнее",
        "View Personal Area": "Открыть личный кабинет",
        "View Profile": "Открыть профиль",
        "Visibility / Media": "Видимость / медиа",
        "Volunteer": "Волонтёрство",
        "Volunteer / Mentor": "Волонтёр / ментор",
        "Volunteer Opportunities": "Волонтёрские возможности",
        "Volunteer Opportunity": "Волонтёрская возможность",
        "Volunteers": "Волонтёры",
        "volunteers joined new projects this week.": "волонтёров присоединились к новым проектам на этой неделе.",
        "Volunteers and professionals": "Волонтёры и специалисты",
        "Volunteers Needed": "Нужны волонтёры",
        "We are not just a platform. We are a community built on trust and shared purpose. By joining GloWe, you commit to these core values:": "Мы не просто платформа. Мы сообщество, построенное на доверии и общей цели. Присоединяясь к GloWe, вы принимаете эти основные ценности:",
        "We are not responsible for actions or content posted by users.": "Мы не несём ответственности за действия или контент, публикуемые пользователями.",
        "We are starting with a focused community space. Next, we want to grow local community circles, a practical knowledge library, and technology that helps people use knowledge for good.": "Мы начинаем с сфокусированного пространства сообщества. Дальше мы хотим вырастить местные круги сообщества, библиотеку практических знаний и технологии, которые помогают людям использовать знания во благо.",
        "We believe impact grows when people stand with each other, listen deeply, and act with care.": "Мы верим, что перемены растут, когда люди стоят рядом друг с другом, глубоко слушают и действуют с заботой.",
        "We do not look down or preach. We stand next to each other, listen, learn, and act together. Sometimes you give; sometimes you need help. Both are part of a healthy community.": "Мы не смотрим свысока и не поучаем. Мы стоим рядом друг с другом, слушаем, учимся и действуем вместе. Иногда вы даёте; иногда вам нужна помощь. И то, и другое — часть здорового сообщества.",
        "We do not sell, rent, or trade your data to advertisers.": "Мы не продаём, не сдаём в аренду и не передаём ваши данные рекламодателям.",
        "We do not want technology to replace relationships. We want it to help people find each other, document what they already know, and turn care into practical action.": "Мы не хотим, чтобы технологии заменяли отношения. Мы хотим, чтобы они помогали людям находить друг друга, фиксировать то, что они уже знают, и превращать заботу в практическое действие.",
        "We reserve the right to moderate, remove, or report inappropriate content.": "Мы оставляем за собой право модерировать, удалять или сообщать о неуместном контенте.",
        "Weekdays": "Будни",
        "Weekends": "Выходные",
        "Welcome,": "Добро пожаловать,",
        "What comes after the MVP?": "Что будет после MVP?",
        "What do you need help thinking through?": "В чём вам нужна помощь, чтобы всё обдумать?",
        "What do you want to share, ask, or offer today?": "Чем вы хотите поделиться, о чём спросить или что предложить сегодня?",
        "What GloWe makes possible": "Что делает возможным GloWe",
        "What happens next": "Что происходит дальше",
        "What is open now": "Что открыто сейчас",
        "What we are learning": "Чему мы учимся",
        "What we believe": "Во что мы верим",
        "What we want to build next": "Что мы хотим построить дальше",
        "When GloWe grows, one-third of future revenues will return to local communities.": "Когда GloWe вырастет, треть будущих доходов вернётся местным сообществам.",
        "When you publish content, such as text, images, links, or project descriptions, on GloWe:": "Когда вы публикуете контент в GloWe — текст, изображения, ссылки или описания проектов:",
        "Who is this for?": "Для кого это?",
        "Who We Serve": "Кому мы служим",
        "Why do you want to volunteer?": "Почему вы хотите стать волонтёром?",
        "Why GloWe exists": "Зачем существует GloWe",
        "Wish filters": "Фильтры желаний",
        "Wish Type": "Тип желания",
        "Write a Community Post": "Написать пост сообщества",
        "Write a reply": "Написать ответ",
        "Write Post": "Написать пост",
        "Write posts, ask questions, share field knowledge, publish updates, and join topic-based discussions.": "Пишите посты, задавайте вопросы, делитесь знаниями с мест, публикуйте обновления и присоединяйтесь к тематическим обсуждениям.",
        "Write the story, request, guide, event details, or question you want the community to see.": "Напишите историю, запрос, руководство, детали мероприятия или вопрос, который вы хотите показать сообществу.",
        "Write to the community": "Написать сообществу",
        "You are acting in good faith and with respect for others.": "Вы действуете добросовестно и с уважением к другим.",
        "You are not alone here": "Здесь вы не одни",
        "You are part of a community where people can ask, offer, learn, and keep going together.": "Вы часть сообщества, где люди могут просить, предлагать, учиться и двигаться дальше вместе.",
        "You confirm that you have the legal right to publish what you upload and assume full responsibility for it.": "Вы подтверждаете, что имеете законное право публиковать загружаемые материалы и несёте за них полную ответственность.",
        "You grant GloWe a non-exclusive, royalty-free, worldwide, perpetual license to host, translate, display, analyze, and distribute your content within the platform.": "Вы предоставляете GloWe неисключительную, безвозмездную, всемирную, бессрочную лицензию на размещение, перевод, отображение, анализ и распространение вашего контента в рамках платформы.",
        "You may close your account at any time.": "Вы можете закрыть свой аккаунт в любое время.",
        "You may request deletion of your account or data at any time.": "Вы можете запросить удаление аккаунта или данных в любое время.",
        "You retain full ownership of your intellectual property.": "Вы сохраняете полное право собственности на свою интеллектуальную собственность.",
        "You've got something the world needs.": "У вас есть то, что нужно миру.",
        "You're already part of GloWe.": "Вы уже часть GloWe.",
        "Explore the community, share what you know, or pick up where you left off.": "Изучайте сообщество, делитесь тем, что знаете, или продолжите с того места, где остановились.",
        "Your Availability": "Ваша доступность",
        "Your Community Home": "Ваша главная сообщества",
        "Your full name": "Ваше полное имя",
        "Your password": "Ваш пароль",
        "About - GloWe": "О нас — GloWe",
        "About GloWe": "О GloWe",
        "About the Organization": "Об организации",
        "About This Opportunity": "Об этой возможности",
        "Across countries, languages, and fields, members can learn from each other, translate field wisdom, adapt proven solutions, and connect local action to global SDG challenges.": "Через страны, языки и сферы участники могут учиться друг у друга, переводить опыт с мест, адаптировать проверенные решения и связывать местные действия с глобальными задачами ЦУР.",
        "Act honestly. Share real experiences. Credit others' work where due. Information shared on GloWe should be accurate, current, and shared with intention.": "Действуйте честно. Делитесь реальным опытом. Указывайте авторство работ других, где это уместно. Информация в GloWe должна быть точной, актуальной и опубликованной осознанно.",
        "Active Members": "Активные участники",
        "Active projects": "Активные проекты",
        "Active Threads": "Активные обсуждения",
        "Admin review": "Проверка администратором",
        "Admin Review - GloWe": "Администрирование — GloWe",
        "A digital-human space for shared knowledge, practical connection, and gradual community growth.": "Цифровое человеческое пространство для общих знаний, практических связей и постепенного роста сообщества.",
        "A living feed for field updates, practical questions, needs, resources, and people building impact together.": "Живая лента обновлений с мест, практических вопросов, запросов, ресурсов и людей, которые вместе создают перемены.",
        "A practical space for volunteers, mentors, professionals, and organizations to meet around real needs, clear roles, and shared impact.": "Практическое пространство, где волонтёры, менторы, специалисты и организации встречаются вокруг реальных запросов, ясных ролей и общего результата.",
        "A full Privacy Policy will be published separately.": "Полная политика конфиденциальности будет опубликована отдельно.",
        "Community - GloWe": "Сообщество — GloWe",
        "Discussion Group - GloWe": "Дискуссионная группа — GloWe",
        "Forums - GloWe": "Форумы — GloWe",
        "Messages - GloWe": "Сообщения — GloWe",
        "Opportunity Details - GloWe": "Детали возможности — GloWe",
        "Organizations - GloWe": "Организации — GloWe",
        "Personal Area - GloWe": "Личный кабинет — GloWe",
        "Profile - GloWe": "Профиль — GloWe",
        "Saved - GloWe": "Сохранённое — GloWe",
        "Settings - GloWe": "Настройки — GloWe",
        "Volunteer Network - GloWe": "Сеть волонтёров — GloWe",
        "Volunteer Opportunities - GloWe": "Волонтёрские возможности — GloWe",
        "What's Next - GloWe": "Что дальше — GloWe",
        "Wishing Well - GloWe": "Колодец желаний — GloWe",
        "Write Post - GloWe": "Написать пост — GloWe",
        "1. About GloWe": "1. О GloWe",
        "2. Who Can Use GloWe": "2. Кто может пользоваться GloWe",
        "3. Acceptable Use & Responsibilities": "3. Допустимое использование и обязанности",
        "4. Content Rights & Licensing": "4. Права на контент и лицензирование",
        "5. Privacy & Data": "5. Конфиденциальность и данные",
        "6. Community Integrity Charter": "6. Устав целостности сообщества",
        "6.1 Transparency": "6.1 Прозрачность",
        "6.2 Respect & Inclusion": "6.2 Уважение и инклюзивность",
        "6.3 Collaboration Over Competition": "6.3 Сотрудничество важнее конкуренции",
        "6.4 Cultural Sensitivity": "6.4 Культурная чуткость",
        "6.5 Community Responsibility": "6.5 Ответственность сообщества",
        "7. Moderation & Enforcement": "7. Модерация и применение правил",
        "8. External Links & Third-Party Services": "8. Внешние ссылки и сторонние сервисы",
        "9. Termination": "9. Прекращение использования",
        "10. Liability Disclaimer": "10. Ограничение ответственности",
        "11. Updates to Terms": "11. Обновления условий",
        "12. Contact Us": "12. Свяжитесь с нами",
        "2026 GloWe. Built for shared knowledge, mutual support, and action that lasts.": "2026 GloWe. Создано для общих знаний, взаимной поддержки и действий, которые остаются.",
        "Local communities already hold practical knowledge about education, health, climate, food, rights, resilience, and care. Too often, that knowledge stays locked inside one place, one language, one report, or one organization. GloWe is being built to help field-based knowledge travel: clearly, respectfully, and in ways other people can adapt.": "Местные сообщества уже обладают практическими знаниями об образовании, здоровье, климате, продовольствии, правах, устойчивости и заботе. Слишком часто эти знания остаются запертыми в одном месте, одном языке, одном отчёте или одной организации. GloWe создаётся, чтобы помочь знаниям с мест путешествовать: понятно, уважительно и так, чтобы другие могли их адаптировать.",
        "Sign in with your Google account to get started. You can complete your profile after signing in.": "Войдите через аккаунт Google, чтобы начать. Профиль можно заполнить после входа.",
        "Share a Wish": "Поделиться желанием",
        "A good wish is specific enough for the right helper to say yes.": "Хорошее желание достаточно конкретно, чтобы нужный помощник сказал «да».",
        "What do you need?": "Что вам нужно?",
        "Wish type": "Тип желания",
        "Select a type": "Выберите тип",
        "Urgency": "Срочность",
        "Choose urgency": "Выберите срочность",
        "This week": "На этой неделе",
        "This month": "В этом месяце",
        "Flexible timeline": "Гибкие сроки",
        "What would success look like?": "Как будет выглядеть успех?",
        "Publish Wish": "Опубликовать желание",
        "Send a clear, trusted offer so the organization can decide quickly.": "Отправьте ясное и надёжное предложение, чтобы организация могла быстро принять решение.",
        "What can you offer?": "Что вы можете предложить?",
        "Choose support type": "Выберите тип поддержки",
        "Professional volunteering": "Профессиональное волонтёрство",
        "Funding or grant help": "Помощь с финансированием или грантами",
        "Space or equipment": "Помещение или оборудование",
        "Business partnership": "Бизнес-партнёрство",
        "Media or distribution": "Медиа или распространение",
        "Availability": "Доступность",
        "Choose availability": "Выберите доступность",
        "Within 2 weeks": "В течение 2 недель",
        "Send Offer": "Отправить предложение",
        "Update the public information that helps others understand who you are and how to collaborate.": "Обновите публичную информацию, которая помогает другим понять, кто вы и как с вами сотрудничать.",
        "Display name": "Отображаемое имя",
        "Profile type": "Тип профиля",
        "Country / region": "Страна / регион",
        "Website / public link": "Сайт / публичная ссылка",
        "Interest areas": "Сферы интересов",
        "SDGs": "ЦУР",
        "Short public line": "Короткая публичная строка",
        "Mission / story": "Миссия / история",
        "Values and goals": "Ценности и цели",
        "Community / audience": "Сообщество / аудитория",
        "Problem addressed": "Решаемая проблема",
        "Solution / method": "Решение / метод",
        "Geographic activity": "География деятельности",
        "Open actions / looking for": "Открытые запросы / что ищете",
        "Articles / videos / reports": "Статьи / видео / отчёты",
        "Profile image": "Изображение профиля",
        "Optional. When Cloudinary keys are configured, this uploads to Cloudinary.": "Необязательно. Когда ключи Cloudinary настроены, файл загружается в Cloudinary.",
        "Save Profile Draft": "Сохранить черновик профиля",
        "Welcome to GloWe 👋": "Добро пожаловать в GloWe 👋",
        "Tell us a little about you so the community knows who they're collaborating with. It only takes a minute.": "Расскажите немного о себе, чтобы сообщество знало, с кем сотрудничает. Это займёт всего минуту.",
        "Your name": "Ваше имя",
        "A short line about you": "Короткая строка о вас",
        "I'm joining as": "Я присоединяюсь как",
        "Private individual": "Частное лицо",
        "Volunteer, donor, or community member. Full access right away.": "Волонтёр, донор или участник сообщества. Полный доступ сразу.",
        "Organization": "Организация",
        "NGO, nonprofit, or initiative. Reviewed before you can publish — only serious applications are accepted.": "НКО, некоммерческая организация или инициатива. Проверяется до получения права публиковать — принимаются только серьёзные заявки.",
        "Organizations are reviewed by the GloWe team. Until you're approved you can browse everything, but posting opportunities, events, and needs stays locked. Please give us enough to take your application seriously.": "Организации проверяются командой GloWe. До одобрения вы можете просматривать всё, но публикация возможностей, мероприятий и запросов остаётся заблокированной. Пожалуйста, предоставьте достаточно информации, чтобы мы могли отнестись к вашей заявке серьёзно.",
        "Organization name *": "Название организации *",
        "Registration / NGO number": "Регистрационный номер / номер НКО",
        "Country of operation": "Страна деятельности",
        "Cause / field": "Направление / сфера",
        "Organization size": "Размер организации",
        "About the organization *": "Об организации *",
        "Contact person *": "Контактное лицо *",
        "Contact email *": "Контактная эл. почта *",
        "Contact phone": "Контактный телефон",
        "Save and continue": "Сохранить и продолжить",
        "Maybe later": "Может быть, позже",
        "Add project": "Добавить проект",
        "Add a project that can appear in your personal area and help others understand what you are building.": "Добавьте проект, который появится в вашем личном кабинете и поможет другим понять, что вы создаёте.",
        "Project title": "Название проекта",
        "Status": "Статус",
        "Draft": "Черновик",
        "Active": "Активный",
        "Recruiting partners": "Набор партнёров",
        "Needs volunteers": "Нужны волонтёры",
        "Ready to share": "Готово к публикации",
        "Description": "Описание",
        "Save Project": "Сохранить проект",
        "Edit": "Редактировать",
        "Edit project": "Редактировать проект",
        "Update Project": "Обновить проект",
        "Project updated": "Проект обновлён",
        "Your project changes were saved.": "Изменения в проекте сохранены.",
        "Project added": "Проект добавлен",
        "The project now appears in your personal area.": "Проект теперь отображается в вашем личном кабинете.",
        "No event registrations yet": "Регистраций на мероприятия пока нет",
        "Register for an event from the Volunteer Network and track it here.": "Зарегистрируйтесь на мероприятие в Сети волонтёров и следите за ним здесь.",
        "Browse events": "Просмотр мероприятий",
        "Event cancelled": "Мероприятие отменено",
        "Registered": "Зарегистрирован",
        "Pending approval": "Ожидает одобрения",
        "Waitlisted": "В списке ожидания",
        "Not accepted": "Не принято",
        "Cancelled": "Отменено",
        "Report a concern": "Сообщить о проблеме",
        "We review every report carefully and confidentially to keep GloWe safe and professional.": "Мы рассматриваем каждое обращение внимательно и конфиденциально, чтобы GloWe оставался безопасным и профессиональным.",
        "Reporting": "Жалоба",
        "General concern": "Общая проблема",
        "What should we look at?": "На что нам стоит обратить внимание?",
        "Choose a reason": "Выберите причину",
        "Inaccurate information": "Неточная информация",
        "Disrespectful or discriminatory content": "Неуважительный или дискриминационный контент",
        "Misleading promotion": "Вводящее в заблуждение продвижение",
        "Human rights concern": "Нарушение прав человека",
        "Other": "Другое",
        "Details": "Подробности",
        "Submit Report": "Отправить жалобу",
        "Choose a rhythm that keeps GloWe useful without creating digital fatigue.": "Выберите ритм, при котором GloWe остаётся полезным и не создаёт цифровой усталости.",
        "Opportunity of the week": "Возможность недели",
        "High-match connection proposals": "Предложения связей с высоким соответствием",
        "Deadline reminders": "Напоминания о сроках",
        "Crisis-response playbooks for my region": "Руководства по реагированию на кризисы для моего региона",
        "Preferred cadence": "Предпочтительная частота",
        "Weekly digest": "Еженедельный дайджест",
        "Only urgent actions": "Только срочные действия",
        "Daily 5-minute brief": "Ежедневная 5-минутная сводка",
        "Save Preferences": "Сохранить настройки",
        "Mentors, space, visibility...": "Менторы, помещение, видимость...",
        "City, region, remote, or hybrid": "Город, регион, удалённо или гибридно",
        "Tell the community what would help.": "Расскажите сообществу, что помогло бы.",
        "Example: 3 mentors matched, one grant draft completed, 50 families reached...": "Например: подобраны 3 ментора, готов один черновик заявки на грант, охвачено 50 семей...",
        "Briefly explain your relevant experience, what you can offer, and what you need to know next.": "Кратко опишите свой подходящий опыт, что вы можете предложить и что вам нужно узнать дальше.",
        "Organization or person name": "Название организации или имя человека",
        "NGO, business, volunteer, initiative...": "НКО, бизнес, волонтёр, инициатива...",
        "Education, health, climate...": "Образование, здоровье, климат...",
        "Quality Education, Climate Action...": "Качественное образование, борьба с изменением климата...",
        "One clear sentence people can understand quickly": "Одно ясное предложение, которое люди быстро поймут",
        "Mission, current work, or what you offer.": "Миссия, текущая работа или то, что вы предлагаете.",
        "Values, goals, leadership, or principles": "Ценности, цели, лидерство или принципы",
        "Who do you serve, support, work with, or hope to reach?": "Кому вы служите, кого поддерживаете, с кем работаете или к кому хотите обратиться?",
        "What problem or need are you working on?": "Над какой проблемой или потребностью вы работаете?",
        "What do you do in practice?": "Что вы делаете на практике?",
        "Advocacy, education, field work, research...": "Правозащита, образование, работа в поле, исследования...",
        "Local / regional / global / remote": "Местный / региональный / глобальный / удалённый",
        "Partners, volunteers, funding, knowledge, visibility...": "Партнёры, волонтёры, финансирование, знания, видимость...",
        "Useful public links": "Полезные публичные ссылки",
        "Full name": "Полное имя",
        "One sentence people grasp quickly": "Одно предложение, которое люди быстро схватывают",
        "Registered / public name": "Зарегистрированное / публичное название",
        "Legal registration number": "Юридический регистрационный номер",
        "Where you operate": "Где вы работаете",
        "Volunteers / staff, approx.": "Волонтёры / сотрудники, примерно",
        "Mission, who you serve, and what you'd do on GloWe.": "Миссия, кому вы служите и что вы будете делать в GloWe.",
        "Who we should talk to": "С кем нам стоит поговорить",
        "Optional": "Необязательно",
        "Community resource map": "Карта ресурсов сообщества",
        "What is the project, who does it support, and what kind of help would move it forward?": "Что это за проект, кого он поддерживает и какая помощь продвинет его вперёд?",
        "Add context that can help our review.": "Добавьте контекст, который поможет нашей проверке.",
        "Switch to English": "Переключиться на английский",
        "This page outlines the terms, responsibilities, and community standards that guide your use of the GloWe platform. By accessing or interacting with this site, you agree to abide by the Terms of Use and our Community Integrity Charter. GloWe is committed to building a safe, inclusive, and impact-driven space.": "На этой странице изложены условия, обязанности и стандарты сообщества, которые определяют ваше использование платформы GloWe. Заходя на этот сайт или взаимодействуя с ним, вы соглашаетесь соблюдать Условия использования и наш Устав целостности сообщества. GloWe стремится создавать безопасное, инклюзивное и нацеленное на результат пространство.",
        "GloWe is a global platform connecting individuals, organizations, and initiatives working to create social and environmental change. We facilitate knowledge-sharing, collaboration, and visibility for solutions that matter across languages, sectors, and geographies.": "GloWe — это глобальная платформа, соединяющая людей, организации и инициативы, которые создают социальные и экологические перемены. Мы поддерживаем обмен знаниями, сотрудничество и видимость решений, которые важны, — через языки, сектора и регионы.",
        "Share knowledge, ask for support, and build practical impact with the community.": "Делитесь знаниями, просите поддержки и создавайте практические перемены вместе с сообществом.",
        "More post actions": "Другие действия с постом",
        "More wish actions": "Другие действия с желанием",
        "More opportunity actions": "Другие действия с возможностью",
        "More profile actions": "Другие действия с профилем",
        "Write a thoughtful comment...": "Напишите вдумчивый комментарий...",
        "Ask a focused question for this group": "Задайте конкретный вопрос этой группе",
        "What do you need input on, and what kind of answers would help?": "По какому вопросу вам нужен отклик и какие ответы помогли бы?",
        "Personal workspace": "Личное рабочее пространство",
        "Your GloWe profile is ready to be completed.": "Ваш профиль GloWe готов к заполнению.",
        "Community collaboration": "Сотрудничество в сообществе",
        "Location not added yet": "Местоположение ещё не добавлено",
        "Team size not added yet": "Размер команды ещё не добавлен",
        "Not added yet": "Ещё не добавлено",
        "Title / role": "Должность / роль",
        "Organization name": "Название организации",
        "Email verified": "Эл. почта подтверждена",
        "Pending": "Ожидает",
        "Accepted": "Принято",
        "Declined": "Отклонено",
        "Public link": "Публичная ссылка",
        "Public line": "Публичная строка",
        "Open to volunteers, donations, or partnerships?": "Открыты для волонтёров, пожертвований или партнёрств?",
        "Funding / support sources": "Источники финансирования / поддержки",
        "Annual budget / support context": "Годовой бюджет / контекст поддержки",
        "Profile status": "Статус профиля",
        "Personal area sections": "Разделы личного кабинета",
        "Sign in to post a need": "Войдите, чтобы опубликовать запрос",
        "Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.": "Просматривать GloWe может каждый. Войдите через Google, чтобы опубликовать запрос и найти людей, готовых помочь.",
        "Sign in to post": "Войдите, чтобы опубликовать",
        "Sign in with Google to share a post with the GloWe community.": "Войдите через Google, чтобы поделиться постом с сообществом GloWe.",
        "Sign in to publish": "Войдите, чтобы опубликовать",
        "Sign in with Google to publish this opportunity and start receiving applications.": "Войдите через Google, чтобы опубликовать эту возможность и начать получать заявки.",
        "Sign in to start a discussion": "Войдите, чтобы начать обсуждение",
        "Sign in with Google to open a new discussion thread.": "Войдите через Google, чтобы открыть новое обсуждение.",
        "Sign in to reply": "Войдите, чтобы ответить",
        "Sign in with Google to join this discussion.": "Войдите через Google, чтобы присоединиться к этому обсуждению.",
        "Sign in to apply": "Войдите, чтобы откликнуться",
        "Save your spot": "Забронируйте своё место",
        "Ready to lend a hand?": "Готовы протянуть руку помощи?",
        "Keep this for later": "Сохраните это на потом",
        "Sign in with Google to save it to your list.": "Войдите через Google, чтобы сохранить это в свой список.",
        "Sign in to continue": "Войдите, чтобы продолжить",
        "Sign in with Google to open your personal area.": "Войдите через Google, чтобы открыть личный кабинет.",
        "Sign in with Google to do this on GloWe.": "Войдите через Google, чтобы сделать это в GloWe.",
        "Welcome to GloWe": "Добро пожаловать в GloWe",
        "Welcome — you're browsing as a guest. Sign in with Google anytime to participate.": "Добро пожаловать — вы просматриваете как гость. Войдите через Google в любой момент, чтобы участвовать.",
        "Mark as fulfilled": "Отметить как выполненное",
        "No wishes yet": "Желаний пока нет",
        "Post a wish": "Опубликовать желание",
        "The Wishing Well fills up as community members post support requests, calls for volunteers, and collaboration opportunities. Be the first to share what your project needs.": "Колодец желаний наполняется, когда участники сообщества публикуют запросы на поддержку, призывы к волонтёрам и возможности для сотрудничества. Станьте первым, кто расскажет, что нужно вашему проекту.",
        "Back to wishes": "Назад к желаниям",
        "No opportunities posted yet": "Возможности пока не опубликованы",
        "No organizations yet": "Организаций пока нет",
        "No matching profiles": "Нет подходящих профилей",
        "No posts yet — share knowledge, ask for support, or open a discussion to get things going.": "Постов пока нет — поделитесь знаниями, попросите поддержки или откройте обсуждение, чтобы всё началось.",
        "No registrations yet.": "Регистраций пока нет.",
        "Could not load registrations.": "Не удалось загрузить регистрации.",
        "Be the first to share a volunteer role or collaboration request with the GloWe community.": "Станьте первым, кто поделится волонтёрской ролью или запросом на сотрудничество с сообществом GloWe.",
        "Be the first to share a volunteer role or collaboration request with the community.": "Станьте первым, кто поделится волонтёрской ролью или запросом на сотрудничество с сообществом.",
        "Members will appear here once they join the community.": "Участники появятся здесь, когда присоединятся к сообществу.",
        "Organizations join GloWe by creating a profile and completing verification. The first approved profiles will appear here.": "Организации присоединяются к GloWe, создавая профиль и проходя проверку. Первые одобренные профили появятся здесь.",
        "The community is just getting started. Post a wish, share what you know, or reach out to someone who is working on what you care about.": "Сообщество только начинает свой путь. Опубликуйте желание, поделитесь тем, что знаете, или напишите тому, кто работает над важным для вас делом.",
        "This section will come alive as the community grows.": "Этот раздел оживёт по мере роста сообщества.",
        "Try a broader keyword or clear a filter.": "Попробуйте более широкое ключевое слово или снимите фильтр.",
        "Write the first post": "Напишите первый пост",
        "Write a message": "Написать сообщение",
        "Loading opportunities…": "Загружаем возможности…",
        "Loading organizations…": "Загружаем организации…",
        "Loading posts…": "Загружаем посты…",
        "Loading profile…": "Загружаем профиль…",
        "Loading registrations…": "Загружаем регистрации…",
        "Loading wishes…": "Загружаем желания…",
        "Fetching from the community directory.": "Загружаем из каталога сообщества.",
        "Back": "Назад",
        "Next": "Далее",
        "Register for event": "Зарегистрироваться на мероприятие",
        "Sign in to register": "Войдите, чтобы зарегистрироваться",
        "Cancel registration": "Отменить регистрацию",
        "Cancel event": "Отменить мероприятие",
        "Manage registrations": "Управление регистрациями",
        "Event registration": "Регистрация на мероприятие",
        "Message to the organizer (optional)": "Сообщение организатору (необязательно)",
        "This event has been cancelled by the organizer.": "Это мероприятие отменено организатором.",
        "This event has ended.": "Это мероприятие завершилось.",
        "This event is cancelled.": "Это мероприятие отменено.",
        "This event is no longer open for registration.": "Регистрация на это мероприятие закрыта.",
        "Registration:": "Регистрация:",
        "Status:": "Статус:",
        "Type:": "Тип:",
        "When:": "Когда:",
        "Join link:": "Ссылка для подключения:",
        "Offer sent": "Предложение отправлено",
        "Structured support offer submitted.": "Структурированное предложение поддержки отправлено.",
        "Save as draft": "Сохранить как черновик",
        "Submit for review": "Отправить на проверку",
        "Send code": "Отправить код",
        "Select an area": "Выберите сферу",
        "Choose if relevant": "Выберите, если применимо",
        "Preferred contact": "Предпочтительный способ связи",
        "In-app message": "Сообщение в приложении",
        "Location (optional)": "Местоположение (необязательно)",
        "Phone": "Телефон",
        "Phone (optional)": "Телефон (необязательно)",
        "WhatsApp": "WhatsApp",
        "Public": "Публично",
        "Public actions": "Публичные действия",
        "Public profile and media": "Публичный профиль и медиа",
        "Basic account": "Базовый аккаунт",
        "Looking for": "Ищу",
        "Impact": "Влияние",
        "Impact update": "Обновление о результате",
        "Draft impact update": "Черновик обновления о результате",
        "Draft Update": "Черновик обновления",
        "Impact, interests and methods": "Влияние, интересы и методы",
        "Mentoring": "Наставничество",
        "Trust": "Доверие",
        "Trust, contact and review": "Доверие, контакты и проверка",
        "Story": "История",
        "Story and purpose": "История и цель",
        "The dream": "Мечта",
        "The conversation starts here": "Разговор начинается здесь",
        "Connection workspace": "Пространство для связей",
        "Profile onboarding": "Создание профиля",
        "Organization review": "Проверка организации",
        "Review note": "Заметка проверяющего",
        "Relevant SDGs": "Соответствующие ЦУР",
        "Size / team": "Размер / команда",
        "Annual budget": "Годовой бюджет",
        "First coordination call": "Первый координационный созвон",
        "Both sides confirm scope, timeline, and ownership.": "Обе стороны подтверждают объём, сроки и зоны ответственности.",
        "A short outcome note documents what changed.": "Короткая заметка о результате фиксирует, что изменилось.",
        "When work is complete, this becomes a short public note: what was needed, who helped, what happened, and what is still needed.": "Когда работа завершена, это становится короткой публичной заметкой: что было нужно, кто помог, что произошло и что ещё требуется.",
        "To turn a local need into a shared action that others can join, support, or learn from.": "Чтобы превратить местный запрос в общее действие, к которому другие могут присоединиться, поддержать его или научиться на нём.",
        "Build a useful profile step by step. You can save a draft now and complete more details later.": "Создавайте полезный профиль шаг за шагом. Можно сохранить черновик сейчас и дополнить детали позже.",
        "Choose the profile that best describes you. This changes the questions and future profile layout.": "Выберите профиль, который лучше всего вас описывает. Это меняет вопросы и будущий вид профиля.",
        "For this MVP, the code is shown on screen and stored locally.": "В этой MVP-версии код показывается на экране и хранится локально.",
        "I agree to keep GloWe professional, respectful, transparent, and aligned with human rights.": "Я обязуюсь поддерживать GloWe профессиональным, уважительным, прозрачным и соответствующим правам человека.",
        "Logo or profile image": "Логотип или изображение профиля",
        "Website / LinkedIn / Facebook": "Сайт / LinkedIn / Facebook",
        "1 person": "1 человек",
        "2-5 people": "2–5 человек",
        "6-20 people": "6–20 человек",
        "20+ people": "20+ человек",
        "(required for rejection)": "(обязательно при отклонении)",
        "First name *": "Имя *",
        "Last name *": "Фамилия *",
        "Email *": "Эл. почта *",
        "Password *": "Пароль *",
        "Confirm password *": "Подтвердите пароль *",
        "Email verification code *": "Код подтверждения эл. почты *",
        "Country *": "Страна *",
        "Community / audience *": "Сообщество / аудитория *",
        "Geographic activity *": "География деятельности *",
        "Main interest areas *": "Основные сферы интересов *",
        "Organization mission *": "Миссия организации *",
        "Problem you address *": "Проблема, которую вы решаете *",
        "Solution or method *": "Решение или метод *",
        "Values and goals *": "Ценности и цели *",
        "Short public line *": "Короткая публичная строка *",
        "Title / role *": "Должность / роль *",
        "All listings": "Все объявления",
        "Events only": "Только мероприятия",
        "Events:": "Мероприятия:",
        "In-person events": "Очные мероприятия",
        "Online events": "Онлайн-мероприятия",
        "Upcoming events": "Предстоящие мероприятия",
        "Registered members": "Зарегистрированные участники",
        "Registered organizations": "Зарегистрированные организации",
        "+ Create": "+ Создать",
        "Create": "Создать",
        "What would you like to create?": "Что вы хотите создать?",
        "Share an update, a story, or knowledge with the community.": "Поделитесь обновлением, историей или знаниями с сообществом.",
        "Publish a volunteering event with a date and registration.": "Опубликуйте волонтёрское мероприятие с датой и регистрацией.",
        "Recruit volunteers for an ongoing role or project.": "Наберите волонтёров на постоянную роль или проект.",
        "Ask the community for help, resources, or partners.": "Попросите у сообщества помощь, ресурсы или партнёров.",
        "Offer your time and skills so organizations can find you.": "Предложите своё время и навыки, чтобы организации могли вас найти.",
        "Event": "Мероприятие",
        "Need": "Запрос о помощи",
        "Volunteer Offer": "Предложение волонтёрства",
        "Publish an event": "Опубликовать мероприятие",
        "Events appear on the Volunteer Network with a date and registration.": "Мероприятия появляются в Сети волонтёров с датой и регистрацией.",
        "Event title": "Название мероприятия",
        "e.g. Community beach cleanup": "например: общественная уборка пляжа",
        "What happens at the event, and who should come?": "Что происходит на мероприятии и кому стоит прийти?",
        "Starts": "Начало",
        "Ends (optional)": "Окончание (необязательно)",
        "Format": "Формат",
        "Location / link": "Место / ссылка",
        "Address, city, or meeting link": "Адрес, город или ссылка на встречу",
        "Capacity (optional)": "Вместимость (необязательно)",
        "Leave empty for unlimited": "Оставьте пустым, чтобы не ограничивать",
        "Registration": "Регистрация",
        "Organizer approves each registration": "Организатор одобряет каждую регистрацию",
        "Open — instant confirmation": "Открытая — мгновенное подтверждение",
        "Publish Event": "Опубликовать мероприятие",
        "Event published": "Мероприятие опубликовано",
        "Your event is now live on the Volunteer Network.": "Ваше мероприятие опубликовано в Сети волонтёров.",
        "Offer your help": "Предложите свою помощь",
        "Your offer appears on the Wishing Well so organizations and members can find you.": "Ваше предложение появляется в Колодце желаний, чтобы организации и участники могли вас найти.",
        "Headline": "Заголовок",
        "e.g. Graphic designer offering 3 hours a week": "например: графический дизайнер предлагает 3 часа в неделю",
        "Skills, time, equipment — anything that could help.": "Навыки, время, оборудование — всё, что может помочь.",
        "Impact area (optional)": "Сфера влияния (необязательно)",
        "Publish Offer": "Опубликовать предложение",
        "Offer published": "Предложение опубликовано",
        "Your offer is now live on the Wishing Well.": "Ваше предложение опубликовано в Колодце желаний.",
        "Fetching your conversations.": "Загружаем ваши переписки.",
        "No conversations yet": "Переписок пока нет",
        "Reach out to an organization, offer help on a need, or message a community member — conversations will appear here.": "Напишите организации, предложите помощь по запросу или отправьте сообщение участнику сообщества — переписки появятся здесь.",
        "Open the Wishing Well": "Открыть Колодец желаний",
        "Opening the conversation.": "Открываем переписку.",
        "Conversation unavailable": "Переписка недоступна",
        "This conversation could not be opened.": "Не удалось открыть эту переписку.",
        "Back to messages": "Назад к сообщениям",
        "No messages yet. Say hello!": "Сообщений пока нет. Поздоровайтесь!",
        "Write a message...": "Напишите сообщение...",
        "Could not send": "Не удалось отправить",
        "Messaging unavailable": "Сообщения недоступны",
        "This member cannot receive direct messages yet.": "Этот участник пока не может получать личные сообщения.",
        "Messages are unavailable": "Сообщения недоступны",
        "Spam or misleading promotion": "Спам или вводящее в заблуждение продвижение",
        "Harassment or hate": "Преследование или ненависть",
        "False or misleading information": "Ложная или вводящая в заблуждение информация",
        "Inappropriate content": "Неуместный контент",
        "Fake profile or impersonation": "Поддельный профиль или выдача себя за другого",
        "Already reported": "Вы уже пожаловались",
        "You already reported this. Our team will review it.": "Вы уже пожаловались на это. Наша команда рассмотрит обращение.",
        "Could not send report": "Не удалось отправить жалобу",
        "Something went wrong sending your report. Please try again.": "При отправке жалобы произошла ошибка. Пожалуйста, попробуйте снова.",
        "Reporting needs a live connection right now. Please try again shortly.": "Для отправки жалобы сейчас нужно активное подключение. Пожалуйста, попробуйте снова через некоторое время.",
        "Sign in to report": "Войдите, чтобы пожаловаться",
        "Sign in with Google to report this content so our team can review it.": "Войдите через Google, чтобы пожаловаться на этот контент — наша команда его рассмотрит.",
        "Fetching community reports.": "Загружаем жалобы сообщества.",
        "Could not load reports": "Не удалось загрузить жалобы",
        "Remove content": "Удалить контент",
        "Content removed": "Контент удалён",
        "The reported content is no longer publicly visible.": "Контент, на который поступила жалоба, больше не виден публично.",
        "Report dismissed": "Жалоба отклонена",
        "The report was closed with no action.": "Жалоба закрыта без принятия мер.",
        "Only GloWe reviewers can act on reports.": "Только проверяющие GloWe могут принимать меры по жалобам.",
        "Open reported item": "Открыть элемент из жалобы",
        "Audience": "Аудитория",
        "Community Discussion": "Обсуждение в сообществе",
        "Connection Request": "Запрос на связь",
        "Deadline": "Крайний срок",
        "Discussion": "Обсуждение",
        "Event / Webinar": "Мероприятие / вебинар",
        "Filters": "Фильтры",
        "Grant / Open Call": "Грант / открытый конкурс",
        "Knowledge Share": "Обмен знаниями",
        "Newest first": "Сначала новые",
        "No wishes match your filters": "Нет желаний по выбранным фильтрам",
        "Oldest first": "Сначала старые",
        "Professional Guide": "Профессиональное руководство",
        "Reason": "Причина",
        "Reporter": "Автор жалобы",
        "Search by title, author, city, or topic": "Поиск по названию, автору, городу или теме",
        "Search wishes": "Поиск желаний",
        "Search, filter, and sort open needs from across the community.": "Ищите, фильтруйте и сортируйте открытые запросы сообщества.",
        "Sort": "Сортировка",
        "Sort wishes": "Сортировать желания",
        "Success Story": "История успеха",
        "Title A–Z": "Название А–Я",
        "Verified": "Проверено",
        "volunteers": "волонтёров",
        "wish shown": "желание показано",
        "wishes shown": "желаний показано",
        "Values": "Ценности",
        "Problem": "Проблема",
        "Solution": "Решение",
        "Size / availability": "Размер / доступность",
        "Not specified yet": "Пока не указано",
        "Through participation, useful connections, project progress, and community feedback.": "Через участие, полезные связи, прогресс проектов и отзывы сообщества.",
        "Contact through GloWe messages": "Связаться через сообщения GloWe",
        "Community impact": "Влияние на сообщество",
        "Open to coordination": "Открыты для координации",
        "Impact signals": "Показатели влияния",
        "What I offer": "Что я предлагаю",
        "Bio": "О себе",
        "Size": "Размер",
        "Country": "Страна",
        "Website": "Веб-сайт",
        "Field / sector": "Сфера / отрасль",
        "Size (optional)": "Размер (необязательно)",
        "Contact name": "Контактное имя",
        "Contact email": "Контактный email",
        "Contact phone (optional)": "Контактный телефон (необязательно)",
        "A few words about you and what you're working on": "Несколько слов о вас и над чем вы работаете",
        "Education, health, environment...": "Образование, здоровье, экология...",
        "What does your organization do?": "Чем занимается ваша организация?",
        "e.g. 1-10, 11-50": "например 1-10, 11-50",
        "Contact person": "Контактное лицо",
        "Dev sign in": "Вход для разработки",
        "Local dev sign-in": "Локальный вход для разработки",
        "Google OAuth is disabled on the local Supabase stack. Pick a test persona below — each option mints a real Supabase session (same as production after sign-in).": "Google OAuth отключён в локальном стеке Supabase. Выберите тестовый профиль ниже — каждый вариант создаёт настоящую сессию Supabase (как в продакшене после входа).",
        "Generated automatically — change if you like": "Создано автоматически — можно изменить",
        "Organization mission": "Миссия организации",
        "Community you serve": "Сообщество, которому вы служите",
        "Problem you address": "Проблема, которую вы решаете",
        "Solution or method": "Решение или метод",
        "Business purpose": "Цель бизнеса",
        "Business values": "Ценности бизнеса",
        "Customers / community": "Клиенты / сообщество",
        "Social or environmental problem": "Социальная или экологическая проблема",
        "Product, service, or impact model": "Продукт, услуга или модель воздействия",
        "Team / company size": "Размер команды / компании",
        "Initiative story": "История инициативы",
        "Values and people behind it": "Ценности и люди, стоящие за инициативой",
        "Problem or need": "Проблема или потребность",
        "What you do in practice": "Что вы делаете на практике",
        "People involved": "Вовлечённые люди",
        "Volunteer introduction": "Представление волонтёра",
        "How you like to volunteer": "Как вы предпочитаете волонтёрить",
        "Preferred causes / communities": "Предпочитаемые направления / сообщества",
        "Causes close to your heart": "Направления, важные для вас",
        "Support you can offer": "Поддержка, которую вы можете предложить",
        "Monthly availability": "Ежемесячная доступность",
        "Professional background": "Профессиональный опыт",
        "Professional values": "Профессиональные ценности",
        "Who you can support": "Кому вы можете помочь",
        "Challenges you can help solve": "Задачи, в решении которых вы можете помочь",
        "Services, volunteering, or forum leadership": "Услуги, волонтёрство или ведение форума",
        "Availability / service model": "Доступность / модель услуг",
        "Collaboration": "Сотрудничество",
        "Joint Projects": "Совместные проекты",
        "Active Account": "Активный аккаунт",
        "Shared Content": "Опубликованный контент",
        "Expert Writer": "Эксперт-автор",
        "Professional Knowledge": "Профессиональные знания",
        "Leading Volunteer": "Ведущий волонтёр",
        "Volunteer Hours": "Часы волонтёрства",
        "Active Learner": "Активный ученик",
        "Knowledge Discovery": "Открытие знаний",
        "Community Bridge": "Мост между сообществами",
        "Connections Made": "Установленные связи",
        "Documented Impact": "Задокументированное влияние",
        "Case Studies": "Тематические исследования",
        "Diversity & Inclusion": "Многообразие и инклюзия",
        "Diverse Collaborations": "Разнообразные сотрудничества",
        "Projects created or managed in partnership": "Проекты, созданные или управляемые в партнёрстве",
        "Posts, articles, videos, and comments published": "Опубликованные посты, статьи, видео и комментарии",
        "Professional posts or articles shared": "Опубликованные профессиональные посты или статьи",
        "Hours of consulting, mentoring, or activity": "Часы консультаций, наставничества или активности",
        "Articles, pages, and projects explored": "Изученные статьи, страницы и проекты",
        "People and organizations introduced to one another": "Люди и организации, знакомство между которыми состоялось",
        "Success stories with impact evidence": "Истории успеха с доказательствами влияния",
        "Cross-community, cross-country, or cross-sector collaborations": "Межобщинные, межстрановые или межотраслевые сотрудничества",
        "volunteers connected": "волонтёров на связи",
        "projects listed": "проектов в списке",
        // Profile-view fallback sentences (fix/language-gap-sweep, round 2)
        "Verified organization": "Проверенная организация",
        "community impact": "влияние на сообщество",
        "This profile can add more field insights, measurement notes, and lessons learned as the work develops.": "К этому профилю можно добавить больше полевых наблюдений, заметок по измерению результатов и извлечённых уроков по мере развития работы.",
        "Community work, partnerships, shared knowledge, and practical field-based action.": "Работа с сообществом, партнёрства, обмен знаниями и практические действия на местах.",
        "Open to relevant conversations and collaboration through GloWe.": "Открыты к обсуждению и сотрудничеству через GloWe.",
        "people connected through projects, opportunities, or community activity.": "людей подключились через проекты, возможности или активность в сообществе.",
        "The work responds to needs connected to ": "Работа отвечает на потребности, связанные с ",
        " and helps make local knowledge easier to access and act on.": ", и помогает сделать местные знания более доступными и применимыми на практике.",
        // wishTypeStyles labels (data.js) missing from an earlier partial harvest
        "Call for Help": "Призыв о помощи",
        "Looking for Collaboration": "Ищем сотрудничество",
        "Support Needed": "Требуется поддержка",
        "Sharing Knowledge": "Обмен знаниями",
        "Call for Collaboration": "Призыв к сотрудничеству",
        "Media & Visibility": "Медиа и узнаваемость",
        "Project Spotlight": "В центре внимания: проект",
        "We're Hiring": "Мы нанимаем",
        // Date-locale-bug follow-up (event type + relative-time + applied/offered labels)
        "Online": "Онлайн",
        "In person": "Очно",
        "now": "сейчас",
        "Offered": "Предложено",
        "Applied": "Подано",
        "Applied on": "Подано",
        // index.html home-page marketing copy + member-feed Opportunity badge
        "Opportunity": "Возможность",
        "Your GloWe home": "Ваша домашняя страница GloWe",
        "GloWe was created as a home for impact communities: a place to make work visible, build trust, share multilingual knowledge, and turn local needs into collaborative action. You can arrive with a project, a question, a skill, a story, or a need. There is room for all of it.": "GloWe был создан как дом для сообществ влияния: место, где делают работу видимой, строят доверие, делятся многоязычными знаниями и превращают локальные потребности в совместные действия. Можно прийти с проектом, вопросом, навыком, историей или потребностью. Здесь есть место для всего этого.",
        "Our community is built around practical exchange: professional volunteers, proven solutions, multilingual knowledge, local and global collaboration, tools and resources, donor and client access, social-business integration, and peer-to-peer inspiration.": "Наше сообщество построено вокруг практического обмена: профессиональные волонтёры, проверенные решения, многоязычные знания, локальное и глобальное сотрудничество, инструменты и ресурсы, доступ к донорам и клиентам, интеграция социального бизнеса и вдохновение от равного к равному.",
        // TD-141 — report/saved-item target-type + status enum labels
        "Wish": "Пожелание",
        "Thread": "Тема",
        "General": "Общее",
        "Dismissed": "Отклонено",
        "Actioned": "Обработано",
        // Forums page welded counts (members/posts/replies/Last active)
        "members": "участников",
        "replies": "ответов",
        "Last active": "Последняя активность",
        "Discussion from members of ": "Обсуждение от участников ",
        // discussion-group.html group-stats row
        "active threads": "активных тем",
        // opportunity.html org-mission fallback text
        "This local opportunity was published by a GloWe community member and is ready for interested volunteers or collaborators.": "Эта локальная возможность опубликована участником сообщества GloWe и готова для заинтересованных волонтёров или партнёров.",
        // connections.html title + intro + follow-ui error state
        "Connections - GloWe": "Связи - GloWe",
        "Followers and people this profile follows on GloWe.": "Подписчики и люди, за которыми следит этот профиль в GloWe.",
        "Missing user id.": "Отсутствует идентификатор пользователя.",
        // admin.html — never previously translated (moderation + health tabs)
        "Review new profile submissions, respond to reports, and monitor production health from one place.": "Просматривайте новые заявки на профиль, отвечайте на жалобы и следите за состоянием системы в одном месте.",
        "Moderation": "Модерация",
        "System health": "Состояние системы",
        "Field": "Сфера",
        "Submitted": "Отправлено",
        "Production probes": "Проверки продакшена",
        "Read-only checks against the live GloWe site. Refreshed after each deploy and every 15 minutes.": "Проверки только для чтения на живом сайте GloWe. Обновляется после каждого деплоя и каждые 15 минут.",
        "No data": "Нет данных",
        "Refresh": "Обновить",
        "Open this tab to load probes": "Откройте эту вкладку, чтобы загрузить проверки",
        "Health data loads on demand so moderation stays fast.": "Данные о состоянии загружаются по запросу, чтобы модерация оставалась быстрой.",
        "Recent probe history": "История последних проверок",
        "Check": "Проверка",
        "Latency": "Задержка",
        "Version": "Версия",
        "Checked at": "Проверено в",
        "Detail": "Детали",
        "Admin sections": "Разделы администрирования",
        "Explain the decision — especially required when rejecting": "Объясните решение — особенно важно при отклонении",
        // registrationProfileFields publicPrompt/fundingLabel/budgetLabel for
        // business/initiative/volunteer/professional — reachable via
        // renderQuestionnaireProfile() on the Personal Area page (ngo's were
        // already covered by an earlier harvest, the other 4 types were not)
        "Open to collaborations, products, services, or CSR partnerships?": "Открыты к сотрудничеству, продуктам, услугам или партнёрствам в сфере КСО?",
        "Business model / support sources": "Бизнес-модель / источники поддержки",
        "Looking for volunteers, mentors, partners, or visibility?": "Ищете волонтёров, наставников, партнёров или узнаваемость?",
        "Current support / resources": "Текущая поддержка / ресурсы",
        "Can people contact you directly through GloWe?": "Могут ли люди связаться с вами напрямую через GloWe?",
        "Preferred communication": "Предпочитаемый способ связи",
        "Support needs / accessibility notes": "Потребности в поддержке / заметки о доступности",
        "Open to volunteering, paid services, forum leadership, or community support?": "Открыты к волонтёрству, платным услугам, ведению форума или поддержке сообщества?",
        "Preferred engagement": "Предпочитаемый формат участия",
        "Rates / pro-bono policy": "Расценки / политика pro-bono",
    },
    ar: {
        "Show original": "عرض النص الأصلي",
        "Show translation": "عرض الترجمة",
        "Translating…": "جارٍ الترجمة…",
        "Name in English (optional)": "الاسم بالإنجليزية (اختياري)",
        "Latin / English display name": "اسم العرض بالحروف اللاتينية / الإنجليزية",
        "Latin / English name — auto-filled if left blank": "الاسم بالحروف اللاتينية / الإنجليزية — يُملأ تلقائيًا إذا تُرك فارغًا",
        "Organization name in English (optional)": "اسم المؤسسة بالإنجليزية (اختياري)",
        "Organization name in English": "اسم المؤسسة بالإنجليزية",
        "English org name — auto-filled if blank": "اسم المؤسسة بالإنجليزية — يُملأ تلقائيًا إذا تُرك فارغًا",
        "Complete profile": "استكمال الملف الشخصي",
        "Pending review": "قيد المراجعة",
        "Needs changes": "يحتاج إلى تعديلات",
        "Save profile": "حفظ الملف الشخصي",
        "Change profile photo": "تغيير صورة الملف الشخصي",
        "Change cover photo": "تغيير صورة الغلاف",
        "Remove cover": "إزالة الغلاف",
        "Save cover": "حفظ الغلاف",
        "Cover will be removed when you save.": "ستتم إزالة الغلاف عند الحفظ.",
        "Remove photo": "إزالة الصورة",
        "Save photo": "حفظ الصورة",
        "Profile saved": "تم حفظ الملف الشخصي",
        "Could not save profile.": "تعذّر حفظ الملف الشخصي.",
        "Replace": "استبدال",
        "Cancel": "إلغاء",
        "Photo will be removed when you save.": "ستتم إزالة الصورة عند الحفظ.",
        "Saving...": "جارٍ الحفظ...",
        "Uploading...": "جارٍ الرفع...",
        "Preparing photo...": "جارٍ تجهيز الصورة...",
        "Photo optimized for upload.": "تم تحسين الصورة للرفع.",
        "Could not read image.": "تعذّرت قراءة الصورة.",
        "Could not compress image.": "تعذّر ضغط الصورة.",
        "Image is too large. Try a smaller photo.": "حجم الصورة كبير جدًا. جرّب صورة أصغر.",
        "Image is too large even after compression. Try a smaller photo.": "حجم الصورة كبير جدًا حتى بعد الضغط. جرّب صورة أصغر.",
        "Could not save photo.": "تعذّر حفظ الصورة.",
        "Followers": "المتابِعون",
        "Following": "المتابَعون",
        "Forum": "منتدى",
        "Join GloWe to see more and take part.": "انضموا إلى GloWe لرؤية المزيد والمشاركة.",
        "You're caught up": "اطّلعتم على كل شيء",
        "+ Follow": "+ متابعة",
        "Following ✓": "تتابعه ✓",
        "Stop following": "إلغاء المتابعة",
        "This account requires approval to follow.": "يتطلب هذا الحساب موافقة قبل المتابعة.",
        "No followers yet": "لا يوجد متابِعون بعد",
        "Not following anyone yet": "لا تتابع أحدًا بعد",
        "Sign in to follow": "سجّل الدخول للمتابعة",
        "Sign in with Google to follow profiles and stay updated on their work.": "سجّل الدخول عبر Google لمتابعة الملفات الشخصية والبقاء على اطلاع بعملها.",
        "Can't follow this profile": "لا يمكن متابعة هذا الملف الشخصي",
        "Could not follow": "تعذّرت المتابعة",
        "Could not unfollow": "تعذّر إلغاء المتابعة",
        "Connections": "الروابط",
        "Sign in to see connections": "سجّل الدخول لعرض الروابط",
        "Show details": "عرض التفاصيل",
        "Hide details": "إخفاء التفاصيل",
        "Individual": "فرد",
        "Settings": "الإعدادات",
        "Opportunities": "الفرص",
        "My Events": "فعالياتي",
        "Focus not added yet": "لم يُضَف مجال التركيز بعد",
        "Saved from the GloWe community": "محفوظ من مجتمع GloWe",
        "Loading your event registrations…": "جارٍ تحميل تسجيلاتك في الفعاليات…",
        "Education & Knowledge": "التعليم والمعرفة",
        "Environment & Climate Action": "البيئة والعمل المناخي",
        "Health & Community Care": "الصحة والرعاية المجتمعية",
        "Rights, Safety & Civic Power": "الحقوق والسلامة والقوة المدنية",
        "A focused group for learning spaces, youth programs, multilingual knowledge sharing, and practical education tools.": "مجموعة متخصصة لمساحات التعلّم وبرامج الشباب وتبادل المعرفة متعدد اللغات وأدوات التعليم العملية.",
        "For climate, food systems, waste, restoration, repair, and local environmental action.": "للمناخ والنظم الغذائية والنفايات والاستصلاح والإصلاح والعمل البيئي المحلي.",
        "A moderated space for wellbeing, preventive health, emergency response, and community care methods.": "مساحة خاضعة للإشراف تُعنى بالعافية والصحة الوقائية والاستجابة للطوارئ وأساليب الرعاية المجتمعية.",
        "For rights-based action, civic participation, safe moderation, and community trust.": "للعمل القائم على الحقوق والمشاركة المدنية والإشراف الآمن والثقة المجتمعية.",
        "Youth": "الشباب",
        "Repair": "الإصلاح",
        "Wellbeing": "العافية",
        "Crisis Response": "الاستجابة للأزمات",
        "Justice": "العدالة",
        "Safety": "السلامة",
        "Civic Action": "العمل المدني",
        "Home": "الرئيسية",
        "Personal Area": "المنطقة الشخصية",
        "Wishing Well": "بئر الأمنيات",
        "The Wishing Well": "بئر الأمنيات",
        "Wishes": "الأمنيات",
        "Organizations": "المؤسسات",
        "Community": "المجتمع",
        "Forums": "المنتديات",
        "About": "حول",
        "About Us": "من نحن",
        "Profile": "الملف الشخصي",
        "Sign up / Sign in": "التسجيل / تسجيل الدخول",
        "Log In": "تسجيل الدخول",
        "Log in": "تسجيل الدخول",
        "Join GloWe": "انضم إلى GloWe",
        "Log Out": "تسجيل الخروج",
        "Hi,": "مرحبًا،",
        "there": "صديقنا",
        "Global Learning, Open Knowledge & Wisdom Exchange.": "تعلّم عالمي، معرفة مفتوحة، وتبادل للحكمة.",
        "Bridging local solutions to global challenges through shared knowledge, solidarity, and practical action.": "نربط الحلول المحلية بالتحديات العالمية عبر المعرفة المشتركة والتضامن والعمل التطبيقي.",
        "Quick Links": "روابط سريعة",
        "Explore": "استكشاف",
        "Participate": "المشاركة",
        "Write a post": "كتابة منشور",
        "Volunteer Network": "شبكة المتطوعين",
        "What's next": "ما التالي",
        "What Comes Next": "ما الذي يأتي بعد ذلك",
        "Built With Care": "بُني بعناية",
        "An MVP by the GloWe community, with product and implementation support by Topaz.": "نسخة أولية من مجتمع GloWe، بدعم في المنتج والتنفيذ من Topaz.",
        "Admin Review": "الإدارة والمراجعة",
        "Terms & Community Charter": "الشروط وميثاق المجتمع",
        "For Organizations": "للمؤسسات",
        "Register Your Organization": "سجّل مؤسستك",
        "Post an Opportunity": "نشر فرصة",
        "Connect": "تواصل",
        "Welcome Back": "أهلًا بعودتك",
        "Welcome Back!": "أهلًا بعودتك!",
        "Sign in with your Google account to continue.": "سجّل الدخول بحساب Google للمتابعة.",
        "Continue with Google": "المتابعة عبر Google",
        "Don't have an account?": "ليس لديك حساب؟",
        "Join our community": "انضم إلى مجتمعنا",
        "Join the GloWe Community": "انضم إلى مجتمع GloWe",
        "Sign in with your Google account to get started.": "سجّل الدخول بحساب Google للبدء.",
        "Already have an account?": "لديك حساب بالفعل؟",
        "Success": "تم بنجاح",
        "Your action was completed successfully.": "تمت العملية بنجاح.",
        "Continue": "متابعة",
        "Find your GloWe path": "اعثر على مسارك في GloWe",
        "Choose the path that matches what you want to do first.": "اختر المسار الذي يناسب ما تريد البدء به.",
        "I represent an organization": "أمثّل مؤسسة",
        "Create a profile, post a need, and receive structured offers.": "أنشئ ملفًا شخصيًا، وانشر احتياجًا، واستقبل عروضًا منظّمة.",
        "I can help": "يمكنني المساعدة",
        "Find wishes that match your skills, language, location, and time.": "اعثر على أمنيات تناسب مهاراتك ولغتك وموقعك ووقتك.",
        "I am a business partner": "أنا شريك من قطاع الأعمال",
        "Match CSR teams, logistics, funding, or services with verified needs.": "اربط فرق المسؤولية المجتمعية أو الخدمات اللوجستية أو التمويل أو الخدمات باحتياجات موثّقة.",
        "Manage your account, language, and session preferences.": "أدِر حسابك ولغتك وتفضيلات الجلسة.",
        "Account": "الحساب",
        "Name": "الاسم",
        "Email": "البريد الإلكتروني",
        "Account type": "نوع الحساب",
        "Community member": "عضو في المجتمع",
        "Open Personal Area": "فتح المنطقة الشخصية",
        "Language": "اللغة",
        "Interface language": "لغة الواجهة",
        "Choose the language for the GloWe interface. Hebrew and Arabic are shown in a right-to-left (RTL) layout.": "اختر لغة واجهة GloWe. تُعرض العبرية والعربية بتخطيط من اليمين إلى اليسار (RTL).",
        "English": "الإنجليزية",
        "Hebrew": "العبرية",
        "Session": "الجلسة",
        "End your session on this device. You can sign back in any time with Google.": "أنهِ جلستك على هذا الجهاز. يمكنك تسجيل الدخول مجددًا في أي وقت عبر Google.",
        "Delete Account": "حذف الحساب",
        "Permanently delete your GloWe profile from this community. This removes your profile details; your Google sign-in itself is not deleted, so you can sign up again later.": "احذف ملفك الشخصي في GloWe من هذا المجتمع نهائيًا. يؤدي ذلك إلى إزالة بيانات ملفك الشخصي؛ أما تسجيل الدخول عبر Google فلا يُحذف، ويمكنك التسجيل مرة أخرى لاحقًا.",
        "Type DELETE to confirm": "اكتب DELETE للتأكيد",
        "Could not delete account": "تعذّر حذف الحساب",
        "Something went wrong deleting your profile. Please try again.": "حدث خطأ أثناء حذف ملفك الشخصي. يرجى المحاولة مرة أخرى.",
        "Sign in to manage settings": "سجّل الدخول لإدارة الإعدادات",
        "Your account, language, and session options live here once you are signed in.": "ستظهر هنا خيارات حسابك ولغتك وجلستك بعد تسجيل الدخول.",
        "Sign in to open your personal area": "سجّل الدخول لفتح منطقتك الشخصية",
        "Your profile, applications, needs, and saved items live here once you are signed in.": "سيظهر هنا ملفك الشخصي وطلباتك واحتياجاتك وعناصرك المحفوظة بعد تسجيل الدخول.",
        "Your GloWe": "GloWe الخاص بك",
        "Welcome back,": "أهلًا بعودتك،",
        "What would you like to do today? Share knowledge, post an opportunity, or ask the community for support.": "ماذا تودّ أن تفعل اليوم؟ شارك معرفة، أو انشر فرصة، أو اطلب الدعم من المجتمع.",
        "Share a post": "مشاركة منشور",
        "Post an opportunity": "نشر فرصة",
        "Ask for support": "طلب الدعم",
        "Your activity": "نشاطك",
        "What is happening on GloWe": "ما الذي يحدث في GloWe",
        "See all": "عرض الكل",
        "See all comments": "عرض كل التعليقات",
        "Loading your GloWe home…": "جارٍ تحميل صفحتك الرئيسية في GloWe…",
        "You have not shared anything yet": "لم تشارك شيئًا بعد",
        "Your posts, opportunities, and requests will gather here.": "ستتجمع هنا منشوراتك وفرصك وطلباتك.",
        "Write your first post": "اكتب منشورك الأول",
        "The community is just getting started": "المجتمع في بدايته",
        "Be the first to share a post or an opportunity others can join.": "كن أول من يشارك منشورًا أو فرصة يمكن للآخرين الانضمام إليها.",
        "Start the conversation": "ابدأ الحوار",
        "Community post": "منشور مجتمعي",
        "Community Member": "عضو في المجتمع",
        "A home for people building impact together": "بيت لمن يصنعون الأثر معًا",
        "You do not have to carry the work alone.": "لست مضطرًا لحمل هذا العمل وحدك.",
        "GloWe is a warm, professional community for people, organizations, initiatives, volunteers, and partners working around the SDGs. Here you can ask for support, offer what you know, share field wisdom, and meet people who walk beside you in the work.": "GloWe مجتمع دافئ ومهني للأفراد والمؤسسات والمبادرات والمتطوعين والشركاء العاملين حول أهداف التنمية المستدامة. هنا يمكنك طلب الدعم، وتقديم ما تعرفه، ومشاركة حكمة الميدان، ولقاء أشخاص يسيرون إلى جانبك في العمل.",
        "Find Your Place": "اعثر على مكانك",
        "Meet the Community": "تعرّف على المجتمع",
        "Ask for Support": "اطلب الدعم",
        "You have something to give, and something to receive.": "لديك ما تعطيه، ولديك ما تتلقاه.",
        "You can ask": "يمكنك أن تسأل",
        "You can offer": "يمكنك أن تقدّم",
        "You can learn": "يمكنك أن تتعلّم",
        "You can connect": "يمكنك أن تتواصل",
        "You can belong": "يمكنك أن تنتمي",
        "Three communities, one living network": "ثلاثة مجتمعات، وشبكة حيّة واحدة",
        "Enter the Community": "ادخل إلى المجتمع",
        "Local Community": "المجتمع المحلي",
        "People who know the place": "أشخاص يعرفون المكان",
        "Share a local need": "شارك احتياجًا محليًا",
        "Expert Community": "مجتمع الخبراء",
        "People who can strengthen the work": "أشخاص يمكنهم تعزيز العمل",
        "Offer your expertise": "قدّم خبرتك",
        "Global Community": "المجتمع العالمي",
        "People who help knowledge travel": "أشخاص يساعدون المعرفة على الانتقال",
        "Join a discussion": "انضم إلى نقاش",
        "Ask with honesty": "اسأل بصدق",
        "Offer with care": "قدّم باهتمام",
        "Build with solidarity": "ابنِ بتضامن",
        "Start where you are": "ابدأ من حيث أنت",
        "Choose the doorway that feels right today": "اختر الباب الذي يبدو مناسبًا اليوم",
        "Need support": "أحتاج إلى دعم",
        "Share what would help": "شارك ما الذي سيساعدك",
        "Want to contribute": "أريد أن أساهم",
        "Offer your time or expertise": "قدّم وقتك أو خبرتك",
        "Offer Help": "تقديم المساعدة",
        "Looking for people": "أبحث عن أشخاص",
        "Step into the community": "ادخل إلى المجتمع",
        "Enter Community": "دخول المجتمع",
        "What you can do in GloWe now": "ما يمكنك فعله في GloWe الآن",
        "Create a profile": "إنشاء ملف شخصي",
        "Share with the community": "المشاركة مع المجتمع",
        "Use the Wishing Well": "استخدام بئر الأمنيات",
        "Find ways to help": "إيجاد طرق للمساعدة",
        "Values that guide the space": "القيم التي توجّه هذه المساحة",
        "Solidarity": "التضامن",
        "Shared Knowledge": "المعرفة المشتركة",
        "Practical Action": "العمل التطبيقي",
        "Trust and Respect": "الثقة والاحترام",
        "The GloWe ecosystem": "منظومة GloWe",
        "A glimpse into the community": "لمحة عن المجتمع",
        "Read Community Posts": "اقرأ منشورات المجتمع",
        "Who is invited?": "من المدعو؟",
        "How GloWe is structured": "كيف تتكوّن GloWe",
        "User Roles": "أدوار المستخدمين",
        "Business Model": "نموذج العمل",
        "Development Roadmap": "خارطة طريق التطوير",
        "Trusted by the GloWe Community": "موضع ثقة مجتمع GloWe",
        "You have a place in this community.": "لك مكان في هذا المجتمع.",
        "Bring what you know. Ask for what you need. Meet people who are working, learning, building, and caring around the SDGs.": "أحضِر ما تعرفه. اطلب ما تحتاجه. التقِ بأشخاص يعملون ويتعلمون ويبنون ويهتمون حول أهداف التنمية المستدامة.",
        "Read Community": "اقرأ المجتمع",
        "Open Community": "افتح المجتمع",
        "Read What's Next": "اقرأ «ما التالي»",
        "See How This Could Grow": "شاهد كيف يمكن أن ينمو هذا",
        "Active threads will appear here once community members start discussions.": "ستظهر النقاشات النشطة هنا بمجرد أن يبدأ أعضاء المجتمع الحوار.",
        "Activity": "النشاط",
        "Add Project": "إضافة مشروع",
        "Advocacy": "المناصرة",
        "All areas": "كل المجالات",
        "All Fields": "كل المجالات",
        "All Groups": "كل المجموعات",
        "All Locations": "كل المواقع",
        "All regions": "كل المناطق",
        "All types": "كل الأنواع",
        "All Types": "كل الأنواع",
        "All wishes": "كل الأمنيات",
        "Applications": "الطلبات",
        "Apply for This Opportunity": "التقدّم لهذه الفرصة",
        "Apply Now": "تقدّم الآن",
        "Apply to opportunities or publish your own request for volunteers and collaborators.": "تقدّم للفرص أو انشر طلبك الخاص للمتطوعين والمتعاونين.",
        "Apply with your availability and relevant skills.": "تقدّم مع بيان مدى توفرك ومهاراتك ذات الصلة.",
        "Approve": "اعتماد",
        "Approve profiles that are ready, or send them back for changes.": "اعتمد الملفات الجاهزة، أو أعِدها لإجراء تعديلات.",
        "Arabic": "العربية",
        "Articles / media": "مقالات / وسائط",
        "As a member of the GloWe community, you agree not to:": "بصفتك عضوًا في مجتمع GloWe، فإنك توافق على عدم:",
        "Ask a real question, lead a focused space, share a file, or learn from people working through similar challenges.": "اطرح سؤالًا حقيقيًا، أو قُد مساحة متخصصة، أو شارك ملفًا، أو تعلّم ممن يواجهون تحديات مشابهة.",
        "Ask question": "طرح سؤال",
        "Ask, advise, lead": "اسأل، انصح، قُد",
        "Attach file": "إرفاق ملف",
        "Back to Community": "العودة إلى المجتمع",
        "Back to Feed": "العودة إلى التدفق",
        "Back to Wishing Well": "العودة إلى بئر الأمنيات",
        "Backend not configured": "لم يتم إعداد الخادم",
        "Based on GloWe content types": "استنادًا إلى أنواع المحتوى في GloWe",
        "Better matching": "مطابقة أفضل",
        "Both belong here. GloWe is built for mutual support, respectful collaboration, and the quiet relief of finding people who understand the journey.": "كلاهما ينتمي إلى هنا. بُنيت GloWe للدعم المتبادل والتعاون المحترم، ولذلك الارتياح الهادئ حين تجد من يفهم هذه الرحلة.",
        "Browse opportunities, save what matters, contact members, and offer your professional skills, time, resources, or lived experience.": "تصفّح الفرص، واحفظ ما يهمّك، وتواصل مع الأعضاء، وقدّم مهاراتك المهنية أو وقتك أو مواردك أو خبرتك الحياتية.",
        "Browse Organizations": "تصفّح المؤسسات",
        "Build trust through profiles, community review, and clear next steps": "ابنِ الثقة عبر الملفات الشخصية ومراجعة المجتمع وخطوات تالية واضحة",
        "Business-Social Collaboration": "تعاون بين القطاع التجاري والاجتماعي",
        "Businesses / CSR teams": "الشركات / فرق المسؤولية المجتمعية",
        "Businesses and partners": "الشركات والشركاء",
        "By using the platform, you agree that:": "باستخدامك المنصة، فإنك توافق على أن:",
        "Change": "تغيير",
        "Choose the right topic, add useful context, and publish it into the community feed.": "اختر الموضوع المناسب، وأضف سياقًا مفيدًا، وانشره في تدفق المجتمع.",
        "Civic Innovation": "الابتكار المدني",
        "Cleanup days worth repeating": "أيام تنظيف تستحق التكرار",
        "Clear": "مسح",
        "Clear filters": "مسح عوامل التصفية",
        "Climate": "المناخ",
        "Close": "إغلاق",
        "Comment": "تعليق",
        "comment": "تعليق",
        "comments": "تعليقات",
        "Commitment:": "الالتزام:",
        "Community Activity": "نشاط المجتمع",
        "Community Building": "بناء المجتمع",
        "Community feed": "تدفق المجتمع",
        "Community Feed": "تدفق المجتمع",
        "Community feed filters": "عوامل تصفية تدفق المجتمع",
        "Community first, technology second.": "المجتمع أولًا، والتقنية ثانيًا.",
        "Community Forums": "منتديات المجتمع",
        "Community home": "الصفحة الرئيسية للمجتمع",
        "Community integrity": "نزاهة المجتمع",
        "Community interactions": "التفاعلات المجتمعية",
        "Community managers": "مديرو المجتمع",
        "Community members with active contributions will be featured here.": "سيُعرض هنا أعضاء المجتمع أصحاب المساهمات النشطة.",
        "Community reinvestment": "إعادة الاستثمار في المجتمع",
        "Community reports": "بلاغات المجتمع",
        "Community reports will appear here.": "ستظهر بلاغات المجتمع هنا.",
        "Community review": "مراجعة المجتمع",
        "Community support board": "لوحة الدعم المجتمعي",
        "Community wishes": "أمنيات المجتمع",
        "Connect with social and environmental work through responsible collaboration, CSR, ESG, and shared value.": "تواصل مع العمل الاجتماعي والبيئي عبر التعاون المسؤول والمسؤولية المجتمعية ومعايير ESG والقيمة المشتركة.",
        "Connection suggestions": "اقتراحات للتواصل",
        "connections": "روابط",
        "Consultation request": "طلب استشارة",
        "Contact": "التواصل",
        "Content": "المحتوى",
        "Context": "السياق",
        "Could not load queue": "تعذّر تحميل القائمة",
        "Create a password": "أنشئ كلمة مرور",
        "Create a password (min 8 characters)": "أنشئ كلمة مرور (8 أحرف على الأقل)",
        "Create Account": "إنشاء حساب",
        "Create Your Profile": "أنشئ ملفك الشخصي",
        "Daily workspace": "مساحة عمل يومية",
        "Describe your relevant skills and experience...": "صِف مهاراتك وخبراتك ذات الصلة...",
        "Direct conversations with volunteers, organizations, and partners live here once you are signed in.": "ستظهر هنا المحادثات المباشرة مع المتطوعين والمؤسسات والشركاء بعد تسجيل الدخول.",
        "Direct conversations with volunteers, organizations, and partners.": "محادثات مباشرة مع المتطوعين والمؤسسات والشركاء.",
        "Direct messaging is coming soon": "الرسائل المباشرة قريبًا",
        "Discover organizations, initiatives, and partners sharing field knowledge and practical needs.": "اكتشف المؤسسات والمبادرات والشركاء الذين يشاركون معرفة الميدان والاحتياجات العملية.",
        "Discover People": "اكتشف أشخاصًا",
        "Discussion group": "مجموعة نقاش",
        "Discussion groups will appear here once they are set up.": "ستظهر مجموعات النقاش هنا بمجرد إنشائها.",
        "Discussion groups will appear here soon.": "ستظهر مجموعات النقاش هنا قريبًا.",
        "Discussion Groups": "مجموعات النقاش",
        "Dismiss": "إغلاق",
        "Distribution": "التوزيع",
        "Diverse people speaking around a round table at an impact community conference": "أشخاص متنوعون يتحدثون حول طاولة مستديرة في مؤتمر لمجتمع الأثر",
        "Document what happened after someone helped: what changed, what was learned, and what support is still needed.": "وثّق ما حدث بعد أن ساعدك أحدهم: ما الذي تغيّر، وما الذي تعلّمتموه، وما الدعم الذي ما زال مطلوبًا.",
        "Duration": "المدة",
        "Duration:": "المدة:",
        "Each community starts from its own reality: language, culture, needs, skills, and local leadership.": "كل مجتمع ينطلق من واقعه الخاص: اللغة والثقافة والاحتياجات والمهارات والقيادة المحلية.",
        "Each part of the system is here to help impact work become more visible, connected, and supported.": "كل جزء في هذه المنظومة موجود ليجعل العمل ذا الأثر أكثر وضوحًا وارتباطًا ودعمًا.",
        "Edit profile": "تعديل الملف الشخصي",
        "Edit Profile": "تعديل الملف الشخصي",
        "Edit your profile, add projects, track opportunities, and manage your community activity in one place.": "عدّل ملفك الشخصي، وأضف مشاريع، وتابع الفرص، وأدِر نشاطك المجتمعي في مكان واحد.",
        "Education": "التعليم",
        "Education, Climate, Health, Funding": "التعليم، المناخ، الصحة، التمويل",
        "Education, climate, mentors, Jerusalem...": "التعليم، المناخ، الموجّهون، القدس...",
        "Effective Date: May 30, 2026": "تاريخ السريان: 30 مايو 2026",
        "Environment": "البيئة",
        "Equipment / Space": "معدات / مساحة",
        "Evenings": "المساءات",
        "Events": "الفعاليات",
        "Every connection can end with a short outcome update.": "يمكن أن ينتهي كل تواصل بتحديث قصير عن النتيجة.",
        "Everyone": "الجميع",
        "Example: Grant proposal checklist for small NGOs": "مثال: قائمة تحقق لمقترح منحة للمنظمات الصغيرة",
        "Explore Community": "استكشف المجتمع",
        "Explore possible collaborations": "استكشف التعاونات الممكنة",
        "Explore possible connections between needs, skills, organizations, and people. Each suggestion is an invitation to read, ask, and decide together.": "استكشف الروابط الممكنة بين الاحتياجات والمهارات والمؤسسات والأشخاص. كل اقتراح هو دعوة للقراءة والسؤال واتخاذ القرار معًا.",
        "Fetching organizations awaiting verification.": "جارٍ جلب المؤسسات التي تنتظر التحقق.",
        "Field knowledge becomes easier to find, translate, discuss, and reuse across communities.": "تصبح معرفة الميدان أسهل في الإيجاد والترجمة والنقاش وإعادة الاستخدام بين المجتمعات.",
        "Field stories, questions, support offers, updates, and open calls": "قصص من الميدان، وأسئلة، وعروض دعم، وتحديثات، ودعوات مفتوحة",
        "Field update": "تحديث من الميدان",
        "Field wisdom, professional tools, lived experience, and multilingual learning all have value here.": "حكمة الميدان والأدوات المهنية والخبرة الحياتية والتعلّم متعدد اللغات، كلها ذات قيمة هنا.",
        "Field:": "المجال:",
        "Filter by region, profile type, or keywords connected to mission, field, needs, and projects.": "صفِّ حسب المنطقة أو نوع الملف الشخصي أو الكلمات المفتاحية المرتبطة بالرسالة والمجال والاحتياجات والمشاريع.",
        "Find a Group": "ابحث عن مجموعة",
        "Find My Path": "اعثر على مساري",
        "Find or publish practical volunteer, work, and collaboration opportunities for social impact projects.": "اعثر على فرص تطوع وعمل وتعاون عملية لمشاريع الأثر الاجتماعي أو انشرها.",
        "Find people who understand your cause, help shape your next step, and make your work visible.": "اعثر على أشخاص يفهمون قضيتك، ويساعدونك في تشكيل خطوتك التالية، ويجعلون عملك مرئيًا.",
        "Find projects, organizations, volunteers, experts, and practical needs": "اعثر على مشاريع ومؤسسات ومتطوعين وخبراء واحتياجات عملية",
        "Find the right people": "اعثر على الأشخاص المناسبين",
        "Find the right request": "اعثر على الطلب المناسب",
        "Find where your skills can help.": "اعثر على المكان الذي يمكن لمهاراتك أن تساعد فيه.",
        "Flexible": "مرن",
        "Follow the work, ask, offer, and connect.": "تابع العمل، واسأل، وقدّم، وتواصل.",
        "Follow updates": "متابعة التحديثات",
        "Follow Updates": "متابعة التحديثات",
        "Food Security": "الأمن الغذائي",
        "For questions, support, or concerns, please reach out:": "للأسئلة أو الدعم أو الملاحظات، يرجى التواصل:",
        "For you": "لك",
        "Forum Leaders": "قادة المنتديات",
        "Forum leadership offer": "عرض لقيادة منتدى",
        "Full Name": "الاسم الكامل",
        "Full-time": "دوام كامل",
        "Funding preparation": "التحضير للتمويل",
        "Funding Support": "الدعم التمويلي",
        "Global": "عالمي",
        "GloWe - Global Collaboration for Social Impact": "GloWe - تعاون عالمي من أجل الأثر الاجتماعي",
        "GloWe begins as a simple MVP: profiles, posts, wishes, opportunities, and conversations. From here, we want to grow carefully, with local communities, field knowledge, and technology that serves people.": "تبدأ GloWe كنسخة أولية بسيطة: ملفات شخصية ومنشورات وأمنيات وفرص ومحادثات. ومن هنا نريد أن ننمو بعناية، مع المجتمعات المحلية ومعرفة الميدان وتقنية تخدم الناس.",
        "GloWe community promise": "وعد مجتمع GloWe",
        "GloWe community value system": "منظومة قيم مجتمع GloWe",
        "GloWe does not guarantee uninterrupted access or availability.": "لا تضمن GloWe وصولًا أو توافرًا دون انقطاع.",
        "GloWe is built for people who meet, listen, offer, ask, and turn local experience into practical collaboration.": "بُنيت GloWe لأشخاص يلتقون ويستمعون ويقدّمون ويسألون ويحوّلون الخبرة المحلية إلى تعاون عملي.",
        "GloWe is not liable for losses resulting from interruptions, errors, or misuse of the platform.": "لا تتحمل GloWe المسؤولية عن الخسائر الناتجة عن الانقطاعات أو الأخطاء أو سوء استخدام المنصة.",
        "GloWe is open to all people and organizations, regardless of age, geography, identity, or legal status.": "GloWe مفتوحة لجميع الأفراد والمؤسسات، بغض النظر عن العمر أو الموقع الجغرافي أو الهوية أو الوضع القانوني.",
        "GloWe may include links to external platforms or tools. We are not responsible for the content, privacy, or reliability of third-party services. Use them at your discretion.": "قد تتضمن GloWe روابط لمنصات أو أدوات خارجية. نحن غير مسؤولين عن محتوى خدمات الطرف الثالث أو خصوصيتها أو موثوقيتها. استخدمها وفق تقديرك.",
        "GloWe may suspend or terminate accounts that violate these Terms or the Community Integrity Charter.": "يجوز لـ GloWe تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط أو ميثاق نزاهة المجتمع.",
        "GloWe Member": "عضو في GloWe",
        "GloWe reserves the right to:": "تحتفظ GloWe بالحق في:",
        "GloWe respects your privacy. Personal data will only be used to improve your experience and build relevant connections.": "تحترم GloWe خصوصيتك. لن تُستخدم البيانات الشخصية إلا لتحسين تجربتك وبناء روابط ذات صلة.",
        "GloWe will not sell or license your content to external commercial entities without explicit consent.": "لن تبيع GloWe محتواك أو ترخّصه لجهات تجارية خارجية دون موافقة صريحة.",
        "GloWe works through local roots, professional support, and global exchange.": "تعمل GloWe عبر الجذور المحلية والدعم المهني والتبادل العالمي.",
        "Good intentions become stronger when they are connected to clear needs, real people, and concrete next steps.": "تزداد النوايا الطيبة قوة حين ترتبط باحتياجات واضحة وأشخاص حقيقيين وخطوات تالية ملموسة.",
        "Grant match": "مطابقة منحة",
        "Grey knowledge library": "مكتبة المعرفة الرمادية",
        "Group Actions": "إجراءات المجموعة",
        "Groups": "المجموعات",
        "Groups that want to document their work, find collaborators, and ask for concrete support.": "مجموعات ترغب في توثيق عملها وإيجاد متعاونين وطلب دعم ملموس.",
        "Haifa": "حيفا",
        "Health": "الصحة",
        "Healthy moderation rules": "قواعد إشراف صحية",
        "Help communities turn field experience into practical guides, short case studies, templates, and translated resources.": "ساعد المجتمعات على تحويل خبرة الميدان إلى أدلة عملية ودراسات حالة قصيرة وقوالب وموارد مترجمة.",
        "Help shape what comes next.": "ساهم في تشكيل ما سيأتي.",
        "Helpers explain what they can provide, availability, and conditions.": "يوضّح المساعدون ما يمكنهم تقديمه ومدى توفرهم وشروطهم.",
        "Hidden content": "محتوى مخفي",
        "Hidden items": "عناصر مخفية",
        "Hide Item": "إخفاء العنصر",
        "Hide Profile": "إخفاء الملف الشخصي",
        "How success is understood": "كيف يُفهم النجاح",
        "How the post will feel in the feed": "كيف سيبدو المنشور في التدفق",
        "I am a": "أنا",
        "I Can Help": "يمكنني المساعدة",
        "If you are under the legal age of majority in your country, you are using GloWe under the guidance of a mentor, parent, or educational framework.": "إذا كنت دون سن الرشد القانوني في بلدك، فإنك تستخدم GloWe تحت إشراف موجّه أو أحد الوالدين أو إطار تعليمي.",
        "If you witness misconduct, misinformation, or harm, report it. Use the Report button on profiles or reach out to us directly. All reports are reviewed with care and confidentiality.": "إذا لاحظت سوء سلوك أو معلومات مضللة أو ضررًا، فأبلغ عنه. استخدم زر الإبلاغ في الملفات الشخصية أو تواصل معنا مباشرة. تُراجع جميع البلاغات بعناية وسرية.",
        "Impact approach": "نهج الأثر",
        "Impact area": "مجال الأثر",
        "Impact areas": "مجالات الأثر",
        "Impact Areas": "مجالات الأثر",
        "Impact field": "مجال الأثر",
        "Impact follow-up": "متابعة الأثر",
        "Impact Signals": "مؤشرات الأثر",
        "Impact so far": "الأثر حتى الآن",
        "Impact stories": "قصص الأثر",
        "In cases of legal violations, authorities may be notified.": "في حالات المخالفات القانونية، قد يتم إبلاغ الجهات المختصة.",
        "Interaction": "التفاعل",
        "Israel": "إسرائيل",
        "Items hidden by admin review can be restored while this MVP uses local storage.": "يمكن استعادة العناصر التي أخفتها مراجعة الإدارة ما دامت هذه النسخة الأولية تستخدم التخزين المحلي.",
        "Items removed by admin will be listed here.": "ستُدرج هنا العناصر التي أزالتها الإدارة.",
        "Jerusalem": "القدس",
        "Join Group": "الانضمام إلى المجموعة",
        "Join requests": "طلبات الانضمام",
        "Join the MVP": "انضم إلى النسخة الأولية",
        "Join the Volunteer Network and find places where your skills, experience, language, or care can make someone else's work lighter.": "انضم إلى شبكة المتطوعين واعثر على أماكن يمكن فيها لمهاراتك أو خبرتك أو لغتك أو اهتمامك أن يخفف عبء عمل شخص آخر.",
        "Join with experience, questions, resources, or a willingness to help.": "انضم بخبرة أو أسئلة أو موارد أو استعداد للمساعدة.",
        "Keep the community safe and trustworthy.": "حافظ على مجتمع آمن وجدير بالثقة.",
        "Knowledge": "المعرفة",
        "Knowledge Seekers": "الباحثون عن المعرفة",
        "Knowledge Sharing": "تبادل المعرفة",
        "Languages": "اللغات",
        "Learn More": "اعرف المزيد",
        "Like": "إعجاب",
        "Limit access or features in cases of harm, spam, or manipulation.": "تقييد الوصول أو الميزات في حالات الضرر أو الرسائل المزعجة أو التلاعب.",
        "Live needs": "احتياجات قائمة",
        "Loading...": "جارٍ التحميل...",
        "Loading…": "جارٍ التحميل…",
        "Loading your profile…": "جارٍ تحميل ملفك الشخصي…",
        "Uploading image...": "جارٍ رفع الصورة...",
        "Please choose an image file.": "يرجى اختيار ملف صورة.",
        "Image must be under 5 MB.": "يجب أن يكون حجم الصورة أقل من 5 ميغابايت.",
        "Optional. JPG, PNG or WebP, up to 5 MB.": "اختياري. JPG أو PNG أو WebP، حتى 5 ميغابايت.",
        "Applicants": "المتقدّمون",
        "Loading applicants…": "جارٍ تحميل المتقدّمين…",
        "Could not load applicants.": "تعذّر تحميل المتقدّمين.",
        "No applications yet.": "لا توجد طلبات بعد.",
        "Accept": "قبول",
        "Decline": "رفض",
        "Could not update the application. Please try again.": "تعذّر تحديث الطلب. يرجى المحاولة مرة أخرى.",
        "Offers": "عروض المساعدة",
        "Loading offers…": "جارٍ تحميل العروض…",
        "Could not load offers.": "تعذّر تحميل العروض.",
        "No offers yet.": "لا توجد عروض بعد.",
        "Preferred contact:": "وسيلة التواصل المفضّلة:",
        "Email copied to clipboard": "تم نسخ البريد الإلكتروني إلى الحافظة",
        "Could not copy the email.": "تعذّر نسخ البريد الإلكتروني.",
        "GloWe volunteer": "متطوع في GloWe",
        "Availability:": "التوفر:",
        "Skills:": "المهارات:",
        "Motivation:": "الدافع:",
        "Local community circles": "دوائر المجتمع المحلي",
        "Local organizations, initiatives, residents, volunteers, and partners bring the real context: what is needed, what already works, who should be involved, and what kind of support would actually help.": "تجلب المؤسسات والمبادرات المحلية والسكان والمتطوعون والشركاء السياق الحقيقي: ما المطلوب، وما الذي ينجح فعلًا، ومن ينبغي إشراكه، وأي نوع من الدعم سيفيد حقًا.",
        "Local roots": "جذور محلية",
        "Location": "الموقع",
        "Location:": "الموقع:",
        "Looking for Mentors": "نبحث عن موجّهين",
        "Low-bandwidth friendly": "مناسب لاتصال الإنترنت البطيء",
        "Make it easier to connect a need with the right volunteer, professional skill, organization, donor, or partner.": "تسهيل ربط الاحتياج بالمتطوع أو المهارة المهنية أو المؤسسة أو الجهة المانحة أو الشريك المناسب.",
        "Mark Reviewed": "وضع علامة تمت المراجعة",
        "Measurement and learning": "القياس والتعلّم",
        "Members": "الأعضاء",
        "Members will appear here once they join this group.": "سيظهر الأعضاء هنا بمجرد انضمامهم إلى هذه المجموعة.",
        "Message": "رسالة",
        "Message author": "مراسلة الكاتب",
        "Message publisher": "مراسلة الناشر",
        "Message sent": "تم إرسال الرسالة",
        "Your message was delivered. The organization can follow up with you.": "تم تسليم رسالتك. يمكن للمؤسسة متابعة التواصل معك.",
        "Could not send message": "تعذّر إرسال الرسالة",
        "Something went wrong sending your message. Please try again.": "حدث خطأ أثناء إرسال رسالتك. يرجى المحاولة مرة أخرى.",
        "Reach Out": "تواصل",
        "Send Message": "إرسال رسالة",
        "Send a short message to start a conversation with this organization.": "أرسل رسالة قصيرة لبدء محادثة مع هذه المؤسسة.",
        "Introduce yourself and explain how you would like to collaborate.": "عرّف بنفسك ووضّح كيف تودّ التعاون.",
        "Sign in to reach out": "سجّل الدخول للتواصل",
        "Please sign in or create a free account to message this organization.": "يرجى تسجيل الدخول أو إنشاء حساب مجاني لمراسلة هذه المؤسسة.",
        "Messaging needs a live connection right now. Please try again shortly.": "تتطلب المراسلة اتصالًا نشطًا في الوقت الحالي. يرجى المحاولة بعد قليل.",
        "Missing details": "تفاصيل ناقصة",
        "Backend unavailable": "الخدمة غير متاحة",
        "Messages": "الرسائل",
        "Methods / approaches": "الأساليب / المقاربات",
        "Moderate discussions in order to keep the space constructive, safe, and impact-driven.": "أشرف على النقاشات للحفاظ على مساحة بنّاءة وآمنة وموجّهة نحو الأثر.",
        "Multilingual": "متعدد اللغات",
        "Needs": "الاحتياجات",
        "Needs Changes": "يحتاج إلى تعديلات",
        "New post": "منشور جديد",
        "New submitted profiles will appear here for review.": "ستظهر هنا الملفات الشخصية المُرسلة حديثًا للمراجعة.",
        "No applications yet": "لا توجد طلبات بعد",
        "No community posts yet.": "لا توجد منشورات مجتمعية بعد.",
        "No hidden items": "لا توجد عناصر مخفية",
        "No matching opportunities yet. This is where open roles and collaboration requests will appear.": "لا توجد فرص مطابقة بعد. هنا ستظهر الأدوار المفتوحة وطلبات التعاون.",
        "No matching profiles yet": "لا توجد ملفات شخصية مطابقة بعد",
        "No opportunities found": "لم يتم العثور على فرص",
        "No pending organizations": "لا توجد مؤسسات قيد الانتظار",
        "No pending profiles": "لا توجد ملفات شخصية قيد الانتظار",
        "No posts match this view yet": "لا توجد منشورات تطابق هذا العرض بعد",
        "No projects listed yet.": "لم تُدرج مشاريع بعد.",
        "No projects yet. Add your first project.": "لا توجد مشاريع بعد. أضف مشروعك الأول.",
        "No replies yet. Be the first to respond.": "لا توجد ردود بعد. كن أول من يردّ.",
        "None specified for this opportunity.": "لم يُحدَّد شيء لهذه الفرصة.",
        "No reports yet": "لا توجد بلاغات بعد",
        "No results": "لا توجد نتائج",
        "No saved items yet": "لا توجد عناصر محفوظة بعد",
        "No threads yet": "لا توجد نقاشات بعد",
        "No wishes found": "لم يتم العثور على أمنيات",
        "Notification Preferences": "تفضيلات الإشعارات",
        "Offer skills, time, translation, mentoring, design, legal help, tech, research, or field knowledge.": "قدّم مهارات أو وقتًا أو ترجمة أو توجيهًا أو تصميمًا أو مساعدة قانونية أو تقنية أو بحثًا أو معرفة ميدانية.",
        "Offer Support": "تقديم الدعم",
        "Open": "مفتوح",
        "Open a Question": "طرح سؤال",
        "Open Call": "دعوة مفتوحة",
        "Open Forums": "افتح المنتديات",
        "Open Needs": "احتياجات مفتوحة",
        "Open Playbook": "افتح الدليل",
        "Open reports": "بلاغات مفتوحة",
        "Open Volunteer Network": "افتح شبكة المتطوعين",
        "Open wish details": "افتح تفاصيل الأمنية",
        "Open wishes": "أمنيات مفتوحة",
        "open wishes are waiting for the right support.": "أمنيات مفتوحة تنتظر الدعم المناسب.",
        "Open wishes, opportunities, posts, and discussions around real work": "أمنيات وفرص ومنشورات ونقاشات مفتوحة حول عمل حقيقي",
        "Opportunities & Applications": "الفرص والطلبات",
        "Opportunities & collaboration": "الفرص والتعاون",
        "Opportunity title": "عنوان الفرصة",
        "Opportunity type": "نوع الفرصة",
        "Optional link": "رابط (اختياري)",
        "Organization filters": "عوامل تصفية المؤسسات",
        "Organization or project": "مؤسسة أو مشروع",
        "Organization Representative": "ممثل المؤسسة",
        "Organization review is available once the shared backend is connected.": "تتوفر مراجعة المؤسسات بعد توصيل الخادم المشترك.",
        "Organizations & Companies": "المؤسسات والشركات",
        "Organizations and NGOs": "المؤسسات والمنظمات غير الحكومية",
        "Organizations and partners are reviewed before sensitive actions.": "تُراجع المؤسسات والشركاء قبل الإجراءات الحساسة.",
        "Organizations awaiting verification. Approve serious requests; rejected ones stay view-only.": "مؤسسات تنتظر التحقق. اعتمد الطلبات الجادة؛ أما المرفوضة فتبقى للاطّلاع فقط.",
        "Organize possible grants and next steps": "نظّم المنح الممكنة والخطوات التالية",
        "Overview": "نظرة عامة",
        "Paid Full-time Role": "دور بدوام كامل مدفوع",
        "Part-time": "دوام جزئي",
        "Part-time Role": "دور بدوام جزئي",
        "Participation signals": "مؤشرات المشاركة",
        "Partnership Opportunity": "فرصة شراكة",
        "Password": "كلمة المرور",
        "Pending organizations": "مؤسسات قيد الانتظار",
        "Pending profiles": "ملفات شخصية قيد الانتظار",
        "Pending verification": "بانتظار التحقق",
        "People already acting in their communities and looking for allies, knowledge, or visibility.": "أشخاص يعملون بالفعل في مجتمعاتهم ويبحثون عن حلفاء أو معرفة أو ظهور.",
        "People looking for practical examples, field lessons, and ways to learn from what already works.": "أشخاص يبحثون عن أمثلة عملية ودروس من الميدان وطرق للتعلّم مما ينجح بالفعل.",
        "People who can offer time, translation, design, research, facilitation, mentoring, or professional skills.": "أشخاص يمكنهم تقديم الوقت أو الترجمة أو التصميم أو البحث أو التيسير أو التوجيه أو مهارات مهنية.",
        "Please refresh and try again.": "يرجى تحديث الصفحة والمحاولة مرة أخرى.",
        "Possible next steps": "خطوات تالية ممكنة",
        "Post": "نشر",
        "Post a clear need in the Wishing Well: volunteers, partners, knowledge, visibility, tools, space, or practical advice.": "انشر احتياجًا واضحًا في بئر الأمنيات: متطوعون أو شركاء أو معرفة أو ظهور أو أدوات أو مساحة أو نصيحة عملية.",
        "Post a Need": "نشر احتياج",
        "Post a need. Find a helper. Build impact.": "انشر احتياجًا. اعثر على مساعد. اصنع أثرًا.",
        "Post false, misleading, discriminatory, hateful, or violent content.": "نشر محتوى كاذب أو مضلل أو تمييزي أو يحضّ على الكراهية أو عنيف.",
        "Post need": "نشر احتياج",
        "Post Opportunity": "نشر فرصة",
        "Post title": "عنوان المنشور",
        "Post Topics": "مواضيع المنشور",
        "Post type": "نوع المنشور",
        "posts": "منشورات",
        "Posts": "المنشورات",
        "Posts you write in the community will appear here.": "ستظهر هنا المنشورات التي تكتبها في المجتمع.",
        "Posts, profiles, wishes, and opportunities you want to return to later.": "منشورات وملفات شخصية وأمنيات وفرص تريد العودة إليها لاحقًا.",
        "Practical guides and field lessons": "أدلة عملية ودروس من الميدان",
        "Prepare a clearer post or campaign draft": "جهّز مسودة منشور أو حملة أكثر وضوحًا",
        "Present your mission, projects, fields of action, SDGs, needs, and the kind of collaborations you are open to.": "اعرض رسالتك ومشاريعك ومجالات عملك وأهداف التنمية المستدامة واحتياجاتك ونوع التعاون الذي أنت منفتح عليه.",
        "Pretend to be someone else.": "انتحال شخصية شخص آخر.",
        "Preview": "معاينة",
        "Private conversations between volunteers, organizations, and partners are on the way. In the meantime, you can reach an organization from its profile.": "المحادثات الخاصة بين المتطوعين والمؤسسات والشركاء في الطريق. في هذه الأثناء، يمكنك التواصل مع مؤسسة من خلال ملفها الشخصي.",
        "Professionals, mentors, facilitators, service providers, and experienced practitioners can offer advice, services, office hours, forum leadership, tools, and practical guidance.": "يمكن للمهنيين والموجّهين والميسّرين ومقدّمي الخدمات وذوي الخبرة تقديم المشورة والخدمات وساعات مكتبية وقيادة المنتديات وأدوات وإرشادات عملية.",
        "Profile actions": "إجراءات الملف الشخصي",
        "Profile From Questionnaire": "ملف شخصي من الاستبيان",
        "Profile not found": "لم يتم العثور على الملف الشخصي",
        "Profile snapshot": "لمحة عن الملف الشخصي",
        "Profile summary": "ملخص الملف الشخصي",
        "Profiles": "الملفات الشخصية",
        "Profiles, posts, messages, and collaborations should support dignity, transparency, and responsible community care.": "ينبغي أن تدعم الملفات الشخصية والمنشورات والرسائل والتعاونات الكرامة والشفافية والرعاية المجتمعية المسؤولة.",
        "Project-based": "قائم على مشروع",
        "Project-based Collaboration": "تعاون قائم على مشروع",
        "Projects": "المشاريع",
        "My Needs": "احتياجاتي",
        "No needs yet. Share what would help on the Wishing Well.": "لا توجد احتياجات بعد. شارك ما الذي سيساعدك في بئر الأمنيات.",
        "My Posts": "منشوراتي",
        "No posts yet. Share an update with the community.": "لا توجد منشورات بعد. شارك تحديثًا مع المجتمع.",
        "My Opportunities": "فرصي",
        "No opportunities yet. Publish one on the Volunteer Network.": "لا توجد فرص بعد. انشر واحدة في شبكة المتطوعين.",
        "My Offers": "عروضي",
        "No offers yet. Help someone by responding to a wish.": "لا توجد عروض بعد. ساعد أحدهم بالاستجابة لأمنية.",
        "Browse Wishes": "تصفّح الأمنيات",
        "Public links": "روابط عامة",
        "Publish a volunteer role": "انشر دورًا تطوعيًا",
        "Publish an opportunity": "انشر فرصة",
        "Publish Opportunity": "نشر الفرصة",
        "Publish Thread": "نشر النقاش",
        "Publish to Community Feed": "النشر في تدفق المجتمع",
        "Publish to Feed": "النشر في التدفق",
        "Publish to Forum": "النشر في المنتدى",
        "Question": "سؤال",
        "Question title": "عنوان السؤال",
        "Questions": "الأسئلة",
        "Ramat Gan, Israel": "رمات غان، إسرائيل",
        "Read posts, ask questions, respond with care, and meet others who are also building social and environmental change.": "اقرأ المنشورات، واطرح الأسئلة، وردّ باهتمام، والتقِ بآخرين يبنون أيضًا تغييرًا اجتماعيًا وبيئيًا.",
        "Ready to Make an Impact?": "مستعد لصنع الأثر؟",
        "Ready to offer your time, skills, mentoring, translation, design, legal help, or field knowledge? Enter the volunteer space and find the right role.": "مستعد لتقديم وقتك أو مهاراتك أو توجيهك أو ترجمتك أو تصميمك أو مساعدتك القانونية أو معرفتك الميدانية؟ ادخل مساحة التطوع واعثر على الدور المناسب.",
        "Recent Activity": "النشاط الأخير",
        "Recognition in GloWe is about visible contribution, not empty ranking. Signals stay tied to documented activity, trust, and community review.": "التقدير في GloWe يتعلق بالمساهمة المرئية، لا بترتيب فارغ. تبقى المؤشرات مرتبطة بنشاط موثّق وثقة ومراجعة من المجتمع.",
        "Recognize visible contribution": "قدّر المساهمة المرئية",
        "Refine": "تحسين",
        "Region": "المنطقة",
        "Registration, article, drive folder, or resource link": "تسجيل أو مقال أو مجلد على درايف أو رابط لمورد",
        "Reject": "رفض",
        "Relevant Skills & Experience": "المهارات والخبرات ذات الصلة",
        "Remote": "عن بُعد",
        "Remote tutors and safety": "المعلّمون عن بُعد والسلامة",
        "Remove": "إزالة",
        "Remove content that violates these terms or values.": "إزالة المحتوى الذي ينتهك هذه الشروط أو القيم.",
        "Reply": "ردّ",
        "Report": "إبلاغ",
        "Reports from users who saw something inaccurate, harmful, or inappropriate.": "بلاغات من مستخدمين رأوا شيئًا غير دقيق أو ضارًا أو غير لائق.",
        "Repost": "إعادة نشر",
        "Requirements": "المتطلبات",
        "Resource / file": "مورد / ملف",
        "Resource Request": "طلب مورد",
        "Responsibilities": "المسؤوليات",
        "Responsible tools": "أدوات مسؤولة",
        "Restore": "استعادة",
        "Review Impact": "مراجعة الأثر",
        "Review new profile submissions, respond to reports, and hide content that does not fit the GloWe community standards.": "راجع الملفات الشخصية الجديدة، واستجب للبلاغات، وأخفِ المحتوى الذي لا يتوافق مع معايير مجتمع GloWe.",
        "Reviewers only": "للمراجعين فقط",
        "Round tables, shared knowledge.": "طاولات مستديرة، ومعرفة مشتركة.",
        "Save": "حفظ",
        "Save Draft": "حفظ المسودة",
        "Save opportunity": "حفظ الفرصة",
        "Save Opportunity": "حفظ الفرصة",
        "Delete post": "حذف المنشور",
        "Delete": "حذف",
        "Post deleted": "تم حذف المنشور",
        "Your post was removed from the community feed.": "تمت إزالة منشورك من تدفق المجتمع.",
        "Could not delete": "تعذّر الحذف",
        "Something went wrong deleting your post. Please try again.": "حدث خطأ أثناء حذف منشورك. يرجى المحاولة مرة أخرى.",
        "Copy link": "نسخ الرابط",
        "Link copied": "تم نسخ الرابط",
        "The post link is on your clipboard — share it anywhere.": "رابط المنشور في الحافظة — شاركه في أي مكان.",
        "Copy this link": "انسخ هذا الرابط",
        "Save post": "حفظ المنشور",
        "Save posts, profiles, and opportunities to return to them from this screen.": "احفظ المنشورات والملفات الشخصية والفرص للعودة إليها من هذه الشاشة.",
        "Save posts, profiles, wishes, and opportunities to return to them from here.": "احفظ المنشورات والملفات الشخصية والأمنيات والفرص للعودة إليها من هنا.",
        "Save Profile": "حفظ الملف الشخصي",
        "Save the opportunity if you want to compare it later.": "احفظ الفرصة إذا أردت مقارنتها لاحقًا.",
        "Save wish": "حفظ الأمنية",
        "Saved": "محفوظ",
        "Sign in or create a free account to save items to your area.": "سجّل الدخول أو أنشئ حسابًا مجانيًا لحفظ العناصر في منطقتك.",
        "Saved items": "العناصر المحفوظة",
        "Saved Items": "العناصر المحفوظة",
        "Scope": "النطاق",
        "SDG focus areas": "مجالات التركيز في أهداف التنمية المستدامة",
        "Search": "بحث",
        "Search by city or region": "ابحث حسب المدينة أو المنطقة",
        "Search keywords": "ابحث بالكلمات المفتاحية",
        "Search opportunities...": "ابحث في الفرص...",
        "Search organizations, companies, and initiatives": "ابحث في المؤسسات والشركات والمبادرات",
        "Search posts, topics, people, or needs...": "ابحث في المنشورات أو المواضيع أو الأشخاص أو الاحتياجات...",
        "Search volunteer roles...": "ابحث في الأدوار التطوعية...",
        "See how members participate": "شاهد كيف يشارك الأعضاء",
        "See where help is needed": "شاهد أين تُطلب المساعدة",
        "Select your availability": "حدّد مدى توفرك",
        "Select your role": "حدّد دورك",
        "Send": "إرسال",
        "Share": "مشاركة",
        "Share a volunteer role, paid role, mentorship request, or project-based collaboration with the GloWe community.": "شارك دورًا تطوعيًا أو وظيفة مدفوعة أو طلب توجيه أو تعاونًا قائمًا على مشروع مع مجتمع GloWe.",
        "Share applied field knowledge in a format others can understand and use": "شارك معرفة ميدانية تطبيقية بصيغة يمكن للآخرين فهمها واستخدامها",
        "Share enough context so others can give useful, respectful advice.": "شارك سياقًا كافيًا حتى يتمكن الآخرون من تقديم نصيحة مفيدة ومحترمة.",
        "Share private or sensitive information without consent.": "مشاركة معلومات خاصة أو حساسة دون موافقة.",
        "Share your motivation for applying...": "شارك دافعك للتقدّم...",
        "Shared knowledge": "معرفة مشتركة",
        "Shared learning": "تعلّم مشترك",
        "Sharing tools": "أدوات المشاركة",
        "Short description": "وصف مختصر",
        "Show your mission, projects, needs, opportunities, and the impact areas you work in.": "اعرض رسالتك ومشاريعك واحتياجاتك وفرصك ومجالات الأثر التي تعمل فيها.",
        "Sign in to see your messages": "سجّل الدخول لعرض رسائلك",
        "Skills Needed": "المهارات المطلوبة",
        "Skills or tags": "مهارات أو وسوم",
        "Social Activists": "ناشطون اجتماعيون",
        "Social initiatives": "مبادرات اجتماعية",
        "Social Justice": "العدالة الاجتماعية",
        "Social links": "روابط التواصل الاجتماعي",
        "Sometimes you give. Sometimes you need help.": "أحيانًا تعطي. وأحيانًا تحتاج إلى مساعدة.",
        "Spam the platform or use it for purely promotional or exploitative purposes.": "إغراق المنصة برسائل مزعجة أو استخدامها لأغراض ترويجية أو استغلالية بحتة.",
        "Start a practical consultation": "ابدأ استشارة عملية",
        "Start a thread": "ابدأ نقاشًا",
        "Start Conversation": "بدء محادثة",
        "Start the first conversation in this group.": "ابدأ أول محادثة في هذه المجموعة.",
        "Start from one useful action": "ابدأ بإجراء مفيد واحد",
        "Start with one useful post, one profile, one wish, or one opportunity.": "ابدأ بمنشور مفيد واحد، أو ملف شخصي واحد، أو أمنية واحدة، أو فرصة واحدة.",
        "Structured offers": "عروض منظّمة",
        "Submit Application": "إرسال الطلب",
        "Support groups around a city, village, school, organization, or SDG topic. Each circle can gather needs, resources, events, and trusted members.": "مجموعات دعم حول مدينة أو قرية أو مدرسة أو مؤسسة أو موضوع من أهداف التنمية المستدامة. يمكن لكل دائرة أن تجمع الاحتياجات والموارد والفعاليات والأعضاء الموثوقين.",
        "Support multilingual access so knowledge is not limited to English-speaking spaces": "ادعم الوصول متعدد اللغات حتى لا تقتصر المعرفة على المساحات الناطقة بالإنجليزية",
        "Suspend or block users who repeatedly abuse the platform.": "تعليق أو حظر المستخدمين الذين يسيئون استخدام المنصة بشكل متكرر.",
        "Tags": "الوسوم",
        "Tech for Good": "التقنية من أجل الخير",
        "Technology": "التقنية",
        "Technology for good": "التقنية من أجل الخير",
        "Technology should reduce friction, not create distance. It should help people act with more clarity, trust, and care.": "ينبغي للتقنية أن تقلّل الاحتكاك لا أن تخلق مسافة. عليها أن تساعد الناس على التصرف بمزيد من الوضوح والثقة والاهتمام.",
        "Tel Aviv": "تل أبيب",
        "Terms of Use - GloWe": "شروط الاستخدام - GloWe",
        "Terms of Use & Community Integrity Charter": "شروط الاستخدام وميثاق نزاهة المجتمع",
        "The information you provide is accurate and honest.": "المعلومات التي تقدّمها دقيقة وصادقة.",
        "The MVP is here so we can learn with you: what helps, what is missing, and what should be built with care.": "النسخة الأولية موجودة لنتعلم معك: ما الذي يساعد، وما الذي ينقص، وما الذي ينبغي بناؤه بعناية.",
        "The next versions of GloWe should support local circles: people who meet around a real place, a real need, and a shared SDG challenge. Each local community can gather stories, tools, resources, and lessons that others may adapt.": "ينبغي أن تدعم النسخ القادمة من GloWe الدوائر المحلية: أشخاص يلتقون حول مكان حقيقي واحتياج حقيقي وتحدٍّ مشترك من أهداف التنمية المستدامة. يمكن لكل مجتمع محلي أن يجمع قصصًا وأدوات وموارد ودروسًا قد يقتبسها آخرون.",
        "The organization receives your message and can continue in GloWe messages.": "تتلقى المؤسسة رسالتك ويمكنها المتابعة عبر رسائل GloWe.",
        "The topic tag will appear next to your name in the feed, and the post is saved into the community stream.": "سيظهر وسم الموضوع بجانب اسمك في التدفق، ويُحفظ المنشور في تيار المجتمع.",
        "The Wishing Well is the action layer of GloWe: verified requests, relevant helpers, and clear next steps after someone offers support.": "بئر الأمنيات هو طبقة العمل في GloWe: طلبات موثّقة، ومساعدون مناسبون، وخطوات تالية واضحة بعد أن يعرض أحدهم الدعم.",
        "These are directions, not promises. We will build them gradually, with community feedback.": "هذه توجهات لا وعود. سنبنيها تدريجيًا، بملاحظات المجتمع.",
        "These Terms of Use & Community Integrity Charter may be updated occasionally. We will notify users of significant changes via email or platform notifications. Continued use signifies your agreement to the latest version.": "قد تُحدَّث شروط الاستخدام وميثاق نزاهة المجتمع من حين لآخر. سنُعلم المستخدمين بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعارات المنصة. ويعني استمرار الاستخدام موافقتك على أحدث نسخة.",
        "This includes use in personalization, recommendation systems, and platform features built to enhance the GloWe user experience only.": "يشمل ذلك الاستخدام في التخصيص وأنظمة التوصية وميزات المنصة المصممة حصريًا لتحسين تجربة المستخدم في GloWe.",
        "This is not a marketplace. It is a shared space. Ask for help. Offer help. Celebrate others' work. Seek connection, not extraction.": "هذا ليس سوقًا. إنه مساحة مشتركة. اطلب المساعدة. قدّم المساعدة. احتفِ بعمل الآخرين. ابحث عن التواصل لا عن الاستغلال.",
        "This profile is not available yet, or the link points to an older demo profile.": "هذا الملف الشخصي غير متاح بعد، أو أن الرابط يشير إلى ملف تجريبي قديم.",
        "This queue is visible to GloWe reviewers. Ask an administrator for access.": "هذه القائمة مرئية لمراجعي GloWe. اطلب الوصول من أحد المسؤولين.",
        "Threads": "النقاشات",
        "Title": "العنوان",
        "To the fullest extent permitted by law:": "إلى أقصى حد يسمح به القانون:",
        "Tone, humor, and expression vary across regions. Be mindful. Use inclusive language. If you are unsure, ask.": "تختلف النبرة والفكاهة وأساليب التعبير بين المناطق. كن منتبهًا. استخدم لغة شاملة. وإذا لم تكن متأكدًا، فاسأل.",
        "Topic": "الموضوع",
        "Topic group": "مجموعة موضوعية",
        "Topic Groups": "المجموعات الموضوعية",
        "Treat every member with dignity. Do not post or endorse any form of discrimination, harassment, or exclusion. Listen to diverse voices and experiences.": "عامل كل عضو بكرامة. لا تنشر أو تؤيّد أي شكل من أشكال التمييز أو التحرش أو الإقصاء. أنصت إلى الأصوات والتجارب المتنوعة.",
        "Trending Discussions": "النقاشات الرائجة",
        "Trust & status": "الثقة والحالة",
        "Try a broader keyword, clear one filter, or search by impact area, location, or support need.": "جرّب كلمة مفتاحية أوسع، أو أزل أحد عوامل التصفية، أو ابحث حسب مجال الأثر أو الموقع أو نوع الدعم المطلوب.",
        "Try a different tab, search a broader word, or start the next conversation.": "جرّب تبويبًا آخر، أو ابحث بكلمة أوسع، أو ابدأ المحادثة التالية.",
        "Try adjusting your filters or search terms.": "جرّب تعديل عوامل التصفية أو كلمات البحث.",
        "Try clearing one of the filters.": "جرّب إزالة أحد عوامل التصفية.",
        "Try Flow": "جرّب المسار",
        "Turn a real need into a clear call for support: volunteers, partners, knowledge, visibility, space, tools, or funding support.": "حوّل احتياجًا حقيقيًا إلى دعوة واضحة للدعم: متطوعون أو شركاء أو معرفة أو ظهور أو مساحة أو أدوات أو دعم تمويلي.",
        "Type": "النوع",
        "Updated today": "تم التحديث اليوم",
        "Upload copyrighted or third-party content without permission.": "رفع محتوى محمي بحقوق النشر أو يعود لطرف ثالث دون إذن.",
        "Use digital tools to make knowledge more accessible, reduce language barriers, and support ethical collaboration.": "استخدم الأدوات الرقمية لجعل المعرفة أيسر وصولًا، وتقليل الحواجز اللغوية، ودعم التعاون الأخلاقي.",
        "Use example grant cards and a funding-brief flow to turn a real need into a clearer request, budget story, and next step.": "استخدم بطاقات المنح النموذجية ومسار ملخّص التمويل لتحويل احتياج حقيقي إلى طلب أوضح وقصة ميزانية وخطوة تالية.",
        "Use the forums for focused questions, peer advice, templates, field lessons, and professional guidance. Professionals can also lead topic spaces and offer office hours.": "استخدم المنتديات للأسئلة المحددة ونصائح الأقران والقوالب ودروس الميدان والإرشاد المهني. كما يمكن للمهنيين قيادة مساحات موضوعية وتقديم ساعات مكتبية.",
        "Usually replies within 3-5 days": "يردّ عادة خلال 3-5 أيام",
        "Verified organizations will publish freely; new submissions show up here.": "تنشر المؤسسات الموثّقة بحرية؛ أما الطلبات الجديدة فتظهر هنا.",
        "Verified profiles": "ملفات شخصية موثّقة",
        "View Details": "عرض التفاصيل",
        "View Personal Area": "عرض المنطقة الشخصية",
        "View Profile": "عرض الملف الشخصي",
        "Visibility / Media": "الظهور / الوسائط",
        "Volunteer": "تطوّع",
        "Volunteer / Mentor": "متطوع / موجّه",
        "Volunteer Opportunities": "فرص التطوع",
        "Volunteer Opportunity": "فرصة تطوع",
        "Volunteers": "المتطوعون",
        "volunteers joined new projects this week.": "متطوعًا انضموا إلى مشاريع جديدة هذا الأسبوع.",
        "Volunteers and professionals": "المتطوعون والمهنيون",
        "Volunteers Needed": "مطلوب متطوعون",
        "We are not just a platform. We are a community built on trust and shared purpose. By joining GloWe, you commit to these core values:": "نحن لسنا مجرد منصة. نحن مجتمع قائم على الثقة والهدف المشترك. بانضمامك إلى GloWe، فإنك تلتزم بهذه القيم الأساسية:",
        "We are not responsible for actions or content posted by users.": "نحن غير مسؤولين عن تصرفات المستخدمين أو المحتوى الذي ينشرونه.",
        "We are starting with a focused community space. Next, we want to grow local community circles, a practical knowledge library, and technology that helps people use knowledge for good.": "نبدأ بمساحة مجتمعية مركّزة. وبعد ذلك نريد أن ننمّي دوائر مجتمعية محلية ومكتبة معرفة عملية وتقنية تساعد الناس على استخدام المعرفة من أجل الخير.",
        "We believe impact grows when people stand with each other, listen deeply, and act with care.": "نؤمن أن الأثر ينمو حين يقف الناس إلى جانب بعضهم، ويصغون بعمق، ويتصرفون باهتمام.",
        "We do not look down or preach. We stand next to each other, listen, learn, and act together. Sometimes you give; sometimes you need help. Both are part of a healthy community.": "نحن لا نتعالى ولا نعِظ. نقف إلى جانب بعضنا، ونصغي، ونتعلم، ونعمل معًا. أحيانًا تعطي؛ وأحيانًا تحتاج إلى مساعدة. وكلاهما جزء من مجتمع سليم.",
        "We do not sell, rent, or trade your data to advertisers.": "نحن لا نبيع بياناتك أو نؤجّرها أو نتاجر بها مع المعلنين.",
        "We do not want technology to replace relationships. We want it to help people find each other, document what they already know, and turn care into practical action.": "لا نريد للتقنية أن تحل محل العلاقات. نريدها أن تساعد الناس على إيجاد بعضهم، وتوثيق ما يعرفونه فعلًا، وتحويل الاهتمام إلى عمل تطبيقي.",
        "We reserve the right to moderate, remove, or report inappropriate content.": "نحتفظ بالحق في الإشراف على المحتوى غير اللائق أو إزالته أو الإبلاغ عنه.",
        "Weekdays": "أيام الأسبوع",
        "Weekends": "عطلة نهاية الأسبوع",
        "Welcome,": "أهلًا،",
        "What comes after the MVP?": "ماذا بعد النسخة الأولية؟",
        "What do you need help thinking through?": "ما الذي تحتاج مساعدة في التفكير فيه؟",
        "What do you want to share, ask, or offer today?": "ما الذي تريد مشاركته أو السؤال عنه أو تقديمه اليوم؟",
        "What GloWe makes possible": "ما الذي تجعله GloWe ممكنًا",
        "What happens next": "ما الذي يحدث بعد ذلك",
        "What is open now": "ما المتاح الآن",
        "What we are learning": "ما الذي نتعلمه",
        "What we believe": "بماذا نؤمن",
        "What we want to build next": "ما الذي نريد بناءه لاحقًا",
        "When GloWe grows, one-third of future revenues will return to local communities.": "عندما تنمو GloWe، سيعود ثلث الإيرادات المستقبلية إلى المجتمعات المحلية.",
        "When you publish content, such as text, images, links, or project descriptions, on GloWe:": "عندما تنشر محتوى على GloWe، مثل النصوص أو الصور أو الروابط أو أوصاف المشاريع:",
        "Who is this for?": "لمن هذا؟",
        "Who We Serve": "من نخدم",
        "Why do you want to volunteer?": "لماذا تريد التطوع؟",
        "Why GloWe exists": "لماذا وُجدت GloWe",
        "Wish filters": "عوامل تصفية الأمنيات",
        "Wish Type": "نوع الأمنية",
        "Write a Community Post": "كتابة منشور مجتمعي",
        "Write a reply": "اكتب ردًا",
        "Write Post": "كتابة منشور",
        "Write posts, ask questions, share field knowledge, publish updates, and join topic-based discussions.": "اكتب منشورات، واطرح أسئلة، وشارك معرفة الميدان، وانشر تحديثات، وانضم إلى نقاشات موضوعية.",
        "Write the story, request, guide, event details, or question you want the community to see.": "اكتب القصة أو الطلب أو الدليل أو تفاصيل الفعالية أو السؤال الذي تريد أن يراه المجتمع.",
        "Write to the community": "اكتب إلى المجتمع",
        "You are acting in good faith and with respect for others.": "أنك تتصرف بحسن نية واحترام للآخرين.",
        "You are not alone here": "لست وحدك هنا",
        "You are part of a community where people can ask, offer, learn, and keep going together.": "أنت جزء من مجتمع يمكن فيه للناس أن يسألوا ويقدّموا ويتعلموا ويمضوا قدمًا معًا.",
        "You confirm that you have the legal right to publish what you upload and assume full responsibility for it.": "تؤكد أن لديك الحق القانوني في نشر ما ترفعه وتتحمل المسؤولية الكاملة عنه.",
        "You grant GloWe a non-exclusive, royalty-free, worldwide, perpetual license to host, translate, display, analyze, and distribute your content within the platform.": "تمنح GloWe ترخيصًا غير حصري وخاليًا من الرسوم وعالميًا ودائمًا لاستضافة محتواك وترجمته وعرضه وتحليله وتوزيعه داخل المنصة.",
        "You may close your account at any time.": "يمكنك إغلاق حسابك في أي وقت.",
        "You may request deletion of your account or data at any time.": "يمكنك طلب حذف حسابك أو بياناتك في أي وقت.",
        "You retain full ownership of your intellectual property.": "تحتفظ بالملكية الكاملة لملكيتك الفكرية.",
        "You've got something the world needs.": "لديك ما يحتاجه العالم.",
        "You're already part of GloWe.": "أنت بالفعل جزء من GloWe.",
        "Explore the community, share what you know, or pick up where you left off.": "استكشف المجتمع، أو شارك ما تعرفه، أو تابع من حيث توقفت.",
        "Your Availability": "مدى توفرك",
        "Your Community Home": "صفحتك الرئيسية في المجتمع",
        "Your full name": "اسمك الكامل",
        "Your password": "كلمة المرور الخاصة بك",
        "About - GloWe": "حول - GloWe",
        "About GloWe": "حول GloWe",
        "About the Organization": "عن المؤسسة",
        "About This Opportunity": "عن هذه الفرصة",
        "Across countries, languages, and fields, members can learn from each other, translate field wisdom, adapt proven solutions, and connect local action to global SDG challenges.": "عبر البلدان واللغات والمجالات، يمكن للأعضاء أن يتعلموا من بعضهم، ويترجموا حكمة الميدان، ويقتبسوا حلولًا مجرَّبة، ويربطوا العمل المحلي بتحديات أهداف التنمية المستدامة العالمية.",
        "Act honestly. Share real experiences. Credit others' work where due. Information shared on GloWe should be accurate, current, and shared with intention.": "تصرّف بصدق. شارك تجارب حقيقية. انسب عمل الآخرين إليهم حيثما وجب. ينبغي أن تكون المعلومات المنشورة في GloWe دقيقة وحديثة ومشاركة بقصد.",
        "Active Members": "الأعضاء النشطون",
        "Active projects": "المشاريع النشطة",
        "Active Threads": "النقاشات النشطة",
        "Admin review": "مراجعة الإدارة",
        "Admin Review - GloWe": "الإدارة والمراجعة - GloWe",
        "A digital-human space for shared knowledge, practical connection, and gradual community growth.": "مساحة رقمية إنسانية للمعرفة المشتركة والتواصل العملي والنمو المجتمعي التدريجي.",
        "A living feed for field updates, practical questions, needs, resources, and people building impact together.": "تدفق حيّ لتحديثات الميدان والأسئلة العملية والاحتياجات والموارد والأشخاص الذين يصنعون الأثر معًا.",
        "A practical space for volunteers, mentors, professionals, and organizations to meet around real needs, clear roles, and shared impact.": "مساحة عملية يلتقي فيها المتطوعون والموجّهون والمهنيون والمؤسسات حول احتياجات حقيقية وأدوار واضحة وأثر مشترك.",
        "A full Privacy Policy will be published separately.": "ستُنشر سياسة خصوصية كاملة بشكل منفصل.",
        "Community - GloWe": "المجتمع - GloWe",
        "Discussion Group - GloWe": "مجموعة نقاش - GloWe",
        "Forums - GloWe": "المنتديات - GloWe",
        "Messages - GloWe": "الرسائل - GloWe",
        "Opportunity Details - GloWe": "تفاصيل الفرصة - GloWe",
        "Organizations - GloWe": "المؤسسات - GloWe",
        "Personal Area - GloWe": "المنطقة الشخصية - GloWe",
        "Profile - GloWe": "الملف الشخصي - GloWe",
        "Saved - GloWe": "المحفوظات - GloWe",
        "Settings - GloWe": "الإعدادات - GloWe",
        "Volunteer Network - GloWe": "شبكة المتطوعين - GloWe",
        "Volunteer Opportunities - GloWe": "فرص التطوع - GloWe",
        "What's Next - GloWe": "ما التالي - GloWe",
        "Wishing Well - GloWe": "بئر الأمنيات - GloWe",
        "Write Post - GloWe": "كتابة منشور - GloWe",
        "1. About GloWe": "1. حول GloWe",
        "2. Who Can Use GloWe": "2. من يمكنه استخدام GloWe",
        "3. Acceptable Use & Responsibilities": "3. الاستخدام المقبول والمسؤوليات",
        "4. Content Rights & Licensing": "4. حقوق المحتوى والترخيص",
        "5. Privacy & Data": "5. الخصوصية والبيانات",
        "6. Community Integrity Charter": "6. ميثاق نزاهة المجتمع",
        "6.1 Transparency": "6.1 الشفافية",
        "6.2 Respect & Inclusion": "6.2 الاحترام والشمول",
        "6.3 Collaboration Over Competition": "6.3 التعاون قبل التنافس",
        "6.4 Cultural Sensitivity": "6.4 الحساسية الثقافية",
        "6.5 Community Responsibility": "6.5 المسؤولية المجتمعية",
        "7. Moderation & Enforcement": "7. الإشراف والتطبيق",
        "8. External Links & Third-Party Services": "8. الروابط الخارجية وخدمات الطرف الثالث",
        "9. Termination": "9. إنهاء الاستخدام",
        "10. Liability Disclaimer": "10. إخلاء المسؤولية",
        "11. Updates to Terms": "11. تحديثات الشروط",
        "12. Contact Us": "12. تواصل معنا",
        "2026 GloWe. Built for shared knowledge, mutual support, and action that lasts.": "2026 GloWe. بُنيت من أجل معرفة مشتركة ودعم متبادل وعمل يدوم.",
        "Local communities already hold practical knowledge about education, health, climate, food, rights, resilience, and care. Too often, that knowledge stays locked inside one place, one language, one report, or one organization. GloWe is being built to help field-based knowledge travel: clearly, respectfully, and in ways other people can adapt.": "تمتلك المجتمعات المحلية بالفعل معرفة عملية عن التعليم والصحة والمناخ والغذاء والحقوق والصمود والرعاية. وكثيرًا ما تبقى تلك المعرفة حبيسة مكان واحد أو لغة واحدة أو تقرير واحد أو مؤسسة واحدة. تُبنى GloWe لمساعدة المعرفة الميدانية على الانتقال: بوضوح واحترام، وبطرق يمكن للآخرين اقتباسها.",
        "Sign in with your Google account to get started. You can complete your profile after signing in.": "سجّل الدخول بحساب Google للبدء. يمكنك استكمال ملفك الشخصي بعد تسجيل الدخول.",
        "Share a Wish": "شارك أمنية",
        "A good wish is specific enough for the right helper to say yes.": "الأمنية الجيدة محددة بما يكفي ليقول المساعد المناسب «نعم».",
        "What do you need?": "ما الذي تحتاجه؟",
        "Wish type": "نوع الأمنية",
        "Select a type": "اختر نوعًا",
        "Urgency": "درجة الاستعجال",
        "Choose urgency": "اختر درجة الاستعجال",
        "This week": "هذا الأسبوع",
        "This month": "هذا الشهر",
        "Flexible timeline": "جدول زمني مرن",
        "What would success look like?": "كيف سيبدو النجاح؟",
        "Publish Wish": "نشر الأمنية",
        "Send a clear, trusted offer so the organization can decide quickly.": "أرسل عرضًا واضحًا وموثوقًا حتى تتمكن المؤسسة من اتخاذ القرار بسرعة.",
        "What can you offer?": "ما الذي يمكنك تقديمه؟",
        "Choose support type": "اختر نوع الدعم",
        "Professional volunteering": "تطوّع مهني",
        "Funding or grant help": "مساعدة في التمويل أو المنح",
        "Space or equipment": "مساحة أو معدات",
        "Business partnership": "شراكة تجارية",
        "Media or distribution": "إعلام أو توزيع",
        "Availability": "التوفر",
        "Choose availability": "اختر مدى التوفر",
        "Within 2 weeks": "خلال أسبوعين",
        "Send Offer": "إرسال العرض",
        "Update the public information that helps others understand who you are and how to collaborate.": "حدّث المعلومات العامة التي تساعد الآخرين على فهم من أنت وكيفية التعاون معك.",
        "Display name": "اسم العرض",
        "Profile type": "نوع الملف الشخصي",
        "Country / region": "الدولة / المنطقة",
        "Website / public link": "الموقع الإلكتروني / رابط عام",
        "Interest areas": "مجالات الاهتمام",
        "SDGs": "أهداف التنمية المستدامة",
        "Short public line": "سطر تعريفي عام قصير",
        "Mission / story": "الرسالة / القصة",
        "Values and goals": "القيم والأهداف",
        "Community / audience": "المجتمع / الجمهور",
        "Problem addressed": "المشكلة التي تعالجها",
        "Solution / method": "الحل / الأسلوب",
        "Geographic activity": "النطاق الجغرافي للنشاط",
        "Open actions / looking for": "إجراءات مفتوحة / ما تبحث عنه",
        "Articles / videos / reports": "مقالات / مقاطع فيديو / تقارير",
        "Profile image": "صورة الملف الشخصي",
        "Optional. When Cloudinary keys are configured, this uploads to Cloudinary.": "اختياري. عند إعداد مفاتيح Cloudinary، يُرفع الملف إلى Cloudinary.",
        "Save Profile Draft": "حفظ مسودة الملف الشخصي",
        "Welcome to GloWe 👋": "أهلًا بك في GloWe 👋",
        "Tell us a little about you so the community knows who they're collaborating with. It only takes a minute.": "أخبرنا قليلًا عن نفسك ليعرف المجتمع مع من يتعاون. لن يستغرق الأمر سوى دقيقة.",
        "Your name": "اسمك",
        "A short line about you": "سطر قصير عنك",
        "I'm joining as": "أنضم بصفتي",
        "Private individual": "فرد",
        "Volunteer, donor, or community member. Full access right away.": "متطوع أو متبرع أو عضو في المجتمع. وصول كامل فورًا.",
        "Organization": "مؤسسة",
        "NGO, nonprofit, or initiative. Reviewed before you can publish — only serious applications are accepted.": "منظمة غير حكومية أو غير ربحية أو مبادرة. تُراجع قبل أن تتمكن من النشر — لا تُقبل سوى الطلبات الجادة.",
        "Organizations are reviewed by the GloWe team. Until you're approved you can browse everything, but posting opportunities, events, and needs stays locked. Please give us enough to take your application seriously.": "يراجع فريق GloWe المؤسسات. وإلى حين اعتمادك يمكنك تصفّح كل شيء، لكن نشر الفرص والفعاليات والاحتياجات يبقى مغلقًا. يرجى تزويدنا بما يكفي لنأخذ طلبك على محمل الجد.",
        "Organization name *": "اسم المؤسسة *",
        "Registration / NGO number": "رقم التسجيل / رقم المنظمة",
        "Country of operation": "دولة النشاط",
        "Cause / field": "القضية / المجال",
        "Organization size": "حجم المؤسسة",
        "About the organization *": "عن المؤسسة *",
        "Contact person *": "الشخص المسؤول *",
        "Contact email *": "البريد الإلكتروني للتواصل *",
        "Contact phone": "هاتف التواصل",
        "Save and continue": "حفظ ومتابعة",
        "Maybe later": "ربما لاحقًا",
        "Add project": "إضافة مشروع",
        "Add a project that can appear in your personal area and help others understand what you are building.": "أضف مشروعًا يظهر في منطقتك الشخصية ويساعد الآخرين على فهم ما تبنيه.",
        "Project title": "عنوان المشروع",
        "Status": "الحالة",
        "Draft": "مسودة",
        "Active": "نشط",
        "Recruiting partners": "استقطاب شركاء",
        "Needs volunteers": "يحتاج متطوعين",
        "Ready to share": "جاهز للمشاركة",
        "Description": "الوصف",
        "Save Project": "حفظ المشروع",
        "Edit": "تعديل",
        "Edit project": "تعديل المشروع",
        "Update Project": "تحديث المشروع",
        "Project updated": "تم تحديث المشروع",
        "Your project changes were saved.": "تم حفظ تعديلات مشروعك.",
        "Project added": "تمت إضافة المشروع",
        "The project now appears in your personal area.": "يظهر المشروع الآن في منطقتك الشخصية.",
        "No event registrations yet": "لا توجد تسجيلات في فعاليات بعد",
        "Register for an event from the Volunteer Network and track it here.": "سجّل في فعالية من شبكة المتطوعين وتابعها هنا.",
        "Browse events": "تصفّح الفعاليات",
        "Event cancelled": "أُلغيت الفعالية",
        "Registered": "مسجَّل",
        "Pending approval": "بانتظار الموافقة",
        "Waitlisted": "في قائمة الانتظار",
        "Not accepted": "لم يُقبل",
        "Cancelled": "مُلغى",
        "Report a concern": "الإبلاغ عن مشكلة",
        "We review every report carefully and confidentially to keep GloWe safe and professional.": "نراجع كل بلاغ بعناية وسرية للحفاظ على GloWe آمنة ومهنية.",
        "Reporting": "الإبلاغ",
        "General concern": "مشكلة عامة",
        "What should we look at?": "ما الذي ينبغي أن ننظر فيه؟",
        "Choose a reason": "اختر سببًا",
        "Inaccurate information": "معلومات غير دقيقة",
        "Disrespectful or discriminatory content": "محتوى غير محترم أو تمييزي",
        "Misleading promotion": "ترويج مضلل",
        "Human rights concern": "مخاوف تتعلق بحقوق الإنسان",
        "Other": "أخرى",
        "Details": "التفاصيل",
        "Submit Report": "إرسال البلاغ",
        "Choose a rhythm that keeps GloWe useful without creating digital fatigue.": "اختر إيقاعًا يُبقي GloWe مفيدة دون أن يسبب إرهاقًا رقميًا.",
        "Opportunity of the week": "فرصة الأسبوع",
        "High-match connection proposals": "مقترحات تواصل عالية التطابق",
        "Deadline reminders": "تذكيرات بالمواعيد النهائية",
        "Crisis-response playbooks for my region": "أدلة الاستجابة للأزمات في منطقتي",
        "Preferred cadence": "الوتيرة المفضّلة",
        "Weekly digest": "ملخص أسبوعي",
        "Only urgent actions": "الإجراءات العاجلة فقط",
        "Daily 5-minute brief": "موجز يومي في 5 دقائق",
        "Save Preferences": "حفظ التفضيلات",
        "Mentors, space, visibility...": "موجّهون، مساحة، ظهور...",
        "City, region, remote, or hybrid": "مدينة أو منطقة أو عن بُعد أو مختلط",
        "Tell the community what would help.": "أخبر المجتمع بما سيساعدك.",
        "Example: 3 mentors matched, one grant draft completed, 50 families reached...": "مثال: مطابقة 3 موجّهين، وإنجاز مسودة منحة واحدة، والوصول إلى 50 أسرة...",
        "Briefly explain your relevant experience, what you can offer, and what you need to know next.": "اشرح بإيجاز خبرتك ذات الصلة، وما يمكنك تقديمه، وما تحتاج معرفته بعد ذلك.",
        "Organization or person name": "اسم المؤسسة أو الشخص",
        "NGO, business, volunteer, initiative...": "منظمة غير حكومية، شركة، متطوع، مبادرة...",
        "Education, health, climate...": "التعليم، الصحة، المناخ...",
        "Quality Education, Climate Action...": "التعليم الجيد، العمل المناخي...",
        "One clear sentence people can understand quickly": "جملة واحدة واضحة يفهمها الناس بسرعة",
        "Mission, current work, or what you offer.": "الرسالة أو العمل الحالي أو ما تقدّمه.",
        "Values, goals, leadership, or principles": "القيم أو الأهداف أو القيادة أو المبادئ",
        "Who do you serve, support, work with, or hope to reach?": "من تخدم أو تدعم أو تعمل معه أو تأمل الوصول إليه؟",
        "What problem or need are you working on?": "ما المشكلة أو الاحتياج الذي تعمل عليه؟",
        "What do you do in practice?": "ماذا تفعل عمليًا؟",
        "Advocacy, education, field work, research...": "المناصرة، التعليم، العمل الميداني، البحث...",
        "Local / regional / global / remote": "محلي / إقليمي / عالمي / عن بُعد",
        "Partners, volunteers, funding, knowledge, visibility...": "شركاء، متطوعون، تمويل، معرفة، ظهور...",
        "Useful public links": "روابط عامة مفيدة",
        "Full name": "الاسم الكامل",
        "One sentence people grasp quickly": "جملة واحدة يستوعبها الناس بسرعة",
        "Registered / public name": "الاسم المسجَّل / العام",
        "Legal registration number": "رقم التسجيل القانوني",
        "Where you operate": "أين تعمل",
        "Volunteers / staff, approx.": "المتطوعون / الموظفون، تقريبًا",
        "Mission, who you serve, and what you'd do on GloWe.": "الرسالة، ومن تخدم، وما ستفعله في GloWe.",
        "Who we should talk to": "بمن ينبغي أن نتواصل",
        "Optional": "اختياري",
        "Community resource map": "خريطة موارد المجتمع",
        "What is the project, who does it support, and what kind of help would move it forward?": "ما هو المشروع، ومن يدعم، وأي نوع من المساعدة سيدفعه إلى الأمام؟",
        "Add context that can help our review.": "أضف سياقًا يساعد في مراجعتنا.",
        "Switch to English": "التبديل إلى الإنجليزية",
        "This page outlines the terms, responsibilities, and community standards that guide your use of the GloWe platform. By accessing or interacting with this site, you agree to abide by the Terms of Use and our Community Integrity Charter. GloWe is committed to building a safe, inclusive, and impact-driven space.": "توضّح هذه الصفحة الشروط والمسؤوليات والمعايير المجتمعية التي توجّه استخدامك لمنصة GloWe. بدخولك هذا الموقع أو تفاعلك معه، فإنك توافق على الالتزام بشروط الاستخدام وميثاق نزاهة المجتمع. تلتزم GloWe ببناء مساحة آمنة وشاملة وموجّهة نحو الأثر.",
        "GloWe is a global platform connecting individuals, organizations, and initiatives working to create social and environmental change. We facilitate knowledge-sharing, collaboration, and visibility for solutions that matter across languages, sectors, and geographies.": "GloWe منصة عالمية تربط الأفراد والمؤسسات والمبادرات العاملة على إحداث تغيير اجتماعي وبيئي. نحن نيسّر تبادل المعرفة والتعاون والظهور للحلول المهمة، عبر اللغات والقطاعات والمناطق الجغرافية.",
        "Share knowledge, ask for support, and build practical impact with the community.": "شارك المعرفة، واطلب الدعم، واصنع أثرًا عمليًا مع المجتمع.",
        "More post actions": "إجراءات أخرى للمنشور",
        "More wish actions": "إجراءات أخرى للأمنية",
        "More opportunity actions": "إجراءات أخرى للفرصة",
        "More profile actions": "إجراءات أخرى للملف الشخصي",
        "Write a thoughtful comment...": "اكتب تعليقًا مدروسًا...",
        "Ask a focused question for this group": "اطرح سؤالًا محددًا لهذه المجموعة",
        "What do you need input on, and what kind of answers would help?": "في أي أمر تحتاج إلى رأي، وأي نوع من الإجابات سيساعدك؟",
        "Personal workspace": "مساحة عمل شخصية",
        "Your GloWe profile is ready to be completed.": "ملفك الشخصي في GloWe جاهز للاستكمال.",
        "Community collaboration": "تعاون مجتمعي",
        "Location not added yet": "لم يُضَف الموقع بعد",
        "Team size not added yet": "لم يُضَف حجم الفريق بعد",
        "Not added yet": "لم يُضَف بعد",
        "Title / role": "المسمّى / الدور",
        "Organization name": "اسم المؤسسة",
        "Email verified": "تم التحقق من البريد الإلكتروني",
        "Pending": "قيد الانتظار",
        "Accepted": "مقبول",
        "Declined": "مرفوض",
        "Public link": "رابط عام",
        "Public line": "سطر عام",
        "Open to volunteers, donations, or partnerships?": "منفتح على المتطوعين أو التبرعات أو الشراكات؟",
        "Funding / support sources": "مصادر التمويل / الدعم",
        "Annual budget / support context": "الميزانية السنوية / سياق الدعم",
        "Profile status": "حالة الملف الشخصي",
        "Personal area sections": "أقسام المنطقة الشخصية",
        "Sign in to post a need": "سجّل الدخول لنشر احتياج",
        "Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.": "تصفّح GloWe متاح للجميع. سجّل الدخول عبر Google لنشر احتياج والوصول إلى أشخاص مستعدين للمساعدة.",
        "Sign in to post": "سجّل الدخول للنشر",
        "Sign in with Google to share a post with the GloWe community.": "سجّل الدخول عبر Google لمشاركة منشور مع مجتمع GloWe.",
        "Sign in to publish": "سجّل الدخول للنشر",
        "Sign in with Google to publish this opportunity and start receiving applications.": "سجّل الدخول عبر Google لنشر هذه الفرصة والبدء في استقبال الطلبات.",
        "Sign in to start a discussion": "سجّل الدخول لبدء نقاش",
        "Sign in with Google to open a new discussion thread.": "سجّل الدخول عبر Google لفتح نقاش جديد.",
        "Sign in to reply": "سجّل الدخول للردّ",
        "Sign in with Google to join this discussion.": "سجّل الدخول عبر Google للانضمام إلى هذا النقاش.",
        "Sign in to apply": "سجّل الدخول للتقدّم",
        "Save your spot": "احجز مكانك",
        "Ready to lend a hand?": "مستعد لمدّ يد العون؟",
        "Keep this for later": "احتفظ بهذا لوقت لاحق",
        "Sign in with Google to save it to your list.": "سجّل الدخول عبر Google لحفظه في قائمتك.",
        "Sign in to continue": "سجّل الدخول للمتابعة",
        "Sign in with Google to open your personal area.": "سجّل الدخول عبر Google لفتح منطقتك الشخصية.",
        "Sign in with Google to do this on GloWe.": "سجّل الدخول عبر Google للقيام بذلك في GloWe.",
        "Welcome to GloWe": "أهلًا بك في GloWe",
        "Welcome — you're browsing as a guest. Sign in with Google anytime to participate.": "أهلًا بك — أنت تتصفّح كزائر. سجّل الدخول عبر Google في أي وقت للمشاركة.",
        "Mark as fulfilled": "وضع علامة تم التحقيق",
        "No wishes yet": "لا توجد أمنيات بعد",
        "Post a wish": "انشر أمنية",
        "The Wishing Well fills up as community members post support requests, calls for volunteers, and collaboration opportunities. Be the first to share what your project needs.": "يمتلئ بئر الأمنيات عندما ينشر أعضاء المجتمع طلبات دعم ودعوات للمتطوعين وفرص تعاون. كن أول من يشارك ما يحتاجه مشروعك.",
        "Back to wishes": "العودة إلى الأمنيات",
        "No opportunities posted yet": "لم تُنشر فرص بعد",
        "No organizations yet": "لا توجد مؤسسات بعد",
        "No matching profiles": "لا توجد ملفات شخصية مطابقة",
        "No posts yet — share knowledge, ask for support, or open a discussion to get things going.": "لا توجد منشورات بعد — شارك معرفة، أو اطلب دعمًا، أو افتح نقاشًا لتبدأ الأمور.",
        "No registrations yet.": "لا توجد تسجيلات بعد.",
        "Could not load registrations.": "تعذّر تحميل التسجيلات.",
        "Be the first to share a volunteer role or collaboration request with the GloWe community.": "كن أول من يشارك دورًا تطوعيًا أو طلب تعاون مع مجتمع GloWe.",
        "Be the first to share a volunteer role or collaboration request with the community.": "كن أول من يشارك دورًا تطوعيًا أو طلب تعاون مع المجتمع.",
        "Members will appear here once they join the community.": "سيظهر الأعضاء هنا بمجرد انضمامهم إلى المجتمع.",
        "Organizations join GloWe by creating a profile and completing verification. The first approved profiles will appear here.": "تنضم المؤسسات إلى GloWe بإنشاء ملف شخصي واستكمال التحقق. وستظهر هنا أول الملفات المعتمدة.",
        "The community is just getting started. Post a wish, share what you know, or reach out to someone who is working on what you care about.": "المجتمع في بدايته. انشر أمنية، أو شارك ما تعرفه، أو تواصل مع شخص يعمل على ما يهمك.",
        "This section will come alive as the community grows.": "سينبض هذا القسم بالحياة مع نمو المجتمع.",
        "Try a broader keyword or clear a filter.": "جرّب كلمة مفتاحية أوسع أو أزل أحد عوامل التصفية.",
        "Write the first post": "اكتب أول منشور",
        "Write a message": "اكتب رسالة",
        "Loading opportunities…": "جارٍ تحميل الفرص…",
        "Loading organizations…": "جارٍ تحميل المؤسسات…",
        "Loading posts…": "جارٍ تحميل المنشورات…",
        "Loading profile…": "جارٍ تحميل الملف الشخصي…",
        "Loading registrations…": "جارٍ تحميل التسجيلات…",
        "Loading wishes…": "جارٍ تحميل الأمنيات…",
        "Fetching from the community directory.": "جارٍ الجلب من دليل المجتمع.",
        "Back": "رجوع",
        "Next": "التالي",
        "Register for event": "التسجيل في الفعالية",
        "Sign in to register": "سجّل الدخول للتسجيل",
        "Cancel registration": "إلغاء التسجيل",
        "Cancel event": "إلغاء الفعالية",
        "Manage registrations": "إدارة التسجيلات",
        "Event registration": "التسجيل في الفعالية",
        "Message to the organizer (optional)": "رسالة إلى المنظّم (اختياري)",
        "This event has been cancelled by the organizer.": "أُلغيت هذه الفعالية من قِبل المنظّم.",
        "This event has ended.": "انتهت هذه الفعالية.",
        "This event is cancelled.": "هذه الفعالية ملغاة.",
        "This event is no longer open for registration.": "لم يعد التسجيل في هذه الفعالية متاحًا.",
        "Registration:": "التسجيل:",
        "Status:": "الحالة:",
        "Type:": "النوع:",
        "When:": "متى:",
        "Join link:": "رابط الانضمام:",
        "Offer sent": "تم إرسال العرض",
        "Structured support offer submitted.": "تم إرسال عرض دعم منظّم.",
        "Save as draft": "حفظ كمسودة",
        "Submit for review": "إرسال للمراجعة",
        "Send code": "إرسال الرمز",
        "Select an area": "اختر مجالًا",
        "Choose if relevant": "اختر إذا كان ذا صلة",
        "Preferred contact": "وسيلة التواصل المفضّلة",
        "In-app message": "رسالة داخل التطبيق",
        "Location (optional)": "الموقع (اختياري)",
        "Phone": "الهاتف",
        "Phone (optional)": "الهاتف (اختياري)",
        "WhatsApp": "واتساب",
        "Public": "عام",
        "Public actions": "إجراءات عامة",
        "Public profile and media": "الملف الشخصي العام والوسائط",
        "Basic account": "حساب أساسي",
        "Looking for": "يبحث عن",
        "Impact": "الأثر",
        "Impact update": "تحديث عن الأثر",
        "Draft impact update": "مسودة تحديث عن الأثر",
        "Draft Update": "مسودة تحديث",
        "Impact, interests and methods": "الأثر والاهتمامات والأساليب",
        "Mentoring": "التوجيه",
        "Trust": "الثقة",
        "Trust, contact and review": "الثقة والتواصل والمراجعة",
        "Story": "القصة",
        "Story and purpose": "القصة والغاية",
        "The dream": "الحلم",
        "The conversation starts here": "الحوار يبدأ من هنا",
        "Connection workspace": "مساحة عمل للتواصل",
        "Profile onboarding": "إعداد الملف الشخصي",
        "Organization review": "مراجعة المؤسسة",
        "Review note": "ملاحظة المراجعة",
        "Relevant SDGs": "أهداف التنمية المستدامة ذات الصلة",
        "Size / team": "الحجم / الفريق",
        "Annual budget": "الميزانية السنوية",
        "First coordination call": "أول مكالمة تنسيق",
        "Both sides confirm scope, timeline, and ownership.": "يؤكد الطرفان النطاق والجدول الزمني والمسؤوليات.",
        "A short outcome note documents what changed.": "ملاحظة قصيرة عن النتيجة توثّق ما تغيّر.",
        "When work is complete, this becomes a short public note: what was needed, who helped, what happened, and what is still needed.": "عند اكتمال العمل، يتحول هذا إلى ملاحظة عامة قصيرة: ما الذي كان مطلوبًا، ومن ساعد، وماذا حدث، وما الذي ما زال مطلوبًا.",
        "To turn a local need into a shared action that others can join, support, or learn from.": "لتحويل احتياج محلي إلى عمل مشترك يمكن للآخرين الانضمام إليه أو دعمه أو التعلّم منه.",
        "Build a useful profile step by step. You can save a draft now and complete more details later.": "ابنِ ملفًا شخصيًا مفيدًا خطوة بخطوة. يمكنك حفظ مسودة الآن واستكمال التفاصيل لاحقًا.",
        "Choose the profile that best describes you. This changes the questions and future profile layout.": "اختر الملف الشخصي الذي يصفك على أفضل نحو. هذا يغيّر الأسئلة وشكل الملف الشخصي مستقبلًا.",
        "For this MVP, the code is shown on screen and stored locally.": "في هذه النسخة الأولية، يُعرض الرمز على الشاشة ويُخزَّن محليًا.",
        "I agree to keep GloWe professional, respectful, transparent, and aligned with human rights.": "أوافق على الحفاظ على GloWe مهنية ومحترمة وشفافة ومتوافقة مع حقوق الإنسان.",
        "Logo or profile image": "الشعار أو صورة الملف الشخصي",
        "Website / LinkedIn / Facebook": "الموقع الإلكتروني / LinkedIn / Facebook",
        "1 person": "شخص واحد",
        "2-5 people": "2-5 أشخاص",
        "6-20 people": "6-20 شخصًا",
        "20+ people": "أكثر من 20 شخصًا",
        "(required for rejection)": "(مطلوب عند الرفض)",
        "First name *": "الاسم الأول *",
        "Last name *": "اسم العائلة *",
        "Email *": "البريد الإلكتروني *",
        "Password *": "كلمة المرور *",
        "Confirm password *": "تأكيد كلمة المرور *",
        "Email verification code *": "رمز التحقق من البريد الإلكتروني *",
        "Country *": "الدولة *",
        "Community / audience *": "المجتمع / الجمهور *",
        "Geographic activity *": "النطاق الجغرافي للنشاط *",
        "Main interest areas *": "مجالات الاهتمام الرئيسية *",
        "Organization mission *": "رسالة المؤسسة *",
        "Problem you address *": "المشكلة التي تعالجها *",
        "Solution or method *": "الحل أو الأسلوب *",
        "Values and goals *": "القيم والأهداف *",
        "Short public line *": "سطر تعريفي عام قصير *",
        "Title / role *": "المسمّى / الدور *",
        "All listings": "كل الإعلانات",
        "Events only": "الفعاليات فقط",
        "Events:": "الفعاليات:",
        "In-person events": "فعاليات حضورية",
        "Online events": "فعاليات عبر الإنترنت",
        "Upcoming events": "الفعاليات القادمة",
        "Registered members": "الأعضاء المسجَّلون",
        "Registered organizations": "المؤسسات المسجَّلة",
        "+ Create": "+ إنشاء",
        "Create": "إنشاء",
        "What would you like to create?": "ما الذي تريد إنشاءه؟",
        "Share an update, a story, or knowledge with the community.": "شارك تحديثًا أو قصة أو معرفة مع المجتمع.",
        "Publish a volunteering event with a date and registration.": "انشر فعالية تطوعية بتاريخ وتسجيل.",
        "Recruit volunteers for an ongoing role or project.": "استقطب متطوعين لدور مستمر أو مشروع.",
        "Ask the community for help, resources, or partners.": "اطلب من المجتمع مساعدة أو موارد أو شركاء.",
        "Offer your time and skills so organizations can find you.": "قدّم وقتك ومهاراتك حتى تتمكن المؤسسات من إيجادك.",
        "Event": "فعالية",
        "Need": "طلب مساعدة",
        "Volunteer Offer": "عرض تطوّع",
        "Publish an event": "نشر فعالية",
        "Events appear on the Volunteer Network with a date and registration.": "تظهر الفعاليات في شبكة المتطوعين بتاريخ وتسجيل.",
        "Event title": "عنوان الفعالية",
        "e.g. Community beach cleanup": "مثال: تنظيف شاطئ مجتمعي",
        "What happens at the event, and who should come?": "ماذا يحدث في الفعالية، ومن ينبغي أن يحضر؟",
        "Starts": "يبدأ",
        "Ends (optional)": "ينتهي (اختياري)",
        "Format": "الصيغة",
        "Location / link": "الموقع / الرابط",
        "Address, city, or meeting link": "العنوان أو المدينة أو رابط اللقاء",
        "Capacity (optional)": "عدد المقاعد (اختياري)",
        "Leave empty for unlimited": "اتركه فارغًا لعدد غير محدود",
        "Registration": "التسجيل",
        "Organizer approves each registration": "يوافق المنظّم على كل تسجيل",
        "Open — instant confirmation": "مفتوح — تأكيد فوري",
        "Publish Event": "نشر الفعالية",
        "Event published": "تم نشر الفعالية",
        "Your event is now live on the Volunteer Network.": "فعاليتك متاحة الآن في شبكة المتطوعين.",
        "Offer your help": "قدّم مساعدتك",
        "Your offer appears on the Wishing Well so organizations and members can find you.": "يظهر عرضك في بئر الأمنيات حتى تتمكن المؤسسات والأعضاء من إيجادك.",
        "Headline": "العنوان الرئيسي",
        "e.g. Graphic designer offering 3 hours a week": "مثال: مصمم جرافيك يقدّم 3 ساعات أسبوعيًا",
        "Skills, time, equipment — anything that could help.": "مهارات، وقت، معدات — أي شيء يمكن أن يساعد.",
        "Impact area (optional)": "مجال الأثر (اختياري)",
        "Publish Offer": "نشر العرض",
        "Offer published": "تم نشر العرض",
        "Your offer is now live on the Wishing Well.": "عرضك متاح الآن في بئر الأمنيات.",
        "Fetching your conversations.": "جارٍ جلب محادثاتك.",
        "No conversations yet": "لا توجد محادثات بعد",
        "Reach out to an organization, offer help on a need, or message a community member — conversations will appear here.": "تواصل مع مؤسسة، أو اعرض المساعدة في احتياج، أو راسل عضوًا في المجتمع — ستظهر المحادثات هنا.",
        "Open the Wishing Well": "افتح بئر الأمنيات",
        "Opening the conversation.": "جارٍ فتح المحادثة.",
        "Conversation unavailable": "المحادثة غير متاحة",
        "This conversation could not be opened.": "تعذّر فتح هذه المحادثة.",
        "Back to messages": "العودة إلى الرسائل",
        "No messages yet. Say hello!": "لا توجد رسائل بعد. ألقِ التحية!",
        "Write a message...": "اكتب رسالة...",
        "Could not send": "تعذّر الإرسال",
        "Messaging unavailable": "المراسلة غير متاحة",
        "This member cannot receive direct messages yet.": "لا يمكن لهذا العضو استقبال رسائل مباشرة بعد.",
        "Messages are unavailable": "الرسائل غير متاحة",
        "Spam or misleading promotion": "رسائل مزعجة أو ترويج مضلل",
        "Harassment or hate": "تحرش أو كراهية",
        "False or misleading information": "معلومات كاذبة أو مضللة",
        "Inappropriate content": "محتوى غير لائق",
        "Fake profile or impersonation": "ملف شخصي مزيف أو انتحال شخصية",
        "Already reported": "سبق الإبلاغ",
        "You already reported this. Our team will review it.": "لقد أبلغت عن هذا مسبقًا. سيراجعه فريقنا.",
        "Could not send report": "تعذّر إرسال البلاغ",
        "Something went wrong sending your report. Please try again.": "حدث خطأ أثناء إرسال بلاغك. يرجى المحاولة مرة أخرى.",
        "Reporting needs a live connection right now. Please try again shortly.": "يتطلب الإبلاغ اتصالًا نشطًا في الوقت الحالي. يرجى المحاولة بعد قليل.",
        "Sign in to report": "سجّل الدخول للإبلاغ",
        "Sign in with Google to report this content so our team can review it.": "سجّل الدخول عبر Google للإبلاغ عن هذا المحتوى ليتمكن فريقنا من مراجعته.",
        "Fetching community reports.": "جارٍ جلب بلاغات المجتمع.",
        "Could not load reports": "تعذّر تحميل البلاغات",
        "Remove content": "إزالة المحتوى",
        "Content removed": "تمت إزالة المحتوى",
        "The reported content is no longer publicly visible.": "لم يعد المحتوى المُبلَّغ عنه مرئيًا للعامة.",
        "Report dismissed": "تم رفض البلاغ",
        "The report was closed with no action.": "أُغلق البلاغ دون اتخاذ إجراء.",
        "Only GloWe reviewers can act on reports.": "يمكن لمراجعي GloWe وحدهم اتخاذ إجراء بشأن البلاغات.",
        "Open reported item": "فتح العنصر المُبلَّغ عنه",
        "Audience": "الجمهور",
        "Community Discussion": "نقاش مجتمعي",
        "Connection Request": "طلب تواصل",
        "Deadline": "الموعد النهائي",
        "Discussion": "نقاش",
        "Event / Webinar": "فعالية / ندوة عبر الإنترنت",
        "Filters": "عوامل التصفية",
        "Grant / Open Call": "منحة / دعوة مفتوحة",
        "Knowledge Share": "مشاركة المعرفة",
        "Newest first": "الأحدث أولاً",
        "No wishes match your filters": "لا توجد أمنيات تطابق عوامل التصفية",
        "Oldest first": "الأقدم أولاً",
        "Professional Guide": "دليل مهني",
        "Reason": "السبب",
        "Reporter": "المُبلّغ",
        "Search by title, author, city, or topic": "ابحث حسب العنوان أو الكاتب أو المدينة أو الموضوع",
        "Search wishes": "البحث في الأمنيات",
        "Search, filter, and sort open needs from across the community.": "ابحث وصِف وصنّف الاحتياجات المفتوحة من أنحاء المجتمع.",
        "Sort": "ترتيب",
        "Sort wishes": "ترتيب الأمنيات",
        "Success Story": "قصة نجاح",
        "Title A–Z": "العنوان أ–ي",
        "Verified": "موثّق",
        "volunteers": "متطوعون",
        "wish shown": "أمنية معروضة",
        "wishes shown": "أمنيات معروضة",
        "Values": "القيم",
        "Problem": "المشكلة",
        "Solution": "الحل",
        "Size / availability": "الحجم / التوفر",
        "Not specified yet": "لم يُحدَّد بعد",
        "Through participation, useful connections, project progress, and community feedback.": "من خلال المشاركة، والعلاقات المفيدة، وتقدّم المشاريع، وملاحظات المجتمع.",
        "Contact through GloWe messages": "التواصل عبر رسائل GloWe",
        "Community impact": "الأثر المجتمعي",
        "Open to coordination": "منفتحون على التنسيق",
        "Impact signals": "مؤشرات الأثر",
        "What I offer": "ما أقدمه",
        "Bio": "نبذة",
        "Size": "الحجم",
        "Country": "البلد",
        "Website": "الموقع الإلكتروني",
        "Field / sector": "المجال / القطاع",
        "Size (optional)": "الحجم (اختياري)",
        "Contact name": "اسم جهة الاتصال",
        "Contact email": "البريد الإلكتروني للتواصل",
        "Contact phone (optional)": "هاتف التواصل (اختياري)",
        "A few words about you and what you're working on": "بضع كلمات عنك وعمّا تعمل عليه",
        "Education, health, environment...": "التعليم، الصحة، البيئة...",
        "What does your organization do?": "ماذا تفعل مؤسستكم؟",
        "e.g. 1-10, 11-50": "مثال 1-10، 11-50",
        "Contact person": "الشخص المسؤول",
        "Dev sign in": "تسجيل دخول المطورين",
        "Local dev sign-in": "تسجيل الدخول التطويري المحلي",
        "Google OAuth is disabled on the local Supabase stack. Pick a test persona below — each option mints a real Supabase session (same as production after sign-in).": "تم تعطيل Google OAuth في بيئة Supabase المحلية. اختر شخصية اختبار أدناه — كل خيار ينشئ جلسة Supabase حقيقية (كما في بيئة الإنتاج بعد تسجيل الدخول).",
        "Generated automatically — change if you like": "تم الإنشاء تلقائيًا — يمكنك التغيير إذا أردت",
        "Organization mission": "رسالة المؤسسة",
        "Community you serve": "المجتمع الذي تخدمونه",
        "Problem you address": "المشكلة التي تعالجونها",
        "Solution or method": "الحل أو الأسلوب",
        "Business purpose": "هدف العمل",
        "Business values": "قيم العمل",
        "Customers / community": "العملاء / المجتمع",
        "Social or environmental problem": "مشكلة اجتماعية أو بيئية",
        "Product, service, or impact model": "منتج أو خدمة أو نموذج تأثير",
        "Team / company size": "حجم الفريق / الشركة",
        "Initiative story": "قصة المبادرة",
        "Values and people behind it": "القيم والأشخاص وراء المبادرة",
        "Problem or need": "مشكلة أو حاجة",
        "What you do in practice": "ما تفعلونه عمليًا",
        "People involved": "الأشخاص المشاركون",
        "Volunteer introduction": "تعريف المتطوع",
        "How you like to volunteer": "كيف تفضل التطوع",
        "Preferred causes / communities": "القضايا / المجتمعات المفضلة",
        "Causes close to your heart": "القضايا القريبة من قلبك",
        "Support you can offer": "الدعم الذي يمكنك تقديمه",
        "Monthly availability": "التوفر الشهري",
        "Professional background": "الخلفية المهنية",
        "Professional values": "القيم المهنية",
        "Who you can support": "من يمكنك دعمه",
        "Challenges you can help solve": "التحديات التي يمكنك المساعدة في حلها",
        "Services, volunteering, or forum leadership": "خدمات أو تطوع أو قيادة منتدى",
        "Availability / service model": "التوفر / نموذج الخدمة",
        "Collaboration": "التعاون",
        "Joint Projects": "مشاريع مشتركة",
        "Active Account": "حساب نشط",
        "Shared Content": "محتوى مُشارك",
        "Expert Writer": "كاتب خبير",
        "Professional Knowledge": "معرفة مهنية",
        "Leading Volunteer": "متطوع رائد",
        "Volunteer Hours": "ساعات التطوع",
        "Active Learner": "متعلم نشط",
        "Knowledge Discovery": "اكتشاف المعرفة",
        "Community Bridge": "جسر مجتمعي",
        "Connections Made": "روابط تم إنشاؤها",
        "Documented Impact": "أثر موثّق",
        "Case Studies": "دراسات حالة",
        "Diversity & Inclusion": "التنوع والشمول",
        "Diverse Collaborations": "تعاونات متنوعة",
        "Projects created or managed in partnership": "مشاريع تم إنشاؤها أو إدارتها بالشراكة",
        "Posts, articles, videos, and comments published": "منشورات ومقالات وفيديوهات وتعليقات تم نشرها",
        "Professional posts or articles shared": "منشورات أو مقالات مهنية تمت مشاركتها",
        "Hours of consulting, mentoring, or activity": "ساعات من الاستشارة أو الإرشاد أو النشاط",
        "Articles, pages, and projects explored": "مقالات وصفحات ومشاريع تم استكشافها",
        "People and organizations introduced to one another": "أشخاص ومؤسسات تم التعريف بينهم",
        "Success stories with impact evidence": "قصص نجاح مع أدلة على الأثر",
        "Cross-community, cross-country, or cross-sector collaborations": "تعاونات بين المجتمعات أو الدول أو القطاعات",
        "volunteers connected": "متطوعون مرتبطون",
        "projects listed": "مشاريع مدرجة",
        // Profile-view fallback sentences (fix/language-gap-sweep, round 2)
        "Verified organization": "مؤسسة موثّقة",
        "community impact": "الأثر المجتمعي",
        "This profile can add more field insights, measurement notes, and lessons learned as the work develops.": "يمكن لهذا الملف الشخصي إضافة المزيد من الرؤى الميدانية وملاحظات القياس والدروس المستفادة مع تطور العمل.",
        "Community work, partnerships, shared knowledge, and practical field-based action.": "العمل المجتمعي، والشراكات، وتبادل المعرفة، والعمل الميداني العملي.",
        "Open to relevant conversations and collaboration through GloWe.": "منفتحون على المحادثات ذات الصلة والتعاون عبر GloWe.",
        "people connected through projects, opportunities, or community activity.": "أشخاص تواصلوا من خلال المشاريع أو الفرص أو النشاط المجتمعي.",
        "The work responds to needs connected to ": "يستجيب العمل للاحتياجات المرتبطة بـ",
        " and helps make local knowledge easier to access and act on.": "، ويساعد في جعل المعرفة المحلية أسهل وصولًا وتطبيقًا.",
        // wishTypeStyles labels (data.js) missing from an earlier partial harvest
        "Call for Help": "نداء للمساعدة",
        "Looking for Collaboration": "نبحث عن تعاون",
        "Support Needed": "الدعم مطلوب",
        "Sharing Knowledge": "مشاركة المعرفة",
        "Call for Collaboration": "دعوة للتعاون",
        "Media & Visibility": "الإعلام والظهور",
        "Project Spotlight": "تسليط الضوء على مشروع",
        "We're Hiring": "نحن نوظّف",
        // Date-locale-bug follow-up (event type + relative-time + applied/offered labels)
        "Online": "عبر الإنترنت",
        "In person": "حضوريًا",
        "now": "الآن",
        "Offered": "تم العرض في",
        "Applied": "تم التقديم في",
        "Applied on": "تم التقديم بتاريخ",
        // index.html home-page marketing copy + member-feed Opportunity badge
        "Opportunity": "فرصة",
        "Your GloWe home": "صفحتك الرئيسية في GloWe",
        "GloWe was created as a home for impact communities: a place to make work visible, build trust, share multilingual knowledge, and turn local needs into collaborative action. You can arrive with a project, a question, a skill, a story, or a need. There is room for all of it.": "تأسست GloWe لتكون بيتًا لمجتمعات الأثر: مكانًا لإظهار العمل، وبناء الثقة، ومشاركة المعرفة متعددة اللغات، وتحويل الاحتياجات المحلية إلى عمل جماعي. يمكنك الوصول بمشروع، أو سؤال، أو مهارة، أو قصة، أو حاجة. هناك مكان لكل ذلك.",
        "Our community is built around practical exchange: professional volunteers, proven solutions, multilingual knowledge, local and global collaboration, tools and resources, donor and client access, social-business integration, and peer-to-peer inspiration.": "يقوم مجتمعنا على التبادل العملي: متطوعون محترفون، حلول مثبتة، معرفة متعددة اللغات، تعاون محلي وعالمي، أدوات وموارد، الوصول إلى المانحين والعملاء، تكامل الأعمال الاجتماعية، والإلهام من الأقران.",
        // TD-141 — report/saved-item target-type + status enum labels
        "Wish": "أمنية",
        "Thread": "نقاش",
        "General": "عام",
        "Dismissed": "مرفوض",
        "Actioned": "تم التعامل معه",
        // Forums page welded counts (members/posts/replies/Last active)
        "members": "أعضاء",
        "replies": "ردود",
        "Last active": "آخر نشاط",
        "Discussion from members of ": "نقاش من أعضاء ",
        // discussion-group.html group-stats row
        "active threads": "نقاشات نشطة",
        // opportunity.html org-mission fallback text
        "This local opportunity was published by a GloWe community member and is ready for interested volunteers or collaborators.": "تم نشر هذه الفرصة المحلية من قبل عضو في مجتمع GloWe وهي جاهزة للمتطوعين أو المتعاونين المهتمين.",
        // connections.html title + intro + follow-ui error state
        "Connections - GloWe": "الروابط - GloWe",
        "Followers and people this profile follows on GloWe.": "المتابعون والأشخاص الذين يتابعهم هذا الملف الشخصي على GloWe.",
        "Missing user id.": "معرّف المستخدم مفقود.",
        // admin.html — never previously translated (moderation + health tabs)
        "Review new profile submissions, respond to reports, and monitor production health from one place.": "راجع طلبات الملفات الجديدة، وردّ على البلاغات، وراقب صحة الإنتاج من مكان واحد.",
        "Moderation": "الإشراف",
        "System health": "صحة النظام",
        "Field": "المجال",
        "Submitted": "تم الإرسال في",
        "Production probes": "فحوصات الإنتاج",
        "Read-only checks against the live GloWe site. Refreshed after each deploy and every 15 minutes.": "فحوصات للقراءة فقط على موقع GloWe المباشر. يتم التحديث بعد كل نشر وكل 15 دقيقة.",
        "No data": "لا توجد بيانات",
        "Refresh": "تحديث",
        "Open this tab to load probes": "افتح هذا التبويب لتحميل الفحوصات",
        "Health data loads on demand so moderation stays fast.": "تُحمَّل بيانات الصحة عند الطلب حتى يبقى الإشراف سريعًا.",
        "Recent probe history": "سجل الفحوصات الأخيرة",
        "Check": "الفحص",
        "Latency": "زمن الاستجابة",
        "Version": "الإصدار",
        "Checked at": "تم الفحص في",
        "Detail": "التفاصيل",
        "Admin sections": "أقسام الإدارة",
        "Explain the decision — especially required when rejecting": "اشرح القرار — مطلوب بشكل خاص عند الرفض",
        // registrationProfileFields publicPrompt/fundingLabel/budgetLabel for
        // business/initiative/volunteer/professional — reachable via
        // renderQuestionnaireProfile() on the Personal Area page (ngo's were
        // already covered by an earlier harvest, the other 4 types were not)
        "Open to collaborations, products, services, or CSR partnerships?": "منفتحون على التعاون أو المنتجات أو الخدمات أو شراكات المسؤولية الاجتماعية؟",
        "Business model / support sources": "نموذج العمل / مصادر الدعم",
        "Looking for volunteers, mentors, partners, or visibility?": "تبحث عن متطوعين أو موجهين أو شركاء أو ظهور؟",
        "Current support / resources": "الدعم / الموارد الحالية",
        "Can people contact you directly through GloWe?": "هل يمكن للأشخاص التواصل معك مباشرة عبر GloWe؟",
        "Preferred communication": "طريقة التواصل المفضلة",
        "Support needs / accessibility notes": "احتياجات الدعم / ملاحظات إمكانية الوصول",
        "Open to volunteering, paid services, forum leadership, or community support?": "منفتح على التطوع أو الخدمات مدفوعة الأجر أو قيادة المنتدى أو دعم المجتمع؟",
        "Preferred engagement": "طريقة المشاركة المفضلة",
        "Rates / pro-bono policy": "الأسعار / سياسة العمل التطوعي المجاني",
    },
    am: {
        "Show original": "ዋናውን አሳይ",
        "Show translation": "ትርጉሙን አሳይ",
        "Translating…": "በመተርጎም ላይ…",
        "Name in English (optional)": "ስም በእንግሊዝኛ (አማራጭ)",
        "Latin / English display name": "የላቲን / እንግሊዝኛ የማሳያ ስም",
        "Latin / English name — auto-filled if left blank": "የላቲን / እንግሊዝኛ ስም — ባዶ ከተተወ በራሱ ይሞላል",
        "Organization name in English (optional)": "የድርጅቱ ስም በእንግሊዝኛ (አማራጭ)",
        "Organization name in English": "የድርጅቱ ስም በእንግሊዝኛ",
        "English org name — auto-filled if blank": "የድርጅቱ ስም በእንግሊዝኛ — ባዶ ከሆነ በራሱ ይሞላል",
        "Complete profile": "መገለጫን ያሟሉ",
        "Pending review": "ግምገማ በመጠባበቅ ላይ",
        "Needs changes": "ማስተካከያ ያስፈልገዋል",
        "Save profile": "መገለጫን አስቀምጥ",
        "Change profile photo": "የመገለጫ ፎቶ ይቀይሩ",
        "Change cover photo": "የሽፋን ፎቶ ይቀይሩ",
        "Remove cover": "ሽፋኑን አስወግድ",
        "Save cover": "ሽፋኑን አስቀምጥ",
        "Cover will be removed when you save.": "ሲያስቀምጡ ሽፋኑ ይወገዳል።",
        "Remove photo": "ፎቶውን አስወግድ",
        "Save photo": "ፎቶውን አስቀምጥ",
        "Profile saved": "መገለጫው ተቀምጧል",
        "Could not save profile.": "መገለጫውን ማስቀመጥ አልተቻለም።",
        "Replace": "ተካ",
        "Cancel": "ይቅር",
        "Photo will be removed when you save.": "ሲያስቀምጡ ፎቶው ይወገዳል።",
        "Saving...": "በማስቀመጥ ላይ...",
        "Uploading...": "በመጫን ላይ...",
        "Preparing photo...": "ፎቶውን በማዘጋጀት ላይ...",
        "Photo optimized for upload.": "ፎቶው ለመጫን ተመቻችቷል።",
        "Could not read image.": "ምስሉን ማንበብ አልተቻለም።",
        "Could not compress image.": "ምስሉን ማጨቅ አልተቻለም።",
        "Image is too large. Try a smaller photo.": "ምስሉ በጣም ትልቅ ነው። ያነሰ ፎቶ ይሞክሩ።",
        "Image is too large even after compression. Try a smaller photo.": "ከታጨቀ በኋላም ምስሉ በጣም ትልቅ ነው። ያነሰ ፎቶ ይሞክሩ።",
        "Could not save photo.": "ፎቶውን ማስቀመጥ አልተቻለም።",
        "Followers": "ተከታዮች",
        "Following": "የሚከተሉት",
        "Forum": "መድረክ",
        "Join GloWe to see more and take part.": "ተጨማሪ ለማየትና ለመሳተፍ ወደ GloWe ይቀላቀሉ።",
        "You're caught up": "ሁሉንም አይተዋል",
        "+ Follow": "+ ተከተል",
        "Following ✓": "እየተከተሉ ነው ✓",
        "Stop following": "መከተል አቁም",
        "This account requires approval to follow.": "ይህን መለያ ለመከተል ፈቃድ ያስፈልጋል።",
        "No followers yet": "እስካሁን ተከታዮች የሉም",
        "Not following anyone yet": "እስካሁን ማንንም አልተከተሉም",
        "Sign in to follow": "ለመከተል ይግቡ",
        "Sign in with Google to follow profiles and stay updated on their work.": "መገለጫዎችን ለመከተል እና ሥራቸውን ለመከታተል በGoogle ይግቡ።",
        "Can't follow this profile": "ይህን መገለጫ መከተል አይቻልም",
        "Could not follow": "መከተል አልተቻለም",
        "Could not unfollow": "መከተል ማቆም አልተቻለም",
        "Connections": "ግንኙነቶች",
        "Sign in to see connections": "ግንኙነቶችን ለማየት ይግቡ",
        "Show details": "ዝርዝሮችን አሳይ",
        "Hide details": "ዝርዝሮችን ደብቅ",
        "Individual": "ግለሰብ",
        "Settings": "ቅንብሮች",
        "Opportunities": "ዕድሎች",
        "My Events": "የእኔ ዝግጅቶች",
        "Focus not added yet": "የትኩረት መስክ እስካሁን አልተጨመረም",
        "Saved from the GloWe community": "ከGloWe ማህበረሰብ የተቀመጠ",
        "Loading your event registrations…": "የዝግጅት ምዝገባዎችዎን በመጫን ላይ…",
        "Education & Knowledge": "ትምህርት እና ዕውቀት",
        "Environment & Climate Action": "አካባቢ እና የአየር ንብረት ተግባር",
        "Health & Community Care": "ጤና እና የማህበረሰብ እንክብካቤ",
        "Rights, Safety & Civic Power": "መብቶች፣ ደህንነት እና የዜጎች ኃይል",
        "A focused group for learning spaces, youth programs, multilingual knowledge sharing, and practical education tools.": "ለመማሪያ ቦታዎች፣ ለወጣቶች ፕሮግራሞች፣ ለብዙ ቋንቋ ዕውቀት ልውውጥ እና ለተግባራዊ የትምህርት መሣሪያዎች ያተኮረ ቡድን።",
        "For climate, food systems, waste, restoration, repair, and local environmental action.": "ለአየር ንብረት፣ ለምግብ ሥርዓቶች፣ ለቆሻሻ፣ ለማገገም፣ ለጥገና እና ለአካባቢያዊ የአካባቢ ተግባር።",
        "A moderated space for wellbeing, preventive health, emergency response, and community care methods.": "ለደህንነት፣ ለመከላከያ ጤና፣ ለአስቸኳይ ጊዜ ምላሽ እና ለማህበረሰብ እንክብካቤ ዘዴዎች የሚመራ ቦታ።",
        "For rights-based action, civic participation, safe moderation, and community trust.": "በመብት ላይ ለተመሠረተ ተግባር፣ ለዜጎች ተሳትፎ፣ ለደህንነቱ የተጠበቀ አስተዳደር እና ለማህበረሰብ እምነት።",
        "Youth": "ወጣቶች",
        "Repair": "ጥገና",
        "Wellbeing": "ደህንነት",
        "Crisis Response": "የቀውስ ምላሽ",
        "Justice": "ፍትሕ",
        "Safety": "ደህንነት",
        "Civic Action": "የዜጎች ተግባር",
        "Home": "መነሻ",
        "Personal Area": "የግል ክፍል",
        "Wishing Well": "የምኞት ጉድጓድ",
        "The Wishing Well": "የምኞት ጉድጓድ",
        "Wishes": "ምኞቶች",
        "Organizations": "ድርጅቶች",
        "Community": "ማህበረሰብ",
        "Forums": "መድረኮች",
        "About": "ስለ እኛ",
        "About Us": "ስለ እኛ",
        "Profile": "መገለጫ",
        "Sign up / Sign in": "ይመዝገቡ / ይግቡ",
        "Log In": "ይግቡ",
        "Log in": "ይግቡ",
        "Join GloWe": "GloWeን ይቀላቀሉ",
        "Log Out": "ውጣ",
        "Hi,": "ሰላም፣",
        "there": "ወዳጃችን",
        "Global Learning, Open Knowledge & Wisdom Exchange.": "ዓለም አቀፍ ትምህርት፣ ክፍት ዕውቀት እና የጥበብ ልውውጥ።",
        "Bridging local solutions to global challenges through shared knowledge, solidarity, and practical action.": "በጋራ ዕውቀት፣ በአንድነት እና በተግባራዊ እርምጃ የአካባቢ መፍትሔዎችን ከዓለም አቀፍ ተግዳሮቶች ጋር እናገናኛለን።",
        "Quick Links": "ፈጣን አገናኞች",
        "Explore": "ያስሱ",
        "Participate": "ይሳተፉ",
        "Write a post": "ልጥፍ ይጻፉ",
        "Volunteer Network": "የበጎ ፈቃደኞች መረብ",
        "What's next": "ቀጥሎ ምን አለ",
        "What Comes Next": "ቀጥሎ የሚመጣው",
        "Built With Care": "በጥንቃቄ የተገነባ",
        "An MVP by the GloWe community, with product and implementation support by Topaz.": "በGloWe ማህበረሰብ የተሠራ የመጀመሪያ ሥሪት፣ በTopaz የምርት እና የትግበራ ድጋፍ።",
        "Admin Review": "አስተዳደር እና ግምገማ",
        "Terms & Community Charter": "ውሎች እና የማህበረሰብ ቻርተር",
        "For Organizations": "ለድርጅቶች",
        "Register Your Organization": "ድርጅትዎን ይመዝግቡ",
        "Post an Opportunity": "ዕድል ይለጥፉ",
        "Connect": "ይገናኙ",
        "Welcome Back": "እንኳን በደህና ተመለሱ",
        "Welcome Back!": "እንኳን በደህና ተመለሱ!",
        "Sign in with your Google account to continue.": "ለመቀጠል በGoogle መለያዎ ይግቡ።",
        "Continue with Google": "በGoogle ይቀጥሉ",
        "Don't have an account?": "መለያ የለዎትም?",
        "Join our community": "ማህበረሰባችንን ይቀላቀሉ",
        "Join the GloWe Community": "የGloWe ማህበረሰብን ይቀላቀሉ",
        "Sign in with your Google account to get started.": "ለመጀመር በGoogle መለያዎ ይግቡ።",
        "Already have an account?": "አስቀድሞ መለያ አለዎት?",
        "Success": "ተሳክቷል",
        "Your action was completed successfully.": "ተግባርዎ በተሳካ ሁኔታ ተጠናቅቋል።",
        "Continue": "ቀጥል",
        "Find your GloWe path": "የGloWe መንገድዎን ያግኙ",
        "Choose the path that matches what you want to do first.": "መጀመሪያ ማድረግ የሚፈልጉትን የሚመጥን መንገድ ይምረጡ።",
        "I represent an organization": "ድርጅትን እወክላለሁ",
        "Create a profile, post a need, and receive structured offers.": "መገለጫ ይፍጠሩ፣ ፍላጎት ይለጥፉ እና የተደራጁ ቅናሾችን ይቀበሉ።",
        "I can help": "መርዳት እችላለሁ",
        "Find wishes that match your skills, language, location, and time.": "ከክህሎትዎ፣ ከቋንቋዎ፣ ከአካባቢዎ እና ከጊዜዎ ጋር የሚመጥኑ ምኞቶችን ያግኙ።",
        "I am a business partner": "የንግድ አጋር ነኝ",
        "Match CSR teams, logistics, funding, or services with verified needs.": "የCSR ቡድኖችን፣ ሎጂስቲክስን፣ የገንዘብ ድጋፍን ወይም አገልግሎቶችን ከተረጋገጡ ፍላጎቶች ጋር ያገናኙ።",
        "Manage your account, language, and session preferences.": "መለያዎን፣ ቋንቋዎን እና የክፍለ ጊዜ ምርጫዎችዎን ያስተዳድሩ።",
        "Account": "መለያ",
        "Name": "ስም",
        "Email": "ኢሜይል",
        "Account type": "የመለያ ዓይነት",
        "Community member": "የማህበረሰብ አባል",
        "Open Personal Area": "የግል ክፍልን ክፈት",
        "Language": "ቋንቋ",
        "Interface language": "የገጽታ ቋንቋ",
        "Choose the language for the GloWe interface. Hebrew and Arabic are shown in a right-to-left (RTL) layout.": "የGloWe ገጽታ ቋንቋን ይምረጡ። ዕብራይስጥ እና ዐረብኛ ከቀኝ ወደ ግራ (RTL) አቀማመጥ ይታያሉ።",
        "English": "እንግሊዝኛ",
        "Hebrew": "ዕብራይስጥ",
        "Session": "ክፍለ ጊዜ",
        "End your session on this device. You can sign back in any time with Google.": "በዚህ መሣሪያ ላይ ክፍለ ጊዜዎን ያጠናቅቁ። በማንኛውም ጊዜ በGoogle እንደገና መግባት ይችላሉ።",
        "Delete Account": "መለያን ሰርዝ",
        "Permanently delete your GloWe profile from this community. This removes your profile details; your Google sign-in itself is not deleted, so you can sign up again later.": "የGloWe መገለጫዎን ከዚህ ማህበረሰብ በቋሚነት ይሰርዙ። ይህ የመገለጫዎን ዝርዝሮች ያስወግዳል፤ የGoogle መግቢያዎ ራሱ አይሰረዝም፣ ስለዚህ ወደፊት እንደገና መመዝገብ ይችላሉ።",
        "Type DELETE to confirm": "ለማረጋገጥ DELETE ብለው ይጻፉ",
        "Could not delete account": "መለያውን መሰረዝ አልተቻለም",
        "Something went wrong deleting your profile. Please try again.": "መገለጫዎን በመሰረዝ ላይ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
        "Sign in to manage settings": "ቅንብሮችን ለማስተዳደር ይግቡ",
        "Your account, language, and session options live here once you are signed in.": "ከገቡ በኋላ የመለያዎ፣ የቋንቋዎ እና የክፍለ ጊዜዎ አማራጮች እዚህ ይታያሉ።",
        "Sign in to open your personal area": "የግል ክፍልዎን ለመክፈት ይግቡ",
        "Your profile, applications, needs, and saved items live here once you are signed in.": "ከገቡ በኋላ መገለጫዎ፣ ማመልከቻዎችዎ፣ ፍላጎቶችዎ እና የተቀመጡ ንጥሎችዎ እዚህ ይታያሉ።",
        "Your GloWe": "የእርስዎ GloWe",
        "Welcome back,": "እንኳን በደህና ተመለሱ፣",
        "What would you like to do today? Share knowledge, post an opportunity, or ask the community for support.": "ዛሬ ምን ማድረግ ይፈልጋሉ? ዕውቀት ያካፍሉ፣ ዕድል ይለጥፉ ወይም ከማህበረሰቡ ድጋፍ ይጠይቁ።",
        "Share a post": "ልጥፍ ያካፍሉ",
        "Post an opportunity": "ዕድል ይለጥፉ",
        "Ask for support": "ድጋፍ ይጠይቁ",
        "Your activity": "የእርስዎ እንቅስቃሴ",
        "What is happening on GloWe": "በGloWe ላይ ምን እየሆነ ነው",
        "See all": "ሁሉንም ይመልከቱ",
        "See all comments": "ሁሉንም አስተያየቶች ይመልከቱ",
        "Loading your GloWe home…": "የGloWe መነሻ ገጽዎን በመጫን ላይ…",
        "You have not shared anything yet": "እስካሁን ምንም አላካፈሉም",
        "Your posts, opportunities, and requests will gather here.": "ልጥፎችዎ፣ ዕድሎችዎ እና ጥያቄዎችዎ እዚህ ይሰበሰባሉ።",
        "Write your first post": "የመጀመሪያ ልጥፍዎን ይጻፉ",
        "The community is just getting started": "ማህበረሰቡ ገና እየጀመረ ነው",
        "Be the first to share a post or an opportunity others can join.": "ሌሎች ሊቀላቀሉት የሚችሉትን ልጥፍ ወይም ዕድል በማካፈል የመጀመሪያው ይሁኑ።",
        "Start the conversation": "ውይይቱን ይጀምሩ",
        "Community post": "የማህበረሰብ ልጥፍ",
        "Community Member": "የማህበረሰብ አባል",
        "A home for people building impact together": "በጋራ ተጽዕኖ ለሚፈጥሩ ሰዎች ቤት",
        "You do not have to carry the work alone.": "ሥራውን ብቻዎን መሸከም የለብዎትም።",
        "GloWe is a warm, professional community for people, organizations, initiatives, volunteers, and partners working around the SDGs. Here you can ask for support, offer what you know, share field wisdom, and meet people who walk beside you in the work.": "GloWe በዘላቂ ልማት ግቦች ዙሪያ ለሚሠሩ ሰዎች፣ ድርጅቶች፣ ተነሳሽነቶች፣ በጎ ፈቃደኞች እና አጋሮች የሚሆን ሞቅ ያለ እና ሙያዊ ማህበረሰብ ነው። እዚህ ድጋፍ መጠየቅ፣ የሚያውቁትን ማካፈል፣ የመስክ ጥበብን ማጋራት እና በሥራው ከጎንዎ የሚራመዱ ሰዎችን ማግኘት ይችላሉ።",
        "Find Your Place": "ቦታዎን ያግኙ",
        "Meet the Community": "ማህበረሰቡን ይተዋወቁ",
        "Ask for Support": "ድጋፍ ይጠይቁ",
        "You have something to give, and something to receive.": "የሚሰጡት ነገር አለዎት፣ የሚቀበሉትም ነገር አለ።",
        "You can ask": "መጠየቅ ይችላሉ",
        "You can offer": "ማቅረብ ይችላሉ",
        "You can learn": "መማር ይችላሉ",
        "You can connect": "መገናኘት ይችላሉ",
        "You can belong": "አባል መሆን ይችላሉ",
        "Three communities, one living network": "ሦስት ማህበረሰቦች፣ አንድ ሕያው መረብ",
        "Enter the Community": "ወደ ማህበረሰቡ ይግቡ",
        "Local Community": "የአካባቢ ማህበረሰብ",
        "People who know the place": "ቦታውን የሚያውቁ ሰዎች",
        "Share a local need": "የአካባቢ ፍላጎት ያካፍሉ",
        "Expert Community": "የባለሙያዎች ማህበረሰብ",
        "People who can strengthen the work": "ሥራውን ማጠናከር የሚችሉ ሰዎች",
        "Offer your expertise": "ሙያዎን ያቅርቡ",
        "Global Community": "ዓለም አቀፍ ማህበረሰብ",
        "People who help knowledge travel": "ዕውቀት እንዲዘዋወር የሚያግዙ ሰዎች",
        "Join a discussion": "ውይይት ይቀላቀሉ",
        "Ask with honesty": "በቅንነት መጠየቅ",
        "Offer with care": "በአሳቢነት ማቅረብ",
        "Build with solidarity": "በአንድነት መገንባት",
        "Start where you are": "ካሉበት ይጀምሩ",
        "Choose the doorway that feels right today": "ዛሬ ትክክል የሚመስለውን በር ይምረጡ",
        "Need support": "ድጋፍ ያስፈልገኛል",
        "Share what would help": "የሚረዳዎትን ያካፍሉ",
        "Want to contribute": "አስተዋጽኦ ማድረግ እፈልጋለሁ",
        "Offer your time or expertise": "ጊዜዎን ወይም ሙያዎን ያቅርቡ",
        "Offer Help": "እርዳታ ያቅርቡ",
        "Looking for people": "ሰዎችን እየፈለግኩ ነው",
        "Step into the community": "ወደ ማህበረሰቡ ይግቡ",
        "Enter Community": "ወደ ማህበረሰቡ መግቢያ",
        "What you can do in GloWe now": "አሁን በGloWe ውስጥ ማድረግ የሚችሉት",
        "Create a profile": "መገለጫ ይፍጠሩ",
        "Share with the community": "ከማህበረሰቡ ጋር ያካፍሉ",
        "Use the Wishing Well": "የምኞት ጉድጓድን ይጠቀሙ",
        "Find ways to help": "የመርዳት መንገዶችን ያግኙ",
        "Values that guide the space": "ይህን ቦታ የሚመሩ እሴቶች",
        "Solidarity": "አንድነት",
        "Shared Knowledge": "የጋራ ዕውቀት",
        "Practical Action": "ተግባራዊ እርምጃ",
        "Trust and Respect": "እምነት እና መከባበር",
        "The GloWe ecosystem": "የGloWe ሥነ ምህዳር",
        "A glimpse into the community": "ስለ ማህበረሰቡ አጭር ዕይታ",
        "Read Community Posts": "የማህበረሰብ ልጥፎችን ያንብቡ",
        "Who is invited?": "ማን ተጋብዟል?",
        "How GloWe is structured": "GloWe እንዴት እንደተዋቀረ",
        "User Roles": "የተጠቃሚ ሚናዎች",
        "Business Model": "የንግድ ሞዴል",
        "Development Roadmap": "የልማት የመንገድ ካርታ",
        "Trusted by the GloWe Community": "በGloWe ማህበረሰብ የታመነ",
        "You have a place in this community.": "በዚህ ማህበረሰብ ውስጥ ቦታ አለዎት።",
        "Bring what you know. Ask for what you need. Meet people who are working, learning, building, and caring around the SDGs.": "የሚያውቁትን ይዘው ይምጡ። የሚያስፈልግዎትን ይጠይቁ። በዘላቂ ልማት ግቦች ዙሪያ የሚሠሩ፣ የሚማሩ፣ የሚገነቡ እና የሚያስቡ ሰዎችን ይተዋወቁ።",
        "Read Community": "ማህበረሰቡን ያንብቡ",
        "Open Community": "ማህበረሰቡን ክፈት",
        "Read What's Next": "«ቀጥሎ ምን አለ» ያንብቡ",
        "See How This Could Grow": "ይህ እንዴት ሊያድግ እንደሚችል ይመልከቱ",
        "Active threads will appear here once community members start discussions.": "የማህበረሰብ አባላት ውይይት ሲጀምሩ ንቁ ውይይቶች እዚህ ይታያሉ።",
        "Activity": "እንቅስቃሴ",
        "Add Project": "ፕሮጀክት ጨምር",
        "Advocacy": "ተሟጋችነት",
        "All areas": "ሁሉም መስኮች",
        "All Fields": "ሁሉም መስኮች",
        "All Groups": "ሁሉም ቡድኖች",
        "All Locations": "ሁሉም አካባቢዎች",
        "All regions": "ሁሉም ክልሎች",
        "All types": "ሁሉም ዓይነቶች",
        "All Types": "ሁሉም ዓይነቶች",
        "All wishes": "ሁሉም ምኞቶች",
        "Applications": "ማመልከቻዎች",
        "Apply for This Opportunity": "ለዚህ ዕድል ያመልክቱ",
        "Apply Now": "አሁን ያመልክቱ",
        "Apply to opportunities or publish your own request for volunteers and collaborators.": "ለዕድሎች ያመልክቱ ወይም ለበጎ ፈቃደኞች እና ለተባባሪዎች የራስዎን ጥያቄ ያሳትሙ።",
        "Apply with your availability and relevant skills.": "የሚገኙበትን ጊዜ እና ተዛማጅ ክህሎቶችዎን አካተው ያመልክቱ።",
        "Approve": "አጽድቅ",
        "Approve profiles that are ready, or send them back for changes.": "ዝግጁ የሆኑ መገለጫዎችን ያጽድቁ ወይም ለማስተካከያ ይመልሱ።",
        "Arabic": "ዐረብኛ",
        "Articles / media": "ጽሑፎች / ሚዲያ",
        "As a member of the GloWe community, you agree not to:": "የGloWe ማህበረሰብ አባል እንደመሆንዎ የሚከተሉትን ላለማድረግ ይስማማሉ፦",
        "Ask a real question, lead a focused space, share a file, or learn from people working through similar challenges.": "እውነተኛ ጥያቄ ይጠይቁ፣ ያተኮረ ቦታ ይምሩ፣ ፋይል ያካፍሉ ወይም ተመሳሳይ ተግዳሮቶችን ከሚያልፉ ሰዎች ይማሩ።",
        "Ask question": "ጥያቄ ይጠይቁ",
        "Ask, advise, lead": "ይጠይቁ፣ ይምከሩ፣ ይምሩ",
        "Attach file": "ፋይል ያያይዙ",
        "Back to Community": "ወደ ማህበረሰቡ ተመለስ",
        "Back to Feed": "ወደ ዥረቱ ተመለስ",
        "Back to Wishing Well": "ወደ የምኞት ጉድጓድ ተመለስ",
        "Backend not configured": "የኋላ ሥርዓቱ አልተዋቀረም",
        "Based on GloWe content types": "በGloWe የይዘት ዓይነቶች ላይ የተመሠረተ",
        "Better matching": "የተሻለ ተዛምዶ",
        "Both belong here. GloWe is built for mutual support, respectful collaboration, and the quiet relief of finding people who understand the journey.": "ሁለቱም እዚህ ቦታ አላቸው። GloWe ለጋራ ድጋፍ፣ ለአክብሮታዊ ትብብር እና ጉዞውን የሚረዱ ሰዎችን በማግኘት ለሚመጣው ጸጥ ያለ እፎይታ የተገነባ ነው።",
        "Browse opportunities, save what matters, contact members, and offer your professional skills, time, resources, or lived experience.": "ዕድሎችን ያስሱ፣ የሚያስፈልግዎትን ያስቀምጡ፣ አባላትን ያግኙ እና ሙያዊ ክህሎቶችዎን፣ ጊዜዎን፣ ሀብቶችዎን ወይም የሕይወት ተሞክሮዎን ያቅርቡ።",
        "Browse Organizations": "ድርጅቶችን ያስሱ",
        "Build trust through profiles, community review, and clear next steps": "በመገለጫዎች፣ በማህበረሰብ ግምገማ እና በግልጽ ቀጣይ እርምጃዎች እምነት ይገንቡ",
        "Business-Social Collaboration": "የንግድ እና ማህበራዊ ትብብር",
        "Businesses / CSR teams": "ንግዶች / የCSR ቡድኖች",
        "Businesses and partners": "ንግዶች እና አጋሮች",
        "By using the platform, you agree that:": "መድረኩን በመጠቀም የሚከተሉትን ይስማማሉ፦",
        "Change": "ቀይር",
        "Choose the right topic, add useful context, and publish it into the community feed.": "ትክክለኛውን ርዕስ ይምረጡ፣ ጠቃሚ አውድ ይጨምሩ እና ወደ ማህበረሰብ ዥረት ያሳትሙ።",
        "Civic Innovation": "የዜጎች ፈጠራ",
        "Cleanup days worth repeating": "መደገም የሚገባቸው የጽዳት ቀናት",
        "Clear": "አጽዳ",
        "Clear filters": "ማጣሪያዎችን አጽዳ",
        "Climate": "የአየር ንብረት",
        "Close": "ዝጋ",
        "Comment": "አስተያየት",
        "comment": "አስተያየት",
        "comments": "አስተያየቶች",
        "Commitment:": "ቁርጠኝነት፦",
        "Community Activity": "የማህበረሰብ እንቅስቃሴ",
        "Community Building": "የማህበረሰብ ግንባታ",
        "Community feed": "የማህበረሰብ ዥረት",
        "Community Feed": "የማህበረሰብ ዥረት",
        "Community feed filters": "የማህበረሰብ ዥረት ማጣሪያዎች",
        "Community first, technology second.": "ማህበረሰብ መጀመሪያ፣ ቴክኖሎጂ ሁለተኛ።",
        "Community Forums": "የማህበረሰብ መድረኮች",
        "Community home": "የማህበረሰብ መነሻ",
        "Community integrity": "የማህበረሰብ ታማኝነት",
        "Community interactions": "የማህበረሰብ መስተጋብሮች",
        "Community managers": "የማህበረሰብ አስተዳዳሪዎች",
        "Community members with active contributions will be featured here.": "ንቁ አስተዋጽኦ ያላቸው የማህበረሰብ አባላት እዚህ ይቀርባሉ።",
        "Community reinvestment": "በማህበረሰቡ ላይ እንደገና መዋዕለ ንዋይ ማፍሰስ",
        "Community reports": "የማህበረሰብ ሪፖርቶች",
        "Community reports will appear here.": "የማህበረሰብ ሪፖርቶች እዚህ ይታያሉ።",
        "Community review": "የማህበረሰብ ግምገማ",
        "Community support board": "የማህበረሰብ ድጋፍ ሰሌዳ",
        "Community wishes": "የማህበረሰብ ምኞቶች",
        "Connect with social and environmental work through responsible collaboration, CSR, ESG, and shared value.": "በኃላፊነት በተሞላ ትብብር፣ በCSR፣ በESG እና በጋራ እሴት አማካኝነት ከማህበራዊ እና አካባቢያዊ ሥራ ጋር ይገናኙ።",
        "Connection suggestions": "የግንኙነት አስተያየቶች",
        "connections": "ግንኙነቶች",
        "Consultation request": "የምክር ጥያቄ",
        "Contact": "ግንኙነት",
        "Content": "ይዘት",
        "Context": "አውድ",
        "Could not load queue": "ሰልፉን መጫን አልተቻለም",
        "Create a password": "የይለፍ ቃል ይፍጠሩ",
        "Create a password (min 8 characters)": "የይለፍ ቃል ይፍጠሩ (ቢያንስ 8 ቁምፊዎች)",
        "Create Account": "መለያ ይፍጠሩ",
        "Create Your Profile": "መገለጫዎን ይፍጠሩ",
        "Daily workspace": "የዕለት ተዕለት የሥራ ቦታ",
        "Describe your relevant skills and experience...": "ተዛማጅ ክህሎቶችዎን እና ተሞክሮዎን ይግለጹ...",
        "Direct conversations with volunteers, organizations, and partners live here once you are signed in.": "ከገቡ በኋላ ከበጎ ፈቃደኞች፣ ከድርጅቶች እና ከአጋሮች ጋር ያሉ ቀጥተኛ ውይይቶች እዚህ ይታያሉ።",
        "Direct conversations with volunteers, organizations, and partners.": "ከበጎ ፈቃደኞች፣ ከድርጅቶች እና ከአጋሮች ጋር ቀጥተኛ ውይይቶች።",
        "Direct messaging is coming soon": "ቀጥተኛ መልእክት በቅርቡ ይመጣል",
        "Discover organizations, initiatives, and partners sharing field knowledge and practical needs.": "የመስክ ዕውቀትን እና ተግባራዊ ፍላጎቶችን የሚያካፍሉ ድርጅቶችን፣ ተነሳሽነቶችን እና አጋሮችን ያግኙ።",
        "Discover People": "ሰዎችን ያግኙ",
        "Discussion group": "የውይይት ቡድን",
        "Discussion groups will appear here once they are set up.": "የውይይት ቡድኖች ከተዋቀሩ በኋላ እዚህ ይታያሉ።",
        "Discussion groups will appear here soon.": "የውይይት ቡድኖች በቅርቡ እዚህ ይታያሉ።",
        "Discussion Groups": "የውይይት ቡድኖች",
        "Dismiss": "ዝጋ",
        "Distribution": "ስርጭት",
        "Diverse people speaking around a round table at an impact community conference": "በተጽዕኖ ማህበረሰብ ጉባኤ ላይ በክብ ጠረጴዛ ዙሪያ የሚወያዩ የተለያዩ ሰዎች",
        "Document what happened after someone helped: what changed, what was learned, and what support is still needed.": "አንድ ሰው ከረዳ በኋላ የሆነውን ይመዝግቡ፦ ምን እንደተለወጠ፣ ምን እንደተማራችሁ እና አሁንም ምን ድጋፍ እንደሚያስፈልግ።",
        "Duration": "ቆይታ",
        "Duration:": "ቆይታ፦",
        "Each community starts from its own reality: language, culture, needs, skills, and local leadership.": "እያንዳንዱ ማህበረሰብ ከራሱ እውነታ ይጀምራል፦ ቋንቋ፣ ባህል፣ ፍላጎቶች፣ ክህሎቶች እና የአካባቢ አመራር።",
        "Each part of the system is here to help impact work become more visible, connected, and supported.": "የሥርዓቱ እያንዳንዱ ክፍል የተጽዕኖ ሥራ ይበልጥ እንዲታይ፣ እንዲተሳሰር እና ድጋፍ እንዲያገኝ ለመርዳት አለ።",
        "Edit profile": "መገለጫን አርትዕ",
        "Edit Profile": "መገለጫን አርትዕ",
        "Edit your profile, add projects, track opportunities, and manage your community activity in one place.": "መገለጫዎን ያርትዑ፣ ፕሮጀክቶችን ይጨምሩ፣ ዕድሎችን ይከታተሉ እና የማህበረሰብ እንቅስቃሴዎን በአንድ ቦታ ያስተዳድሩ።",
        "Education": "ትምህርት",
        "Education, Climate, Health, Funding": "ትምህርት፣ የአየር ንብረት፣ ጤና፣ የገንዘብ ድጋፍ",
        "Education, climate, mentors, Jerusalem...": "ትምህርት፣ የአየር ንብረት፣ አማካሪዎች፣ ኢየሩሳሌም...",
        "Effective Date: May 30, 2026": "የሥራ ላይ የሚውልበት ቀን፦ ግንቦት 30፣ 2026",
        "Environment": "አካባቢ",
        "Equipment / Space": "መሣሪያ / ቦታ",
        "Evenings": "ምሽቶች",
        "Events": "ዝግጅቶች",
        "Every connection can end with a short outcome update.": "እያንዳንዱ ግንኙነት በአጭር የውጤት ዘገባ ሊጠናቀቅ ይችላል።",
        "Everyone": "ሁሉም",
        "Example: Grant proposal checklist for small NGOs": "ምሳሌ፦ ለአነስተኛ መንግሥታዊ ያልሆኑ ድርጅቶች የእርዳታ ጥያቄ ማረጋገጫ ዝርዝር",
        "Explore Community": "ማህበረሰቡን ያስሱ",
        "Explore possible collaborations": "ሊሆኑ የሚችሉ ትብብሮችን ያስሱ",
        "Explore possible connections between needs, skills, organizations, and people. Each suggestion is an invitation to read, ask, and decide together.": "በፍላጎቶች፣ በክህሎቶች፣ በድርጅቶች እና በሰዎች መካከል ሊኖሩ የሚችሉ ግንኙነቶችን ያስሱ። እያንዳንዱ አስተያየት አብሮ ለማንበብ፣ ለመጠየቅ እና ለመወሰን የቀረበ ግብዣ ነው።",
        "Fetching organizations awaiting verification.": "ማረጋገጫ የሚጠባበቁ ድርጅቶችን በማምጣት ላይ።",
        "Field knowledge becomes easier to find, translate, discuss, and reuse across communities.": "የመስክ ዕውቀት በማህበረሰቦች መካከል ለማግኘት፣ ለመተርጎም፣ ለመወያየት እና እንደገና ለመጠቀም ቀላል ይሆናል።",
        "Field stories, questions, support offers, updates, and open calls": "የመስክ ታሪኮች፣ ጥያቄዎች፣ የድጋፍ ቅናሾች፣ ዘገባዎች እና ክፍት ጥሪዎች",
        "Field update": "የመስክ ዘገባ",
        "Field wisdom, professional tools, lived experience, and multilingual learning all have value here.": "የመስክ ጥበብ፣ ሙያዊ መሣሪያዎች፣ የሕይወት ተሞክሮ እና ብዙ ቋንቋ ትምህርት — ሁሉም እዚህ ዋጋ አላቸው።",
        "Field:": "መስክ፦",
        "Filter by region, profile type, or keywords connected to mission, field, needs, and projects.": "በክልል፣ በመገለጫ ዓይነት ወይም ከተልዕኮ፣ ከመስክ፣ ከፍላጎቶች እና ከፕሮጀክቶች ጋር በተያያዙ ቁልፍ ቃላት ያጣሩ።",
        "Find a Group": "ቡድን ያግኙ",
        "Find My Path": "መንገዴን አግኝ",
        "Find or publish practical volunteer, work, and collaboration opportunities for social impact projects.": "ለማህበራዊ ተጽዕኖ ፕሮጀክቶች ተግባራዊ የበጎ ፈቃድ፣ የሥራ እና የትብብር ዕድሎችን ያግኙ ወይም ያሳትሙ።",
        "Find people who understand your cause, help shape your next step, and make your work visible.": "ዓላማዎን የሚረዱ፣ ቀጣይ እርምጃዎን እንዲቀርጹ የሚያግዙ እና ሥራዎን የሚያስተዋውቁ ሰዎችን ያግኙ።",
        "Find projects, organizations, volunteers, experts, and practical needs": "ፕሮጀክቶችን፣ ድርጅቶችን፣ በጎ ፈቃደኞችን፣ ባለሙያዎችን እና ተግባራዊ ፍላጎቶችን ያግኙ",
        "Find the right people": "ትክክለኛዎቹን ሰዎች ያግኙ",
        "Find the right request": "ትክክለኛውን ጥያቄ ያግኙ",
        "Find where your skills can help.": "ክህሎቶችዎ የሚረዱበትን ቦታ ያግኙ።",
        "Flexible": "ተለዋዋጭ",
        "Follow the work, ask, offer, and connect.": "ሥራውን ይከታተሉ፣ ይጠይቁ፣ ያቅርቡ እና ይገናኙ።",
        "Follow updates": "ዘገባዎችን ይከታተሉ",
        "Follow Updates": "ዘገባዎችን ይከታተሉ",
        "Food Security": "የምግብ ዋስትና",
        "For questions, support, or concerns, please reach out:": "ለጥያቄዎች፣ ለድጋፍ ወይም ለስጋቶች እባክዎ ያግኙን፦",
        "For you": "ለእርስዎ",
        "Forum Leaders": "የመድረክ መሪዎች",
        "Forum leadership offer": "የመድረክ አመራር ቅናሽ",
        "Full Name": "ሙሉ ስም",
        "Full-time": "ሙሉ ጊዜ",
        "Funding preparation": "ለገንዘብ ድጋፍ ዝግጅት",
        "Funding Support": "የገንዘብ ድጋፍ",
        "Global": "ዓለም አቀፍ",
        "GloWe - Global Collaboration for Social Impact": "GloWe - ለማህበራዊ ተጽዕኖ ዓለም አቀፍ ትብብር",
        "GloWe begins as a simple MVP: profiles, posts, wishes, opportunities, and conversations. From here, we want to grow carefully, with local communities, field knowledge, and technology that serves people.": "GloWe እንደ ቀላል የመጀመሪያ ሥሪት ይጀምራል፦ መገለጫዎች፣ ልጥፎች፣ ምኞቶች፣ ዕድሎች እና ውይይቶች። ከዚህ ተነስተን ከአካባቢ ማህበረሰቦች፣ ከመስክ ዕውቀት እና ሰዎችን ከሚያገለግል ቴክኖሎጂ ጋር በጥንቃቄ ማደግ እንፈልጋለን።",
        "GloWe community promise": "የGloWe ማህበረሰብ ቃል",
        "GloWe community value system": "የGloWe ማህበረሰብ የእሴት ሥርዓት",
        "GloWe does not guarantee uninterrupted access or availability.": "GloWe ያልተቋረጠ ተደራሽነትን ወይም አገልግሎትን አያረጋግጥም።",
        "GloWe is built for people who meet, listen, offer, ask, and turn local experience into practical collaboration.": "GloWe የሚገናኙ፣ የሚያዳምጡ፣ የሚያቀርቡ፣ የሚጠይቁ እና የአካባቢ ተሞክሮን ወደ ተግባራዊ ትብብር ለሚቀይሩ ሰዎች የተገነባ ነው።",
        "GloWe is not liable for losses resulting from interruptions, errors, or misuse of the platform.": "GloWe ከመቋረጥ፣ ከስህተቶች ወይም መድረኩን አላግባብ ከመጠቀም ለሚመጡ ኪሳራዎች ተጠያቂ አይደለም።",
        "GloWe is open to all people and organizations, regardless of age, geography, identity, or legal status.": "GloWe ዕድሜ፣ አካባቢ፣ ማንነት ወይም ሕጋዊ ሁኔታ ሳይለይ ለሁሉም ሰዎች እና ድርጅቶች ክፍት ነው።",
        "GloWe may include links to external platforms or tools. We are not responsible for the content, privacy, or reliability of third-party services. Use them at your discretion.": "GloWe ወደ ውጫዊ መድረኮች ወይም መሣሪያዎች የሚያመሩ አገናኞችን ሊይዝ ይችላል። ለሦስተኛ ወገን አገልግሎቶች ይዘት፣ ግላዊነት ወይም አስተማማኝነት ኃላፊነት አንወስድም። በራስዎ ውሳኔ ይጠቀሙባቸው።",
        "GloWe may suspend or terminate accounts that violate these Terms or the Community Integrity Charter.": "GloWe እነዚህን ውሎች ወይም የማህበረሰብ ታማኝነት ቻርተርን የሚጥሱ መለያዎችን ሊያግድ ወይም ሊዘጋ ይችላል።",
        "GloWe Member": "የGloWe አባል",
        "GloWe reserves the right to:": "GloWe የሚከተሉትን የማድረግ መብት ይጠብቃል፦",
        "GloWe respects your privacy. Personal data will only be used to improve your experience and build relevant connections.": "GloWe ግላዊነትዎን ያከብራል። የግል መረጃ የሚውለው ተሞክሮዎን ለማሻሻል እና ተዛማጅ ግንኙነቶችን ለመገንባት ብቻ ነው።",
        "GloWe will not sell or license your content to external commercial entities without explicit consent.": "GloWe ያለ ግልጽ ፈቃድዎ ይዘትዎን ለውጫዊ የንግድ አካላት አይሸጥም ወይም ፈቃድ አይሰጥም።",
        "GloWe works through local roots, professional support, and global exchange.": "GloWe በአካባቢያዊ ሥሮች፣ በሙያዊ ድጋፍ እና በዓለም አቀፍ ልውውጥ ይሠራል።",
        "Good intentions become stronger when they are connected to clear needs, real people, and concrete next steps.": "መልካም ዓላማዎች ከግልጽ ፍላጎቶች፣ ከእውነተኛ ሰዎች እና ከተጨባጭ ቀጣይ እርምጃዎች ጋር ሲተሳሰሩ ይበልጥ ይጠናከራሉ።",
        "Grant match": "የእርዳታ ተዛምዶ",
        "Grey knowledge library": "የግራጫ ዕውቀት ቤተ መጻሕፍት",
        "Group Actions": "የቡድን ተግባራት",
        "Groups": "ቡድኖች",
        "Groups that want to document their work, find collaborators, and ask for concrete support.": "ሥራቸውን መመዝገብ፣ ተባባሪዎችን ማግኘት እና ተጨባጭ ድጋፍ መጠየቅ የሚፈልጉ ቡድኖች።",
        "Haifa": "ሃይፋ",
        "Health": "ጤና",
        "Healthy moderation rules": "ጤናማ የአስተዳደር ደንቦች",
        "Help communities turn field experience into practical guides, short case studies, templates, and translated resources.": "ማህበረሰቦች የመስክ ተሞክሮን ወደ ተግባራዊ መመሪያዎች፣ አጫጭር የጉዳይ ጥናቶች፣ አብነቶች እና ወደተተረጎሙ ሀብቶች እንዲቀይሩ ያግዙ።",
        "Help shape what comes next.": "ቀጥሎ የሚመጣውን ለመቅረጽ ያግዙ።",
        "Helpers explain what they can provide, availability, and conditions.": "ረዳቶች ማቅረብ የሚችሉትን፣ የሚገኙበትን ጊዜ እና ሁኔታዎችን ያብራራሉ።",
        "Hidden content": "የተደበቀ ይዘት",
        "Hidden items": "የተደበቁ ንጥሎች",
        "Hide Item": "ንጥሉን ደብቅ",
        "Hide Profile": "መገለጫን ደብቅ",
        "How success is understood": "ስኬት እንዴት እንደሚታይ",
        "How the post will feel in the feed": "ልጥፉ በዥረቱ ውስጥ እንዴት እንደሚታይ",
        "I am a": "እኔ",
        "I Can Help": "መርዳት እችላለሁ",
        "If you are under the legal age of majority in your country, you are using GloWe under the guidance of a mentor, parent, or educational framework.": "በአገርዎ ሕጋዊ የአዋቂነት ዕድሜ ላይ ካልደረሱ፣ GloWeን የሚጠቀሙት በአማካሪ፣ በወላጅ ወይም በትምህርት ተቋም መመሪያ ሥር ነው።",
        "If you witness misconduct, misinformation, or harm, report it. Use the Report button on profiles or reach out to us directly. All reports are reviewed with care and confidentiality.": "ተገቢ ያልሆነ ባህሪ፣ የተሳሳተ መረጃ ወይም ጉዳት ካዩ ሪፖርት ያድርጉ። በመገለጫዎች ላይ ያለውን የሪፖርት ቁልፍ ይጠቀሙ ወይም በቀጥታ ያግኙን። ሁሉም ሪፖርቶች በጥንቃቄ እና በሚስጥር ይገመገማሉ።",
        "Impact approach": "የተጽዕኖ አቀራረብ",
        "Impact area": "የተጽዕኖ መስክ",
        "Impact areas": "የተጽዕኖ መስኮች",
        "Impact Areas": "የተጽዕኖ መስኮች",
        "Impact field": "የተጽዕኖ መስክ",
        "Impact follow-up": "የተጽዕኖ ክትትል",
        "Impact Signals": "የተጽዕኖ ምልክቶች",
        "Impact so far": "እስካሁን ያለው ተጽዕኖ",
        "Impact stories": "የተጽዕኖ ታሪኮች",
        "In cases of legal violations, authorities may be notified.": "ሕጋዊ ጥሰቶች ሲኖሩ ለባለሥልጣናት ሊገለጽ ይችላል።",
        "Interaction": "መስተጋብር",
        "Israel": "እስራኤል",
        "Items hidden by admin review can be restored while this MVP uses local storage.": "ይህ የመጀመሪያ ሥሪት የአካባቢ ማከማቻ እስከተጠቀመ ድረስ በአስተዳዳሪ ግምገማ የተደበቁ ንጥሎች ሊመለሱ ይችላሉ።",
        "Items removed by admin will be listed here.": "በአስተዳዳሪ የተወገዱ ንጥሎች እዚህ ይዘረዘራሉ።",
        "Jerusalem": "ኢየሩሳሌም",
        "Join Group": "ቡድኑን ተቀላቀል",
        "Join requests": "የመቀላቀል ጥያቄዎች",
        "Join the MVP": "የመጀመሪያውን ሥሪት ይቀላቀሉ",
        "Join the Volunteer Network and find places where your skills, experience, language, or care can make someone else's work lighter.": "የበጎ ፈቃደኞች መረብን ይቀላቀሉ እና ክህሎትዎ፣ ተሞክሮዎ፣ ቋንቋዎ ወይም አሳቢነትዎ የሌላውን ሰው ሥራ ሊያቀል የሚችልባቸውን ቦታዎች ያግኙ።",
        "Join with experience, questions, resources, or a willingness to help.": "በተሞክሮ፣ በጥያቄዎች፣ በሀብቶች ወይም ለመርዳት ባለው ፈቃደኝነት ይቀላቀሉ።",
        "Keep the community safe and trustworthy.": "ማህበረሰቡን ደህንነቱ የተጠበቀ እና የሚታመን ያድርጉ።",
        "Knowledge": "ዕውቀት",
        "Knowledge Seekers": "ዕውቀት ፈላጊዎች",
        "Knowledge Sharing": "የዕውቀት ልውውጥ",
        "Languages": "ቋንቋዎች",
        "Learn More": "ተጨማሪ ይወቁ",
        "Like": "ወደድኩት",
        "Limit access or features in cases of harm, spam, or manipulation.": "ጉዳት፣ አላስፈላጊ መልእክት ወይም ማጭበርበር ሲኖር ተደራሽነትን ወይም ባህሪያትን መገደብ።",
        "Live needs": "ንቁ ፍላጎቶች",
        "Loading...": "በመጫን ላይ...",
        "Loading…": "በመጫን ላይ…",
        "Loading your profile…": "መገለጫዎን በመጫን ላይ…",
        "Uploading image...": "ምስሉን በመጫን ላይ...",
        "Please choose an image file.": "እባክዎ የምስል ፋይል ይምረጡ።",
        "Image must be under 5 MB.": "ምስሉ ከ5 ሜባ በታች መሆን አለበት።",
        "Optional. JPG, PNG or WebP, up to 5 MB.": "አማራጭ። JPG፣ PNG ወይም WebP፣ እስከ 5 ሜባ።",
        "Applicants": "አመልካቾች",
        "Loading applicants…": "አመልካቾችን በመጫን ላይ…",
        "Could not load applicants.": "አመልካቾችን መጫን አልተቻለም።",
        "No applications yet.": "እስካሁን ማመልከቻዎች የሉም።",
        "Accept": "ተቀበል",
        "Decline": "አትቀበል",
        "Could not update the application. Please try again.": "ማመልከቻውን ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
        "Offers": "የእርዳታ ቅናሾች",
        "Loading offers…": "ቅናሾችን በመጫን ላይ…",
        "Could not load offers.": "ቅናሾችን መጫን አልተቻለም።",
        "No offers yet.": "እስካሁን ቅናሾች የሉም።",
        "Preferred contact:": "የሚመረጥ የግንኙነት መንገድ፦",
        "Email copied to clipboard": "ኢሜይሉ ወደ ቅንጥብ ሰሌዳ ተቀድቷል",
        "Could not copy the email.": "ኢሜይሉን መቅዳት አልተቻለም።",
        "GloWe volunteer": "የGloWe በጎ ፈቃደኛ",
        "Availability:": "የሚገኙበት ጊዜ፦",
        "Skills:": "ክህሎቶች፦",
        "Motivation:": "ተነሳሽነት፦",
        "Local community circles": "የአካባቢ ማህበረሰብ ክቦች",
        "Local organizations, initiatives, residents, volunteers, and partners bring the real context: what is needed, what already works, who should be involved, and what kind of support would actually help.": "የአካባቢ ድርጅቶች፣ ተነሳሽነቶች፣ ነዋሪዎች፣ በጎ ፈቃደኞች እና አጋሮች እውነተኛውን አውድ ያመጣሉ፦ ምን እንደሚያስፈልግ፣ ምን አስቀድሞ እንደሚሠራ፣ ማን መሳተፍ እንዳለበት እና ምን ዓይነት ድጋፍ በእውነት እንደሚረዳ።",
        "Local roots": "የአካባቢ ሥሮች",
        "Location": "አካባቢ",
        "Location:": "አካባቢ፦",
        "Looking for Mentors": "አማካሪዎችን እየፈለግን ነው",
        "Low-bandwidth friendly": "ለዝቅተኛ የኢንተርኔት ፍጥነት ተስማሚ",
        "Make it easier to connect a need with the right volunteer, professional skill, organization, donor, or partner.": "አንድን ፍላጎት ከትክክለኛው በጎ ፈቃደኛ፣ ሙያዊ ክህሎት፣ ድርጅት፣ ለጋሽ ወይም አጋር ጋር ማገናኘትን ቀላል ማድረግ።",
        "Mark Reviewed": "እንደተገመገመ ምልክት አድርግ",
        "Measurement and learning": "መለካት እና መማር",
        "Members": "አባላት",
        "Members will appear here once they join this group.": "አባላት ይህን ቡድን ሲቀላቀሉ እዚህ ይታያሉ።",
        "Message": "መልእክት",
        "Message author": "ለጸሐፊው መልእክት ላክ",
        "Message publisher": "ለአሳታሚው መልእክት ላክ",
        "Message sent": "መልእክቱ ተልኳል",
        "Your message was delivered. The organization can follow up with you.": "መልእክትዎ ደርሷል። ድርጅቱ ሊያገኝዎት ይችላል።",
        "Could not send message": "መልእክቱን መላክ አልተቻለም",
        "Something went wrong sending your message. Please try again.": "መልእክትዎን በመላክ ላይ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
        "Reach Out": "ያግኙ",
        "Send Message": "መልእክት ላክ",
        "Send a short message to start a conversation with this organization.": "ከዚህ ድርጅት ጋር ውይይት ለመጀመር አጭር መልእክት ይላኩ።",
        "Introduce yourself and explain how you would like to collaborate.": "ራስዎን ያስተዋውቁ እና እንዴት መተባበር እንደሚፈልጉ ያብራሩ።",
        "Sign in to reach out": "ለማግኘት ይግቡ",
        "Please sign in or create a free account to message this organization.": "ለዚህ ድርጅት መልእክት ለመላክ እባክዎ ይግቡ ወይም ነጻ መለያ ይፍጠሩ።",
        "Messaging needs a live connection right now. Please try again shortly.": "መልእክት መላክ አሁን ንቁ ግንኙነት ይፈልጋል። እባክዎ ከጥቂት ጊዜ በኋላ ይሞክሩ።",
        "Missing details": "የጎደሉ ዝርዝሮች",
        "Backend unavailable": "አገልግሎቱ አይገኝም",
        "Messages": "መልእክቶች",
        "Methods / approaches": "ዘዴዎች / አቀራረቦች",
        "Moderate discussions in order to keep the space constructive, safe, and impact-driven.": "ቦታው ገንቢ፣ ደህንነቱ የተጠበቀ እና በተጽዕኖ የሚመራ እንዲሆን ውይይቶችን ያስተዳድሩ።",
        "Multilingual": "ብዙ ቋንቋ",
        "Needs": "ፍላጎቶች",
        "Needs Changes": "ማስተካከያ ያስፈልገዋል",
        "New post": "አዲስ ልጥፍ",
        "New submitted profiles will appear here for review.": "አዲስ የቀረቡ መገለጫዎች ለግምገማ እዚህ ይታያሉ።",
        "No applications yet": "እስካሁን ማመልከቻዎች የሉም",
        "No community posts yet.": "እስካሁን የማህበረሰብ ልጥፎች የሉም።",
        "No hidden items": "የተደበቁ ንጥሎች የሉም",
        "No matching opportunities yet. This is where open roles and collaboration requests will appear.": "እስካሁን የሚዛመዱ ዕድሎች የሉም። ክፍት ሚናዎች እና የትብብር ጥያቄዎች እዚህ ይታያሉ።",
        "No matching profiles yet": "እስካሁን የሚዛመዱ መገለጫዎች የሉም",
        "No opportunities found": "ዕድሎች አልተገኙም",
        "No pending organizations": "በመጠባበቅ ላይ ያሉ ድርጅቶች የሉም",
        "No pending profiles": "በመጠባበቅ ላይ ያሉ መገለጫዎች የሉም",
        "No posts match this view yet": "እስካሁን ከዚህ ዕይታ ጋር የሚዛመዱ ልጥፎች የሉም",
        "No projects listed yet.": "እስካሁን የተዘረዘሩ ፕሮጀክቶች የሉም።",
        "No projects yet. Add your first project.": "እስካሁን ፕሮጀክቶች የሉም። የመጀመሪያ ፕሮጀክትዎን ይጨምሩ።",
        "No replies yet. Be the first to respond.": "እስካሁን መልሶች የሉም። መጀመሪያ የሚመልሱ ይሁኑ።",
        "None specified for this opportunity.": "ለዚህ ዕድል ምንም አልተገለጸም።",
        "No reports yet": "እስካሁን ሪፖርቶች የሉም",
        "No results": "ውጤቶች የሉም",
        "No saved items yet": "እስካሁን የተቀመጡ ንጥሎች የሉም",
        "No threads yet": "እስካሁን ውይይቶች የሉም",
        "No wishes found": "ምኞቶች አልተገኙም",
        "Notification Preferences": "የማሳወቂያ ምርጫዎች",
        "Offer skills, time, translation, mentoring, design, legal help, tech, research, or field knowledge.": "ክህሎቶችን፣ ጊዜን፣ ትርጉምን፣ አማካሪነትን፣ ዲዛይንን፣ የሕግ እርዳታን፣ ቴክኖሎጂን፣ ምርምርን ወይም የመስክ ዕውቀትን ያቅርቡ።",
        "Offer Support": "ድጋፍ ያቅርቡ",
        "Open": "ክፍት",
        "Open a Question": "ጥያቄ ይክፈቱ",
        "Open Call": "ክፍት ጥሪ",
        "Open Forums": "መድረኮችን ክፈት",
        "Open Needs": "ክፍት ፍላጎቶች",
        "Open Playbook": "መመሪያውን ክፈት",
        "Open reports": "ክፍት ሪፖርቶች",
        "Open Volunteer Network": "የበጎ ፈቃደኞች መረብን ክፈት",
        "Open wish details": "የምኞቱን ዝርዝሮች ክፈት",
        "Open wishes": "ክፍት ምኞቶች",
        "open wishes are waiting for the right support.": "ክፍት ምኞቶች ትክክለኛውን ድጋፍ እየጠበቁ ናቸው።",
        "Open wishes, opportunities, posts, and discussions around real work": "በእውነተኛ ሥራ ዙሪያ ክፍት ምኞቶች፣ ዕድሎች፣ ልጥፎች እና ውይይቶች",
        "Opportunities & Applications": "ዕድሎች እና ማመልከቻዎች",
        "Opportunities & collaboration": "ዕድሎች እና ትብብር",
        "Opportunity title": "የዕድሉ ርዕስ",
        "Opportunity type": "የዕድሉ ዓይነት",
        "Optional link": "አገናኝ (አማራጭ)",
        "Organization filters": "የድርጅት ማጣሪያዎች",
        "Organization or project": "ድርጅት ወይም ፕሮጀክት",
        "Organization Representative": "የድርጅት ተወካይ",
        "Organization review is available once the shared backend is connected.": "የጋራ የኋላ ሥርዓቱ ከተገናኘ በኋላ የድርጅት ግምገማ ይገኛል።",
        "Organizations & Companies": "ድርጅቶች እና ኩባንያዎች",
        "Organizations and NGOs": "ድርጅቶች እና መንግሥታዊ ያልሆኑ ድርጅቶች",
        "Organizations and partners are reviewed before sensitive actions.": "ድርጅቶች እና አጋሮች ከስሱ ተግባራት በፊት ይገመገማሉ።",
        "Organizations awaiting verification. Approve serious requests; rejected ones stay view-only.": "ማረጋገጫ የሚጠባበቁ ድርጅቶች። ቁም ነገር ያላቸውን ጥያቄዎች ያጽድቁ፤ የተቀሩት ለዕይታ ብቻ ይሆናሉ።",
        "Organize possible grants and next steps": "ሊገኙ የሚችሉ እርዳታዎችን እና ቀጣይ እርምጃዎችን ያደራጁ",
        "Overview": "አጠቃላይ ዕይታ",
        "Paid Full-time Role": "የሚከፈልበት ሙሉ ጊዜ ሚና",
        "Part-time": "ትርፍ ጊዜ",
        "Part-time Role": "የትርፍ ጊዜ ሚና",
        "Participation signals": "የተሳትፎ ምልክቶች",
        "Partnership Opportunity": "የአጋርነት ዕድል",
        "Password": "የይለፍ ቃል",
        "Pending organizations": "በመጠባበቅ ላይ ያሉ ድርጅቶች",
        "Pending profiles": "በመጠባበቅ ላይ ያሉ መገለጫዎች",
        "Pending verification": "ማረጋገጫ በመጠባበቅ ላይ",
        "People already acting in their communities and looking for allies, knowledge, or visibility.": "አስቀድመው በማህበረሰባቸው ውስጥ የሚሠሩ እና አጋሮችን፣ ዕውቀትን ወይም ተጋላጭነትን የሚፈልጉ ሰዎች።",
        "People looking for practical examples, field lessons, and ways to learn from what already works.": "ተግባራዊ ምሳሌዎችን፣ የመስክ ትምህርቶችን እና አስቀድሞ ከሚሠራው ለመማር መንገዶችን የሚፈልጉ ሰዎች።",
        "People who can offer time, translation, design, research, facilitation, mentoring, or professional skills.": "ጊዜ፣ ትርጉም፣ ዲዛይን፣ ምርምር፣ አመቻችነት፣ አማካሪነት ወይም ሙያዊ ክህሎቶችን ማቅረብ የሚችሉ ሰዎች።",
        "Please refresh and try again.": "እባክዎ ገጹን አድሱ እና እንደገና ይሞክሩ።",
        "Possible next steps": "ሊኖሩ የሚችሉ ቀጣይ እርምጃዎች",
        "Post": "ለጥፍ",
        "Post a clear need in the Wishing Well: volunteers, partners, knowledge, visibility, tools, space, or practical advice.": "በምኞት ጉድጓድ ውስጥ ግልጽ ፍላጎት ይለጥፉ፦ በጎ ፈቃደኞች፣ አጋሮች፣ ዕውቀት፣ ተጋላጭነት፣ መሣሪያዎች፣ ቦታ ወይም ተግባራዊ ምክር።",
        "Post a Need": "ፍላጎት ይለጥፉ",
        "Post a need. Find a helper. Build impact.": "ፍላጎት ይለጥፉ። ረዳት ያግኙ። ተጽዕኖ ይገንቡ።",
        "Post false, misleading, discriminatory, hateful, or violent content.": "ሐሰተኛ፣ አሳሳች፣ አድሎአዊ፣ ጥላቻ የተሞላበት ወይም ዓመፀኛ ይዘት መለጠፍ።",
        "Post need": "ፍላጎት ይለጥፉ",
        "Post Opportunity": "ዕድል ይለጥፉ",
        "Post title": "የልጥፉ ርዕስ",
        "Post Topics": "የልጥፉ ርዕሶች",
        "Post type": "የልጥፉ ዓይነት",
        "posts": "ልጥፎች",
        "Posts": "ልጥፎች",
        "Posts you write in the community will appear here.": "በማህበረሰቡ ውስጥ የሚጽፏቸው ልጥፎች እዚህ ይታያሉ።",
        "Posts, profiles, wishes, and opportunities you want to return to later.": "ወደፊት መመለስ የሚፈልጓቸው ልጥፎች፣ መገለጫዎች፣ ምኞቶች እና ዕድሎች።",
        "Practical guides and field lessons": "ተግባራዊ መመሪያዎች እና የመስክ ትምህርቶች",
        "Prepare a clearer post or campaign draft": "ይበልጥ ግልጽ የሆነ የልጥፍ ወይም የዘመቻ ረቂቅ ያዘጋጁ",
        "Present your mission, projects, fields of action, SDGs, needs, and the kind of collaborations you are open to.": "ተልዕኮዎን፣ ፕሮጀክቶችዎን፣ የተግባር መስኮችዎን፣ የዘላቂ ልማት ግቦችን፣ ፍላጎቶችዎን እና ክፍት የሆኑባቸውን የትብብር ዓይነቶች ያቅርቡ።",
        "Pretend to be someone else.": "ሌላ ሰው መስሎ መቅረብ።",
        "Preview": "ቅድመ ዕይታ",
        "Private conversations between volunteers, organizations, and partners are on the way. In the meantime, you can reach an organization from its profile.": "በበጎ ፈቃደኞች፣ በድርጅቶች እና በአጋሮች መካከል የግል ውይይቶች በመንገድ ላይ ናቸው። እስከዚያው ድረስ አንድን ድርጅት ከመገለጫው ማግኘት ይችላሉ።",
        "Professionals, mentors, facilitators, service providers, and experienced practitioners can offer advice, services, office hours, forum leadership, tools, and practical guidance.": "ባለሙያዎች፣ አማካሪዎች፣ አመቻቾች፣ አገልግሎት ሰጪዎች እና ልምድ ያላቸው ባለሙያዎች ምክር፣ አገልግሎቶች፣ የቢሮ ሰዓታት፣ የመድረክ አመራር፣ መሣሪያዎች እና ተግባራዊ መመሪያ ማቅረብ ይችላሉ።",
        "Profile actions": "የመገለጫ ተግባራት",
        "Profile From Questionnaire": "ከመጠይቅ የተገኘ መገለጫ",
        "Profile not found": "መገለጫው አልተገኘም",
        "Profile snapshot": "የመገለጫ አጭር ዕይታ",
        "Profile summary": "የመገለጫ ማጠቃለያ",
        "Profiles": "መገለጫዎች",
        "Profiles, posts, messages, and collaborations should support dignity, transparency, and responsible community care.": "መገለጫዎች፣ ልጥፎች፣ መልእክቶች እና ትብብሮች ክብርን፣ ግልጽነትን እና ኃላፊነት የተሞላበት የማህበረሰብ እንክብካቤን መደገፍ አለባቸው።",
        "Project-based": "በፕሮጀክት ላይ የተመሠረተ",
        "Project-based Collaboration": "በፕሮጀክት ላይ የተመሠረተ ትብብር",
        "Projects": "ፕሮጀክቶች",
        "My Needs": "የእኔ ፍላጎቶች",
        "No needs yet. Share what would help on the Wishing Well.": "እስካሁን ፍላጎቶች የሉም። በምኞት ጉድጓድ ላይ የሚረዳዎትን ያካፍሉ።",
        "My Posts": "የእኔ ልጥፎች",
        "No posts yet. Share an update with the community.": "እስካሁን ልጥፎች የሉም። ከማህበረሰቡ ጋር ዘገባ ያካፍሉ።",
        "My Opportunities": "የእኔ ዕድሎች",
        "No opportunities yet. Publish one on the Volunteer Network.": "እስካሁን ዕድሎች የሉም። በበጎ ፈቃደኞች መረብ ላይ አንድ ያሳትሙ።",
        "My Offers": "የእኔ ቅናሾች",
        "No offers yet. Help someone by responding to a wish.": "እስካሁን ቅናሾች የሉም። ለምኞት በመመለስ አንድን ሰው ይርዱ።",
        "Browse Wishes": "ምኞቶችን ያስሱ",
        "Public links": "የሕዝብ አገናኞች",
        "Publish a volunteer role": "የበጎ ፈቃድ ሚና ያሳትሙ",
        "Publish an opportunity": "ዕድል ያሳትሙ",
        "Publish Opportunity": "ዕድሉን አሳትም",
        "Publish Thread": "ውይይቱን አሳትም",
        "Publish to Community Feed": "ወደ ማህበረሰብ ዥረት አሳትም",
        "Publish to Feed": "ወደ ዥረቱ አሳትም",
        "Publish to Forum": "ወደ መድረኩ አሳትም",
        "Question": "ጥያቄ",
        "Question title": "የጥያቄው ርዕስ",
        "Questions": "ጥያቄዎች",
        "Ramat Gan, Israel": "ራማት ጋን፣ እስራኤል",
        "Read posts, ask questions, respond with care, and meet others who are also building social and environmental change.": "ልጥፎችን ያንብቡ፣ ጥያቄዎችን ይጠይቁ፣ በአሳቢነት ይመልሱ እና ማህበራዊ እና አካባቢያዊ ለውጥ የሚገነቡ ሌሎችን ይተዋወቁ።",
        "Ready to Make an Impact?": "ተጽዕኖ ለመፍጠር ዝግጁ ነዎት?",
        "Ready to offer your time, skills, mentoring, translation, design, legal help, or field knowledge? Enter the volunteer space and find the right role.": "ጊዜዎን፣ ክህሎቶችዎን፣ አማካሪነትዎን፣ ትርጉምዎን፣ ዲዛይንዎን፣ የሕግ እርዳታዎን ወይም የመስክ ዕውቀትዎን ለማቅረብ ዝግጁ ነዎት? ወደ የበጎ ፈቃድ ቦታ ይግቡ እና ትክክለኛውን ሚና ያግኙ።",
        "Recent Activity": "የቅርብ ጊዜ እንቅስቃሴ",
        "Recognition in GloWe is about visible contribution, not empty ranking. Signals stay tied to documented activity, trust, and community review.": "በGloWe ውስጥ ዕውቅና የሚያተኩረው በሚታይ አስተዋጽኦ ላይ እንጂ በባዶ ደረጃ አሰጣጥ ላይ አይደለም። ምልክቶች ከተመዘገበ እንቅስቃሴ፣ ከእምነት እና ከማህበረሰብ ግምገማ ጋር የተሳሰሩ ሆነው ይቀጥላሉ።",
        "Recognize visible contribution": "የሚታይ አስተዋጽኦን ዕውቅና ይስጡ",
        "Refine": "አጥራ",
        "Region": "ክልል",
        "Registration, article, drive folder, or resource link": "ምዝገባ፣ ጽሑፍ፣ የድራይቭ አቃፊ ወይም የሀብት አገናኝ",
        "Reject": "አትቀበል",
        "Relevant Skills & Experience": "ተዛማጅ ክህሎቶች እና ተሞክሮ",
        "Remote": "ከርቀት",
        "Remote tutors and safety": "የርቀት አስተማሪዎች እና ደህንነት",
        "Remove": "አስወግድ",
        "Remove content that violates these terms or values.": "እነዚህን ውሎች ወይም እሴቶች የሚጥስ ይዘት ማስወገድ።",
        "Reply": "መልስ",
        "Report": "ሪፖርት አድርግ",
        "Reports from users who saw something inaccurate, harmful, or inappropriate.": "ትክክል ያልሆነ፣ ጎጂ ወይም ተገቢ ያልሆነ ነገር ካዩ ተጠቃሚዎች የቀረቡ ሪፖርቶች።",
        "Repost": "እንደገና አጋራ",
        "Requirements": "መስፈርቶች",
        "Resource / file": "ሀብት / ፋይል",
        "Resource Request": "የሀብት ጥያቄ",
        "Responsibilities": "ኃላፊነቶች",
        "Responsible tools": "ኃላፊነት የተሞላባቸው መሣሪያዎች",
        "Restore": "መልስ",
        "Review Impact": "ተጽዕኖን ገምግም",
        "Review new profile submissions, respond to reports, and hide content that does not fit the GloWe community standards.": "አዲስ የቀረቡ መገለጫዎችን ይገምግሙ፣ ለሪፖርቶች ይመልሱ እና ከGloWe ማህበረሰብ መስፈርቶች ጋር የማይጣጣም ይዘትን ይደብቁ።",
        "Reviewers only": "ለገምጋሚዎች ብቻ",
        "Round tables, shared knowledge.": "ክብ ጠረጴዛዎች፣ የጋራ ዕውቀት።",
        "Save": "አስቀምጥ",
        "Save Draft": "ረቂቁን አስቀምጥ",
        "Save opportunity": "ዕድሉን አስቀምጥ",
        "Save Opportunity": "ዕድሉን አስቀምጥ",
        "Delete post": "ልጥፉን ሰርዝ",
        "Delete": "ሰርዝ",
        "Post deleted": "ልጥፉ ተሰርዟል",
        "Your post was removed from the community feed.": "ልጥፍዎ ከማህበረሰብ ዥረቱ ተወግዷል።",
        "Could not delete": "መሰረዝ አልተቻለም",
        "Something went wrong deleting your post. Please try again.": "ልጥፍዎን በመሰረዝ ላይ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
        "Copy link": "አገናኝ ቅዳ",
        "Link copied": "አገናኙ ተቀድቷል",
        "The post link is on your clipboard — share it anywhere.": "የልጥፉ አገናኝ በቅንጥብ ሰሌዳዎ ላይ ነው — በየትኛውም ቦታ ያጋሩት።",
        "Copy this link": "ይህን አገናኝ ይቅዱ",
        "Save post": "ልጥፉን አስቀምጥ",
        "Save posts, profiles, and opportunities to return to them from this screen.": "ልጥፎችን፣ መገለጫዎችን እና ዕድሎችን ከዚህ ማያ ገጽ ለመመለስ ያስቀምጡ።",
        "Save posts, profiles, wishes, and opportunities to return to them from here.": "ልጥፎችን፣ መገለጫዎችን፣ ምኞቶችን እና ዕድሎችን ከዚህ ለመመለስ ያስቀምጡ።",
        "Save Profile": "መገለጫን አስቀምጥ",
        "Save the opportunity if you want to compare it later.": "ወደፊት ማወዳደር ከፈለጉ ዕድሉን ያስቀምጡ።",
        "Save wish": "ምኞቱን አስቀምጥ",
        "Saved": "ተቀምጧል",
        "Sign in or create a free account to save items to your area.": "ንጥሎችን ወደ ክፍልዎ ለማስቀመጥ ይግቡ ወይም ነጻ መለያ ይፍጠሩ።",
        "Saved items": "የተቀመጡ ንጥሎች",
        "Saved Items": "የተቀመጡ ንጥሎች",
        "Scope": "ወሰን",
        "SDG focus areas": "የዘላቂ ልማት ግቦች የትኩረት መስኮች",
        "Search": "ፍለጋ",
        "Search by city or region": "በከተማ ወይም በክልል ይፈልጉ",
        "Search keywords": "ቁልፍ ቃላትን ይፈልጉ",
        "Search opportunities...": "ዕድሎችን ይፈልጉ...",
        "Search organizations, companies, and initiatives": "ድርጅቶችን፣ ኩባንያዎችን እና ተነሳሽነቶችን ይፈልጉ",
        "Search posts, topics, people, or needs...": "ልጥፎችን፣ ርዕሶችን፣ ሰዎችን ወይም ፍላጎቶችን ይፈልጉ...",
        "Search volunteer roles...": "የበጎ ፈቃድ ሚናዎችን ይፈልጉ...",
        "See how members participate": "አባላት እንዴት እንደሚሳተፉ ይመልከቱ",
        "See where help is needed": "እርዳታ የሚያስፈልግበትን ይመልከቱ",
        "Select your availability": "የሚገኙበትን ጊዜ ይምረጡ",
        "Select your role": "ሚናዎን ይምረጡ",
        "Send": "ላክ",
        "Share": "አጋራ",
        "Share a volunteer role, paid role, mentorship request, or project-based collaboration with the GloWe community.": "የበጎ ፈቃድ ሚና፣ የሚከፈልበት ሚና፣ የአማካሪነት ጥያቄ ወይም በፕሮጀክት ላይ የተመሠረተ ትብብር ከGloWe ማህበረሰብ ጋር ያካፍሉ።",
        "Share applied field knowledge in a format others can understand and use": "የተግባር የመስክ ዕውቀትን ሌሎች ሊረዱት እና ሊጠቀሙበት በሚችሉበት መልኩ ያካፍሉ",
        "Share enough context so others can give useful, respectful advice.": "ሌሎች ጠቃሚ እና አክብሮት የተሞላበት ምክር እንዲሰጡ በቂ አውድ ያካፍሉ።",
        "Share private or sensitive information without consent.": "ያለ ፈቃድ የግል ወይም ስሱ መረጃ ማጋራት።",
        "Share your motivation for applying...": "ለማመልከት ያለዎትን ተነሳሽነት ያካፍሉ...",
        "Shared knowledge": "የጋራ ዕውቀት",
        "Shared learning": "የጋራ ትምህርት",
        "Sharing tools": "የማጋሪያ መሣሪያዎች",
        "Short description": "አጭር መግለጫ",
        "Show your mission, projects, needs, opportunities, and the impact areas you work in.": "ተልዕኮዎን፣ ፕሮጀክቶችዎን፣ ፍላጎቶችዎን፣ ዕድሎችዎን እና የሚሠሩባቸውን የተጽዕኖ መስኮች ያሳዩ።",
        "Sign in to see your messages": "መልእክቶችዎን ለማየት ይግቡ",
        "Skills Needed": "የሚያስፈልጉ ክህሎቶች",
        "Skills or tags": "ክህሎቶች ወይም መለያዎች",
        "Social Activists": "ማህበራዊ አክቲቪስቶች",
        "Social initiatives": "ማህበራዊ ተነሳሽነቶች",
        "Social Justice": "ማህበራዊ ፍትሕ",
        "Social links": "የማህበራዊ ሚዲያ አገናኞች",
        "Sometimes you give. Sometimes you need help.": "አንዳንዴ ይሰጣሉ። አንዳንዴ እርዳታ ያስፈልግዎታል።",
        "Spam the platform or use it for purely promotional or exploitative purposes.": "መድረኩን በአላስፈላጊ መልእክቶች መሙላት ወይም ለማስተዋወቂያ ወይም ለብዝበዛ ዓላማ ብቻ መጠቀም።",
        "Start a practical consultation": "ተግባራዊ ምክክር ይጀምሩ",
        "Start a thread": "ውይይት ይጀምሩ",
        "Start Conversation": "ውይይት ጀምር",
        "Start the first conversation in this group.": "በዚህ ቡድን ውስጥ የመጀመሪያውን ውይይት ይጀምሩ።",
        "Start from one useful action": "ከአንድ ጠቃሚ ተግባር ይጀምሩ",
        "Start with one useful post, one profile, one wish, or one opportunity.": "በአንድ ጠቃሚ ልጥፍ፣ በአንድ መገለጫ፣ በአንድ ምኞት ወይም በአንድ ዕድል ይጀምሩ።",
        "Structured offers": "የተደራጁ ቅናሾች",
        "Submit Application": "ማመልከቻ አስገባ",
        "Support groups around a city, village, school, organization, or SDG topic. Each circle can gather needs, resources, events, and trusted members.": "በከተማ፣ በመንደር፣ በትምህርት ቤት፣ በድርጅት ወይም በዘላቂ ልማት ግብ ርዕስ ዙሪያ የድጋፍ ቡድኖች። እያንዳንዱ ክብ ፍላጎቶችን፣ ሀብቶችን፣ ዝግጅቶችን እና የታመኑ አባላትን መሰብሰብ ይችላል።",
        "Support multilingual access so knowledge is not limited to English-speaking spaces": "ዕውቀት በእንግሊዝኛ ተናጋሪ ቦታዎች ብቻ እንዳይወሰን የብዙ ቋንቋ ተደራሽነትን ይደግፉ",
        "Suspend or block users who repeatedly abuse the platform.": "መድረኩን በተደጋጋሚ አላግባብ የሚጠቀሙ ተጠቃሚዎችን ማገድ ወይም መከልከል።",
        "Tags": "መለያዎች",
        "Tech for Good": "ቴክኖሎጂ ለበጎ",
        "Technology": "ቴክኖሎጂ",
        "Technology for good": "ቴክኖሎጂ ለበጎ",
        "Technology should reduce friction, not create distance. It should help people act with more clarity, trust, and care.": "ቴክኖሎጂ ግጭትን መቀነስ እንጂ ርቀት መፍጠር የለበትም። ሰዎች በበለጠ ግልጽነት፣ እምነት እና አሳቢነት እንዲሠሩ ማገዝ አለበት።",
        "Tel Aviv": "ቴል አቪቭ",
        "Terms of Use - GloWe": "የአጠቃቀም ውሎች - GloWe",
        "Terms of Use & Community Integrity Charter": "የአጠቃቀም ውሎች እና የማህበረሰብ ታማኝነት ቻርተር",
        "The information you provide is accurate and honest.": "የሚያቀርቡት መረጃ ትክክለኛ እና እውነተኛ መሆኑን።",
        "The MVP is here so we can learn with you: what helps, what is missing, and what should be built with care.": "የመጀመሪያው ሥሪት እዚህ ያለው ከእርስዎ ጋር እንድንማር ነው፦ ምን እንደሚረዳ፣ ምን እንደጎደለ እና ምን በጥንቃቄ መገንባት እንዳለበት።",
        "The next versions of GloWe should support local circles: people who meet around a real place, a real need, and a shared SDG challenge. Each local community can gather stories, tools, resources, and lessons that others may adapt.": "የGloWe ቀጣይ ሥሪቶች የአካባቢ ክቦችን መደገፍ አለባቸው፦ በእውነተኛ ቦታ፣ በእውነተኛ ፍላጎት እና በጋራ የዘላቂ ልማት ግብ ተግዳሮት ዙሪያ የሚገናኙ ሰዎች። እያንዳንዱ የአካባቢ ማህበረሰብ ሌሎች ሊጠቀሙባቸው የሚችሉ ታሪኮችን፣ መሣሪያዎችን፣ ሀብቶችን እና ትምህርቶችን መሰብሰብ ይችላል።",
        "The organization receives your message and can continue in GloWe messages.": "ድርጅቱ መልእክትዎን ይቀበላል እና በGloWe መልእክቶች መቀጠል ይችላል።",
        "The topic tag will appear next to your name in the feed, and the post is saved into the community stream.": "የርዕሱ መለያ በዥረቱ ውስጥ ከስምዎ ጎን ይታያል፣ ልጥፉም በማህበረሰብ ዥረት ውስጥ ይቀመጣል።",
        "The Wishing Well is the action layer of GloWe: verified requests, relevant helpers, and clear next steps after someone offers support.": "የምኞት ጉድጓድ የGloWe የተግባር ንብርብር ነው፦ የተረጋገጡ ጥያቄዎች፣ ተዛማጅ ረዳቶች እና አንድ ሰው ድጋፍ ካቀረበ በኋላ ግልጽ ቀጣይ እርምጃዎች።",
        "These are directions, not promises. We will build them gradually, with community feedback.": "እነዚህ አቅጣጫዎች እንጂ ተስፋዎች አይደሉም። ከማህበረሰቡ አስተያየት ጋር ቀስ በቀስ እንገነባቸዋለን።",
        "These Terms of Use & Community Integrity Charter may be updated occasionally. We will notify users of significant changes via email or platform notifications. Continued use signifies your agreement to the latest version.": "እነዚህ የአጠቃቀም ውሎች እና የማህበረሰብ ታማኝነት ቻርተር አልፎ አልፎ ሊዘመኑ ይችላሉ። ጉልህ ለውጦችን ለተጠቃሚዎች በኢሜይል ወይም በመድረክ ማሳወቂያዎች እናሳውቃለን። መጠቀምዎን መቀጠል የቅርብ ጊዜውን ሥሪት መቀበልዎን ያመለክታል።",
        "This includes use in personalization, recommendation systems, and platform features built to enhance the GloWe user experience only.": "ይህ የGloWeን የተጠቃሚ ተሞክሮ ለማሻሻል ብቻ በተገነቡ የግላዊነት ማላበሻ፣ የምክረ ሐሳብ ሥርዓቶች እና የመድረክ ባህሪያት ውስጥ መጠቀምን ያካትታል።",
        "This is not a marketplace. It is a shared space. Ask for help. Offer help. Celebrate others' work. Seek connection, not extraction.": "ይህ ገበያ አይደለም። የጋራ ቦታ ነው። እርዳታ ይጠይቁ። እርዳታ ያቅርቡ። የሌሎችን ሥራ ያክብሩ። ግንኙነትን ይፈልጉ እንጂ ብዝበዛን አይደለም።",
        "This profile is not available yet, or the link points to an older demo profile.": "ይህ መገለጫ እስካሁን አይገኝም፣ ወይም አገናኙ ወደ አሮጌ የናሙና መገለጫ ያመራል።",
        "This queue is visible to GloWe reviewers. Ask an administrator for access.": "ይህ ሰልፍ ለGloWe ገምጋሚዎች ይታያል። ተደራሽነት ለማግኘት አስተዳዳሪን ይጠይቁ።",
        "Threads": "ውይይቶች",
        "Title": "ርዕስ",
        "To the fullest extent permitted by law:": "ሕጉ በሚፈቅደው ከፍተኛ መጠን፦",
        "Tone, humor, and expression vary across regions. Be mindful. Use inclusive language. If you are unsure, ask.": "የአነጋገር ቃና፣ ቀልድ እና አገላለጽ በክልሎች መካከል ይለያያሉ። አስተውሉ። አካታች ቋንቋ ይጠቀሙ። እርግጠኛ ካልሆኑ ይጠይቁ።",
        "Topic": "ርዕስ",
        "Topic group": "የርዕስ ቡድን",
        "Topic Groups": "የርዕስ ቡድኖች",
        "Treat every member with dignity. Do not post or endorse any form of discrimination, harassment, or exclusion. Listen to diverse voices and experiences.": "እያንዳንዱን አባል በክብር ይያዙ። ማንኛውንም ዓይነት አድልዎ፣ ትንኮሳ ወይም ማግለል አይለጥፉ ወይም አይደግፉ። ለተለያዩ ድምፆች እና ተሞክሮዎች ጆሮ ይስጡ።",
        "Trending Discussions": "ተወዳጅ ውይይቶች",
        "Trust & status": "እምነት እና ሁኔታ",
        "Try a broader keyword, clear one filter, or search by impact area, location, or support need.": "ሰፋ ያለ ቁልፍ ቃል ይሞክሩ፣ አንድ ማጣሪያ ያጽዱ ወይም በተጽዕኖ መስክ፣ በአካባቢ ወይም በሚያስፈልግ ድጋፍ ይፈልጉ።",
        "Try a different tab, search a broader word, or start the next conversation.": "ሌላ ትር ይሞክሩ፣ ሰፋ ያለ ቃል ይፈልጉ ወይም ቀጣዩን ውይይት ይጀምሩ።",
        "Try adjusting your filters or search terms.": "ማጣሪያዎችዎን ወይም የፍለጋ ቃላትዎን ማስተካከል ይሞክሩ።",
        "Try clearing one of the filters.": "ከማጣሪያዎቹ አንዱን ማጽዳት ይሞክሩ።",
        "Try Flow": "ሂደቱን ይሞክሩ",
        "Turn a real need into a clear call for support: volunteers, partners, knowledge, visibility, space, tools, or funding support.": "እውነተኛ ፍላጎትን ወደ ግልጽ የድጋፍ ጥሪ ይለውጡ፦ በጎ ፈቃደኞች፣ አጋሮች፣ ዕውቀት፣ ተጋላጭነት፣ ቦታ፣ መሣሪያዎች ወይም የገንዘብ ድጋፍ።",
        "Type": "ዓይነት",
        "Updated today": "ዛሬ ተዘምኗል",
        "Upload copyrighted or third-party content without permission.": "ያለ ፈቃድ በቅጂ መብት የተጠበቀ ወይም የሦስተኛ ወገን ይዘት መጫን።",
        "Use digital tools to make knowledge more accessible, reduce language barriers, and support ethical collaboration.": "ዕውቀትን ይበልጥ ተደራሽ ለማድረግ፣ የቋንቋ እንቅፋቶችን ለመቀነስ እና ሥነ ምግባራዊ ትብብርን ለመደገፍ ዲጂታል መሣሪያዎችን ይጠቀሙ።",
        "Use example grant cards and a funding-brief flow to turn a real need into a clearer request, budget story, and next step.": "እውነተኛ ፍላጎትን ወደ ይበልጥ ግልጽ ጥያቄ፣ የበጀት ታሪክ እና ቀጣይ እርምጃ ለመቀየር የናሙና የእርዳታ ካርዶችን እና የገንዘብ ድጋፍ አጭር መግለጫ ሂደትን ይጠቀሙ።",
        "Use the forums for focused questions, peer advice, templates, field lessons, and professional guidance. Professionals can also lead topic spaces and offer office hours.": "መድረኮችን ለተወሰኑ ጥያቄዎች፣ ለአቻ ምክር፣ ለአብነቶች፣ ለመስክ ትምህርቶች እና ለሙያዊ መመሪያ ይጠቀሙ። ባለሙያዎችም የርዕስ ቦታዎችን መምራት እና የቢሮ ሰዓታት ማቅረብ ይችላሉ።",
        "Usually replies within 3-5 days": "ብዙውን ጊዜ በ3-5 ቀናት ውስጥ ይመልሳል",
        "Verified organizations will publish freely; new submissions show up here.": "የተረጋገጡ ድርጅቶች በነጻነት ያሳትማሉ፤ አዲስ የቀረቡት እዚህ ይታያሉ።",
        "Verified profiles": "የተረጋገጡ መገለጫዎች",
        "View Details": "ዝርዝሮችን ይመልከቱ",
        "View Personal Area": "የግል ክፍልን ይመልከቱ",
        "View Profile": "መገለጫን ይመልከቱ",
        "Visibility / Media": "ተጋላጭነት / ሚዲያ",
        "Volunteer": "በጎ ፈቃድ",
        "Volunteer / Mentor": "በጎ ፈቃደኛ / አማካሪ",
        "Volunteer Opportunities": "የበጎ ፈቃድ ዕድሎች",
        "Volunteer Opportunity": "የበጎ ፈቃድ ዕድል",
        "Volunteers": "በጎ ፈቃደኞች",
        "volunteers joined new projects this week.": "በጎ ፈቃደኞች በዚህ ሳምንት አዳዲስ ፕሮጀክቶችን ተቀላቅለዋል።",
        "Volunteers and professionals": "በጎ ፈቃደኞች እና ባለሙያዎች",
        "Volunteers Needed": "በጎ ፈቃደኞች ያስፈልጋሉ",
        "We are not just a platform. We are a community built on trust and shared purpose. By joining GloWe, you commit to these core values:": "እኛ መድረክ ብቻ አይደለንም። በእምነት እና በጋራ ዓላማ ላይ የተገነባ ማህበረሰብ ነን። GloWeን በመቀላቀል ለእነዚህ ዋና እሴቶች ቁርጠኛ ይሆናሉ፦",
        "We are not responsible for actions or content posted by users.": "በተጠቃሚዎች ለሚፈጸሙ ተግባራት ወይም ለሚለጠፍ ይዘት ኃላፊነት አንወስድም።",
        "We are starting with a focused community space. Next, we want to grow local community circles, a practical knowledge library, and technology that helps people use knowledge for good.": "በተወሰነ የማህበረሰብ ቦታ እየጀመርን ነው። ቀጥሎ የአካባቢ ማህበረሰብ ክቦችን፣ ተግባራዊ የዕውቀት ቤተ መጻሕፍትን እና ሰዎች ዕውቀትን ለበጎ እንዲጠቀሙ የሚያግዝ ቴክኖሎጂን ማሳደግ እንፈልጋለን።",
        "We believe impact grows when people stand with each other, listen deeply, and act with care.": "ሰዎች እርስ በርስ ሲደጋገፉ፣ በጥልቀት ሲያዳምጡ እና በአሳቢነት ሲሠሩ ተጽዕኖ እንደሚያድግ እናምናለን።",
        "We do not look down or preach. We stand next to each other, listen, learn, and act together. Sometimes you give; sometimes you need help. Both are part of a healthy community.": "አንንቅም አንሰብክም። እርስ በርስ እንደጋገፋለን፣ እናዳምጣለን፣ እንማራለን እና በጋራ እንሠራለን። አንዳንዴ ይሰጣሉ፤ አንዳንዴ እርዳታ ያስፈልግዎታል። ሁለቱም የጤናማ ማህበረሰብ አካል ናቸው።",
        "We do not sell, rent, or trade your data to advertisers.": "ውሂብዎን ለማስታወቂያ አውጪዎች አንሸጥም፣ አናከራይም ወይም አንለውጥም።",
        "We do not want technology to replace relationships. We want it to help people find each other, document what they already know, and turn care into practical action.": "ቴክኖሎጂ ግንኙነቶችን እንዲተካ አንፈልግም። ሰዎች እርስ በርስ እንዲገናኙ፣ አስቀድመው የሚያውቁትን እንዲመዘግቡ እና አሳቢነትን ወደ ተግባራዊ እርምጃ እንዲቀይሩ እንዲያግዝ እንፈልጋለን።",
        "We reserve the right to moderate, remove, or report inappropriate content.": "ተገቢ ያልሆነ ይዘትን የማስተዳደር፣ የማስወገድ ወይም ሪፖርት የማድረግ መብት አለን።",
        "Weekdays": "የሳምንቱ ቀናት",
        "Weekends": "ቅዳሜና እሁድ",
        "Welcome,": "እንኳን ደህና መጡ፣",
        "What comes after the MVP?": "ከመጀመሪያው ሥሪት በኋላ ምን ይመጣል?",
        "What do you need help thinking through?": "ለማሰብ በምን ላይ እርዳታ ያስፈልግዎታል?",
        "What do you want to share, ask, or offer today?": "ዛሬ ምን ማካፈል፣ መጠየቅ ወይም ማቅረብ ይፈልጋሉ?",
        "What GloWe makes possible": "GloWe የሚያስችለው",
        "What happens next": "ቀጥሎ ምን ይሆናል",
        "What is open now": "አሁን ክፍት የሆነው",
        "What we are learning": "የምንማረው",
        "What we believe": "የምናምነው",
        "What we want to build next": "ቀጥሎ መገንባት የምንፈልገው",
        "When GloWe grows, one-third of future revenues will return to local communities.": "GloWe ሲያድግ ከወደፊት ገቢዎች አንድ ሦስተኛው ወደ አካባቢ ማህበረሰቦች ይመለሳል።",
        "When you publish content, such as text, images, links, or project descriptions, on GloWe:": "በGloWe ላይ እንደ ጽሑፍ፣ ምስሎች፣ አገናኞች ወይም የፕሮጀክት መግለጫዎች ያሉ ይዘቶችን ሲያሳትሙ፦",
        "Who is this for?": "ይህ ለማን ነው?",
        "Who We Serve": "የምናገለግላቸው",
        "Why do you want to volunteer?": "ለምን በጎ ፈቃደኛ መሆን ይፈልጋሉ?",
        "Why GloWe exists": "GloWe ለምን እንደተፈጠረ",
        "Wish filters": "የምኞት ማጣሪያዎች",
        "Wish Type": "የምኞት ዓይነት",
        "Write a Community Post": "የማህበረሰብ ልጥፍ ይጻፉ",
        "Write a reply": "መልስ ይጻፉ",
        "Write Post": "ልጥፍ ይጻፉ",
        "Write posts, ask questions, share field knowledge, publish updates, and join topic-based discussions.": "ልጥፎችን ይጻፉ፣ ጥያቄዎችን ይጠይቁ፣ የመስክ ዕውቀትን ያካፍሉ፣ ዘገባዎችን ያሳትሙ እና በርዕስ ላይ የተመሠረቱ ውይይቶችን ይቀላቀሉ።",
        "Write the story, request, guide, event details, or question you want the community to see.": "ማህበረሰቡ እንዲያየው የሚፈልጉትን ታሪክ፣ ጥያቄ፣ መመሪያ፣ የዝግጅት ዝርዝር ወይም ጥያቄ ይጻፉ።",
        "Write to the community": "ለማህበረሰቡ ይጻፉ",
        "You are acting in good faith and with respect for others.": "በቅን ልቦና እና ለሌሎች በማክበር እየሠሩ መሆኑን።",
        "You are not alone here": "እዚህ ብቻዎን አይደሉም",
        "You are part of a community where people can ask, offer, learn, and keep going together.": "ሰዎች መጠየቅ፣ ማቅረብ፣ መማር እና በጋራ መቀጠል የሚችሉበት ማህበረሰብ አካል ነዎት።",
        "You confirm that you have the legal right to publish what you upload and assume full responsibility for it.": "የሚጭኑትን የማሳተም ሕጋዊ መብት እንዳለዎት እና ሙሉ ኃላፊነቱን እንደሚወስዱ ያረጋግጣሉ።",
        "You grant GloWe a non-exclusive, royalty-free, worldwide, perpetual license to host, translate, display, analyze, and distribute your content within the platform.": "ይዘትዎን በመድረኩ ውስጥ ለማስተናገድ፣ ለመተርጎም፣ ለማሳየት፣ ለመተንተን እና ለማሰራጨት ለGloWe ብቸኛ ያልሆነ፣ ከክፍያ ነጻ የሆነ፣ ዓለም አቀፍ እና ዘላቂ ፈቃድ ይሰጣሉ።",
        "You may close your account at any time.": "በማንኛውም ጊዜ መለያዎን መዝጋት ይችላሉ።",
        "You may request deletion of your account or data at any time.": "በማንኛውም ጊዜ መለያዎ ወይም ውሂብዎ እንዲሰረዝ መጠየቅ ይችላሉ።",
        "You retain full ownership of your intellectual property.": "የአእምሮ ንብረትዎን ሙሉ ባለቤትነት ይይዛሉ።",
        "You've got something the world needs.": "ዓለም የሚፈልገው ነገር አለዎት።",
        "You're already part of GloWe.": "አስቀድመው የGloWe አካል ነዎት።",
        "Explore the community, share what you know, or pick up where you left off.": "ማህበረሰቡን ያስሱ፣ የሚያውቁትን ያካፍሉ ወይም ካቆሙበት ይቀጥሉ።",
        "Your Availability": "የሚገኙበት ጊዜ",
        "Your Community Home": "የእርስዎ የማህበረሰብ መነሻ",
        "Your full name": "ሙሉ ስምዎ",
        "Your password": "የይለፍ ቃልዎ",
        "About - GloWe": "ስለ እኛ - GloWe",
        "About GloWe": "ስለ GloWe",
        "About the Organization": "ስለ ድርጅቱ",
        "About This Opportunity": "ስለዚህ ዕድል",
        "Across countries, languages, and fields, members can learn from each other, translate field wisdom, adapt proven solutions, and connect local action to global SDG challenges.": "በአገሮች፣ በቋንቋዎች እና በመስኮች መካከል አባላት እርስ በርስ መማር፣ የመስክ ጥበብን መተርጎም፣ የተረጋገጡ መፍትሔዎችን ማላመድ እና የአካባቢ ተግባርን ከዓለም አቀፍ የዘላቂ ልማት ግቦች ተግዳሮቶች ጋር ማገናኘት ይችላሉ።",
        "Act honestly. Share real experiences. Credit others' work where due. Information shared on GloWe should be accurate, current, and shared with intention.": "በታማኝነት ይሥሩ። እውነተኛ ተሞክሮዎችን ያካፍሉ። የሌሎችን ሥራ በተገቢው ቦታ ዕውቅና ይስጡ። በGloWe ላይ የሚጋራ መረጃ ትክክለኛ፣ ወቅታዊ እና በዓላማ የተጋራ መሆን አለበት።",
        "Active Members": "ንቁ አባላት",
        "Active projects": "ንቁ ፕሮጀክቶች",
        "Active Threads": "ንቁ ውይይቶች",
        "Admin review": "የአስተዳዳሪ ግምገማ",
        "Admin Review - GloWe": "አስተዳደር እና ግምገማ - GloWe",
        "A digital-human space for shared knowledge, practical connection, and gradual community growth.": "ለጋራ ዕውቀት፣ ለተግባራዊ ግንኙነት እና ለቀስ በቀስ የማህበረሰብ ዕድገት የሚሆን ዲጂታል-ሰብዓዊ ቦታ።",
        "A living feed for field updates, practical questions, needs, resources, and people building impact together.": "ለመስክ ዘገባዎች፣ ለተግባራዊ ጥያቄዎች፣ ለፍላጎቶች፣ ለሀብቶች እና በጋራ ተጽዕኖ ለሚፈጥሩ ሰዎች የሚሆን ሕያው ዥረት።",
        "A practical space for volunteers, mentors, professionals, and organizations to meet around real needs, clear roles, and shared impact.": "በጎ ፈቃደኞች፣ አማካሪዎች፣ ባለሙያዎች እና ድርጅቶች በእውነተኛ ፍላጎቶች፣ በግልጽ ሚናዎች እና በጋራ ተጽዕኖ ዙሪያ የሚገናኙበት ተግባራዊ ቦታ።",
        "A full Privacy Policy will be published separately.": "ሙሉ የግላዊነት ፖሊሲ ለብቻው ይታተማል።",
        "Community - GloWe": "ማህበረሰብ - GloWe",
        "Discussion Group - GloWe": "የውይይት ቡድን - GloWe",
        "Forums - GloWe": "መድረኮች - GloWe",
        "Messages - GloWe": "መልእክቶች - GloWe",
        "Opportunity Details - GloWe": "የዕድል ዝርዝሮች - GloWe",
        "Organizations - GloWe": "ድርጅቶች - GloWe",
        "Personal Area - GloWe": "የግል ክፍል - GloWe",
        "Profile - GloWe": "መገለጫ - GloWe",
        "Saved - GloWe": "የተቀመጡ - GloWe",
        "Settings - GloWe": "ቅንብሮች - GloWe",
        "Volunteer Network - GloWe": "የበጎ ፈቃደኞች መረብ - GloWe",
        "Volunteer Opportunities - GloWe": "የበጎ ፈቃድ ዕድሎች - GloWe",
        "What's Next - GloWe": "ቀጥሎ ምን አለ - GloWe",
        "Wishing Well - GloWe": "የምኞት ጉድጓድ - GloWe",
        "Write Post - GloWe": "ልጥፍ ይጻፉ - GloWe",
        "1. About GloWe": "1. ስለ GloWe",
        "2. Who Can Use GloWe": "2. GloWeን ማን መጠቀም ይችላል",
        "3. Acceptable Use & Responsibilities": "3. ተቀባይነት ያለው አጠቃቀም እና ኃላፊነቶች",
        "4. Content Rights & Licensing": "4. የይዘት መብቶች እና ፈቃድ",
        "5. Privacy & Data": "5. ግላዊነት እና ውሂብ",
        "6. Community Integrity Charter": "6. የማህበረሰብ ታማኝነት ቻርተር",
        "6.1 Transparency": "6.1 ግልጽነት",
        "6.2 Respect & Inclusion": "6.2 አክብሮት እና አካታችነት",
        "6.3 Collaboration Over Competition": "6.3 ትብብር ከውድድር በላይ",
        "6.4 Cultural Sensitivity": "6.4 የባህል ስሜታዊነት",
        "6.5 Community Responsibility": "6.5 የማህበረሰብ ኃላፊነት",
        "7. Moderation & Enforcement": "7. አስተዳደር እና ማስፈጸም",
        "8. External Links & Third-Party Services": "8. ውጫዊ አገናኞች እና የሦስተኛ ወገን አገልግሎቶች",
        "9. Termination": "9. ማቋረጥ",
        "10. Liability Disclaimer": "10. የኃላፊነት ማስተባበያ",
        "11. Updates to Terms": "11. የውሎች ዝማኔዎች",
        "12. Contact Us": "12. ያግኙን",
        "2026 GloWe. Built for shared knowledge, mutual support, and action that lasts.": "2026 GloWe. ለጋራ ዕውቀት፣ ለጋራ ድጋፍ እና ለዘላቂ ተግባር የተገነባ።",
        "Local communities already hold practical knowledge about education, health, climate, food, rights, resilience, and care. Too often, that knowledge stays locked inside one place, one language, one report, or one organization. GloWe is being built to help field-based knowledge travel: clearly, respectfully, and in ways other people can adapt.": "የአካባቢ ማህበረሰቦች ስለ ትምህርት፣ ጤና፣ የአየር ንብረት፣ ምግብ፣ መብቶች፣ የመቋቋም አቅም እና እንክብካቤ ተግባራዊ ዕውቀት አስቀድሞ አላቸው። ብዙ ጊዜ ግን ያ ዕውቀት በአንድ ቦታ፣ በአንድ ቋንቋ፣ በአንድ ሪፖርት ወይም በአንድ ድርጅት ውስጥ ተቆልፎ ይቀራል። GloWe የሚገነባው የመስክ ዕውቀት እንዲዘዋወር ለመርዳት ነው፦ በግልጽ፣ በአክብሮት እና ሌሎች ሊጠቀሙበት በሚችሉበት መንገድ።",
        "Sign in with your Google account to get started. You can complete your profile after signing in.": "ለመጀመር በGoogle መለያዎ ይግቡ። ከገቡ በኋላ መገለጫዎን ማሟላት ይችላሉ።",
        "Share a Wish": "ምኞት ያካፍሉ",
        "A good wish is specific enough for the right helper to say yes.": "ጥሩ ምኞት ትክክለኛው ረዳት «አዎ» እንዲል በቂ ዝርዝር ያለው ነው።",
        "What do you need?": "ምን ያስፈልግዎታል?",
        "Wish type": "የምኞት ዓይነት",
        "Select a type": "ዓይነት ይምረጡ",
        "Urgency": "አጣዳፊነት",
        "Choose urgency": "አጣዳፊነትን ይምረጡ",
        "This week": "በዚህ ሳምንት",
        "This month": "በዚህ ወር",
        "Flexible timeline": "ተለዋዋጭ የጊዜ ሰሌዳ",
        "What would success look like?": "ስኬት ምን ይመስላል?",
        "Publish Wish": "ምኞቱን አሳትም",
        "Send a clear, trusted offer so the organization can decide quickly.": "ድርጅቱ በፍጥነት እንዲወስን ግልጽ እና የሚታመን ቅናሽ ይላኩ።",
        "What can you offer?": "ምን ማቅረብ ይችላሉ?",
        "Choose support type": "የድጋፍ ዓይነት ይምረጡ",
        "Professional volunteering": "ሙያዊ በጎ ፈቃደኝነት",
        "Funding or grant help": "የገንዘብ ወይም የእርዳታ ድጋፍ",
        "Space or equipment": "ቦታ ወይም መሣሪያ",
        "Business partnership": "የንግድ አጋርነት",
        "Media or distribution": "ሚዲያ ወይም ስርጭት",
        "Availability": "የሚገኙበት ጊዜ",
        "Choose availability": "የሚገኙበትን ጊዜ ይምረጡ",
        "Within 2 weeks": "በሁለት ሳምንት ውስጥ",
        "Send Offer": "ቅናሹን ላክ",
        "Update the public information that helps others understand who you are and how to collaborate.": "ሌሎች እርስዎ ማን እንደሆኑ እና እንዴት መተባበር እንደሚችሉ እንዲረዱ የሚያግዘውን የሕዝብ መረጃ ያዘምኑ።",
        "Display name": "የማሳያ ስም",
        "Profile type": "የመገለጫ ዓይነት",
        "Country / region": "አገር / ክልል",
        "Website / public link": "ድረ ገጽ / የሕዝብ አገናኝ",
        "Interest areas": "የፍላጎት መስኮች",
        "SDGs": "የዘላቂ ልማት ግቦች",
        "Short public line": "አጭር የሕዝብ መግለጫ",
        "Mission / story": "ተልዕኮ / ታሪክ",
        "Values and goals": "እሴቶች እና ግቦች",
        "Community / audience": "ማህበረሰብ / ተመልካች",
        "Problem addressed": "የሚፈታው ችግር",
        "Solution / method": "መፍትሔ / ዘዴ",
        "Geographic activity": "የጂኦግራፊ እንቅስቃሴ",
        "Open actions / looking for": "ክፍት ተግባራት / የሚፈልጉት",
        "Articles / videos / reports": "ጽሑፎች / ቪዲዮዎች / ሪፖርቶች",
        "Profile image": "የመገለጫ ምስል",
        "Optional. When Cloudinary keys are configured, this uploads to Cloudinary.": "አማራጭ። የCloudinary ቁልፎች ሲዋቀሩ ይህ ወደ Cloudinary ይጫናል።",
        "Save Profile Draft": "የመገለጫ ረቂቅ አስቀምጥ",
        "Welcome to GloWe 👋": "እንኳን ወደ GloWe በደህና መጡ 👋",
        "Tell us a little about you so the community knows who they're collaborating with. It only takes a minute.": "ማህበረሰቡ ከማን ጋር እንደሚተባበር እንዲያውቅ ስለ እርስዎ ትንሽ ይንገሩን። አንድ ደቂቃ ብቻ ይወስዳል።",
        "Your name": "ስምዎ",
        "A short line about you": "ስለ እርስዎ አጭር መግለጫ",
        "I'm joining as": "የምቀላቀለው እንደ",
        "Private individual": "የግል ግለሰብ",
        "Volunteer, donor, or community member. Full access right away.": "በጎ ፈቃደኛ፣ ለጋሽ ወይም የማህበረሰብ አባል። ወዲያውኑ ሙሉ ተደራሽነት።",
        "Organization": "ድርጅት",
        "NGO, nonprofit, or initiative. Reviewed before you can publish — only serious applications are accepted.": "መንግሥታዊ ያልሆነ ድርጅት፣ ለትርፍ ያልተቋቋመ ወይም ተነሳሽነት። ከማሳተምዎ በፊት ይገመገማል — ቁም ነገር ያላቸው ማመልከቻዎች ብቻ ይቀበላሉ።",
        "Organizations are reviewed by the GloWe team. Until you're approved you can browse everything, but posting opportunities, events, and needs stays locked. Please give us enough to take your application seriously.": "ድርጅቶች በGloWe ቡድን ይገመገማሉ። እስከሚጸድቁ ድረስ ሁሉንም ማሰስ ይችላሉ፣ ነገር ግን ዕድሎችን፣ ዝግጅቶችን እና ፍላጎቶችን መለጠፍ ተቆልፎ ይቆያል። እባክዎ ማመልከቻዎን በቁም ነገር እንድንመለከት በቂ መረጃ ይስጡን።",
        "Organization name *": "የድርጅቱ ስም *",
        "Registration / NGO number": "የምዝገባ / የድርጅት ቁጥር",
        "Country of operation": "የሚሠሩበት አገር",
        "Cause / field": "ዓላማ / መስክ",
        "Organization size": "የድርጅቱ መጠን",
        "About the organization *": "ስለ ድርጅቱ *",
        "Contact person *": "የግንኙነት ሰው *",
        "Contact email *": "የግንኙነት ኢሜይል *",
        "Contact phone": "የግንኙነት ስልክ",
        "Save and continue": "አስቀምጥ እና ቀጥል",
        "Maybe later": "ምናልባት ወደፊት",
        "Add project": "ፕሮጀክት ጨምር",
        "Add a project that can appear in your personal area and help others understand what you are building.": "በግል ክፍልዎ ውስጥ ሊታይ የሚችል እና ሌሎች የሚገነቡትን እንዲረዱ የሚያግዝ ፕሮጀክት ይጨምሩ።",
        "Project title": "የፕሮጀክቱ ርዕስ",
        "Status": "ሁኔታ",
        "Draft": "ረቂቅ",
        "Active": "ንቁ",
        "Recruiting partners": "አጋሮችን በመመልመል ላይ",
        "Needs volunteers": "በጎ ፈቃደኞች ያስፈልጋሉ",
        "Ready to share": "ለማጋራት ዝግጁ",
        "Description": "መግለጫ",
        "Save Project": "ፕሮጀክቱን አስቀምጥ",
        "Edit": "አርትዕ",
        "Edit project": "ፕሮጀክቱን አርትዕ",
        "Update Project": "ፕሮጀክቱን አዘምን",
        "Project updated": "ፕሮጀክቱ ተዘምኗል",
        "Your project changes were saved.": "የፕሮጀክትዎ ለውጦች ተቀምጠዋል።",
        "Project added": "ፕሮጀክቱ ተጨምሯል",
        "The project now appears in your personal area.": "ፕሮጀክቱ አሁን በግል ክፍልዎ ውስጥ ይታያል።",
        "No event registrations yet": "እስካሁን የዝግጅት ምዝገባዎች የሉም",
        "Register for an event from the Volunteer Network and track it here.": "ከበጎ ፈቃደኞች መረብ ለዝግጅት ይመዝገቡ እና እዚህ ይከታተሉት።",
        "Browse events": "ዝግጅቶችን ያስሱ",
        "Event cancelled": "ዝግጅቱ ተሰርዟል",
        "Registered": "ተመዝግቧል",
        "Pending approval": "ፈቃድ በመጠባበቅ ላይ",
        "Waitlisted": "በመጠባበቂያ ዝርዝር ውስጥ",
        "Not accepted": "አልተቀበለም",
        "Cancelled": "ተሰርዟል",
        "Report a concern": "ስጋት ሪፖርት ያድርጉ",
        "We review every report carefully and confidentially to keep GloWe safe and professional.": "GloWeን ደህንነቱ የተጠበቀ እና ሙያዊ ለማድረግ እያንዳንዱን ሪፖርት በጥንቃቄ እና በሚስጥር እንገመግማለን።",
        "Reporting": "ሪፖርት ማድረግ",
        "General concern": "አጠቃላይ ስጋት",
        "What should we look at?": "ምን እንመልከት?",
        "Choose a reason": "ምክንያት ይምረጡ",
        "Inaccurate information": "ትክክል ያልሆነ መረጃ",
        "Disrespectful or discriminatory content": "አክብሮት የጎደለው ወይም አድሎአዊ ይዘት",
        "Misleading promotion": "አሳሳች ማስተዋወቂያ",
        "Human rights concern": "የሰብዓዊ መብት ስጋት",
        "Other": "ሌላ",
        "Details": "ዝርዝሮች",
        "Submit Report": "ሪፖርቱን አስገባ",
        "Choose a rhythm that keeps GloWe useful without creating digital fatigue.": "GloWeን ጠቃሚ የሚያደርግ ነገር ግን ዲጂታል ድካም የማይፈጥር ምት ይምረጡ።",
        "Opportunity of the week": "የሳምንቱ ዕድል",
        "High-match connection proposals": "ከፍተኛ ተዛምዶ ያላቸው የግንኙነት ሐሳቦች",
        "Deadline reminders": "የመጨረሻ ቀን ማስታወሻዎች",
        "Crisis-response playbooks for my region": "ለክልሌ የቀውስ ምላሽ መመሪያዎች",
        "Preferred cadence": "የሚመረጥ ድግግሞሽ",
        "Weekly digest": "ሳምንታዊ ማጠቃለያ",
        "Only urgent actions": "አጣዳፊ ተግባራት ብቻ",
        "Daily 5-minute brief": "የዕለት 5 ደቂቃ አጭር መግለጫ",
        "Save Preferences": "ምርጫዎችን አስቀምጥ",
        "Mentors, space, visibility...": "አማካሪዎች፣ ቦታ፣ ተጋላጭነት...",
        "City, region, remote, or hybrid": "ከተማ፣ ክልል፣ ከርቀት ወይም ድብልቅ",
        "Tell the community what would help.": "ማህበረሰቡን የሚረዳዎትን ይንገሩ።",
        "Example: 3 mentors matched, one grant draft completed, 50 families reached...": "ምሳሌ፦ 3 አማካሪዎች ተዛምደዋል፣ አንድ የእርዳታ ረቂቅ ተጠናቋል፣ 50 ቤተሰቦች ተደርሰዋል...",
        "Briefly explain your relevant experience, what you can offer, and what you need to know next.": "ተዛማጅ ተሞክሮዎን፣ ማቅረብ የሚችሉትን እና ቀጥሎ ማወቅ የሚያስፈልግዎትን በአጭሩ ያብራሩ።",
        "Organization or person name": "የድርጅት ወይም የሰው ስም",
        "NGO, business, volunteer, initiative...": "መንግሥታዊ ያልሆነ ድርጅት፣ ንግድ፣ በጎ ፈቃደኛ፣ ተነሳሽነት...",
        "Education, health, climate...": "ትምህርት፣ ጤና፣ የአየር ንብረት...",
        "Quality Education, Climate Action...": "ጥራት ያለው ትምህርት፣ የአየር ንብረት ተግባር...",
        "One clear sentence people can understand quickly": "ሰዎች በፍጥነት ሊረዱት የሚችሉ አንድ ግልጽ ዓረፍተ ነገር",
        "Mission, current work, or what you offer.": "ተልዕኮ፣ የአሁኑ ሥራ ወይም የሚያቀርቡት።",
        "Values, goals, leadership, or principles": "እሴቶች፣ ግቦች፣ አመራር ወይም መርሆዎች",
        "Who do you serve, support, work with, or hope to reach?": "ማንን ያገለግላሉ፣ ይደግፋሉ፣ ከማን ጋር ይሠራሉ ወይም ማንን ለመድረስ ተስፋ ያደርጋሉ?",
        "What problem or need are you working on?": "በየትኛው ችግር ወይም ፍላጎት ላይ እየሠሩ ነው?",
        "What do you do in practice?": "በተግባር ምን ያደርጋሉ?",
        "Advocacy, education, field work, research...": "ተሟጋችነት፣ ትምህርት፣ የመስክ ሥራ፣ ምርምር...",
        "Local / regional / global / remote": "አካባቢያዊ / ክልላዊ / ዓለም አቀፍ / ከርቀት",
        "Partners, volunteers, funding, knowledge, visibility...": "አጋሮች፣ በጎ ፈቃደኞች፣ የገንዘብ ድጋፍ፣ ዕውቀት፣ ተጋላጭነት...",
        "Useful public links": "ጠቃሚ የሕዝብ አገናኞች",
        "Full name": "ሙሉ ስም",
        "One sentence people grasp quickly": "ሰዎች በፍጥነት የሚይዙት አንድ ዓረፍተ ነገር",
        "Registered / public name": "የተመዘገበ / የሕዝብ ስም",
        "Legal registration number": "ሕጋዊ የምዝገባ ቁጥር",
        "Where you operate": "የሚሠሩበት ቦታ",
        "Volunteers / staff, approx.": "በጎ ፈቃደኞች / ሠራተኞች፣ በግምት",
        "Mission, who you serve, and what you'd do on GloWe.": "ተልዕኮ፣ የሚያገለግሏቸው እና በGloWe ላይ የሚያደርጉት።",
        "Who we should talk to": "ማንን ማነጋገር እንዳለብን",
        "Optional": "አማራጭ",
        "Community resource map": "የማህበረሰብ ሀብት ካርታ",
        "What is the project, who does it support, and what kind of help would move it forward?": "ፕሮጀክቱ ምንድን ነው፣ ማንን ይደግፋል፣ እና ምን ዓይነት እርዳታ ወደፊት ያራምደዋል?",
        "Add context that can help our review.": "ግምገማችንን ሊያግዝ የሚችል አውድ ይጨምሩ።",
        "Switch to English": "ወደ እንግሊዝኛ ቀይር",
        "This page outlines the terms, responsibilities, and community standards that guide your use of the GloWe platform. By accessing or interacting with this site, you agree to abide by the Terms of Use and our Community Integrity Charter. GloWe is committed to building a safe, inclusive, and impact-driven space.": "ይህ ገጽ የGloWe መድረክን አጠቃቀምዎን የሚመሩ ውሎችን፣ ኃላፊነቶችን እና የማህበረሰብ መስፈርቶችን ያብራራል። ይህን ጣቢያ በመድረስ ወይም ከእሱ ጋር በመስተጋብር የአጠቃቀም ውሎችን እና የማህበረሰብ ታማኝነት ቻርተራችንን ለማክበር ይስማማሉ። GloWe ደህንነቱ የተጠበቀ፣ አካታች እና በተጽዕኖ የሚመራ ቦታ ለመገንባት ቁርጠኛ ነው።",
        "GloWe is a global platform connecting individuals, organizations, and initiatives working to create social and environmental change. We facilitate knowledge-sharing, collaboration, and visibility for solutions that matter across languages, sectors, and geographies.": "GloWe ማህበራዊ እና አካባቢያዊ ለውጥ ለመፍጠር የሚሠሩ ግለሰቦችን፣ ድርጅቶችን እና ተነሳሽነቶችን የሚያገናኝ ዓለም አቀፍ መድረክ ነው። በቋንቋዎች፣ በዘርፎች እና በጂኦግራፊ አካባቢዎች መካከል ለሚጠቅሙ መፍትሔዎች የዕውቀት ልውውጥን፣ ትብብርን እና ተጋላጭነትን እናመቻቻለን።",
        "Share knowledge, ask for support, and build practical impact with the community.": "ዕውቀት ያካፍሉ፣ ድጋፍ ይጠይቁ እና ከማህበረሰቡ ጋር ተግባራዊ ተጽዕኖ ይገንቡ።",
        "More post actions": "ተጨማሪ የልጥፍ ተግባራት",
        "More wish actions": "ተጨማሪ የምኞት ተግባራት",
        "More opportunity actions": "ተጨማሪ የዕድል ተግባራት",
        "More profile actions": "ተጨማሪ የመገለጫ ተግባራት",
        "Write a thoughtful comment...": "አሳቢነት የተሞላበት አስተያየት ይጻፉ...",
        "Ask a focused question for this group": "ለዚህ ቡድን ያተኮረ ጥያቄ ይጠይቁ",
        "What do you need input on, and what kind of answers would help?": "በምን ላይ አስተያየት ያስፈልግዎታል፣ እና ምን ዓይነት መልሶች ይረዳሉ?",
        "Personal workspace": "የግል የሥራ ቦታ",
        "Your GloWe profile is ready to be completed.": "የGloWe መገለጫዎ ለማሟላት ዝግጁ ነው።",
        "Community collaboration": "የማህበረሰብ ትብብር",
        "Location not added yet": "አካባቢ እስካሁን አልተጨመረም",
        "Team size not added yet": "የቡድን መጠን እስካሁን አልተጨመረም",
        "Not added yet": "እስካሁን አልተጨመረም",
        "Title / role": "ማዕረግ / ሚና",
        "Organization name": "የድርጅቱ ስም",
        "Email verified": "ኢሜይል ተረጋግጧል",
        "Pending": "በመጠባበቅ ላይ",
        "Accepted": "ተቀባይነት አግኝቷል",
        "Declined": "ተቀባይነት አላገኘም",
        "Public link": "የሕዝብ አገናኝ",
        "Public line": "የሕዝብ መግለጫ",
        "Open to volunteers, donations, or partnerships?": "ለበጎ ፈቃደኞች፣ ለልገሳዎች ወይም ለአጋርነቶች ክፍት ነዎት?",
        "Funding / support sources": "የገንዘብ / የድጋፍ ምንጮች",
        "Annual budget / support context": "ዓመታዊ በጀት / የድጋፍ አውድ",
        "Profile status": "የመገለጫ ሁኔታ",
        "Personal area sections": "የግል ክፍል ክፍሎች",
        "Sign in to post a need": "ፍላጎት ለመለጠፍ ይግቡ",
        "Browsing GloWe is open to everyone. Sign in with Google to post a need and reach people ready to help.": "GloWeን ማሰስ ለሁሉም ክፍት ነው። ፍላጎት ለመለጠፍ እና ለመርዳት ዝግጁ የሆኑ ሰዎችን ለመድረስ በGoogle ይግቡ።",
        "Sign in to post": "ለመለጠፍ ይግቡ",
        "Sign in with Google to share a post with the GloWe community.": "ከGloWe ማህበረሰብ ጋር ልጥፍ ለማጋራት በGoogle ይግቡ።",
        "Sign in to publish": "ለማሳተም ይግቡ",
        "Sign in with Google to publish this opportunity and start receiving applications.": "ይህን ዕድል ለማሳተም እና ማመልከቻዎችን መቀበል ለመጀመር በGoogle ይግቡ።",
        "Sign in to start a discussion": "ውይይት ለመጀመር ይግቡ",
        "Sign in with Google to open a new discussion thread.": "አዲስ የውይይት ክር ለመክፈት በGoogle ይግቡ።",
        "Sign in to reply": "ለመመለስ ይግቡ",
        "Sign in with Google to join this discussion.": "ይህን ውይይት ለመቀላቀል በGoogle ይግቡ።",
        "Sign in to apply": "ለማመልከት ይግቡ",
        "Save your spot": "ቦታዎን ያስይዙ",
        "Ready to lend a hand?": "እጅ ለመዘርጋት ዝግጁ ነዎት?",
        "Keep this for later": "ይህን ለወደፊት ያስቀምጡ",
        "Sign in with Google to save it to your list.": "ወደ ዝርዝርዎ ለማስቀመጥ በGoogle ይግቡ።",
        "Sign in to continue": "ለመቀጠል ይግቡ",
        "Sign in with Google to open your personal area.": "የግል ክፍልዎን ለመክፈት በGoogle ይግቡ።",
        "Sign in with Google to do this on GloWe.": "ይህን በGloWe ላይ ለማድረግ በGoogle ይግቡ።",
        "Welcome to GloWe": "እንኳን ወደ GloWe በደህና መጡ",
        "Welcome — you're browsing as a guest. Sign in with Google anytime to participate.": "እንኳን ደህና መጡ — እንደ እንግዳ እያሰሱ ነው። ለመሳተፍ በማንኛውም ጊዜ በGoogle ይግቡ።",
        "Mark as fulfilled": "እንደተፈጸመ ምልክት አድርግ",
        "No wishes yet": "እስካሁን ምኞቶች የሉም",
        "Post a wish": "ምኞት ይለጥፉ",
        "The Wishing Well fills up as community members post support requests, calls for volunteers, and collaboration opportunities. Be the first to share what your project needs.": "የማህበረሰብ አባላት የድጋፍ ጥያቄዎችን፣ የበጎ ፈቃደኞች ጥሪዎችን እና የትብብር ዕድሎችን ሲለጥፉ የምኞት ጉድጓዱ ይሞላል። ፕሮጀክትዎ የሚያስፈልገውን በማካፈል የመጀመሪያው ይሁኑ።",
        "Back to wishes": "ወደ ምኞቶች ተመለስ",
        "No opportunities posted yet": "እስካሁን የተለጠፉ ዕድሎች የሉም",
        "No organizations yet": "እስካሁን ድርጅቶች የሉም",
        "No matching profiles": "የሚዛመዱ መገለጫዎች የሉም",
        "No posts yet — share knowledge, ask for support, or open a discussion to get things going.": "እስካሁን ልጥፎች የሉም — ዕውቀት ያካፍሉ፣ ድጋፍ ይጠይቁ ወይም ነገሮችን ለማንቀሳቀስ ውይይት ይክፈቱ።",
        "No registrations yet.": "እስካሁን ምዝገባዎች የሉም።",
        "Could not load registrations.": "ምዝገባዎችን መጫን አልተቻለም።",
        "Be the first to share a volunteer role or collaboration request with the GloWe community.": "ከGloWe ማህበረሰብ ጋር የበጎ ፈቃድ ሚና ወይም የትብብር ጥያቄ በማካፈል የመጀመሪያው ይሁኑ።",
        "Be the first to share a volunteer role or collaboration request with the community.": "ከማህበረሰቡ ጋር የበጎ ፈቃድ ሚና ወይም የትብብር ጥያቄ በማካፈል የመጀመሪያው ይሁኑ።",
        "Members will appear here once they join the community.": "አባላት ማህበረሰቡን ሲቀላቀሉ እዚህ ይታያሉ።",
        "Organizations join GloWe by creating a profile and completing verification. The first approved profiles will appear here.": "ድርጅቶች መገለጫ በመፍጠር እና ማረጋገጫን በማጠናቀቅ GloWeን ይቀላቀላሉ። መጀመሪያ የጸደቁት መገለጫዎች እዚህ ይታያሉ።",
        "The community is just getting started. Post a wish, share what you know, or reach out to someone who is working on what you care about.": "ማህበረሰቡ ገና እየጀመረ ነው። ምኞት ይለጥፉ፣ የሚያውቁትን ያካፍሉ ወይም ለእርስዎ በሚያሳስብዎት ጉዳይ ላይ የሚሠራ ሰው ያግኙ።",
        "This section will come alive as the community grows.": "ማህበረሰቡ እያደገ ሲሄድ ይህ ክፍል ሕያው ይሆናል።",
        "Try a broader keyword or clear a filter.": "ሰፋ ያለ ቁልፍ ቃል ይሞክሩ ወይም ማጣሪያ ያጽዱ።",
        "Write the first post": "የመጀመሪያውን ልጥፍ ይጻፉ",
        "Write a message": "መልእክት ይጻፉ",
        "Loading opportunities…": "ዕድሎችን በመጫን ላይ…",
        "Loading organizations…": "ድርጅቶችን በመጫን ላይ…",
        "Loading posts…": "ልጥፎችን በመጫን ላይ…",
        "Loading profile…": "መገለጫን በመጫን ላይ…",
        "Loading registrations…": "ምዝገባዎችን በመጫን ላይ…",
        "Loading wishes…": "ምኞቶችን በመጫን ላይ…",
        "Fetching from the community directory.": "ከማህበረሰብ ማውጫ በማምጣት ላይ።",
        "Back": "ተመለስ",
        "Next": "ቀጣይ",
        "Register for event": "ለዝግጅቱ ይመዝገቡ",
        "Sign in to register": "ለመመዝገብ ይግቡ",
        "Cancel registration": "ምዝገባን ሰርዝ",
        "Cancel event": "ዝግጅቱን ሰርዝ",
        "Manage registrations": "ምዝገባዎችን አስተዳድር",
        "Event registration": "የዝግጅት ምዝገባ",
        "Message to the organizer (optional)": "ለአዘጋጁ መልእክት (አማራጭ)",
        "This event has been cancelled by the organizer.": "ይህ ዝግጅት በአዘጋጁ ተሰርዟል።",
        "This event has ended.": "ይህ ዝግጅት ተጠናቋል።",
        "This event is cancelled.": "ይህ ዝግጅት ተሰርዟል።",
        "This event is no longer open for registration.": "ይህ ዝግጅት ለምዝገባ ክፍት አይደለም።",
        "Registration:": "ምዝገባ፦",
        "Status:": "ሁኔታ፦",
        "Type:": "ዓይነት፦",
        "When:": "መቼ፦",
        "Join link:": "የመቀላቀያ አገናኝ፦",
        "Offer sent": "ቅናሹ ተልኳል",
        "Structured support offer submitted.": "የተደራጀ የድጋፍ ቅናሽ ቀርቧል።",
        "Save as draft": "እንደ ረቂቅ አስቀምጥ",
        "Submit for review": "ለግምገማ አስገባ",
        "Send code": "ኮድ ላክ",
        "Select an area": "መስክ ይምረጡ",
        "Choose if relevant": "አግባብነት ካለው ይምረጡ",
        "Preferred contact": "የሚመረጥ የግንኙነት መንገድ",
        "In-app message": "በመተግበሪያ ውስጥ መልእክት",
        "Location (optional)": "አካባቢ (አማራጭ)",
        "Phone": "ስልክ",
        "Phone (optional)": "ስልክ (አማራጭ)",
        "WhatsApp": "WhatsApp",
        "Public": "የሕዝብ",
        "Public actions": "የሕዝብ ተግባራት",
        "Public profile and media": "የሕዝብ መገለጫ እና ሚዲያ",
        "Basic account": "መሠረታዊ መለያ",
        "Looking for": "የሚፈለገው",
        "Impact": "ተጽዕኖ",
        "Impact update": "የተጽዕኖ ዘገባ",
        "Draft impact update": "የተጽዕኖ ዘገባ ረቂቅ",
        "Draft Update": "የዘገባ ረቂቅ",
        "Impact, interests and methods": "ተጽዕኖ፣ ፍላጎቶች እና ዘዴዎች",
        "Mentoring": "አማካሪነት",
        "Trust": "እምነት",
        "Trust, contact and review": "እምነት፣ ግንኙነት እና ግምገማ",
        "Story": "ታሪክ",
        "Story and purpose": "ታሪክ እና ዓላማ",
        "The dream": "ሕልሙ",
        "The conversation starts here": "ውይይቱ የሚጀምረው እዚህ ነው",
        "Connection workspace": "የግንኙነት የሥራ ቦታ",
        "Profile onboarding": "የመገለጫ ማስጀመሪያ",
        "Organization review": "የድርጅት ግምገማ",
        "Review note": "የግምገማ ማስታወሻ",
        "Relevant SDGs": "ተዛማጅ የዘላቂ ልማት ግቦች",
        "Size / team": "መጠን / ቡድን",
        "Annual budget": "ዓመታዊ በጀት",
        "First coordination call": "የመጀመሪያ የቅንጅት ጥሪ",
        "Both sides confirm scope, timeline, and ownership.": "ሁለቱም ወገኖች ወሰኑን፣ የጊዜ ሰሌዳውን እና ባለቤትነትን ያረጋግጣሉ።",
        "A short outcome note documents what changed.": "አጭር የውጤት ማስታወሻ የተለወጠውን ይመዘግባል።",
        "When work is complete, this becomes a short public note: what was needed, who helped, what happened, and what is still needed.": "ሥራው ሲጠናቀቅ ይህ አጭር የሕዝብ ማስታወሻ ይሆናል፦ ምን እንደሚያስፈልግ ነበር፣ ማን እንደረዳ፣ ምን እንደሆነ እና አሁንም ምን እንደሚያስፈልግ።",
        "To turn a local need into a shared action that others can join, support, or learn from.": "የአካባቢ ፍላጎትን ሌሎች ሊቀላቀሉት፣ ሊደግፉት ወይም ሊማሩበት ወደሚችሉ የጋራ ተግባር ለመቀየር።",
        "Build a useful profile step by step. You can save a draft now and complete more details later.": "ጠቃሚ መገለጫ ደረጃ በደረጃ ይገንቡ። አሁን ረቂቅ አስቀምጠው ተጨማሪ ዝርዝሮችን ወደፊት ማሟላት ይችላሉ።",
        "Choose the profile that best describes you. This changes the questions and future profile layout.": "እርስዎን በተሻለ የሚገልጸውን መገለጫ ይምረጡ። ይህ ጥያቄዎቹን እና የወደፊቱን የመገለጫ አቀማመጥ ይለውጣል።",
        "For this MVP, the code is shown on screen and stored locally.": "በዚህ የመጀመሪያ ሥሪት ኮዱ በማያ ገጽ ላይ ይታያል እና በአካባቢው ይቀመጣል።",
        "I agree to keep GloWe professional, respectful, transparent, and aligned with human rights.": "GloWeን ሙያዊ፣ አክብሮታዊ፣ ግልጽ እና ከሰብዓዊ መብቶች ጋር የተጣጣመ ለማድረግ እስማማለሁ።",
        "Logo or profile image": "አርማ ወይም የመገለጫ ምስል",
        "Website / LinkedIn / Facebook": "ድረ ገጽ / LinkedIn / Facebook",
        "1 person": "1 ሰው",
        "2-5 people": "2-5 ሰዎች",
        "6-20 people": "6-20 ሰዎች",
        "20+ people": "ከ20 በላይ ሰዎች",
        "(required for rejection)": "(ለአለመቀበል ያስፈልጋል)",
        "First name *": "የመጀመሪያ ስም *",
        "Last name *": "የአባት ስም *",
        "Email *": "ኢሜይል *",
        "Password *": "የይለፍ ቃል *",
        "Confirm password *": "የይለፍ ቃል ያረጋግጡ *",
        "Email verification code *": "የኢሜይል ማረጋገጫ ኮድ *",
        "Country *": "አገር *",
        "Community / audience *": "ማህበረሰብ / ተመልካች *",
        "Geographic activity *": "የጂኦግራፊ እንቅስቃሴ *",
        "Main interest areas *": "ዋና የፍላጎት መስኮች *",
        "Organization mission *": "የድርጅቱ ተልዕኮ *",
        "Problem you address *": "የሚፈቱት ችግር *",
        "Solution or method *": "መፍትሔ ወይም ዘዴ *",
        "Values and goals *": "እሴቶች እና ግቦች *",
        "Short public line *": "አጭር የሕዝብ መግለጫ *",
        "Title / role *": "ማዕረግ / ሚና *",
        "All listings": "ሁሉም ዝርዝሮች",
        "Events only": "ዝግጅቶች ብቻ",
        "Events:": "ዝግጅቶች፦",
        "In-person events": "በአካል የሚደረጉ ዝግጅቶች",
        "Online events": "የመስመር ላይ ዝግጅቶች",
        "Upcoming events": "መጪ ዝግጅቶች",
        "Registered members": "የተመዘገቡ አባላት",
        "Registered organizations": "የተመዘገቡ ድርጅቶች",
        "+ Create": "+ ፍጠር",
        "Create": "ፍጠር",
        "What would you like to create?": "ምን መፍጠር ይፈልጋሉ?",
        "Share an update, a story, or knowledge with the community.": "ከማህበረሰቡ ጋር ዘገባ፣ ታሪክ ወይም ዕውቀት ያካፍሉ።",
        "Publish a volunteering event with a date and registration.": "ቀን እና ምዝገባ ያለው የበጎ ፈቃድ ዝግጅት ያሳትሙ።",
        "Recruit volunteers for an ongoing role or project.": "ለቀጣይ ሚና ወይም ፕሮጀክት በጎ ፈቃደኞችን ይመልምሉ።",
        "Ask the community for help, resources, or partners.": "ከማህበረሰቡ እርዳታ፣ ሀብቶች ወይም አጋሮች ይጠይቁ።",
        "Offer your time and skills so organizations can find you.": "ድርጅቶች እንዲያገኙዎት ጊዜዎን እና ክህሎቶችዎን ያቅርቡ።",
        "Event": "ዝግጅት",
        "Need": "የእርዳታ ጥያቄ",
        "Volunteer Offer": "የበጎ ፈቃድ ቅናሽ",
        "Publish an event": "ዝግጅት ያሳትሙ",
        "Events appear on the Volunteer Network with a date and registration.": "ዝግጅቶች በበጎ ፈቃደኞች መረብ ላይ ከቀን እና ከምዝገባ ጋር ይታያሉ።",
        "Event title": "የዝግጅቱ ርዕስ",
        "e.g. Community beach cleanup": "ለምሳሌ፦ የማህበረሰብ የባህር ዳርቻ ጽዳት",
        "What happens at the event, and who should come?": "በዝግጅቱ ላይ ምን ይሆናል፣ እና ማን መምጣት አለበት?",
        "Starts": "ይጀምራል",
        "Ends (optional)": "ያበቃል (አማራጭ)",
        "Format": "ቅርጸት",
        "Location / link": "አካባቢ / አገናኝ",
        "Address, city, or meeting link": "አድራሻ፣ ከተማ ወይም የስብሰባ አገናኝ",
        "Capacity (optional)": "የመቀበል አቅም (አማራጭ)",
        "Leave empty for unlimited": "ገደብ ለሌለው ባዶ ይተዉት",
        "Registration": "ምዝገባ",
        "Organizer approves each registration": "አዘጋጁ እያንዳንዱን ምዝገባ ያጸድቃል",
        "Open — instant confirmation": "ክፍት — ፈጣን ማረጋገጫ",
        "Publish Event": "ዝግጅቱን አሳትም",
        "Event published": "ዝግጅቱ ታትሟል",
        "Your event is now live on the Volunteer Network.": "ዝግጅትዎ አሁን በበጎ ፈቃደኞች መረብ ላይ ንቁ ነው።",
        "Offer your help": "እርዳታዎን ያቅርቡ",
        "Your offer appears on the Wishing Well so organizations and members can find you.": "ድርጅቶች እና አባላት እንዲያገኙዎት ቅናሽዎ በምኞት ጉድጓድ ላይ ይታያል።",
        "Headline": "ዋና ርዕስ",
        "e.g. Graphic designer offering 3 hours a week": "ለምሳሌ፦ በሳምንት 3 ሰዓት የሚያቀርብ ግራፊክ ዲዛይነር",
        "Skills, time, equipment — anything that could help.": "ክህሎቶች፣ ጊዜ፣ መሣሪያዎች — ሊረዳ የሚችል ማንኛውም ነገር።",
        "Impact area (optional)": "የተጽዕኖ መስክ (አማራጭ)",
        "Publish Offer": "ቅናሹን አሳትም",
        "Offer published": "ቅናሹ ታትሟል",
        "Your offer is now live on the Wishing Well.": "ቅናሽዎ አሁን በምኞት ጉድጓድ ላይ ንቁ ነው።",
        "Fetching your conversations.": "ውይይቶችዎን በማምጣት ላይ።",
        "No conversations yet": "እስካሁን ውይይቶች የሉም",
        "Reach out to an organization, offer help on a need, or message a community member — conversations will appear here.": "ድርጅትን ያግኙ፣ ለአንድ ፍላጎት እርዳታ ያቅርቡ ወይም ለማህበረሰብ አባል መልእክት ይላኩ — ውይይቶች እዚህ ይታያሉ።",
        "Open the Wishing Well": "የምኞት ጉድጓድን ክፈት",
        "Opening the conversation.": "ውይይቱን በመክፈት ላይ።",
        "Conversation unavailable": "ውይይቱ አይገኝም",
        "This conversation could not be opened.": "ይህን ውይይት መክፈት አልተቻለም።",
        "Back to messages": "ወደ መልእክቶች ተመለስ",
        "No messages yet. Say hello!": "እስካሁን መልእክቶች የሉም። ሰላም ይበሉ!",
        "Write a message...": "መልእክት ይጻፉ...",
        "Could not send": "መላክ አልተቻለም",
        "Messaging unavailable": "መልእክት መላክ አይገኝም",
        "This member cannot receive direct messages yet.": "ይህ አባል እስካሁን ቀጥተኛ መልእክቶችን መቀበል አይችልም።",
        "Messages are unavailable": "መልእክቶች አይገኙም",
        "Spam or misleading promotion": "አላስፈላጊ መልእክት ወይም አሳሳች ማስተዋወቂያ",
        "Harassment or hate": "ትንኮሳ ወይም ጥላቻ",
        "False or misleading information": "ሐሰተኛ ወይም አሳሳች መረጃ",
        "Inappropriate content": "ተገቢ ያልሆነ ይዘት",
        "Fake profile or impersonation": "ሐሰተኛ መገለጫ ወይም ማንነት መስረቅ",
        "Already reported": "አስቀድሞ ሪፖርት ተደርጓል",
        "You already reported this. Our team will review it.": "ይህን አስቀድመው ሪፖርት አድርገዋል። ቡድናችን ይገመግመዋል።",
        "Could not send report": "ሪፖርቱን መላክ አልተቻለም",
        "Something went wrong sending your report. Please try again.": "ሪፖርትዎን በመላክ ላይ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
        "Reporting needs a live connection right now. Please try again shortly.": "ሪፖርት ማድረግ አሁን ንቁ ግንኙነት ይፈልጋል። እባክዎ ከጥቂት ጊዜ በኋላ ይሞክሩ።",
        "Sign in to report": "ሪፖርት ለማድረግ ይግቡ",
        "Sign in with Google to report this content so our team can review it.": "ቡድናችን እንዲገመግመው ይህን ይዘት ሪፖርት ለማድረግ በGoogle ይግቡ።",
        "Fetching community reports.": "የማህበረሰብ ሪፖርቶችን በማምጣት ላይ።",
        "Could not load reports": "ሪፖርቶችን መጫን አልተቻለም",
        "Remove content": "ይዘቱን አስወግድ",
        "Content removed": "ይዘቱ ተወግዷል",
        "The reported content is no longer publicly visible.": "ሪፖርት የተደረገበት ይዘት ከዚህ በኋላ ለሕዝብ አይታይም።",
        "Report dismissed": "ሪፖርቱ ተቀባይነት አላገኘም",
        "The report was closed with no action.": "ሪፖርቱ ያለ ምንም እርምጃ ተዘግቷል።",
        "Only GloWe reviewers can act on reports.": "በሪፖርቶች ላይ እርምጃ መውሰድ የሚችሉት የGloWe ገምጋሚዎች ብቻ ናቸው።",
        "Open reported item": "ሪፖርት የተደረገበትን ንጥል ክፈት",
        "Audience": "ታዳሚ",
        "Community Discussion": "የማህበረሰብ ውይይት",
        "Connection Request": "የግንኙነት ጥያቄ",
        "Deadline": "የመጨረሻ ቀን",
        "Discussion": "ውይይት",
        "Event / Webinar": "ዝግጅት / ዌቢናር",
        "Filters": "ማጣሪያዎች",
        "Grant / Open Call": "እርዳታ / ክፍት ጥሪ",
        "Knowledge Share": "የእውቀት ልውውጥ",
        "Newest first": "አዲሶች መጀመሪያ",
        "No wishes match your filters": "ከማጣሪያዎችዎ ጋር የሚዛመድ ምኞት የለም",
        "Oldest first": "አሮጌዎች መጀመሪያ",
        "Professional Guide": "ሙያዊ መመሪያ",
        "Reason": "ምክንያት",
        "Reporter": "ሪፖርት አድራጊ",
        "Search by title, author, city, or topic": "በርዕስ፣ በጸሐፊ፣ በከተማ ወይም በርዕሰ ጉዳይ ይፈልጉ",
        "Search wishes": "ምኞቶችን ፈልግ",
        "Search, filter, and sort open needs from across the community.": "ከማህበረሰቡ ክፍት ፍላጎቶችን ይፈልጉ፣ ያጣሩ እና ይደርድሩ።",
        "Sort": "ደርድር",
        "Sort wishes": "ምኞቶችን ደርድር",
        "Success Story": "የስኬት ታሪክ",
        "Title A–Z": "ርዕስ ሀ–ፐ",
        "Verified": "የተረጋገጠ",
        "volunteers": "በጎ ፈቃደኞች",
        "wish shown": "ምኞት ታይቷል",
        "wishes shown": "ምኞቶች ታይተዋል",
        "Values": "እሴቶች",
        "Problem": "ችግር",
        "Solution": "መፍትሔ",
        "Size / availability": "መጠን / ተገኝነት",
        "Not specified yet": "እስካሁን አልተገለጸም",
        "Through participation, useful connections, project progress, and community feedback.": "በተሳትፎ፣ ጠቃሚ ግንኙነቶች፣ የፕሮጀክት እድገት እና የማህበረሰብ አስተያየት አማካኝነት።",
        "Contact through GloWe messages": "በGloWe መልእክቶች በኩል ያግኙ",
        "Community impact": "የማህበረሰብ ተጽዕኖ",
        "Open to coordination": "ለቅንጅት ክፍት",
        "Impact signals": "የተጽዕኖ ምልክቶች",
        "What I offer": "የማቀርበው",
        "Bio": "የግል መረጃ",
        "Size": "መጠን",
        "Country": "ሀገር",
        "Website": "ድህረ ገጽ",
        "Field / sector": "መስክ / ዘርፍ",
        "Size (optional)": "መጠን (አማራጭ)",
        "Contact name": "የአድራሻ ስም",
        "Contact email": "የአድራሻ ኢሜይል",
        "Contact phone (optional)": "የአድራሻ ስልክ (አማራጭ)",
        "A few words about you and what you're working on": "ስለ እርስዎ እና እየሰሩበት ስላለው ጥቂት ቃላት",
        "Education, health, environment...": "ትምህርት፣ ጤና፣ አካባቢ...",
        "What does your organization do?": "ድርጅትዎ ምን ይሰራል?",
        "e.g. 1-10, 11-50": "ለምሳሌ 1-10, 11-50",
        "Contact person": "አድራሻ ሰው",
        "Dev sign in": "የገንቢ መግቢያ",
        "Local dev sign-in": "የአካባቢ ገንቢ መግቢያ",
        "Google OAuth is disabled on the local Supabase stack. Pick a test persona below — each option mints a real Supabase session (same as production after sign-in).": "Google OAuth በአካባቢያዊ Supabase ስታክ ላይ ተሰናክሏል። ከዚህ በታች የሙከራ ማንነት ይምረጡ — እያንዳንዱ አማራጭ እውነተኛ የSupabase ክፍለ ጊዜ ይፈጥራል (እንደ ምርት አካባቢ ከመግባት በኋላ)።",
        "Generated automatically — change if you like": "በራስ-ሰር ተፈጥሯል — ከፈለጉ ይቀይሩ",
        "Organization mission": "የድርጅቱ ተልዕኮ",
        "Community you serve": "የሚያገለግሉት ማህበረሰብ",
        "Problem you address": "የሚፈቱት ችግር",
        "Solution or method": "መፍትሔ ወይም ዘዴ",
        "Business purpose": "የንግድ ዓላማ",
        "Business values": "የንግድ እሴቶች",
        "Customers / community": "ደንበኞች / ማህበረሰብ",
        "Social or environmental problem": "ማህበራዊ ወይም አካባቢያዊ ችግር",
        "Product, service, or impact model": "ምርት፣ አገልግሎት ወይም የተጽዕኖ ሞዴል",
        "Team / company size": "የቡድን / ኩባንያ መጠን",
        "Initiative story": "የተነሳሽነት ታሪክ",
        "Values and people behind it": "እሴቶች እና ከኋላ ያሉ ሰዎች",
        "Problem or need": "ችግር ወይም ፍላጎት",
        "What you do in practice": "በተግባር የሚያደርጉት",
        "People involved": "የተሳተፉ ሰዎች",
        "Volunteer introduction": "የበጎ ፈቃደኛ መግቢያ",
        "How you like to volunteer": "እንዴት መባል እንደሚፈልጉ",
        "Preferred causes / communities": "የተመረጡ ዓላማዎች / ማህበረሰቦች",
        "Causes close to your heart": "ለልብዎ ቅርብ የሆኑ ዓላማዎች",
        "Support you can offer": "ሊያቀርቡት የሚችሉት ድጋፍ",
        "Monthly availability": "ወርሃዊ ተገኝነት",
        "Professional background": "ሙያዊ ዳራ",
        "Professional values": "ሙያዊ እሴቶች",
        "Who you can support": "ሊደግፉት የሚችሉት",
        "Challenges you can help solve": "ሊፈቱ የሚችሉ ተግዳሮቶች",
        "Services, volunteering, or forum leadership": "አገልግሎቶች፣ በጎ ፈቃደኝነት ወይም የመድረክ አመራር",
        "Availability / service model": "ተገኝነት / የአገልግሎት ሞዴል",
        "Collaboration": "ትብብር",
        "Joint Projects": "የጋራ ፕሮጀክቶች",
        "Active Account": "ንቁ መለያ",
        "Shared Content": "የተጋራ ይዘት",
        "Expert Writer": "ባለሙያ ጸሐፊ",
        "Professional Knowledge": "ሙያዊ እውቀት",
        "Leading Volunteer": "መሪ በጎ ፈቃደኛ",
        "Volunteer Hours": "የበጎ ፈቃድ ሰዓታት",
        "Active Learner": "ንቁ ተማሪ",
        "Knowledge Discovery": "የእውቀት ግኝት",
        "Community Bridge": "የማህበረሰብ ድልድይ",
        "Connections Made": "የተፈጠሩ ግንኙነቶች",
        "Documented Impact": "የተመዘገበ ተጽዕኖ",
        "Case Studies": "የጉዳይ ጥናቶች",
        "Diversity & Inclusion": "ብዝሃነት እና ማካተት",
        "Diverse Collaborations": "የተለያዩ ትብብሮች",
        "Projects created or managed in partnership": "በሽርክና የተፈጠሩ ወይም የተመሩ ፕሮጀክቶች",
        "Posts, articles, videos, and comments published": "የታተሙ ልጥፎች፣ ጽሑፎች፣ ቪዲዮዎች እና አስተያየቶች",
        "Professional posts or articles shared": "የተጋሩ ሙያዊ ልጥፎች ወይም ጽሑፎች",
        "Hours of consulting, mentoring, or activity": "የምክር፣ የአማካሪነት ወይም የእንቅስቃሴ ሰዓታት",
        "Articles, pages, and projects explored": "የተዳሱ ጽሑፎች፣ ገጾች እና ፕሮጀክቶች",
        "People and organizations introduced to one another": "እርስ በርስ የተዋወቁ ሰዎች እና ድርጅቶች",
        "Success stories with impact evidence": "ተጽዕኖ ማስረጃ ያላቸው የስኬት ታሪኮች",
        "Cross-community, cross-country, or cross-sector collaborations": "በማህበረሰቦች፣ በሀገራት ወይም በዘርፎች መካከል ያሉ ትብብሮች",
        "volunteers connected": "የተገናኙ በጎ ፈቃደኞች",
        "projects listed": "የተዘረዘሩ ፕሮጀክቶች",
        // Profile-view fallback sentences (fix/language-gap-sweep, round 2)
        "Verified organization": "የተረጋገጠ ድርጅት",
        "community impact": "የማህበረሰብ ተጽዕኖ",
        "This profile can add more field insights, measurement notes, and lessons learned as the work develops.": "ይህ መገለጫ ስራው እየዳበረ ሲሄድ ተጨማሪ የመስክ ግንዛቤዎችን፣ የመለኪያ ማስታወሻዎችን እና የተማሩ ትምህርቶችን ማከል ይችላል።",
        "Community work, partnerships, shared knowledge, and practical field-based action.": "የማህበረሰብ ስራ፣ ሽርክናዎች፣ የተጋራ እውቀት እና ተግባራዊ የመስክ እርምጃ።",
        "Open to relevant conversations and collaboration through GloWe.": "ተዛማጅ ውይይቶች እና በGloWe በኩል ለሚደረግ ትብብር ክፍት ነን።",
        "people connected through projects, opportunities, or community activity.": "በፕሮጀክቶች፣ በዕድሎች ወይም በማህበረሰብ እንቅስቃሴ የተገናኙ ሰዎች።",
        "The work responds to needs connected to ": "ስራው ከ",
        " and helps make local knowledge easier to access and act on.": " ጋር የተያያዙ ፍላጎቶች ምላሽ ይሰጣል፣ የአካባቢ እውቀትን ለማግኘት እና በተግባር ለማዋል ቀላል ያደርጋል።",
        // wishTypeStyles labels (data.js) missing from an earlier partial harvest
        "Call for Help": "የእርዳታ ጥሪ",
        "Looking for Collaboration": "ትብብር እየፈለግን ነው",
        "Support Needed": "ድጋፍ ያስፈልጋል",
        "Sharing Knowledge": "የእውቀት ልውውጥ",
        "Call for Collaboration": "ለትብብር ጥሪ",
        "Media & Visibility": "ሚዲያ እና ታይነት",
        "Project Spotlight": "የፕሮጀክት ትኩረት",
        "We're Hiring": "እየቀጠርን ነው",
        // Date-locale-bug follow-up (event type + relative-time + applied/offered labels)
        "Online": "በመስመር ላይ",
        "In person": "በአካል",
        "now": "አሁን",
        "Offered": "የቀረበበት",
        "Applied": "የተመዘገበበት",
        "Applied on": "የተመዘገበበት ቀን",
        // index.html home-page marketing copy + member-feed Opportunity badge
        "Opportunity": "ዕድል",
        "Your GloWe home": "የእርስዎ የGloWe መነሻ ገጽ",
        "GloWe was created as a home for impact communities: a place to make work visible, build trust, share multilingual knowledge, and turn local needs into collaborative action. You can arrive with a project, a question, a skill, a story, or a need. There is room for all of it.": "GloWe እንደ ተጽዕኖ ማህበረሰቦች መኖሪያ ተፈጠረ፦ ስራን ለማሳየት፣ እምነትን ለመገንባት፣ ባለብዙ ቋንቋ እውቀትን ለማጋራት እና የአካባቢ ፍላጎቶችን ወደ የጋራ እርምጃ ለመቀየር የሚያስችል ቦታ። በፕሮጀክት፣ በጥያቄ፣ በክህሎት፣ በታሪክ ወይም በፍላጎት መምጣት ይችላሉ። ለሁሉም ነገር ቦታ አለ።",
        "Our community is built around practical exchange: professional volunteers, proven solutions, multilingual knowledge, local and global collaboration, tools and resources, donor and client access, social-business integration, and peer-to-peer inspiration.": "ማህበረሰባችን በተግባራዊ ልውውጥ ላይ የተመሰረተ ነው፦ ሙያዊ በጎ ፈቃደኞች፣ የተረጋገጡ መፍትሄዎች፣ ባለብዙ ቋንቋ እውቀት፣ የአካባቢና ዓለም አቀፍ ትብብር፣ መሳሪያዎችና ሀብቶች፣ ለለጋሾችና ደንበኞች ተደራሽነት፣ የማህበራዊ ንግድ ውህደት እና ከእኩዮች የሚገኝ መነሳሳት።",
        // TD-141 — report/saved-item target-type + status enum labels
        "Wish": "ምኞት",
        "Thread": "ውይይት",
        "General": "አጠቃላይ",
        "Dismissed": "ውድቅ ተደርጓል",
        "Actioned": "እርምጃ ተወስዷል",
        // Forums page welded counts (members/posts/replies/Last active)
        "members": "አባላት",
        "replies": "ምላሾች",
        "Last active": "መጨረሻ ንቁ የነበረበት",
        "Discussion from members of ": "ውይይት ከ",
        // discussion-group.html group-stats row
        "active threads": "ንቁ ውይይቶች",
        // opportunity.html org-mission fallback text
        "This local opportunity was published by a GloWe community member and is ready for interested volunteers or collaborators.": "ይህ የአካባቢ ዕድል በGloWe ማህበረሰብ አባል የተለጠፈ ሲሆን ፍላጎት ላላቸው በጎ ፈቃደኞች ወይም ተባባሪዎች ዝግጁ ነው።",
        // connections.html title + intro + follow-ui error state
        "Connections - GloWe": "ግንኙነቶች - GloWe",
        "Followers and people this profile follows on GloWe.": "ይህ መገለጫ በGloWe ላይ የሚከተላቸው ተከታዮች እና ሰዎች።",
        "Missing user id.": "የተጠቃሚ መታወቂያ ይጎድላል።",
        // admin.html — never previously translated (moderation + health tabs)
        "Review new profile submissions, respond to reports, and monitor production health from one place.": "አዲስ የመገለጫ ማመልከቻዎችን ይገምግሙ፣ ለሪፖርቶች ምላሽ ይስጡ እና የምርት ጤናን ከአንድ ቦታ ይከታተሉ።",
        "Moderation": "ቁጥጥር",
        "System health": "የስርዓት ጤንነት",
        "Field": "መስክ",
        "Submitted": "የቀረበበት",
        "Production probes": "የምርት ምርመራዎች",
        "Read-only checks against the live GloWe site. Refreshed after each deploy and every 15 minutes.": "በቀጥታ በGloWe ጣቢያ ላይ የንባብ-ብቻ ምርመራዎች። ከእያንዳንዱ ማሰማራት በኋላ እና በየ15 ደቂቃው ይታደሳል።",
        "No data": "መረጃ የለም",
        "Refresh": "አድስ",
        "Open this tab to load probes": "ምርመራዎችን ለመጫን ይህን ትር ይክፈቱ",
        "Health data loads on demand so moderation stays fast.": "ቁጥጥሩ ፈጣን ሆኖ እንዲቆይ የጤንነት መረጃ በፍላጎት ይጫናል።",
        "Recent probe history": "የቅርብ ጊዜ የምርመራ ታሪክ",
        "Check": "ምርመራ",
        "Latency": "መዘግየት",
        "Version": "ስሪት",
        "Checked at": "የተመረመረበት ሰዓት",
        "Detail": "ዝርዝር",
        "Admin sections": "የአስተዳደር ክፍሎች",
        "Explain the decision — especially required when rejecting": "ውሳኔውን ያብራሩ — በተለይ ውድቅ ሲደረግ ያስፈልጋል",
        // registrationProfileFields publicPrompt/fundingLabel/budgetLabel for
        // business/initiative/volunteer/professional — reachable via
        // renderQuestionnaireProfile() on the Personal Area page (ngo's were
        // already covered by an earlier harvest, the other 4 types were not)
        "Open to collaborations, products, services, or CSR partnerships?": "ለትብብር፣ ምርቶች፣ አገልግሎቶች ወይም የCSR ሽርክናዎች ክፍት ነው?",
        "Business model / support sources": "የንግድ ሞዴል / የድጋፍ ምንጮች",
        "Looking for volunteers, mentors, partners, or visibility?": "በጎ ፈቃደኞችን፣ አማካሪዎችን፣ አጋሮችን ወይም ታይነትን እየፈለጉ ነው?",
        "Current support / resources": "የአሁኑ ድጋፍ / ሀብቶች",
        "Can people contact you directly through GloWe?": "ሰዎች በቀጥታ በGloWe በኩል ሊያገኙዎት ይችላሉ?",
        "Preferred communication": "የተመረጠ ግንኙነት",
        "Support needs / accessibility notes": "የድጋፍ ፍላጎቶች / የተደራሽነት ማስታወሻዎች",
        "Open to volunteering, paid services, forum leadership, or community support?": "ለበጎ ፈቃደኝነት፣ ለሚከፈልባቸው አገልግሎቶች፣ ለመድረክ አመራር ወይም ለማህበረሰብ ድጋፍ ክፍት ነው?",
        "Preferred engagement": "የተመረጠ ተሳትፎ",
        "Rates / pro-bono policy": "ዋጋዎች / የበጎ አድራጎት ፖሊሲ",
    }
};

function gloweDict() {
    return GLOWE_TRANSLATIONS[getGloweLanguage()] || null;
}

const GLOWE_I18N_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

// Opt-out marker for content that must stay verbatim in every locale — the
// language picker's endonyms above all: "עברית" stays Hebrew even while the
// rest of the page renders in Russian.
function isGloweI18nExempt(node) {
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return Boolean(el && el.closest && el.closest('[data-no-i18n]'));
}

function applyGloweTextNode(node, dict) {
    const raw = node.nodeValue;
    if (!raw) return;
    const key = raw.trim();
    const hit = key && dict[key];
    // Replace only the trimmed segment so surrounding whitespace is preserved.
    if (hit) node.nodeValue = raw.replace(key, hit);
}

function applyGloweAttrs(el, dict) {
    if (!el.hasAttribute) return;
    if (isGloweI18nExempt(el)) return;
    GLOWE_I18N_ATTRS.forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const raw = el.getAttribute(attr);
        const key = (raw || '').trim();
        const hit = key && dict[key];
        if (hit) el.setAttribute(attr, raw.replace(key, hit));
    });
}

// Translate a freshly-rendered subtree in place. Idempotent: localized text no
// longer matches an English key, so re-running is a no-op.
function translateGloweTree(root) {
    const dict = gloweDict();
    if (!dict || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
        if (!isGloweI18nExempt(root)) applyGloweTextNode(root, dict);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentNode;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (isGloweI18nExempt(node)) return NodeFilter.FILTER_REJECT;
            if (parent.nodeName === 'SCRIPT' || parent.nodeName === 'STYLE') {
                return NodeFilter.FILTER_REJECT;
            }
            // Never chrome-localize UGC fields — those are demand-translated by
            // glowe-translate.js with a per-card "Show original" toggle.
            let el = parent;
            while (el && el.nodeType === Node.ELEMENT_NODE) {
                if (el.hasAttribute && el.hasAttribute('data-tr-field')) {
                    return NodeFilter.FILTER_REJECT;
                }
                el = el.parentNode;
            }
            return node.nodeValue && node.nodeValue.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        }
    });
    const texts = [];
    let node;
    while ((node = walker.nextNode())) texts.push(node);
    texts.forEach(t => applyGloweTextNode(t, dict));
    applyGloweAttrs(root, dict);
    root.querySelectorAll('*').forEach(el => applyGloweAttrs(el, dict));
}

let gloweI18nObserver = null;
function startGloweI18nObserver() {
    if (gloweI18nObserver || !gloweDict()) return;
    // Catches content injected after first paint (modals, settings, data-driven
    // lists). Only childList is observed, so our own text edits never re-trigger.
    gloweI18nObserver = new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(n => translateGloweTree(n)));
    });
    gloweI18nObserver.observe(document.body, { childList: true, subtree: true });
}

function applyGloweDirection() {
    const lang = getGloweLanguage();
    const rtl = GLOWE_RTL_LANGS.includes(lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    // Per-language body class drives script-specific typography (Hebrew, Arabic,
    // Ethiopic) — see the typography block in css/styles.css.
    if (document.body) {
        GLOWE_LANGUAGES.forEach(l => document.body.classList.toggle('lang-' + l.code, l.code === lang));
    }
}

// <title> sits outside <body>, so the tree walker never reaches it. Without
// this the page-title keys ("Wishing Well - GloWe", …) stay unused and the
// browser tab reads English while the page itself is localized.
function translateGloweTitle() {
    const dict = gloweDict();
    const key = (document.title || '').trim();
    if (dict && key && dict[key]) document.title = dict[key];
}

function initGloweI18n() {
    applyGloweDirection();
    const reveal = function revealGloweI18n() {
        if (window.GloweBootPaint) window.GloweBootPaint.clearI18nPendingPaint();
        else if (window.GloweAuthPaint) window.GloweAuthPaint.clearI18nPendingPaint();
    };
    if (!gloweDict()) {
        reveal();
        return;
    }
    translateGloweTitle();
    translateGloweTree(document.body);
    startGloweI18nObserver();
    // Reveal on the next frame after the translated tree is committed, so the
    // first visible paint is already localized (no EN flash on tab switches).
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { requestAnimationFrame(reveal); });
    } else {
        reveal();
    }
}

function setGloweLanguage(lang) {
    if (lang === getGloweLanguage()) return;
    localStorage.setItem(GLOWE_LANG_KEY, lang);
    // A full reload re-renders every page in the new direction from a clean
    // English baseline, avoiding half-flipped layout state.
    window.location.reload();
}

// A native <select> keeps the picker keyboard- and screen-reader-accessible and
// hands mobile users the platform language list for free. Each option carries
// its own `lang` so the browser renders the endonym with the right script font.
function buildGloweLanguageSelect(className, ariaLabel) {
    const current = getGloweLanguage();
    const select = document.createElement('select');
    select.className = className;
    // Endonyms are never translated — "עברית" must stay Hebrew in every locale.
    select.setAttribute('data-no-i18n', '');
    select.setAttribute('aria-label', ariaLabel);
    GLOWE_LANGUAGES.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = l.native;
        opt.setAttribute('lang', l.code);
        if (l.code === current) opt.selected = true;
        select.appendChild(opt);
    });
    select.addEventListener('change', () => setGloweLanguage(select.value));
    return select;
}

// Header language picker — shown only for anonymous visitors.
// Logged-in users access language via the Settings page.
function injectLanguageToggle() {
    const headerEnd = ensureHeaderEnd();
    if (!headerEnd || headerEnd.querySelector('.lang-toggle')) return;
    // Trailing edge of the header-end cluster (after auth / user-menu).
    headerEnd.appendChild(buildGloweLanguageSelect('lang-toggle', 'Interface language'));
}

function removeLanguageToggle() {
    const btn = document.querySelector('.main-header .lang-toggle');
    if (btn) btn.remove();
}

// Expose on window so auth.js (loaded separately) can call these after sign-in/out.
window.injectLanguageToggle = injectLanguageToggle;
window.removeLanguageToggle = removeLanguageToggle;

// Set direction as early as app.js evaluates (it loads at end of <body>, so the
// element is present) to minimize the LTR→RTL flash on Hebrew loads.
applyGloweDirection();

// Settings page: account summary, language preference, and session controls.
function initSettingsPage() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    const loggedIn = typeof isLoggedIn === 'function' && isLoggedIn();
    if (!loggedIn) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Sign in to manage settings</h3>
                <p>Your account, language, and session options live here once you are signed in.</p>
                <button class="btn btn-primary" type="button" onclick="handleGoogleSignIn()">Sign up / Sign in</button>
            </div>
        `;
        return;
    }

    const profile = getPersonalProfile();
    const lang = getGloweLanguage();
    container.innerHTML = `
        <div class="settings-grid">
            <article class="profile-section-card">
                <div class="profile-section-heading">
                    <span>01</span>
                    <h2>Account</h2>
                </div>
                <div class="profile-info-list">
                    <p><strong>Name</strong><span>${escapeHtml(
                        (typeof GloweLocalizedName !== 'undefined')
                            ? GloweLocalizedName.localizedProfileName(profile, lang)
                            : (profile.name || 'GloWe member')
                    )}</span></p>
                    <p><strong>Email</strong><span>${escapeHtml(profile.email || 'Not available')}</span></p>
                    <p><strong>Account type</strong><span>${escapeHtml(profile.type || 'Community member')}</span></p>
                </div>
                <a class="btn btn-outline btn-small" href="my-applications.html">Open Personal Area</a>
                <button class="btn btn-primary btn-small" type="button" onclick="openEditProfile()">Edit Profile</button>
            </article>

            <article class="profile-section-card">
                <div class="profile-section-heading">
                    <span>02</span>
                    <h2>Language</h2>
                </div>
                <p class="muted-note">Choose the language for the GloWe interface. Hebrew and Arabic are shown in a right-to-left (RTL) layout.</p>
                <div class="form-group">
                    <label for="settings-language">Interface language</label>
                    <select id="settings-language" data-no-i18n onchange="setGloweLanguage(this.value)">
                        ${GLOWE_LANGUAGES.map(l => `<option value="${l.code}" lang="${l.code}"${lang === l.code ? ' selected' : ''}>${escapeHtml(l.native)}</option>`).join('')}
                    </select>
                </div>
            </article>

            <article class="profile-section-card">
                <div class="profile-section-heading">
                    <span>03</span>
                    <h2>Session</h2>
                </div>
                <p class="muted-note">End your session on this device. You can sign back in any time with Google.</p>
                <button class="btn btn-primary" type="button" onclick="logout()">Log Out</button>
            </article>

            <article class="profile-section-card">
                <div class="profile-section-heading">
                    <span>04</span>
                    <h2>Delete Account</h2>
                </div>
                <p class="muted-note">Permanently delete your GloWe profile from this community. This removes your profile details; your Google sign-in itself is not deleted, so you can sign up again later.</p>
                <div class="form-group">
                    <label for="settings-delete-confirm">Type DELETE to confirm</label>
                    <input id="settings-delete-confirm" type="text" autocomplete="off" oninput="onDeleteAccountInput()" />
                </div>
                <button id="settings-delete-btn" class="btn btn-outline" type="button" onclick="deleteAccount()" disabled>Delete Account</button>
            </article>
        </div>
    `;
}

// FR-GLOWE-011 AC10 — enable the destructive delete button only once the user
// has typed the confirmation word (validated by the pure helper).
function onDeleteAccountInput() {
    const input = document.getElementById('settings-delete-confirm');
    const btn = document.getElementById('settings-delete-btn');
    if (!input || !btn) return;
    const orgs = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const confirmed = orgs ? orgs.isDeleteAccountConfirmed(input.value) : false;
    btn.disabled = !confirmed;
}

// FR-GLOWE-011 AC10 — delete the caller's glowe_profiles row, then sign out
// locally and return to the guest home (reusing logout for the session teardown).
async function deleteAccount() {
    const backend = window.gloweBackend;
    const orgs = (typeof GloweOrganizations !== 'undefined') ? GloweOrganizations : null;
    const input = document.getElementById('settings-delete-confirm');
    if (!orgs || !orgs.isDeleteAccountConfirmed(input && input.value)) return;
    if (!backend || !backend.configured() || !isLoggedIn()) return;
    try {
        await backend.deleteProfile();
    } catch (_e) {
        if (typeof showSuccessModal === 'function') {
            showSuccessModal('Could not delete account', 'Something went wrong deleting your profile. Please try again.');
        }
        return;
    }
    await logout();
}

// Messages page (FR-GLOWE-016 AC6) — a real inbox + thread view riding on
// KC's shared public.chats / public.messages. ?chat=<id> opens a thread.
// Gate the messages surface: guests get a sign-in prompt, an unconfigured
// backend gets an explanation. Returns true when the inbox may render.
function messagesPageReady(container) {
    if (!gloweIsLoggedIn()) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Sign in to see your messages</h3>
                <p>Direct conversations with volunteers, organizations, and partners live here once you are signed in.</p>
                <button class="btn btn-primary" type="button" onclick="handleGoogleSignIn()">Sign up / Sign in</button>
            </div>
        `;
        return false;
    }
    if (!backendReady()) {
        container.innerHTML = '<div class="empty-state"><h3>Messages are unavailable</h3><p>Messaging needs a live connection right now. Please try again shortly.</p></div>';
        return false;
    }
    return true;
}

function initMessagesPage() {
    const container = document.getElementById('messages-content');
    if (!container || !messagesPageReady(container)) return;
    const chatId = new URLSearchParams(window.location.search).get('chat');
    if (chatId) {
        renderChatThread(container, chatId);
        return;
    }
    renderChatInbox(container);
}

function initConnectionsPage() {
    if (window.GloweFollowUI) window.GloweFollowUI.initConnectionsPage();
}

function chatLoadingState(container, body) {
    container.innerHTML = `<div class="empty-state"><h3>Loading…</h3><p>${body}</p></div>`;
}

function chatEmptyInboxState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <h3>No conversations yet</h3>
            <p>Reach out to an organization, offer help on a need, or message a community member — conversations will appear here.</p>
            <div class="modal-actions">
                <a class="btn btn-primary" href="organizations.html">Browse Organizations</a>
                <a class="btn btn-outline" href="wishing-well.html">Open the Wishing Well</a>
            </div>
        </div>
    `;
}

function chatCounterpartName(chat, profiles) {
    const who = profiles[chat.otherId] || {};
    return who.name || 'GloWe member';
}

function chatUnreadBadgeHtml(unread) {
    return unread ? `<span class="chat-unread-badge">${unread}</span>` : '';
}

function renderChatInboxRow(chat, profiles) {
    const name = chatCounterpartName(chat, profiles);
    const rowClass = chat.unread ? ' has-unread' : '';
    const preview = String(chat.previewText || '').slice(0, 90);
    const time = GloweMessages.formatChatTime(chat.previewAt || chat.lastMessageAt, undefined, gloweLocaleTag());
    return `
        <a class="chat-inbox-row${rowClass}" href="messages.html?chat=${encodeURIComponent(chat.chatId)}">
            ${renderEntityMark(name, 'avatar')}
            <span class="chat-inbox-main">
                <strong>${escapeHtml(name)}</strong>
                <small>${escapeHtml(preview)}</small>
            </span>
            <span class="chat-inbox-side">
                <small>${escapeHtml(time)}</small>
                ${chatUnreadBadgeHtml(chat.unread)}
            </span>
        </a>
    `;
}

async function renderChatInbox(container) {
    chatLoadingState(container, 'Fetching your conversations.');
    const backend = window.gloweBackend;
    const me = await backend.currentUser().catch(() => null);
    if (!me) return;
    const rows = await backend.kcListMyChats(200).catch(() => []);
    let chats = GloweMessages.inboxRows(rows, me.id);
    if (!chats.length) {
        chatEmptyInboxState(container);
        if (typeof refreshMessagesBadge === 'function') refreshMessagesBadge({ skipSubscribe: true });
        return;
    }
    const chatIds = chats.map(c => c.chatId);
    const [previews, unread, profiles] = await Promise.all([
        backend.kcLastMessages(chatIds).catch(() => []),
        backend.kcUnreadCounts(chatIds).catch(() => []),
        backend.kcCounterpartProfiles(chats.map(c => c.otherId)).catch(() => ({}))
    ]);
    chats = GloweMessages.attachUnread(GloweMessages.attachPreviews(chats, previews), unread);
    container.innerHTML = `<div class="chat-inbox-list">${chats.map(chat => renderChatInboxRow(chat, profiles)).join('')}</div>`;
    if (typeof refreshMessagesBadge === 'function') refreshMessagesBadge({ skipSubscribe: true });
}

// Resolve the counterpart's display identity for the thread header. Falls
// back to a generic label when the chat row or profile is unavailable.
async function resolveChatCounterpartName(backend, chatId, meId) {
    const myChats = await backend.kcListMyChats(50).catch(() => []);
    const chatRow = myChats.find(c => String(c.chat_id) === String(chatId));
    if (!chatRow) return 'GloWe member';
    const counterpartId = GloweMessages.mapChatRow(chatRow, meId).otherId;
    const profiles = await backend.kcCounterpartProfiles([counterpartId]).catch(() => ({}));
    return (profiles[counterpartId] || {}).name || 'GloWe member';
}

function renderChatBubbles(messages) {
    if (!messages.length) return '<p class="muted-note">No messages yet. Say hello!</p>';
    return messages.map(m => `
        <div class="chat-bubble${m.mine ? ' mine' : ''}${m.isSystem ? ' system' : ''}">
            <p>${escapeHtml(m.text)}</p>
            <small>${escapeHtml(GloweMessages.formatChatTime(m.createdAt, undefined, gloweLocaleTag()))}</small>
        </div>
    `).join('');
}

async function renderChatThread(container, chatId) {
    chatLoadingState(container, 'Opening the conversation.');
    const backend = window.gloweBackend;
    const me = await backend.currentUser().catch(() => null);
    if (!me) return;
    let rows;
    try {
        rows = await backend.kcGetMessages(chatId, 100);
    } catch (_e) {
        container.innerHTML = '<div class="empty-state"><h3>Conversation unavailable</h3><p>This conversation could not be opened.</p><a class="btn btn-outline" href="messages.html">Back to messages</a></div>';
        return;
    }
    const counterpartName = await resolveChatCounterpartName(backend, chatId, me.id);
    const messages = GloweMessages.mapMessageRows(rows, me.id);
    container.innerHTML = `
        <div class="chat-thread">
            <div class="chat-thread-header">
                <a class="btn btn-outline btn-small" href="messages.html">Back</a>
                <strong>${escapeHtml(counterpartName)}</strong>
            </div>
            <div class="chat-thread-messages" id="chat-thread-messages">
                ${renderChatBubbles(messages)}
            </div>
            <form class="chat-send-form" onsubmit="handleChatSend(event, '${jsString(chatId)}')">
                <input id="chat-send-input" autocomplete="off" maxlength="2000" placeholder="Write a message...">
                <button class="btn btn-primary" type="submit">Send</button>
            </form>
        </div>
    `;
    const scroller = document.getElementById('chat-thread-messages');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    backend.kcMarkChatRead(chatId).catch(() => {}).finally(() => {
        if (typeof refreshMessagesBadge === 'function') refreshMessagesBadge({ skipSubscribe: true });
    });
}

async function handleChatSend(event, chatId) {
    event.preventDefault();
    const text = fieldValue('chat-send-input');
    const check = GloweMessages.validateMessageDraft(text);
    if (!check.valid) return;
    const sent = await window.gloweBackend.kcSendMessage(chatId, text).catch(() => null);
    if (!sent) {
        showSuccessModal('Could not send', 'Something went wrong sending your message. Please try again.');
        return;
    }
    renderChatThread(document.getElementById('messages-content'), chatId);
}

// Seed the opening message of a fresh conversation; the chat still opens if
// the seed fails (the member can type it again).
async function kcSeedFirstMessage(chatId, text) {
    if (!text) return;
    await window.gloweBackend.kcSendMessage(chatId, text).catch(() => {});
}

// Open (or create) the 1:1 conversation with another member and jump straight
// into the thread. `firstMessage` (optional) seeds the conversation context.
async function startDirectChat(otherUserId, firstMessage) {
    const backend = window.gloweBackend;
    const me = await backend.currentUser();
    if (!me || String(me.id) === String(otherUserId)) return null;
    const chat = await backend.kcGetOrCreateDmChat(otherUserId);
    if (!chat) return null;
    await kcSeedFirstMessage(chat.chat_id, firstMessage);
    return chat.chat_id;
}

function messagesBadgeCount(total) {
    return total > 99 ? '99+' : String(total);
}

function applyMessagesBadge(total) {
    const anchor = document.querySelector('.user-menu .header-icon-btn[href$="messages.html"]');
    if (!anchor) return;
    const existing = anchor.querySelector('.chat-unread-badge');
    if (existing) existing.remove();
    if (!total) return;
    const badge = document.createElement('span');
    badge.className = 'chat-unread-badge';
    badge.textContent = messagesBadgeCount(total);
    badge.setAttribute('aria-label', messagesBadgeCount(total) + ' unread');
    anchor.appendChild(badge);
}

let _inboxBadgeUnsub = null;
let _inboxBadgeRefreshInFlight = false;
let _inboxBadgeRefreshQueued = false;

function stopInboxBadgeRealtime() {
    if (typeof _inboxBadgeUnsub === 'function') {
        try { _inboxBadgeUnsub(); } catch (_e) { /* ignore */ }
    }
    _inboxBadgeUnsub = null;
}

async function ensureInboxBadgeRealtime() {
    if (!backendReady() || !gloweIsLoggedIn()) {
        stopInboxBadgeRealtime();
        return;
    }
    if (_inboxBadgeUnsub || typeof window.gloweBackend.kcSubscribeInboxChanges !== 'function') return;
    _inboxBadgeUnsub = await window.gloweBackend.kcSubscribeInboxChanges(function () {
        refreshMessagesBadge({ skipSubscribe: true });
    }).catch(function () { return null; });
}

// Header unread badge (FR-GLOWE-016) — sum of unreads on inbox-visible chats
// only (excludes support / hidden threads GloWe does not list). Refreshes on
// auth change + realtime message INSERT/UPDATE (KC parity / TD-180).
async function refreshMessagesBadge(options = {}) {
    if (!backendReady() || !gloweIsLoggedIn()) {
        applyMessagesBadge(0);
        stopInboxBadgeRealtime();
        return;
    }
    if (_inboxBadgeRefreshInFlight) {
        _inboxBadgeRefreshQueued = true;
        return;
    }
    _inboxBadgeRefreshInFlight = true;
    try {
        const backend = window.gloweBackend;
        const me = await backend.currentUser().catch(() => null);
        if (!me) {
            applyMessagesBadge(0);
            return;
        }
        const rows = await backend.kcListMyChats(200).catch(() => []);
        const chats = (window.GloweMessages && GloweMessages.inboxRows)
            ? GloweMessages.inboxRows(rows, me.id)
            : [];
        if (!chats.length) {
            applyMessagesBadge(0);
        } else {
            const counts = await backend.kcUnreadCounts(chats.map(c => c.chatId)).catch(() => []);
            const withUnread = GloweMessages.attachUnread(chats, counts);
            applyMessagesBadge(GloweMessages.sumUnread(withUnread));
        }
    } finally {
        _inboxBadgeRefreshInFlight = false;
        if (_inboxBadgeRefreshQueued) {
            _inboxBadgeRefreshQueued = false;
            refreshMessagesBadge(options);
            return;
        }
    }
    if (!options.skipSubscribe) await ensureInboxBadgeRealtime();
}
window.refreshMessagesBadge = refreshMessagesBadge;

// Derive the logical page key from a pathname, tolerant of both
// extension-style URLs (local: /pages/settings.html) and clean URLs
// (Cloudflare Pages on dev/prod: /glowe/pages/settings).
function resolveGlowePage(pathname) {
    const clean = (pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '');
    // Every page except the home page lives under /pages/. Anything outside
    // that directory (the app root, with or without a trailing index.html) is
    // the home page — this holds for both local .html URLs and the clean URLs
    // Cloudflare Pages serves on dev/prod (e.g. /glowe, /glowe/pages/settings).
    if (!clean.includes('/pages/')) return 'index';
    const seg = clean.split('/').pop().replace(/\.html$/, '');
    return (!seg || seg === 'index') ? 'index' : seg;
}

// Page initialization
document.addEventListener('DOMContentLoaded', function() {
    applyGloweDirection();
    ensureGlobalUI();
    if (typeof updateAuthUI === 'function') updateAuthUI();
    normalizeMainNavigation();
    if (localStorage.getItem('gloweLowDataMode') === 'true') {
        document.body.classList.add('low-data-mode');
    }
    // Determine which page we're on and initialize accordingly
    const page = resolveGlowePage(window.location.pathname);

    if (page === 'index') {
        initFeaturedOpportunities();
    } else if (page === 'opportunities' || page === 'volunteer-network') {
        initOpportunitiesPage();
    } else if (page === 'organizations') {
        initOrganizationsPage();
    } else if (page === 'wishing-well') {
        initWishingWellPage();
    } else if (page === 'community') {
        initCommunityPage();
    } else if (page === 'write-post') {
        initWritePostPage();
    } else if (page === 'forums') {
        initForumsPage();
    } else if (page === 'saved') {
        initSavedPage();
    } else if (page === 'discussion-group') {
        initDiscussionGroupPage();
    } else if (page === 'profile') {
        initProfilePage();
    } else if (page === 'opportunity') {
        initOpportunityDetailPage();
    } else if (page === 'my-applications') {
        initMyApplicationsPage();
    } else if (page === 'admin') {
        initAdminPage();
    } else if (page === 'settings') {
        initSettingsPage();
    } else if (page === 'messages') {
        initMessagesPage();
    } else if (page === 'connections') {
        initConnectionsPage();
    }

    // Translate the now-rendered chrome + page, then watch for later injections.
    initGloweI18n();
});
