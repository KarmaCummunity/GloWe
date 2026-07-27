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
// gates: (1) unregistered "peek" visitors cannot write; (2) a rejected org
// application is view-only. Pending org applicants keep individual permissions
// until approved (migration 0242). Returns { allowed, reason }.
function gloweWriteGate() {
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        return { allowed: false, reason: 'anon' };
    }
    const profile = (typeof getPersonalProfile === 'function') ? getPersonalProfile() : {};
    const isOrg = profile.accountType === 'organization' || profile.type === 'organization';
    if (isOrg && profile.approvalStatus === 'rejected') {
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
            'Application not approved',
            'Your organization application was not approved. You can still browse GloWe, but publishing is paused. Contact support if you think this is a mistake.'
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
            'Application not approved',
            'Your organization application was not approved. You can still browse GloWe, but publishing is paused. Contact support if you think this is a mistake.'
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

function gloweReaderInterfaceLang() {
    return (typeof getGloweLanguage === 'function' ? getGloweLanguage() : 'en') || 'en';
}

function syncEnglishNameFieldVisibility(wrapId, primaryInputId, englishInputId) {
    const wrap = document.getElementById(wrapId);
    const primaryEl = document.getElementById(primaryInputId);
    if (!wrap || !primaryEl) return;
    const primary = primaryEl.value.trim();
    const show = typeof GloweLocalizedName !== 'undefined'
        && GloweLocalizedName.shouldPromptEnglishNameField(primary, gloweReaderInterfaceLang());
    wrap.hidden = !show;
    if (!show && englishInputId) {
        const englishEl = document.getElementById(englishInputId);
        if (englishEl) englishEl.value = '';
    }
}

function syncOnboardingEnglishFields() {
    syncEnglishNameFieldVisibility(
        'onboarding-display-name-en-wrap',
        'onboarding-display-name',
        'onboarding-display-name-en'
    );
    syncEnglishNameFieldVisibility(
        'onboarding-org-name-en-wrap',
        'onboarding-org-name',
        'onboarding-org-name-en'
    );
}

function syncProfileEnglishFields() {
    syncEnglishNameFieldVisibility(
        'edit-profile-name-en-wrap',
        'edit-profile-name',
        'edit-profile-name-en'
    );
    syncEnglishNameFieldVisibility(
        'edit-profile-org-name-en-wrap',
        'edit-profile-org-name',
        'edit-profile-org-name-en'
    );
    syncEnglishNameFieldVisibility(
        'edit-profile-upgrade-org-name-en-wrap',
        'edit-profile-upgrade-org-name',
        'edit-profile-upgrade-org-name-en'
    );
}

function clearGloweFieldErrors(formEl) {
    const root = formEl || document;
    root.querySelectorAll('.form-group.glowe-field-invalid').forEach(function (group) {
        group.classList.remove('glowe-field-invalid');
    });
}

function validateGloweRequiredFieldIds(fieldIds, formEl) {
    clearGloweFieldErrors(formEl);
    const invalid = [];
    (fieldIds || []).forEach(function (id) {
        const el = document.getElementById(id);
        const empty = !el || !String(el.value || '').trim();
        if (empty) {
            invalid.push(id);
            const group = el && el.closest('.form-group');
            if (group) group.classList.add('glowe-field-invalid');
        }
    });
    if (!invalid.length) return true;
    const first = document.getElementById(invalid[0]);
    if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try { first.focus({ preventScroll: true }); } catch (_) { first.focus(); }
    }
    return false;
}

function syncEditProfileUpgradeLayout() {
    const toggle = document.getElementById('edit-profile-upgrade-org-toggle');
    const fields = document.getElementById('edit-profile-upgrade-org-fields');
    const submitBtn = document.querySelector('#edit-profile-modal button[type="submit"]');
    const show = Boolean(toggle && toggle.checked);
    if (fields) fields.hidden = !show;
    if (submitBtn) {
        submitBtn.textContent = show ? 'Submit organization application' : 'Save profile';
    }
    syncProfileEnglishFields();
}

function syncOnboardingFormLayout() {
    const individualFields = document.getElementById('onboarding-individual-fields');
    const orgFields = document.getElementById('onboarding-org-fields');
    const checked = document.querySelector('input[name="onboarding-account-type"]:checked');
    const isOrg = Boolean(checked && checked.value === 'organization');
    if (individualFields) individualFields.hidden = isOrg;
    if (orgFields) orgFields.hidden = !isOrg;
    const displayNameEl = document.getElementById('onboarding-display-name');
    if (displayNameEl) displayNameEl.required = !isOrg;
    const orgNameEl = document.getElementById('onboarding-org-name');
    if (orgNameEl) orgNameEl.required = isOrg;
    const contactNameEl = document.getElementById('onboarding-org-contact-name');
    if (contactNameEl) contactNameEl.required = isOrg;
    syncOnboardingEnglishFields();
}

function wireOnboardingFormUx() {
    const form = document.getElementById('glowe-onboarding-form');
    if (!form || form.dataset.uxWired === '1') return;
    form.dataset.uxWired = '1';
    form.addEventListener('input', function (event) {
        const group = event.target && event.target.closest('.form-group.glowe-field-invalid');
        if (group) group.classList.remove('glowe-field-invalid');
        const id = event.target && event.target.id;
        if (id === 'onboarding-display-name' || id === 'onboarding-org-name') {
            syncOnboardingEnglishFields();
        }
    });
    form.querySelectorAll('input[name="onboarding-account-type"]').forEach(function (input) {
        input.addEventListener('change', syncOnboardingFormLayout);
    });
}

// Back-compat alias for inline handlers in cached HTML.
function toggleOnboardingOrgFields() {
    syncOnboardingFormLayout();
}

function openGloweOnboarding(profile) {
    ensureGlobalUI();
    wireOnboardingFormUx();
    if (!document.getElementById('glowe-onboarding-modal')) return;
    const user = (typeof getCurrentUser === 'function' && getCurrentUser()) || {};
    const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ''; };
    const personName = (profile && profile.name) || user.name || '';
    setVal('onboarding-display-name', personName);
    setVal('onboarding-display-name-en', (profile && profile.nameEn) || '');
    setVal('onboarding-country', (profile && profile.country) || '');
    setVal('onboarding-about', (profile && profile.about) || '');
    setVal('onboarding-org-name', (profile && profile.orgName) || '');
    setVal('onboarding-org-name-en', (profile && profile.orgNameEn) || '');
    setVal('onboarding-org-contact-name', (profile && profile.orgContactName) || personName);
    setVal('onboarding-org-contact-email', (profile && profile.orgContactEmail) || user.email || '');
    if (profile && profile.accountType === 'organization') {
        const orgRadio = document.querySelector('input[name="onboarding-account-type"][value="organization"]');
        if (orgRadio) orgRadio.checked = true;
    } else {
        const individualRadio = document.querySelector('input[name="onboarding-account-type"][value="individual"]');
        if (individualRadio) individualRadio.checked = true;
    }
    syncOnboardingFormLayout();
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
    const form = document.getElementById('glowe-onboarding-form');

    if (!isOrg) {
        if (!validateGloweRequiredFieldIds(['onboarding-display-name'], form)) return;
    } else if (!validateGloweRequiredFieldIds([
        'onboarding-org-name',
        'onboarding-org-description',
        'onboarding-org-contact-name',
        'onboarding-org-contact-email'
    ], form)) {
        return;
    }

    const submitBtn = document.getElementById('onboarding-submit');
    if (submitBtn) submitBtn.disabled = true;

    const contactName = val('onboarding-org-contact-name');
    const details = {
        displayName: isOrg ? contactName : val('onboarding-display-name'),
        displayNameEn: isOrg ? '' : val('onboarding-display-name-en'),
        country: isOrg ? val('onboarding-org-country') : val('onboarding-country'),
        about: isOrg ? '' : val('onboarding-about'),
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
        if (typeof syncPersonalDataFromBackend === 'function') {
            await syncPersonalDataFromBackend().catch(() => {});
        }
        if (typeof updateAuthUI === 'function') updateAuthUI();
        if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
        showSuccessModal(
            isOrg ? 'Application submitted' : "You're all set!",
            isOrg
                ? "Thanks! The GloWe team will review your organization. While you wait you can still post as an individual — opportunities and events unlock once you're approved."
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
    if (typeof backend.listPendingOrgs === 'function') {
        try {
            const orgs = await backend.listPendingOrgs();
            const count = Array.isArray(orgs) ? orgs.length : 0;
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'glowe-admin-pending-badge';
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.setAttribute('aria-label', `${count} pending organization application${count === 1 ? '' : 's'}`);
                link.appendChild(badge);
                link.title = `Admin review (${count} pending)`;
            }
        } catch (_) { /* badge is optional */ }
    }
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
                    <a href="${prefix}privacy.html">Privacy Policy</a>
                    <a href="${prefix}accessibility.html">Accessibility</a>
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

function ensureConsentBanner() {
    if (window.GloweConsent && typeof window.GloweConsent.ensure === 'function') {
        window.GloweConsent.ensure();
        return;
    }
    if (document.querySelector('script[data-glowe-consent]')) return;
    const inPages = window.location.pathname.includes('/pages/');
    const script = document.createElement('script');
    script.src = inPages ? '../js/glowe-consent.js' : 'js/glowe-consent.js';
    script.dataset.gloweConsent = '1';
    script.async = true;
    document.head.appendChild(script);
}

function ensureGlobalUI() {
    ensureLogoBrand();
    normalizeHeaderAuthButtons();
    normalizeHeaderUserMenu();
    ensureGlobalFooter();
    ensureBottomNavigation();
    ensureConsentBanner();
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
                                <div class="form-group onboarding-english-field" id="edit-profile-name-en-wrap" hidden>
                                    <label for="edit-profile-name-en">Name in English (optional)</label>
                                    <input id="edit-profile-name-en" type="text" placeholder="Latin / English display name">
                                    <small>For readers using the English interface</small>
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
                            <div id="edit-profile-upgrade-org-section" class="edit-profile-upgrade-section">
                                <h3 class="onboarding-section-title">Register as an organization</h3>
                                <p class="onboarding-review-note">Represent an NGO, nonprofit, or initiative? Submit an application for review. Until you are approved you can browse everything — publishing unlocks once approved.</p>
                                <label class="edit-profile-upgrade-toggle">
                                    <input type="checkbox" id="edit-profile-upgrade-org-toggle" onchange="syncEditProfileUpgradeLayout()">
                                    <span>I want to register my organization on GloWe</span>
                                </label>
                                <div id="edit-profile-upgrade-org-fields" hidden>
                                    <h3 class="onboarding-section-title">The organization</h3>
                                    <div class="form-grid-2">
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-name">Organization name *</label>
                                            <input id="edit-profile-upgrade-org-name" type="text" placeholder="Registered / public name">
                                        </div>
                                        <div class="form-group onboarding-english-field" id="edit-profile-upgrade-org-name-en-wrap" hidden>
                                            <label for="edit-profile-upgrade-org-name-en">Organization name in English (optional)</label>
                                            <input id="edit-profile-upgrade-org-name-en" type="text" placeholder="Organization name in English">
                                        </div>
                                    </div>
                                    <div class="form-grid-2">
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-registration">Registration / NGO number</label>
                                            <input id="edit-profile-upgrade-org-registration" type="text" placeholder="Legal registration number">
                                        </div>
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-website">Website</label>
                                            <input id="edit-profile-upgrade-org-website" type="url" placeholder="https://...">
                                        </div>
                                    </div>
                                    <div class="form-grid-2">
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-field">Field / sector *</label>
                                            <input id="edit-profile-upgrade-org-field" type="text" placeholder="Education, health, environment...">
                                        </div>
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-country">Country *</label>
                                            <input id="edit-profile-upgrade-org-country" type="text" placeholder="Country">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="edit-profile-upgrade-org-size">Size (optional)</label>
                                        <input id="edit-profile-upgrade-org-size" type="text" placeholder="e.g. 1-10, 11-50">
                                    </div>
                                    <div class="form-group">
                                        <label for="edit-profile-upgrade-org-description">About the organization *</label>
                                        <textarea id="edit-profile-upgrade-org-description" rows="4" placeholder="Mission, who you serve, and what you would do on GloWe."></textarea>
                                    </div>
                                    <h3 class="onboarding-section-title">You (contact person)</h3>
                                    <div class="form-grid-2">
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-contact-name">Contact name *</label>
                                            <input id="edit-profile-upgrade-org-contact-name" type="text" placeholder="Who we should talk to">
                                        </div>
                                        <div class="form-group">
                                            <label for="edit-profile-upgrade-org-contact-email">Contact email *</label>
                                            <input id="edit-profile-upgrade-org-contact-email" type="email" placeholder="email@example.com">
                                        </div>
                                    </div>
                                    <div class="form-group">
                                        <label for="edit-profile-upgrade-org-contact-phone">Contact phone (optional)</label>
                                        <input id="edit-profile-upgrade-org-contact-phone" type="tel" placeholder="+972...">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="edit-profile-fields-organization" hidden>
                            <h3 class="onboarding-section-title">The organization</h3>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="edit-profile-org-name">Organization name</label>
                                    <input id="edit-profile-org-name" type="text" placeholder="Organization name">
                                    <small>This is how your organization appears on GloWe</small>
                                </div>
                                <div class="form-group onboarding-english-field" id="edit-profile-org-name-en-wrap" hidden>
                                    <label for="edit-profile-org-name-en">Organization name in English (optional)</label>
                                    <input id="edit-profile-org-name-en" type="text" placeholder="Organization name in English">
                                    <small>For readers using the English interface</small>
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
                            <h3 class="onboarding-section-title">You (contact person)</h3>
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
                            <label>I'm joining as</label>
                            <div class="onboarding-type-choice">
                                <label class="onboarding-type-card">
                                    <input type="radio" name="onboarding-account-type" value="individual" checked onchange="syncOnboardingFormLayout()">
                                    <span class="onboarding-type-title">Private individual</span>
                                    <span class="onboarding-type-desc">Volunteer, donor, or community member. Full access right away.</span>
                                </label>
                                <label class="onboarding-type-card">
                                    <input type="radio" name="onboarding-account-type" value="organization" onchange="syncOnboardingFormLayout()">
                                    <span class="onboarding-type-title">Organization</span>
                                    <span class="onboarding-type-desc">NGO, nonprofit, or initiative. Reviewed before you can publish — only serious applications are accepted.</span>
                                </label>
                            </div>
                        </div>
                        <div id="onboarding-individual-fields">
                            <div class="form-group">
                                <label for="onboarding-display-name">Your name</label>
                                <input id="onboarding-display-name" type="text" required placeholder="Full name">
                            </div>
                            <div class="form-group onboarding-english-field" id="onboarding-display-name-en-wrap" hidden>
                                <label for="onboarding-display-name-en">Name in English (optional)</label>
                                <input id="onboarding-display-name-en" type="text" placeholder="Latin / English name — auto-filled if left blank">
                                <small>For readers using the English interface</small>
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
                        </div>
                        <div id="onboarding-org-fields" hidden>
                            <h3 class="onboarding-section-title">The organization</h3>
                            <p class="onboarding-review-note">Organizations are reviewed by the GloWe team. While your application is pending you can still post as an individual (needs, offers, community posts). Opportunities and events unlock once you're approved.</p>
                            <div class="form-group">
                                <label for="onboarding-org-name">Organization name *</label>
                                <input id="onboarding-org-name" type="text" placeholder="Registered / public name">
                                <small>This is how your organization appears on GloWe</small>
                            </div>
                            <div class="form-group onboarding-english-field" id="onboarding-org-name-en-wrap" hidden>
                                <label for="onboarding-org-name-en">Organization name in English (optional)</label>
                                <input id="onboarding-org-name-en" type="text" placeholder="English org name — auto-filled if blank">
                                <small>For readers using the English interface</small>
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
                                <div class="form-group">
                                    <label for="onboarding-org-field">Cause / field</label>
                                    <input id="onboarding-org-field" type="text" placeholder="Education, health, climate...">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="onboarding-org-size">Organization size</label>
                                <input id="onboarding-org-size" type="text" placeholder="Volunteers / staff, approx.">
                            </div>
                            <div class="form-group">
                                <label for="onboarding-org-description">About the organization *</label>
                                <textarea id="onboarding-org-description" rows="4" placeholder="Mission, who you serve, and what you'd do on GloWe."></textarea>
                            </div>
                            <h3 class="onboarding-section-title">You (contact person)</h3>
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label for="onboarding-org-contact-name">Your name *</label>
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
        wireOnboardingFormUx();
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

    if (!document.getElementById('post-detail-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="post-detail-modal" class="modal">
                <div class="modal-content modal-wide" id="post-detail-content"></div>
            </div>
        `);
    }

    if (!document.getElementById('edit-post-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="edit-post-modal" class="modal">
                <div class="modal-content">
                    <span class="close-modal" onclick="closeModal('edit-post-modal')">&times;</span>
                    <h2>Edit your post</h2>
                    <p class="modal-intro">Update the title, topic, or body. Changes appear on the community feed right away.</p>
                    <form onsubmit="handleEditCommunityPostSubmit(event)">
                        <input id="edit-post-id" type="hidden" value="">
                        <div class="form-group">
                            <label for="edit-post-title">Title</label>
                            <input id="edit-post-title" type="text" required placeholder="What do you want the community to notice?">
                        </div>
                        <div class="form-group">
                            <label for="edit-post-category">Topic</label>
                            <input id="edit-post-category" type="text" placeholder="Education, Climate, Health">
                        </div>
                        <div class="form-group">
                            <label for="edit-post-text">Post</label>
                            <textarea id="edit-post-text" rows="5" required placeholder="Share an update, a story, or knowledge with the community."></textarea>
                        </div>
                        <div class="form-group">
                            <label for="edit-post-tags">Tags</label>
                            <input id="edit-post-tags" type="text" placeholder="Education, Climate, Health">
                        </div>
                        <button class="btn btn-primary btn-block" type="submit">Update Post</button>
                    </form>
                </div>
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
    const upgradeSection = document.getElementById('edit-profile-upgrade-org-section');
    if (individualPanel) individualPanel.hidden = isOrg;
    if (orgPanel) orgPanel.hidden = !isOrg;
    if (upgradeSection) upgradeSection.hidden = isOrg;

    const upgradeToggle = document.getElementById('edit-profile-upgrade-org-toggle');
    if (upgradeToggle) upgradeToggle.checked = false;
    syncEditProfileUpgradeLayout();

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
        const upgradeContactName = document.getElementById('edit-profile-upgrade-org-contact-name');
        if (upgradeContactName) upgradeContactName.value = profile.orgContactName || profile.name || '';
        const upgradeContactEmail = document.getElementById('edit-profile-upgrade-org-contact-email');
        if (upgradeContactEmail) {
            const user = (typeof getCurrentUser === 'function' && getCurrentUser()) || {};
            upgradeContactEmail.value = profile.orgContactEmail || user.email || '';
        }
        const upgradeCountry = document.getElementById('edit-profile-upgrade-org-country');
        if (upgradeCountry) upgradeCountry.value = profile.country || '';
    }
    wireEditProfileFormUx();
    syncProfileEnglishFields();
    openModal('edit-profile-modal');
}

function wireEditProfileFormUx() {
    const form = document.querySelector('#edit-profile-modal form');
    if (!form || form.dataset.uxWired === '1') return;
    form.dataset.uxWired = '1';
    form.addEventListener('input', function (event) {
        const group = event.target && event.target.closest('.form-group.glowe-field-invalid');
        if (group) group.classList.remove('glowe-field-invalid');
        const id = event.target && event.target.id;
        if (id === 'edit-profile-name' || id === 'edit-profile-org-name'
            || id === 'edit-profile-upgrade-org-name') {
            syncProfileEnglishFields();
        }
    });
    const upgradeToggle = document.getElementById('edit-profile-upgrade-org-toggle');
    if (upgradeToggle) {
        upgradeToggle.addEventListener('change', syncEditProfileUpgradeLayout);
    }
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
    const upgradeToggle = document.getElementById('edit-profile-upgrade-org-toggle');
    const wantsOrgUpgrade = !isOrg && Boolean(upgradeToggle && upgradeToggle.checked);

    if (wantsOrgUpgrade) {
        const upgradeForm = document.querySelector('#edit-profile-modal form');
        if (!validateGloweRequiredFieldIds([
            'edit-profile-upgrade-org-name',
            'edit-profile-upgrade-org-description',
            'edit-profile-upgrade-org-field',
            'edit-profile-upgrade-org-country',
            'edit-profile-upgrade-org-contact-name',
            'edit-profile-upgrade-org-contact-email'
        ], upgradeForm)) {
            return;
        }
        if (!(window.gloweBackend && window.gloweBackend.configured()
              && typeof window.gloweBackend.completeOnboarding === 'function')) {
            showToast('Organization applications are unavailable right now. Please try again later.', { error: true });
            return;
        }
        const contactName = val('edit-profile-upgrade-org-contact-name');
        const details = {
            displayName: contactName,
            displayNameEn: '',
            country: val('edit-profile-upgrade-org-country'),
            about: '',
            accountType: 'organization',
            org: {
                name: val('edit-profile-upgrade-org-name'),
                nameEn: val('edit-profile-upgrade-org-name-en'),
                registrationNumber: val('edit-profile-upgrade-org-registration'),
                website: val('edit-profile-upgrade-org-website'),
                country: val('edit-profile-upgrade-org-country'),
                field: val('edit-profile-upgrade-org-field'),
                size: val('edit-profile-upgrade-org-size'),
                description: val('edit-profile-upgrade-org-description'),
                contactName,
                contactEmail: val('edit-profile-upgrade-org-contact-email'),
                contactPhone: val('edit-profile-upgrade-org-contact-phone')
            }
        };
        try {
            const profile = await window.gloweBackend.completeOnboarding(details);
            if (profile) {
                localStorage.setItem(PERSONAL_PROFILE_KEY, JSON.stringify(profile));
                if (typeof getCurrentUser === 'function') {
                    const current = getCurrentUser() || {};
                    localStorage.setItem('gloweUser', JSON.stringify({
                        ...current,
                        name: profile.name || current.name,
                        type: profile.type || current.type
                    }));
                }
            }
            closeModal('edit-profile-modal');
            if (typeof syncPersonalDataFromBackend === 'function') {
                await syncPersonalDataFromBackend().catch(() => {});
            }
            if (typeof updateAuthUI === 'function') updateAuthUI();
            if (typeof window.renderPersonalArea === 'function') window.renderPersonalArea();
            showSuccessModal(
                'Application submitted',
                "Thanks! The GloWe team will review your organization. While you wait you can still post as an individual — opportunities and events unlock once you're approved."
            );
        } catch (error) {
            showToast((error && error.message) || 'Could not submit your organization application.', { error: true });
        }
        return;
    }

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

// Unified ⋯ menu for feed cards (community posts + home discovery).
// Order: Save → Share → Open → (Edit|Delete for owner) → (Message|Report for others).
// fallow-ignore-next-line complexity
function feedCardMoreMenuHtml(opts) {
    const o = opts || {};
    const parts = [];
    if (o.saveHtml) parts.push(o.saveHtml);
    if (o.shareTitle != null) {
        parts.push(
            `<button type="button" class="post-menu-action" onclick="sharePost('${jsString(o.shareTitle)}', '${jsString(o.shareHref || '')}')">Share</button>`
        );
    }
    if (o.viewHref) {
        const viewClick = o.viewOnclick
            ? ` onclick="event.preventDefault(); ${o.viewOnclick}"`
            : '';
        parts.push(
            `<a class="post-menu-action" href="${escapeHtml(o.viewHref)}"${viewClick}>Open</a>`
        );
    }
    if (o.ownsItem) {
        if (o.editOnclick) {
            parts.push(
                `<button type="button" class="post-menu-action" onclick="${o.editOnclick}">Edit post</button>`
            );
        }
        if (o.deleteOnclick) {
            parts.push(
                `<button type="button" class="post-menu-action post-delete-action" onclick="${o.deleteOnclick}">Delete post</button>`
            );
        }
    } else {
        if (o.authorId) {
            parts.push(
                `<button type="button" class="post-menu-action" onclick="openPrivateMessage('${jsString(o.authorName || '')}', '${jsString(o.authorId)}')">Message</button>`
            );
        }
        if (o.reportType && o.reportId != null) {
            parts.push(
                `<button type="button" class="post-menu-action" onclick="openReportModal('${jsString(o.reportType)}', '${jsString(o.reportId)}', '${jsString(o.reportTitle || '')}')">Report</button>`
            );
        }
    }
    return parts.join('\n                        ');
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

function communityPostDeepLinkId() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('post');
    if (fromQuery) return String(fromQuery);
    const hash = String(window.location.hash || '').replace(/^#/, '');
    if (hash.startsWith('post-')) return hash.slice(5);
    return '';
}

function communityPostDetailHref(postId, pageBase) {
    const base = pageBase || '';
    return `${base}community.html?post=${encodeURIComponent(String(postId || ''))}`;
}

function focusCommunityPost(postId) {
    const id = String(postId || '');
    if (!id) return false;
    expandPostComments(id);
    const el = document.getElementById('post-' + id);
    if (!el) return false;
    revealPostComments(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
}

function scheduleFocusCommunityPost(postId) {
    const id = String(postId || '');
    if (!id) return;
    let attempts = 0;
    function tryFocus() {
        attempts += 1;
        if (focusCommunityPost(id) || attempts >= 10) return;
        setTimeout(tryFocus, 100);
    }
    requestAnimationFrame(tryFocus);
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

// FR-GLOWE-016 AC2 — open a community post from the home discovery feed without
// losing context on a bare Community tab navigation.
// fallow-ignore-next-line complexity
function openCommunityPostDetail(postId) {
    ensureGlobalUI();
    const id = String(postId || '');
    const base = gloweePagePrefix();
    const post = findCommunityPostById(id);
    if (!post) {
        window.location.assign(communityPostDetailHref(id, base));
        return;
    }
    const content = document.getElementById('post-detail-content');
    if (!content) {
        window.location.assign(communityPostDetailHref(id, base));
        return;
    }
    const authorPair = authorNamePairFrom(post);
    const authorName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedAuthorName(post, gloweReaderLang(), 'Community Member')
        : (post.authorName || 'Community Member');
    const postIdSafe = post.id || getPostId(post);
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const tagsHtml = tags.length
        ? `<div class="post-tag-row">${tags.map((tag, i) =>
            `<span data-tr-field="tags.${i}" title="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
        ).join('')}</div>`
        : '';
    const communityLink = communityPostDetailHref(postIdSafe, base);
    const commentCount = getPostCommentsFor(postIdSafe).length;
    content.innerHTML = `
        <button class="close-modal" type="button" aria-label="Close post" onclick="closeModal('post-detail-modal')">&times;</button>
        <div class="wish-detail-scroll post-detail-scroll" data-tr-card data-tr-type="glowe_post" data-tr-id="${escapeHtml(String(postIdSafe))}">
            <div class="wish-detail-hero">
                <span class="post-type-tag" title="${escapeHtml(glowePostTypeLabel(post.category))}">${escapeHtml(glowePostTypeLabel(post.category))}</span>
                <h2 data-tr-field="title">${escapeHtml(post.title)}</h2>
                <span class="wish-author">
                    ${renderLocalizedEntityMark(authorPair.primary, authorPair.english, authorName, 'avatar')}
                    <span ${bilingualNameAttrs(authorPair.primary, authorPair.english)}>${escapeHtml(authorName)}</span>
                    <small>${post.createdAt ? new Date(post.createdAt).toLocaleDateString(gloweLocaleTag()) : gloweText('now')}</small>
                </span>
            </div>
            ${translationToggleSlotHtml()}
            <p class="wish-detail-description" data-tr-field="text">${escapeHtml(post.text)}</p>
            ${tagsHtml}
            <div class="card-actions wish-detail-actions">
                <a class="btn btn-primary" href="${escapeHtml(communityLink)}">${escapeHtml(gloweText('Enter Community'))}</a>
                <button class="btn btn-outline" type="button" onclick="closeModal('post-detail-modal')">${escapeHtml(gloweText('Close'))}</button>
            </div>
            ${commentCount ? `<p class="muted-note">${escapeHtml(formatCommentCount(commentCount))}</p>` : ''}
        </div>
    `;
    openModal('post-detail-modal');
    if (typeof translateGloweTree === 'function') translateGloweTree(content);
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
    await refreshCommunityPostSurfaces(postId, { removed: true });
    showActionToast('Post deleted', 'Your post was removed from the community feed.');
}

// FR-GLOWE-008 AC10 — open the edit modal for a post the viewer owns.
function openEditCommunityPost(postId) {
    ensureGlobalUI();
    if (!canCreateContent('create-post')) return;
    const id = String(postId || '');
    const post = findCommunityPostById(id);
    if (!post) {
        showSuccessModal('Could not update', 'This post could not be loaded for editing.');
        return;
    }
    const viewer = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const ownsPost = (typeof GlowePosts !== 'undefined')
        ? GlowePosts.isPostOwner(post, viewer && viewer.id)
        : Boolean(viewer && viewer.id && String(post.authorId) === String(viewer.id));
    if (!ownsPost) {
        showSuccessModal('Could not update', 'Only the author can edit this post.');
        return;
    }
    document.getElementById('edit-post-id').value = id;
    document.getElementById('edit-post-title').value = post.title || '';
    document.getElementById('edit-post-category').value = post.category || '';
    document.getElementById('edit-post-text').value = post.text || '';
    document.getElementById('edit-post-tags').value = Array.isArray(post.tags) ? post.tags.join(', ') : '';
    openModal('edit-post-modal');
    if (typeof translateGloweTree === 'function') {
        translateGloweTree(document.getElementById('edit-post-modal'));
    }
}

async function handleEditCommunityPostSubmit(event) {
    event.preventDefault();
    const id = (document.getElementById('edit-post-id').value || '').trim();
    if (!id) return;
    const draft = {
        title: document.getElementById('edit-post-title').value,
        category: document.getElementById('edit-post-category').value,
        text: document.getElementById('edit-post-text').value,
        tags: document.getElementById('edit-post-tags').value
    };
    const ok = await updateCommunityPost(id, draft);
    if (!ok) return;
    closeModal('edit-post-modal');
    showActionToast('Post updated', 'Your post changes were saved.');
}

// Persist an owner edit to glowe_posts (FR-GLOWE-008 AC10).
async function updateCommunityPost(postId, draft) {
    const helpers = (typeof GlowePosts !== 'undefined') ? GlowePosts : null;
    const check = helpers ? helpers.validatePostDraft(draft) : { valid: Boolean(draft && draft.title) };
    if (!check.valid) {
        showSuccessModal('Missing details', check.error || 'Please complete the post before saving.');
        return false;
    }
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) {
        showSuccessModal('Backend unavailable', 'Posts need a live connection right now. Please try again shortly.');
        return false;
    }
    const patch = helpers ? helpers.normalizePostUpdatePatch(draft) : draft;
    try {
        const row = await backend.updateOwned('posts', postId, patch);
        if (!row) {
            showSuccessModal('Could not update', 'Something went wrong updating your post. Please try again.');
            return false;
        }
        const mapped = helpers ? helpers.mapPostRow(row) : null;
        if (mapped) {
            const idx = communityPosts.findIndex(function (p) {
                return String(p.id || getPostId(p)) === String(postId);
            });
            if (idx >= 0) communityPosts[idx] = mapped;
            else communityPosts.unshift(mapped);
        }
        await refreshCommunityPostSurfaces(postId, { removed: false });
        return true;
    } catch (_e) {
        showSuccessModal('Could not update', 'Something went wrong updating your post. Please try again.');
        return false;
    }
}

// After create/edit/delete, refresh whichever surface is showing the post.
async function refreshCommunityPostSurfaces(postId, options) {
    const removed = Boolean(options && options.removed);
    if (document.getElementById('community-feed') && typeof initCommunityPage === 'function') {
        await initCommunityPage();
        return;
    }
    if (removed) {
        const ids = ['post-' + postId, 'home-post-' + postId];
        ids.forEach(function (elId) {
            const el = document.getElementById(elId);
            if (el) el.remove();
        });
        return;
    }
    refreshHomeFeedPostCard(postId);
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
        profileType: profile.type || 'Organization',
        type: profile.orgField || profile.focus || profile.type || 'Organization',
        mission: profile.orgDescription || profile.about || '',
        missionField: profile.orgDescription ? 'org_description' : 'about',
        location: profile.orgCountry || profile.location || '',
        scope: profile.country || '',
        country: profile.orgCountry || profile.country || '',
        volunteers: 0,
        impactArea: profile.focus || '',
        focus: profile.focus || profile.orgField || '',
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

// Compact feed cards need a visible body snippet — not only "Read more".
function postFeedDisplayParts(post, options) {
    const compact = Boolean(options && options.compact);
    const title = String(post.title || '').trim();
    const text = String(post.text || '').trim();
    const truncFn = (typeof GlowePosts !== 'undefined' && GlowePosts.truncateCommentPreview)
        ? GlowePosts.truncateCommentPreview
        : function (value, maxLen) {
            const raw = String(value == null ? '' : value).trim();
            const limit = Math.max(1, Number(maxLen) || 120);
            if (raw.length <= limit) return raw;
            return raw.slice(0, limit).trim() + '…';
        };
    const excerptLimit = compact ? 200 : 280;
    if (title && text) {
        return {
            title,
            excerpt: truncFn(text, excerptLimit),
            excerptField: 'text',
            showReadMore: compact
        };
    }
    if (text) {
        return {
            title: '',
            excerpt: compact ? truncFn(text, excerptLimit) : text,
            excerptField: 'text',
            showReadMore: compact && text.length > 48
        };
    }
    if (title) {
        return {
            title: compact ? '' : title,
            excerpt: compact ? truncFn(title, excerptLimit) : '',
            excerptField: 'title',
            showReadMore: compact && title.length > 48
        };
    }
    return { title: '', excerpt: '', excerptField: 'text', showReadMore: false };
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

// Elements marked data-i18n carry a stable English dictionary key; resolve at
// runtime so labels stay localized even when locale JSON was cached stale.
function applyGloweDataI18n(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
        if (isGloweI18nExempt(el)) return;
        const key = (el.getAttribute('data-i18n') || '').trim();
        if (!key) return;
        el.textContent = gloweText(key);
    });
}

function mountGloweListFilters(rootId, presetKey, hooks) {
    const root = document.getElementById(rootId);
    if (!root || typeof GloweListFilters === 'undefined' || !GloweListFilters.presets || !GloweListFilters.presets[presetKey]) return null;
    const config = GloweListFilters.presets[presetKey]();
    root.innerHTML = GloweListFilters.renderPanel(config);
    const panel = root.querySelector('.glowe-filter-panel');
    if (!panel) return null;
    return GloweListFilters.mount(panel, config, hooks);
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
function renderPostCard(post, pageBase, options) {
    const base = pageBase || '';
    const compact = Boolean(options && options.compact);
    const authorPair = authorNamePairFrom(post);
    const authorName = (typeof GloweLocalizedName !== 'undefined')
        ? GloweLocalizedName.localizedAuthorName(post, gloweReaderLang(), 'Community Member')
        : (post.authorName || 'Community Member');
    const profileHref = post.authorId ? `${base}profile.html?id=${post.authorId}` : '#';
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const postId = post.id || getPostId(post);
    const comments = getPostCommentsFor(postId);
    const commentsExpanded = isPostCommentsExpanded(postId);
    const viewer = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const ownsPost = (typeof GlowePosts !== 'undefined')
        ? GlowePosts.isPostOwner(post, viewer && viewer.id)
        : Boolean(viewer && viewer.id && String(post.authorId) === String(viewer.id));
    const tagsHtml = (!compact && tags.length)
        ? `<div class="post-tag-row">${tags.map((tag, i) =>
            `<span data-tr-field="tags.${i}" title="${escapeHtml(tag)}">${escapeHtml(tag)}</span>`
        ).join('')}</div>`
        : '';
    const leadComment = comments[0];
    const extraComments = comments.slice(1);
    const leadHtml = (!compact && leadComment)
        ? renderPostCommentRow(leadComment, { lead: true, postId, openOnClick: !commentsExpanded })
        : '';
    const extraHtml = (!compact && extraComments.length)
        ? `<div class="comment-thread-extra">${extraComments.map((c) => renderPostCommentRow(c, { postId })).join('')}</div>`
        : '';
    const moreCommentsHtml = (!compact && comments.length > 1)
        ? `<button type="button" class="comment-thread-toggle" onclick="openPostComments('${postId}')">${escapeHtml(gloweText('See all comments'))}</button>`
        : '';
    const detailHref = communityPostDetailHref(postId, base);
    const sharePath = detailHref;
    const menuHtml = feedCardMoreMenuHtml({
        saveHtml: savedToggleButtonHtml('post', postId, post.title, post.category, detailHref, 'Save', 'post-menu-action'),
        shareTitle: post.title,
        shareHref: sharePath,
        viewHref: detailHref,
        viewOnclick: `openCommunityPostDetail('${jsString(postId)}')`,
        authorId: post.authorId || '',
        authorName: authorName,
        reportType: 'post',
        reportId: postId,
        reportTitle: post.title,
        ownsItem: ownsPost,
        editOnclick: `openEditCommunityPost('${jsString(postId)}')`,
        deleteOnclick: `deleteCommunityPost('${jsString(postId)}')`
    });
    const collapsedClass = commentsExpanded ? ' is-expanded' : ' is-collapsed';
    const feedParts = postFeedDisplayParts(post, options);
    const readMoreHtml = compact && feedParts.showReadMore
        ? `<a class="post-read-more" href="${escapeHtml(detailHref)}" onclick="event.preventDefault(); openCommunityPostDetail('${jsString(postId)}')">${escapeHtml(gloweText('Read more'))}</a>`
        : '';
    const compactTitleHtml = feedParts.title
        ? `<h3 data-tr-field="title"><a class="home-feed-title-link" href="${escapeHtml(detailHref)}" onclick="event.preventDefault(); openCommunityPostDetail('${jsString(postId)}')">${escapeHtml(feedParts.title)}</a></h3>`
        : '';
    const compactExcerptHtml = feedParts.excerpt
        ? `<p class="post-card-excerpt" data-tr-field="${escapeHtml(feedParts.excerptField)}">${escapeHtml(feedParts.excerpt)}</p>`
        : '';
    const engagementHtml = comments.length > 0
        ? `<div class="post-engagement-row">
                <button type="button" class="comment-summary" aria-live="polite" onclick="openPostComments('${postId}')">${formatCommentCount(comments.length)}</button>
            </div>`
        : '';
    const cardClass = compact ? 'post-card post-card--feed' : 'post-card';
    return `
        <article class="${cardClass}" id="post-${postId}" data-tr-card data-tr-type="glowe_post" data-tr-id="${postId}">
            <div class="post-card-header">
                <a class="post-author" href="${profileHref}">
                    ${renderLocalizedEntityMark(authorPair.primary, authorPair.english, authorName, 'avatar')}
                    <span>
                        <strong ${bilingualNameAttrs(authorPair.primary, authorPair.english)}>${escapeHtml(authorName)}</strong>
                        <small>${post.createdAt ? new Date(post.createdAt).toLocaleDateString(gloweLocaleTag()) : gloweText('now')}</small>
                    </span>
                </a>
                <span class="post-type-tag" title="${escapeHtml(glowePostTypeLabel(post.category))}">${escapeHtml(glowePostTypeLabel(post.category))}</span>
                <details class="post-more-menu">
                    <summary aria-label="More post actions">...</summary>
                    <div class="post-more-panel">
                        ${menuHtml}
                    </div>
                </details>
            </div>
            ${translationToggleSlotHtml()}
            ${compact ? `<div class="post-card-body">
                ${compactTitleHtml}
                ${compactExcerptHtml}
                ${readMoreHtml}
            </div>` : `<h3 data-tr-field="title">${escapeHtml(post.title)}</h3>
            <p data-tr-field="text">${escapeHtml(post.text)}</p>
            ${tagsHtml}`}
            ${engagementHtml}
            <div class="post-comments${collapsedClass}" id="comments-${postId}">
                ${leadHtml}
                ${extraHtml}
                ${moreCommentsHtml}
                <form class="comment-form" onsubmit="handlePostComment(event, '${postId}')">
                    <input id="comment-input-${postId}" aria-label="${escapeHtml(gloweText('Write a thoughtful comment...'))}" placeholder="${escapeHtml(gloweText('Write a thoughtful comment...'))}" required onfocus="revealPostComments('${postId}')">
                    <div class="comment-form-actions">
                        <button type="button" class="comment-send-chat" onclick="openPrivateMessage('${jsString(authorName)}', '${jsString(post.authorId || '')}')" aria-label="${escapeHtml(gloweText('Send'))}" title="${escapeHtml(gloweText('Send'))}">${SEND_ICON_SVG}</button>
                        <button type="submit">${escapeHtml(gloweText('Post'))}</button>
                    </div>
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
    if (document.getElementById('community-feed')) {
        initCommunityPage();
    } else {
        refreshHomeFeedPostCard(postId);
    }
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

// fallow-ignore-next-line complexity
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
        const HF = window.GloweHomeFeed;
        const peekLimit = HF ? HF.GUEST_PREVIEW_LIMIT : 10;
        const ranked = await loadRankedHomeFeed(peekLimit, 0);
        if (gen !== _gloweHomeGen) return;
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

function findCommunityPostById(postId) {
    const id = String(postId || '');
    return getAllCommunityPosts().find(function (p) {
        return String(p.id || getPostId(p)) === id;
    }) || null;
}

// fallow-ignore-next-line complexity
function refreshHomeFeedPostCard(postId) {
    const el = document.getElementById('post-' + postId);
    if (!el || !el.closest('#home-feed-grid')) return;
    const root = el.closest('#member-home') || el.closest('#guest-home-feed');
    const post = findCommunityPostById(postId);
    if (!post) return;
    el.outerHTML = renderPostCard(post, 'pages/', { compact: true });
    if (root) scheduleMemberHomeTranslation(root);
}

// fallow-ignore-next-line complexity
function renderHomeFeedCard(item) {
    const HF = window.GloweHomeFeed;
    const kind = (item && item.kind) || 'post';
    const id = (item && item.id) || '';
    if (kind === 'post') {
        const post = findCommunityPostById(id);
        if (post) return renderPostCard(post, 'pages/', { compact: true });
    }
    return renderHomeDiscoveryCard(item);
}

// fallow-ignore-next-line complexity
function homeFeedSaveType(kind) {
    if (kind === 'opportunity' || kind === 'event') return 'opportunity';
    if (kind === 'wish' || kind === 'volunteer_offer') return 'wish';
    if (kind === 'forum_thread' || kind === 'forum_group') return 'forum';
    return 'post';
}

function homeFeedLocalizedText(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return gloweText(raw);
}

// Home discovery card for non-community kinds (wish / opportunity / forum…).
// fallow-ignore-next-line complexity
function renderHomeDiscoveryCard(item) {
    const HF = window.GloweHomeFeed;
    const kind = (item && item.kind) || 'post';
    const id = (item && item.id) || '';
    const href = (item && item.hrefPath) || (HF ? HF.defaultHref(kind, id, item) : '#');
    const tag = gloweText((item && item.tagKey) || 'Post');
    const isCatalog = kind === 'forum_group';
    const titleRaw = (item && item.title) || 'GloWe';
    const snippetRaw = (item && item.snippet) || '';
    // Forum groups are admin chrome (seeded EN keys in GLOWE_TRANSLATIONS) — not UGC.
    const title = isCatalog ? homeFeedLocalizedText(titleRaw) : titleRaw;
    const snippet = isCatalog ? homeFeedLocalizedText(snippetRaw) : snippetRaw;
    const authorRaw = (item && item.authorLabel) || 'GloWe Member';
    const authorName = homeFeedLocalizedText(authorRaw) || authorRaw;
    const authorId = (item && item.authorId) || '';
    const createdAt = (item && item.createdAt) || '';
    const dateLabel = createdAt
        ? new Date(createdAt).toLocaleDateString(gloweLocaleTag())
        : gloweText('now');
    const profileHref = authorId ? `pages/profile.html?id=${encodeURIComponent(authorId)}` : href;
    const authorPair = { primary: authorName, english: '' };
    const trType = isCatalog
        ? ''
        : (kind === 'opportunity' || kind === 'event')
            ? 'glowe_opportunity'
            : kind === 'forum_thread'
                ? 'glowe_forum_thread'
                : (kind === 'wish' || kind === 'volunteer_offer')
                    ? 'glowe_post'
                    : 'glowe_post';
    const field = (kind === 'opportunity' || kind === 'event')
        ? 'description'
        : (kind === 'forum_thread' ? 'body' : 'text');
    const saveType = homeFeedSaveType(kind);
    const cardId = `home-${kind}-${id}`;
    const saveBtn = typeof savedToggleButtonHtml === 'function'
        ? savedToggleButtonHtml(saveType, id, titleRaw, tag, href, 'Save', 'post-menu-action')
        : '';
    const trAttrs = isCatalog
        ? ''
        : ` data-tr-card data-tr-type="${trType}" data-tr-id="${escapeHtml(String(id))}"`;
    const titleField = isCatalog ? '' : ' data-tr-field="title"';
    const bodyField = isCatalog ? '' : ` data-tr-field="${field}"`;
    const trSlot = isCatalog ? '' : (typeof translationToggleSlotHtml === 'function' ? translationToggleSlotHtml() : '');
    const postLabel = escapeHtml(gloweText('Post'));
    const commentPlaceholder = escapeHtml(gloweText('Write a thoughtful comment...'));
    const isWishKind = kind === 'wish' || kind === 'volunteer_offer';
    const detailClick = isWishKind
        ? ` onclick="event.preventDefault(); openWishDetail('${jsString(id)}')"`
        : (kind === 'post' ? ` onclick="event.preventDefault(); openCommunityPostDetail('${jsString(id)}')"` : '');
    const menuHtml = typeof feedCardMoreMenuHtml === 'function'
        ? feedCardMoreMenuHtml({
            saveHtml: saveBtn,
            shareTitle: titleRaw,
            shareHref: href,
            viewHref: href,
            viewOnclick: isWishKind
                ? `openWishDetail('${jsString(id)}')`
                : (kind === 'post' ? `openCommunityPostDetail('${jsString(id)}')` : ''),
            authorId: authorId,
            authorName: authorName,
            reportType: saveType,
            reportId: id,
            reportTitle: titleRaw,
            ownsItem: false
        })
        : saveBtn;
    return `
        <article class="post-card post-card--feed home-feed-discovery-card" id="${escapeHtml(cardId)}"${trAttrs} data-feed-kind="${escapeHtml(kind)}">
            <div class="post-card-header">
                <a class="post-author" href="${escapeHtml(profileHref)}">
                    ${renderLocalizedEntityMark(authorPair.primary, authorPair.english, authorName, 'avatar')}
                    <span>
                        <strong ${bilingualNameAttrs(authorPair.primary, authorPair.english)}>${escapeHtml(authorName)}</strong>
                        <small>${escapeHtml(dateLabel)}</small>
                    </span>
                </a>
                <span class="post-type-tag" title="${escapeHtml(tag)}">${escapeHtml(tag)}</span>
                <details class="post-more-menu">
                    <summary aria-label="More post actions">...</summary>
                    <div class="post-more-panel">
                        ${menuHtml}
                    </div>
                </details>
            </div>
            ${trSlot}
            <div class="post-card-body">
                <h3${titleField}><a class="home-feed-title-link" href="${escapeHtml(href)}"${detailClick}>${escapeHtml(title)}</a></h3>
                <p class="post-card-excerpt"${bodyField}>${escapeHtml(snippet)}</p>
                <a class="post-read-more" href="${escapeHtml(href)}"${detailClick}>${escapeHtml(gloweText('Read more'))}</a>
            </div>
            <div class="post-comments is-expanded">
                <form class="comment-form" onsubmit="handleHomeDiscoveryEngage(event, '${jsString(kind)}', '${jsString(id)}', '${jsString(authorName)}', '${jsString(authorId)}', '${jsString(href)}')">
                    <input aria-label="${commentPlaceholder}" placeholder="${commentPlaceholder}" required>
                    <div class="comment-form-actions">
                        <button type="button" class="comment-send-chat" onclick="openPrivateMessage('${jsString(authorName)}', '${jsString(authorId)}')" aria-label="${escapeHtml(gloweText('Send'))}" title="${escapeHtml(gloweText('Send'))}"${authorId ? '' : ' disabled'}>${SEND_ICON_SVG}</button>
                        <button type="submit">${postLabel}</button>
                    </div>
                </form>
            </div>
        </article>`;
}

// fallow-ignore-next-line complexity
function handleHomeDiscoveryEngage(event, kind, id, authorName, authorId, href) {
    event.preventDefault();
    const input = event.target && event.target.querySelector('input');
    const note = input && input.value ? String(input.value).trim() : '';
    if (authorId) {
        openPrivateMessage(authorName || 'this member', authorId);
        if (input) input.value = '';
        return;
    }
    if (href) window.location.href = href;
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
            <section class="member-section member-home-community linkedin-community-layout">
                <div class="section-toolbar">
                    <div><h2>What is happening on GloWe</h2></div>
                </div>
                <div class="feed-list home-feed-list" id="home-feed-grid">${feedHtml}</div>
                <div id="home-feed-sentinel" class="home-feed-sentinel" aria-hidden="true"></div>
                <p id="home-feed-end" class="muted-note home-feed-end" hidden>You're caught up</p>
            </section>
        </div>`;
}

// fallow-ignore-next-line complexity
function attachHomeFeedObserver(root) {
    const sentinel = root.querySelector('#home-feed-sentinel');
    const grid = root.querySelector('#home-feed-grid');
    const endEl = root.querySelector('#home-feed-end');
    const HF = window.GloweHomeFeed;
    if (!sentinel || !grid || !HF || !window.IntersectionObserver) return;
    if (root._homeFeedObserver) {
        try { root._homeFeedObserver.disconnect(); } catch (_e) { /* ignore */ }
    }
    // fallow-ignore-next-line complexity
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

function isGenericHomeAuthorLabel(label) {
    const raw = String(label || '').trim();
    return !raw
        || raw === 'GloWe Member'
        || raw === 'Community Member';
}

// Resolve live profile name/avatar onto feed cards when the post snapshot is
// blank or still the generic fallback (existing wishes/offers/posts).
async function enrichHomeFeedItems(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return list;
    const needIds = [];
    const seen = {};
    list.forEach(function (item) {
        const id = item && item.authorId ? String(item.authorId) : '';
        if (!id || seen[id]) return;
        if (!isGenericHomeAuthorLabel(item.authorLabel) && item.authorAvatarUrl) return;
        seen[id] = true;
        needIds.push(id);
    });
    if (!needIds.length) return list;
    const backend = window.gloweBackend;
    if (!backend || typeof backend.fetchPublicAuthorsByUserIds !== 'function') return list;
    let authors = {};
    try {
        authors = await backend.fetchPublicAuthorsByUserIds(needIds);
    } catch (_e) {
        return list;
    }
    return list.map(function (item) {
        if (!item || !item.authorId) return item;
        const mark = authors[String(item.authorId)];
        if (!mark) return item;
        const next = Object.assign({}, item);
        if (isGenericHomeAuthorLabel(next.authorLabel) && mark.displayName) {
            next.authorLabel = mark.displayName;
        }
        if (!next.authorNameEn && mark.displayNameEn) {
            next.authorNameEn = mark.displayNameEn;
        }
        if (!next.authorAvatarUrl && mark.avatarUrl) {
            next.authorAvatarUrl = mark.avatarUrl;
        }
        return next;
    });
}

async function buildEnrichedHomeFeed(sources) {
    const HF = window.GloweHomeFeed;
    if (!HF) return [];
    const normalized = HF.normalizeFeedSources(sources);
    const enriched = await enrichHomeFeedItems(normalized);
    return HF.diversifyFeed(HF.rankFeed(enriched, Date.now()));
}

// FR-GLOWE-016 AC2 / Wave 2.1 — prefer glowe_home_feed RPC; fall back to the
// legacy six-fetch + client rank path when the RPC is unavailable.
async function loadRankedHomeFeed(limit, offset) {
    const lim = Math.max(1, Number(limit) || 10);
    const off = Math.max(0, Number(offset) || 0);
    const backend = window.gloweBackend;
    if (backend && backend.configured() && typeof backend.fetchHomeFeed === 'function') {
        try {
            const rows = await backend.fetchHomeFeed(lim, off);
            if (rows != null) return Array.isArray(rows) ? rows : [];
        } catch (_e) {
            // Fall through to the client-side path.
        }
    }
    const sources = await loadHomeFeedSources();
    const ranked = await buildEnrichedHomeFeed(sources);
    const HF = window.GloweHomeFeed;
    if (!HF) return ranked;
    return HF.pageSlice(ranked, off, lim).items;
}

function hideGuestHomeFeed() {
    const el = document.getElementById('guest-home-feed');
    if (el) {
        el.hidden = true;
        el.innerHTML = '';
    }
}

// fallow-ignore-next-line complexity
function renderGuestHomeFeedPeek(ranked) {
    const el = document.getElementById('guest-home-feed');
    const HF = window.GloweHomeFeed;
    if (!el || !HF) return;
    const preview = HF.pageSlice(ranked, 0, HF.GUEST_PREVIEW_LIMIT);
    el.hidden = false;
    el.classList.add('linkedin-community-layout');
    el.innerHTML = `
        <div class="section-toolbar"><div><h2>What is happening on GloWe</h2></div></div>
        <div class="feed-list home-feed-list">${preview.items.length ? preview.items.map(renderHomeFeedCard).join('') : homeFeedEmptyHtml()}</div>
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

    const HF = window.GloweHomeFeed;
    const ranked = await loadRankedHomeFeed(50, 0);
    if (gen !== _gloweHomeGen) return;
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

    const filterCtrl = mountGloweListFilters('opportunity-filters-root', 'opportunities', {
        countActive: function (state) {
            let count = 0;
            if (state.search) count += 1;
            if (state.location !== 'all') count += 1;
            if (state.field !== 'all') count += 1;
            if (state.commitment !== 'all') count += 1;
            if (state.event !== 'all') count += 1;
            return count;
        },
        onChange: function (next) {
            Object.assign(filters, next);
            renderOpportunities();
        },
        results: {
            singular: 'opportunity shown',
            plural: 'opportunities shown',
            empty: 'No opportunities match your filters'
        }
    });

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
        if (filterCtrl) {
            const hasFilters = filters.location !== 'all' || filters.field !== 'all' || filters.commitment !== 'all' || filters.event !== 'all' || filters.search;
            filterCtrl.updateResults({ count: filtered.length, hasFilters: hasFilters });
        }
    }

    window.renderOpportunitiesList = renderOpportunities;

    // Re-fetch the live board after a publish so created opportunities appear
    // with real server ids (working detail links), not a client-side copy.
    reloadOpportunities = async function () {
        await fetchAndPopulate(() => gloweBackend.listAll('opportunities'), opportunities, mapOpportunityRow, withEnsuredOrganizationEnglishNames);
        renderOpportunities();
    };

    if (filterCtrl) filterCtrl.refreshI18n();

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
            <div class="form-grid-2">
                <!-- FR-GLOWE-012 AC8 — deliberately the same two controls, with the
                     same wording, as the event composer: one concept, one vocabulary. -->
                <div class="form-group">
                    <label for="opportunity-registration">Registration</label>
                    <select id="opportunity-registration">
                        <option value="gated">Organizer approves each registration</option>
                        <option value="open">Open — instant confirmation</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="opportunity-capacity">Capacity (optional)</label>
                    <input id="opportunity-capacity" type="number" min="1" placeholder="Leave empty for unlimited">
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" type="submit">Publish Opportunity</button>
                <button class="btn btn-outline" type="button" onclick="closeOpportunityComposer()">Cancel</button>
            </div>
        </form>
    `;
    if (typeof translateGloweTree === 'function') {
        translateGloweTree(composer);
    }
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
        requirements: document.getElementById('opportunity-requirements').value,
        // FR-GLOWE-012 AC5 — the owner picks whether to vet applicants one by
        // one or let everyone in, and how many places exist. The server applies
        // both (migration 0237); these controls just express the intent.
        registration_mode: fieldValue('opportunity-registration'),
        capacity: fieldValue('opportunity-capacity')
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
    } catch (err) {
        // insertOwned() already maps the server guards (0236) to readable copy —
        // show that instead of a generic failure, so "your organization is not
        // approved yet" does not read as "something went wrong".
        showSuccessModal('Could not publish', backend.describeBackendError(err));
    }
}

// Initialize organizations page
const ORG_REGION_MATCHERS = {
    israel: ['israel', 'ישראל'],
    'tel-aviv': ['tel aviv', 'תל אביב', 'gush dan', 'מרכז'],
    jerusalem: ['jerusalem', 'ירושלים'],
    haifa: ['haifa', 'חיפה', 'north', 'צפון', 'גליל', 'galilee'],
    south: ['negev', 'נגב', 'beer sheva', 'באר שבע', 'south', 'דרום', 'eilat', 'אילת'],
    global: ['global', 'remote', 'international', 'worldwide', 'עולמי', 'מרוחק', 'בינלאומי']
};
const ORG_TYPE_MATCHERS = {
    ngo: ['ngo', 'nonprofit', 'non-profit', 'עמותה', 'מלכ"ר', 'ארגון ללא מטרות רווח'],
    business: ['company', 'business', 'csr', 'esg', 'חברה', 'עסק', 'impact business'],
    initiative: ['initiative', 'project', 'יוזמה', 'פרויקט', 'social initiative']
};

function orgRegionHaystack(org) {
    return [org.location, org.scope, org.country, org.mission, org.name].filter(Boolean).join(' ').toLowerCase();
}

function orgMatchesRegion(org, regionKey) {
    if (!regionKey || regionKey === 'all') return true;
    const needles = ORG_REGION_MATCHERS[regionKey] || [];
    const hay = orgRegionHaystack(org);
    return needles.some(function (needle) { return hay.includes(needle); });
}

function orgMatchesProfileType(org, typeKey) {
    if (!typeKey || typeKey === 'all') return true;
    const needles = ORG_TYPE_MATCHERS[typeKey] || [];
    const hay = [org.profileType, org.type, org.mission, org.name].filter(Boolean).join(' ').toLowerCase();
    if (needles.some(function (needle) { return hay.includes(needle); })) return true;
    const label = (registrationProfileFields[typeKey] && registrationProfileFields[typeKey].label) || '';
    return label && hay.includes(label.toLowerCase());
}

function orgMatchesField(org, fieldKey) {
    if (!fieldKey || fieldKey === 'all') return true;
    const hay = [org.type, org.impactArea, org.mission, org.focus].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(String(fieldKey).toLowerCase());
}

function orgActiveFilterCount(filters) {
    let count = 0;
    if (filters.region !== 'all') count += 1;
    if (filters.type !== 'all') count += 1;
    if (filters.field !== 'all') count += 1;
    return count;
}

async function initOrganizationsPage() {
    const container = document.getElementById('organizations-list');
    if (!container) return;

    const filters = { query: '', region: 'all', type: 'all', field: 'all' };
    const filterCtrl = mountGloweListFilters('organization-filters-root', 'organizations', {
        countActive: orgActiveFilterCount,
        onChange: function (next) {
            Object.assign(filters, next);
            renderOrganizations();
        },
        results: {
            singular: 'profile shown',
            plural: 'profiles shown',
            empty: 'No profiles match your filters'
        }
    });

    function buildVisibleOrgs() {
        return [...organizations];
    }

    function renderOrganizations() {
        const visibleOrgs = buildVisibleOrgs();
        const query = filters.query.trim().toLowerCase();
        const filtered = visibleOrgs.filter(function (org) {
            const searchable = [org.name, org.type, org.profileType, org.mission, org.impactArea, org.country, org.location, org.scope, org.size, org.focus]
                .filter(Boolean).join(' ').toLowerCase();
            const queryMatch = !query || searchable.includes(query);
            return queryMatch
                && orgMatchesRegion(org, filters.region)
                && orgMatchesProfileType(org, filters.type)
                && orgMatchesField(org, filters.field);
        });

        const hasFilters = Boolean(query)
            || filters.region !== 'all'
            || filters.type !== 'all'
            || filters.field !== 'all';
        container.innerHTML = filtered.length
            ? filtered.map(function (org) { return renderOrganizationCard(org, '../'); }).join('')
            : hasFilters
                ? '<div class="empty-state organizations-empty-state"><h3>' + escapeHtml(gloweText('No matching profiles')) + '</h3><p>' + escapeHtml(gloweText('Try a broader keyword or clear a filter.')) + '</p></div>'
                : '<div class="empty-state organizations-empty-state"><h3>' + escapeHtml(gloweText('No organizations yet')) + '</h3><p>' + escapeHtml(gloweText('Organizations join GloWe by creating a profile and completing verification. The first approved profiles will appear here.')) + '</p></div>';

        if (filterCtrl) filterCtrl.updateResults({ count: filtered.length, hasFilters: hasFilters });
        hydrateFollowSlots(container);
    }

    if (getGloweLanguage() !== 'en') {
        await loadGloweLocaleDict(getGloweLanguage());
    }
    if (filterCtrl) filterCtrl.refreshI18n();

    container.innerHTML = '<div class="empty-state loading-state" role="status" aria-busy="true"><p class="muted-note">' + escapeHtml(gloweText('Loading organizations…')) + '</p></div>';
    try {
        const rows = await gloweBackend.listApprovedOrgs();
        const ensured = await withEnsuredEnglishNames(rows || []);
        organizations.splice(0, organizations.length, ...ensured.map(mapProfileToOrg));
    } catch (_e) {
        organizations.splice(0, organizations.length);
    }
    renderOrganizations();
    if (filterCtrl) filterCtrl.refreshI18n();
}

// Re-read + re-render the wish board after a create/close. Assigned when the
// Wishing Well page initialises; a no-op elsewhere.
let reloadWishBoard = null;
let resetWishBoardFilters = null;

async function initWishingWellPage() {
    const container = document.getElementById('wishes-list');
    const filters = { type: 'all', area: 'all', query: '', sort: 'newest' };
    const filterCtrl = mountGloweListFilters('wish-filters-root', 'wishes', {
        countActive: function (state) {
            let count = 0;
            if (state.type !== 'all') count += 1;
            if (state.area !== 'all') count += 1;
            return count;
        },
        onChange: function (next) {
            Object.assign(filters, next);
            if (typeof next.query === 'string') filters.query = next.query.trim();
            renderWishes();
        },
        results: {
            singular: 'wish shown',
            plural: 'wishes shown',
            empty: 'No wishes match your filters'
        }
    });

    function renderWishes() {
        const helpers = (typeof GloweWishes !== 'undefined') ? GloweWishes : null;
        const hasFilters = filters.type !== 'all' || filters.area !== 'all' || filters.query;
        const filtered = helpers ? helpers.filterWishes(wishes, filters) : wishes;
        const sorted = helpers ? helpers.sortWishes(filtered, filters.sort) : filtered;
        container.innerHTML = sorted.length
            ? sorted.map(renderWishCard).join('')
            : hasFilters ? emptyWishFilteredHtml() : emptyWishBoardHtml();
        if (filterCtrl) filterCtrl.updateResults({ count: sorted.length, hasFilters: hasFilters });
    }

    resetWishBoardFilters = function () {
        if (filterCtrl) filterCtrl.reset();
        else renderWishes();
    };

    reloadWishBoard = async function () { await loadLiveWishes(); renderWishes(); };

    if (filterCtrl) filterCtrl.refreshI18n();
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

async function ensureCommunityOpportunitiesLoaded() {
    const backend = window.gloweBackend;
    if (!backend || !backend.configured()) return;
    await fetchAndPopulate(
        () => backend.listAll('opportunities'),
        opportunities,
        mapOpportunityRow,
        withEnsuredOrganizationEnglishNames
    );
}

function getCommunityEventsForFeed() {
    const eventsApi = (typeof GloweEvents !== 'undefined') ? GloweEvents : null;
    if (!eventsApi) return [];
    const listed = getAllOpportunitiesForDisplay().filter(function (opp) {
        return (opp.status || 'active') !== 'removed';
    });
    return eventsApi.sortByStart(eventsApi.filterEvents(listed, { timeframe: 'all' }));
}

function communityEventSearchHaystack(opp) {
    return `${opp.title || ''} ${opp.description || ''} ${opp.organization || ''} ${opp.location || ''}`.toLowerCase();
}

function renderCommunityFeedEntry(entry) {
    if (entry && entry.kind === 'event') return renderOpportunityCard(entry.data, '');
    return renderPostCard(entry.data);
}

async function initCommunityPage() {
    const container = document.getElementById('community-feed');
    const peopleContainer = document.getElementById('people-list');
    const groupsContainer = document.getElementById('topic-groups-list');
    const feedFilters = { query: '', feedFilter: 'all' };
    const filterCtrl = mountGloweListFilters('community-feed-filters-root', 'communityFeed', {
        onChange: function (next) {
            Object.assign(feedFilters, next);
            if (typeof next.query === 'string') feedFilters.query = next.query.trim();
            renderFeed();
        }
    });

    function postMatchesFilter(post, filter) {
        if (filter === 'all') return true;
        const haystack = `${post.title || ''} ${post.category || ''} ${post.text || ''}`.toLowerCase();
        if (filter === 'question') return haystack.includes('question') || haystack.includes('discussion') || haystack.includes('?');
        if (filter === 'need') return haystack.includes('need') || haystack.includes('volunteer') || haystack.includes('open call') || haystack.includes('looking for');
        if (filter === 'knowledge') return haystack.includes('knowledge') || haystack.includes('guide') || haystack.includes('checklist') || haystack.includes('tips') || haystack.includes('best practices');
        return true;
    }

    function communityFeedEmptyHtml(activeFilter) {
        if (activeFilter === 'event') {
            return '<div class="empty-state"><h3>No events yet</h3><p>Organization events appear here once published.</p><button class="btn btn-primary btn-small" type="button" onclick="openEventComposer()">Publish an event</button></div>';
        }
        return '<div class="empty-state"><h3>The conversation starts here</h3><p>No posts yet — share knowledge, ask for support, or open a discussion to get things going.</p><button class="btn btn-primary btn-small" type="button" onclick="openInlineComposer()">Write the first post</button></div>';
    }

    function renderFeed() {
        if (!container) return;
        const query = feedFilters.query.toLowerCase();
        const activeFilter = feedFilters.feedFilter || 'all';
        const deepId = communityPostDeepLinkId();

        if (activeFilter === 'event') {
            const eventRows = getCommunityEventsForFeed().filter(function (opp) {
                return !query || communityEventSearchHaystack(opp).includes(query);
            });
            container.innerHTML = eventRows.length
                ? eventRows.map(function (opp) { return renderOpportunityCard(opp, ''); }).join('')
                : communityFeedEmptyHtml('event');
            if (typeof translateGloweTree === 'function') translateGloweTree(container);
            return;
        }

        let posts = getAllCommunityPosts().filter(post => {
            const searchable = `${post.title || ''} ${post.category || ''} ${post.text || ''} ${(post.tags || []).join(' ')}`.toLowerCase();
            return postMatchesFilter(post, activeFilter) && (!query || searchable.includes(query));
        });
        if (deepId) {
            const pinned = findCommunityPostById(deepId);
            if (pinned && !posts.some(function (p) { return String(p.id) === String(deepId); })) {
                posts = [pinned, ...posts];
            }
        }

        let entries = posts.map(function (post) {
            return { kind: 'post', sortAt: post.createdAt || '', data: post };
        });
        if (activeFilter === 'all') {
            const eventEntries = getCommunityEventsForFeed()
                .filter(function (opp) { return !query || communityEventSearchHaystack(opp).includes(query); })
                .map(function (opp) {
                    return { kind: 'event', sortAt: opp.startAt || '', data: opp };
                });
            entries = entries.concat(eventEntries).sort(function (a, b) {
                return Date.parse(b.sortAt || 0) - Date.parse(a.sortAt || 0);
            });
        }

        container.innerHTML = entries.length
            ? entries.map(renderCommunityFeedEntry).join('')
            : communityFeedEmptyHtml(activeFilter);
        if (typeof translateGloweTree === 'function') translateGloweTree(container);
        if (deepId) scheduleFocusCommunityPost(deepId);
    }

    if (filterCtrl) filterCtrl.refreshI18n();

    // Fetch posts, comments, and live events (glowe_opportunities + start_at).
    if (container) {
        container.innerHTML = '<div class="empty-state"><p class="muted-note">Loading posts…</p></div>';
        await Promise.all([
            loadCommunityPosts(),
            loadPostComments(),
            ensureCommunityOpportunitiesLoaded()
        ]);
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
                        <button type="button" onclick="openPrivateMessage('${jsString(localizedProfileDisplayName(person))}', '${jsString(person.id || '')}')">Message</button>
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
        container.innerHTML = '<div class="empty-state"><h3>No pending organizations</h3><p>Only organization applications awaiting review appear here (status: pending). If someone just submitted, ask them to confirm they saw “Application submitted”, then refresh.</p><button type="button" class="btn btn-outline btn-small" onclick="loadPendingOrgs()">Refresh queue</button></div>';
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
                    <button class="btn btn-outline btn-small" type="button" onclick="openPrivateMessage('${jsString(localizedProfileDisplayName(person))}', '${jsString(person.id || '')}')">Message</button>
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
                <button type="button" onclick="openPrivateMessage('${jsString(localizedProfileDisplayName(person))}', '${jsString(person.id || '')}')">Message</button>
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
    const missionFallback = 'A GloWe community profile sharing work, knowledge, and opportunities for impact.';
    const missionRaw = String(profile.mission || profile.story || profile.bio || '').trim();
    const missionText = missionRaw || missionFallback;
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

    // FR-TRANSLATE-005 AC7 — only tag real user prose for UGC translate. Chrome
    // fallbacks must stay free of data-tr-field so translateGloweTree can localize.
    const missionFieldAttr = (profile._tr && missionRaw)
        ? ` data-tr-field="${profile._tr.missionField}"`
        : '';

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
                    ${!isOwnerView && profile.id ? `<button class="btn btn-primary" type="button" onclick="openPrivateMessage('${safeName}', '${jsString(profile.id)}')">Message</button>` : ''}
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
                    ${!isOwnerView && profile.id ? `<button class="btn btn-primary btn-block" type="button" onclick="openPrivateMessage('${safeName}', '${jsString(profile.id)}')">Start Conversation</button>` : ''}
                </article>

                <article class="org-info-card">
                    <h4>Profile snapshot</h4>
                    <div class="profile-info-list compact">
                        <p><strong>Location</strong><span>${escapeHtml(profile.location || profile.country || 'Not specified yet')}</span></p>
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
    if (typeof translateGloweTree === 'function') translateGloweTree(container);
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

    // FR-GLOWE-012 AC5 — say up front how registration works here. The event
    // panel prints its own live "X of Y places" line, so this is for plain
    // opportunities only.
    if (!isEvent) renderRegistrationTerms(opportunity);

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

// Fill the sidebar registration-terms line, or leave it hidden when the listing
// runs on the defaults (organizer approves, unlimited places).
function renderRegistrationTerms(opportunity) {
    const el = document.getElementById('opp-registration-terms');
    const helpers = (typeof GloweOpportunities !== 'undefined') ? GloweOpportunities : null;
    if (!el || !helpers) return;
    const label = helpers.registrationTermsLabel(opportunity, gloweText);
    if (!label) { el.hidden = true; return; }
    el.innerHTML = `<strong>${escapeHtml(gloweText('Registration:'))}</strong> ${escapeHtml(label)}`;
    el.hidden = false;
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
        // A waitlisted applicant is promoted with the same Accept button; the
        // server re-checks capacity and only moves them up if a seat is free.
        const acceptLabel = v.status === 'Waitlisted' ? 'Give a place' : 'Accept';
        const decideButtons = canDecide ? `
                <button class="btn btn-primary btn-sm" type="button" data-app="${escapeHtml(String(v.id))}" data-decide="Accepted">${acceptLabel}</button>
                <button class="btn btn-outline btn-sm" type="button" data-app="${escapeHtml(String(v.id))}" data-decide="Declined">Decline</button>` : '';
        const connectButton = connectButtonHtml(v);
        const actions = (decideButtons || connectButton) ? `
            <div class="applicant-actions">${decideButtons}${connectButton}</div>` : '';
        return `
        <li class="applicant-row">
            <div class="applicant-head">
                <strong>${escapeHtml(v.name || 'GloWe volunteer')}</strong>
                <span class="applicant-status status-${escapeHtml(String(v.status).toLowerCase())}">${escapeHtml(v.status)}${v.waitlistPosition ? ' #' + escapeHtml(String(v.waitlistPosition)) : ''}</span>
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
    let row = null;
    try {
        row = await backend.updateApplicationStatus(applicationId, decision);
    } catch (err) {
        const area = document.getElementById('opp-applicants');
        if (area) area.insertAdjacentHTML('afterbegin', `<p class="event-register-error">${escapeHtml(backend.describeBackendError(err))}</p>`);
        return;
    }
    // An accept past capacity comes back as 'Waitlisted' (migration 0237) —
    // tell the owner rather than letting the list silently disagree with the
    // button they just pressed.
    if (decision === 'Accepted' && row && row.status === 'Waitlisted') {
        showActionToast('Added to the waitlist', 'All places are taken, so this applicant is next in line.');
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
    const helpers = (typeof GloweOpportunities !== 'undefined') ? GloweOpportunities : null;
    if (!backend || !backend.configured() || !events) return;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registering...'; }
    try {
        const row = await backend.registerForEvent(opportunity.id, {
            email: document.getElementById('event-reg-email').value,
            phone: document.getElementById('event-reg-phone').value,
            comment: document.getElementById('event-reg-comment').value
        });
        // Shares the apply-flow copy so a full event says "waitlist" instead of
        // the old "pending review", which was wrong once capacity kicked in.
        const outcome = helpers
            ? helpers.applicationOutcomeMessage(row && row.status, row && row.waitlist_position, gloweText)
            : { title: 'Application sent', body: 'You can track the status in your personal area.' };
        showSuccessModal(outcome.title, outcome.body);
        renderEventRegisterArea(opportunity, events);
    } catch (err) {
        const area = document.getElementById('event-register-area');
        if (area) area.insertAdjacentHTML('afterbegin', `<p class="event-register-error">${escapeHtml(backend.describeBackendError(err))}</p>`);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Register for event'; }
    }
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

    // FR-GLOWE-012 AC5 — the server decides the outcome from the listing's
    // registration_mode and capacity (migration 0237). An 'open' listing
    // confirms on the spot, a full one waitlists, a 'gated' one stays pending.
    // This used to be a direct insert that hardcoded 'Pending', which is why an
    // opportunity could never be run on "everyone can join" terms.
    let status = 'Pending';
    let waitlistPosition = null;
    if (backend && backend.configured()) {
        try {
            const row = await backend.applyToOpportunity(opportunityId, {
                availability, skills, motivation
            });
            if (row) {
                status = row.status || 'Pending';
                waitlistPosition = row.waitlist_position || null;
            }
        } catch (err) {
            const detail = (backend.describeBackendError && backend.describeBackendError(err))
                || 'Something went wrong submitting your application. Please try again.';
            closeModal('apply-modal');
            showSuccessModal('Could not apply', detail);
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
        status,
        appliedAt: new Date().toISOString()
    });
    saveApplications(applications);

    closeModal('apply-modal');
    const outcome = helpers
        ? helpers.applicationOutcomeMessage(status, waitlistPosition, gloweText)
        : { title: 'Application sent', body: 'You can track the status in your personal area.' };
    showSuccessModal(outcome.title, outcome.body);
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
const GLOWE_TRANSLATIONS = {};

// Wave 2.3 — load one locale JSON on demand (TD-186). English strings are keys.
async function loadGloweLocaleDict(lang) {
    const code = String(lang || 'en');
    if (code === 'en') return null;
    if (GLOWE_TRANSLATIONS[code]) return GLOWE_TRANSLATIONS[code];
    const pathName = String(
        (typeof location !== 'undefined' && location.pathname) || ''
    ).replace(/\\/g, '/');
    const inPages = /\/pages\//.test(pathName);
    const version = (typeof GloweAppVersion !== 'undefined' && GloweAppVersion.version) || '1';
    const url = (inPages ? '../i18n/' : 'i18n/') + encodeURIComponent(code) + '.json?v=' + encodeURIComponent(version);
    try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('locale http ' + res.status);
        const dict = await res.json();
        GLOWE_TRANSLATIONS[code] = dict && typeof dict === 'object' ? dict : {};
        return GLOWE_TRANSLATIONS[code];
    } catch (err) {
        console.warn('[glowe-i18n] failed to load locale', code, err);
        return null;
    }
}

function gloweDict() {
    const lang = getGloweLanguage();
    if (lang === 'en') return null;
    return GLOWE_TRANSLATIONS[lang] || null;
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
    const finish = function finishGloweI18n() {
        if (!gloweDict()) {
            reveal();
            return;
        }
        translateGloweTitle();
        translateGloweTree(document.body);
        applyGloweDataI18n(document.body);
        startGloweI18nObserver();
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function () { requestAnimationFrame(reveal); });
        } else {
            reveal();
        }
    };
    if (getGloweLanguage() === 'en') {
        finish();
        return;
    }
    loadGloweLocaleDict(getGloweLanguage()).then(finish).catch(finish);
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

// About page — expand What's Next inline (FR-GLOWE-027 AC6).
// fallow-ignore-next-line complexity
function toggleWhatsNextExpand() {
    const panel = document.getElementById('about-whats-next-panel');
    const btn = document.getElementById('about-whats-next-toggle');
    if (!panel || !btn) return;
    const open = btn.getAttribute('aria-expanded') === 'true';
    const nextOpen = !open;
    btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    panel.hidden = !nextOpen;
    btn.textContent = nextOpen ? 'Show less' : 'Read What\'s Next';
    if (typeof translateGloweTree === 'function') {
        translateGloweTree(btn);
        if (nextOpen) translateGloweTree(panel);
    }
    if (nextOpen) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
window.toggleWhatsNextExpand = toggleWhatsNextExpand;

// fallow-ignore-next-line complexity
async function initAboutPage() {
    const listEl = document.getElementById('about-team-list');
    if (!listEl) return;
    const api = window.GloweAboutTeam;
    const backend = window.gloweBackend;
    if (!api || !backend || typeof backend.listAboutTeam !== 'function') {
        listEl.innerHTML = '<p class="about-team-empty">No team members to show yet.</p>';
        return;
    }

    function paintError() {
        listEl.innerHTML =
            '<p class="about-team-error">We couldn\'t load the team. Please try again.' +
            ' <button type="button" class="btn btn-outline btn-small" id="about-team-retry">Retry</button></p>';
        const btn = document.getElementById('about-team-retry');
        if (btn) btn.addEventListener('click', function () { initAboutPage(); });
    }

    try {
        if (!backend.configured || !backend.configured()) {
            listEl.innerHTML = '<p class="about-team-empty">No team members to show yet.</p>';
            return;
        }
        listEl.innerHTML = '<p class="about-team-loading">Loading the team…</p>';
        const rows = await backend.listAboutTeam();
        const members = api.mapTeamRows(rows || []);
        if (!members.length) {
            listEl.innerHTML = '<p class="about-team-empty">No team members to show yet.</p>';
            return;
        }
        listEl.innerHTML = api.teamListHtml(members);
        if (typeof translateGloweTree === 'function') translateGloweTree(listEl);
    } catch (_err) {
        paintError();
        if (typeof translateGloweTree === 'function') translateGloweTree(listEl);
    }
}

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
// fallow-ignore-next-line complexity
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
    } else if (page === 'about') {
        initAboutPage();
    }

    // Translate the now-rendered chrome + page, then watch for later injections.
    initGloweI18n();
});
