// Authentication handling
const LEGACY_USER_KEY = 'revolutionaryUser';
const LEGACY_USERS_KEY = 'revolutionaryUsers';
const GLOWE_USER_KEY = 'gloweUser';
const GLOWE_USERS_KEY = 'gloweUsers';
// Must match backend.js getClient() storageKey — the Supabase session lives here.
const GLOWE_SUPABASE_SESSION_KEY = 'glowe-auth-v1';

function migrateAuthStorage() {
    if (!localStorage.getItem(GLOWE_USER_KEY) && localStorage.getItem(LEGACY_USER_KEY)) {
        localStorage.setItem(GLOWE_USER_KEY, localStorage.getItem(LEGACY_USER_KEY));
    }
    if (!localStorage.getItem(GLOWE_USERS_KEY) && localStorage.getItem(LEGACY_USERS_KEY)) {
        localStorage.setItem(GLOWE_USERS_KEY, localStorage.getItem(LEGACY_USERS_KEY));
    }
}

migrateAuthStorage();

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem(GLOWE_USER_KEY) !== null;
}

// Get current user
function getCurrentUser() {
    const userData = localStorage.getItem(GLOWE_USER_KEY);
    return userData ? JSON.parse(userData) : null;
}

// Single place that wipes every local identity artifact. Both logout() and the
// signed-out branch of syncSupabaseSession() must clear the SAME keys, otherwise
// a stale glowePersonalProfile keeps rendering the previous member on surfaces
// that read getPersonalProfile() (e.g. the Community sidebar).
function clearGloweIdentity() {
    localStorage.removeItem(GLOWE_USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.removeItem('glowePersonalProfile');
}

function buildPersonalProfileFromRegistration(user = {}) {
    const interests = Array.isArray(user.interests) ? user.interests : [];
    const sdgs = Array.isArray(user.sdgs) ? user.sdgs : [];
    return {
        id: user.id,
        name: user.name || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        title: user.title || '',
        organizationName: user.organizationName || '',
        email: user.email || '',
        emailVerified: Boolean(user.emailVerified),
        type: user.profileTypeLabel || user.type || '',
        profileType: user.type || '',
        country: user.country || '',
        publicLink: user.publicLink || '',
        focus: interests.join(', ') || user.shortLine || user.publicActions || 'Community collaboration',
        shortLine: user.shortLine || '',
        about: user.story || user.about || '',
        story: user.story || '',
        values: user.values || '',
        community: user.community || '',
        problem: user.problem || '',
        solution: user.solution || '',
        interests,
        sdgs,
        methods: user.methods || '',
        needs: user.publicActions || user.needs || '',
        publicActions: user.publicActions || '',
        location: user.location || user.country || '',
        socials: user.socials || '',
        media: user.media || '',
        funding: user.funding || '',
        annualBudget: user.annualBudget || '',
        languages: user.languages || [],
        availability: user.size || user.availability || '',
        skills: interests,
        avatarUrl: user.avatarUrl || '',
        reviewStatus: user.reviewStatus || 'Save as draft',
        profileStatus: user.profileStatus || '',
        createdAt: user.createdAt || new Date().toISOString()
    };
}

function refreshPersonalAreaIfVisible() {
    if (typeof window.renderPersonalArea === 'function') {
        window.renderPersonalArea();
    }
}

// --- Supabase session bridge -------------------------------------------------
// The static UI only reads the `gloweUser` localStorage key, but Google OAuth
// returns a Supabase session (captured by detectSessionInUrl) with no local
// user record. Without this bridge the page still looks logged-out after a
// successful Google sign-in. We mirror the live Supabase session into
// `gloweUser` so isLoggedIn()/updateAuthUI() reflect reality.
function gloweUserFromSupabase(supabaseUser, profile = null) {
    const meta = supabaseUser.user_metadata || {};
    const name = (profile && profile.name)
        || meta.name || meta.full_name
        || (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'GloWe member');
    return {
        id: supabaseUser.id,
        name,
        email: supabaseUser.email || meta.email || '',
        type: (profile && profile.type) || meta.profile_type || 'member',
        avatarUrl: (profile && profile.avatarUrl) || meta.avatar_url || meta.picture || ''
    };
}

async function syncSupabaseSession() {
    if (!(window.gloweBackend && window.gloweBackend.configured())) return;

    let supabaseUser = null;
    try {
        supabaseUser = await window.gloweBackend.currentUser();
    } catch (error) {
        return;
    }

    if (!supabaseUser) {
        // Supabase reports signed out — clear ALL stale local identity (incl. the
        // cached personal profile), not just gloweUser.
        const wasLoggedIn = isLoggedIn();
        clearGloweIdentity();
        if (wasLoggedIn) {
            updateAuthUI();
            // The page already rendered member content (e.g. the Community
            // sidebar reads getPersonalProfile() synchronously at load, before
            // this async bridge resolves). Clearing storage alone leaves that
            // stale DOM in place, so force a reload to re-render as anonymous.
            // After the reload gloweUser is gone → wasLoggedIn is false → no loop.
            // logout() clears identity *before* it triggers signOut, so this path
            // never fires during an explicit logout (which redirects on its own).
            window.location.reload();
            return;
        }
        // Already anonymous (e.g. logout() cleared identity before this fired):
        // just refresh the Personal Area to reflect the signed-out state.
        refreshPersonalAreaIfVisible();
        return;
    }

    // FR-GLOWE-023 — register the member from Google on first sign-in (no-op if a
    // profile already exists). Non-fatal on failure; onboarding remains the fallback.
    if (typeof window.gloweBackend.ensureProfileFromGoogle === 'function') {
        try { await window.gloweBackend.ensureProfileFromGoogle(supabaseUser); } catch (error) { /* non-fatal */ }
    }

    let profile = null;
    try {
        profile = await window.gloweBackend.fetchProfile();
    } catch (error) {
        profile = null;
    }

    localStorage.setItem(GLOWE_USER_KEY, JSON.stringify(gloweUserFromSupabase(supabaseUser, profile)));
    if (profile) localStorage.setItem('glowePersonalProfile', JSON.stringify(profile));
    updateAuthUI();
    refreshPersonalAreaIfVisible();

    // Invite the user to finish onboarding (basic details + account type). The
    // helper no-ops if onboarding is already complete or was dismissed this
    // session. (FR-GLOWE-002)
    if (typeof window.maybeShowGloweOnboarding === 'function') {
        window.maybeShowGloweOnboarding(profile);
    }

    // FR-GLOWE-023 — finish the action the guest attempted before signing in.
    if (window.GloweGuest && typeof window.GloweGuest.resumeGuestIntent === 'function') {
        window.GloweGuest.resumeGuestIntent();
    }
}

async function attachSupabaseAuthListener() {
    if (!(window.gloweBackend && window.gloweBackend.configured())) return;
    let client = null;
    try {
        client = await window.gloweBackend.getClient();
    } catch (error) {
        return;
    }
    if (!client || !client.auth || typeof client.auth.onAuthStateChange !== 'function') return;
    client.auth.onAuthStateChange(() => {
        // Defer to avoid the supabase-js deadlock when calling client methods
        // from inside the auth-state callback.
        setTimeout(() => { syncSupabaseSession(); }, 0);
    });
}

function readRegistrationImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function resizeRegistrationImage(file, maxSize = 420, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
            URL.revokeObjectURL(image.src);
        };
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
    });
}

async function getRegistrationAvatarUrl(form) {
    const input = form.querySelector('#register-logo');
    const file = input && input.files ? input.files[0] : null;
    if (!file) return '';

    if (typeof uploadProfileImageToCloudinary === 'function') {
        try {
            return await uploadProfileImageToCloudinary(file);
        } catch (error) {
            console.warn('Cloudinary registration upload failed; saving image locally for this MVP session.', error);
        }
    }

    try {
        return await resizeRegistrationImage(file);
    } catch (error) {
        console.warn('Could not resize registration image; using original file for this MVP session.', error);
        return readRegistrationImageAsDataUrl(file);
    }
}

function storeRegisteredUser(newUser, users = null) {
    const write = (userToStore, usersToStore) => {
        if (usersToStore) localStorage.setItem(GLOWE_USERS_KEY, JSON.stringify(usersToStore));
        localStorage.setItem(GLOWE_USER_KEY, JSON.stringify(userToStore));
        localStorage.setItem('glowePersonalProfile', JSON.stringify(buildPersonalProfileFromRegistration(userToStore)));
    };

    try {
        write(newUser, users);
    } catch (error) {
        if (!newUser.avatarUrl) throw error;
        const userWithoutImage = { ...newUser, avatarUrl: '' };
        const usersWithoutImage = users
            ? users.map(user => user.id === newUser.id ? userWithoutImage : user)
            : null;
        write(userWithoutImage, usersWithoutImage);
        alert('Your account was saved, but the profile image was too large for local demo storage. You can upload it again after Cloudinary is configured.');
        return userWithoutImage;
    }

    return newUser;
}

// Handle login
async function completeSupabaseSignIn(data) {
    const profile = await window.gloweBackend.fetchProfile();
    const user = {
        id: data.user.id,
        name: profile && profile.name ? profile.name : (data.user.user_metadata && data.user.user_metadata.name) || data.user.email,
        email: data.user.email,
        type: profile && profile.type ? profile.type : 'member'
    };
    localStorage.setItem(GLOWE_USER_KEY, JSON.stringify(user));
    if (profile) localStorage.setItem('glowePersonalProfile', JSON.stringify(profile));
    closeModal('login-modal');
    updateAuthUI();
    refreshPersonalAreaIfVisible();
    showSuccessModal('Welcome Back!', `Great to see you again, ${user.name}!`);
    redirectPendingOpportunity();
}

async function applyMockSession(session, userOverride) {
    if (!session || !(window.gloweBackend && window.gloweBackend.configured())) return;
    await window.gloweBackend.setSession(session);
    const supabaseUser = session.user;
    let profile = null;
    try {
        profile = await window.gloweBackend.fetchProfile();
    } catch (_e) {
        profile = null;
    }
    const user = userOverride || gloweUserFromSupabase(supabaseUser, profile);
    localStorage.setItem(GLOWE_USER_KEY, JSON.stringify(user));
    if (profile) localStorage.setItem('glowePersonalProfile', JSON.stringify(profile));
    closeModal('login-modal');
    updateAuthUI();
    refreshPersonalAreaIfVisible();
    showSuccessModal('Welcome Back!', `Great to see you again, ${user.name}!`);
    redirectPendingOpportunity();
}
window.applyMockSession = applyMockSession;

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (window.GloweDevAuth && (window.GloweDevAuth.isActive() || window.GloweDevAuth.isLocalSupabaseConfigured())) {
        signInAsDevPersona({ email, role: 'user', profileType: 'individual', approvalStatus: 'not_required' });
        return;
    }
    
    if (window.gloweBackend && window.gloweBackend.configured()) {
        window.gloweBackend.signIn(email, password)
            .then(completeSupabaseSignIn)
            .catch((error) => {
                alert(error.message || 'Could not log in. Please try again.');
            });
        return;
    }

    // Local fallback when Supabase is not configured.
    const users = JSON.parse(localStorage.getItem(GLOWE_USERS_KEY) || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        localStorage.setItem(GLOWE_USER_KEY, JSON.stringify(user));
        closeModal('login-modal');
        updateAuthUI();
        refreshPersonalAreaIfVisible();
        showSuccessModal('Welcome Back!', `Great to see you again, ${user.name}!`);
        
        // Check if there's a pending redirect
        const pendingOpportunity = sessionStorage.getItem('pendingOpportunityApplication');
        if (pendingOpportunity) {
            sessionStorage.removeItem('pendingOpportunityApplication');
            redirectPendingOpportunity(pendingOpportunity);
        }
    } else {
        alert('Invalid email or password. Please try again.');
    }
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const getValue = (selector) => form.querySelector(selector) ? form.querySelector(selector).value.trim() : '';
    const checkedValues = (name) => [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);

    const firstName = getValue('#register-first-name');
    const lastName = getValue('#register-last-name');
    const title = getValue('#register-title');
    const organizationName = getValue('#register-organization-name');
    const legacyName = getValue('#register-name');
    const name = [firstName, lastName].filter(Boolean).join(' ') || legacyName || organizationName;
    const email = getValue('#register-email');
    const password = getValue('#register-password');
    const passwordConfirm = getValue('#register-password-confirm');
    const emailCode = getValue('#register-email-code');
    const expectedEmailCode = sessionStorage.getItem(`glowe-email-code:${email}`);
    if (passwordConfirm && password !== passwordConfirm) {
        alert('Passwords do not match. Please confirm your password again.');
        return;
    }
    if (form.querySelector('#register-email-code') && (!expectedEmailCode || emailCode !== expectedEmailCode)) {
        alert('Please enter the verification code that was sent for this email.');
        return;
    }
    const type = form.querySelector('input[name="type"]:checked')
        ? form.querySelector('input[name="type"]:checked').value
        : getValue('#register-type');
    const profileTypeLabel = window.registrationProfileFields && window.registrationProfileFields[type]
        ? window.registrationProfileFields[type].label
        : type;
    
    // Create new user
    const newUser = {
        id: Date.now(),
        name,
        firstName,
        lastName,
        title,
        organizationName,
        email,
        password,
        emailVerified: Boolean(expectedEmailCode && emailCode === expectedEmailCode),
        type,
        profileTypeLabel,
        country: getValue('#register-country'),
        publicLink: getValue('#register-public-link'),
        size: getValue('#register-size'),
        story: getValue('#register-story'),
        values: getValue('#register-values'),
        community: getValue('#register-community'),
        problem: getValue('#register-problem'),
        solution: getValue('#register-solution'),
        interests: checkedValues('interests'),
        sdgs: checkedValues('sdgs'),
        methods: getValue('#register-methods'),
        shortLine: getValue('#register-short-line'),
        location: getValue('#register-location'),
        socials: getValue('#register-socials'),
        media: getValue('#register-media'),
        publicActions: getValue('#register-public-actions'),
        funding: getValue('#register-funding'),
        annualBudget: getValue('#register-annual-budget'),
        avatarUrl: await getRegistrationAvatarUrl(form),
        reviewStatus: getValue('#register-review-status') || 'Save as draft',
        profileStatus: (getValue('#register-review-status') || '').includes('Submit') ? 'Pending review' : 'Draft',
        createdAt: new Date().toISOString()
    };
    
    if (window.gloweBackend && window.gloweBackend.configured()) {
        window.gloweBackend.signUp({ email, password, profile: newUser })
            .then(() => {
                storeRegisteredUser(newUser);
                closeModal('register-modal');
                updateAuthUI();
                refreshPersonalAreaIfVisible();
                showSuccessModal(
                    newUser.profileStatus === 'Pending review' ? 'Profile sent for review' : 'Profile draft saved',
                    `Welcome to GloWe, ${name}. Your profile was saved and can be edited from the personal area.`
                );
                redirectPendingOpportunity();
            })
            .catch((error) => {
                alert(error.message || 'Could not create account. Please try again.');
            });
        return;
    }

    // Check if email already exists in the local fallback store.
    const users = JSON.parse(localStorage.getItem(GLOWE_USERS_KEY) || '[]');
    if (users.find(u => u.email === email)) {
        alert('An account with this email already exists.');
        return;
    }

    users.push(newUser);
    storeRegisteredUser(newUser, users);
    
    closeModal('register-modal');
    updateAuthUI();
    refreshPersonalAreaIfVisible();
    showSuccessModal(
        newUser.profileStatus === 'Pending review' ? 'Profile sent for review' : 'Profile draft saved',
        `Welcome to GloWe, ${name}. Your long profile onboarding was saved and can be edited from the personal area.`
    );
    
    // Check if there's a pending redirect
    const pendingOpportunity = sessionStorage.getItem('pendingOpportunityApplication');
    if (pendingOpportunity) {
        sessionStorage.removeItem('pendingOpportunityApplication');
        redirectPendingOpportunity(pendingOpportunity);
    }
}

function sendRegistrationEmailCode() {
    const form = document.getElementById('register-form');
    if (!form) return;
    const emailInput = form.querySelector('#register-email');
    const codeInput = form.querySelector('#register-email-code');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
        alert('Add your email first, then we can send the verification code.');
        if (emailInput) emailInput.focus();
        return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(`glowe-email-code:${email}`, code);
    if (codeInput) codeInput.value = code;
    showSuccessModal(
        'Verification code sent',
        `MVP preview: use code ${code}. When email delivery is connected, this code will be sent to ${email}.`
    );
}

function bindLocalDevPersonaButtons(root) {
    if (!root) return;
    root.querySelectorAll('[data-dev-signin-email]').forEach((button) => {
        button.addEventListener('click', () => {
            const email = button.getAttribute('data-dev-signin-email');
            if (!email) return;
            signInAsDevPersona({
                email,
                role: button.getAttribute('data-dev-signin-role') || 'user',
                profileType: button.getAttribute('data-dev-signin-profile-type') || 'individual',
                approvalStatus: button.getAttribute('data-dev-signin-approval') || 'not_required',
                displayName: button.getAttribute('data-dev-signin-name') || ''
            });
        });
    });
}

async function signInAsDevPersona(options = {}) {
    if (!(window.gloweBackend && window.gloweBackend.configured())) {
        alert('Backend is not configured.');
        return;
    }
    const payload = {
        email: options.email,
        role: options.role || 'user',
        profileType: options.profileType || 'individual',
        approvalStatus: options.approvalStatus || 'not_required',
        displayName: options.displayName || undefined
    };
    if (typeof window.gloweBackend.mockLogin === 'function') {
        const result = await window.gloweBackend.mockLogin(payload).catch((err) => ({
            error: 'network_error',
            message: err && err.message ? err.message : 'mock-login request failed'
        }));
        if (result && result.session && typeof window.applyMockSession === 'function') {
            await window.applyMockSession(result.session, result.user);
            return;
        }
        if (result && result.error) {
            console.error('mock-login failed', result);
        }
    }
    const password = window.GloweDevAuth ? window.GloweDevAuth.DEFAULT_PASSWORD : '';
    if (!password || !payload.email) {
        alert('Local sign-in failed. Run: ./scripts/dev-up.sh');
        return;
    }
    try {
        const data = await window.gloweBackend.signIn(payload.email, password);
        await completeSupabaseSignIn(data);
    } catch (error) {
        const hint = (window.GLOWE_BACKEND_CONFIG && window.GLOWE_BACKEND_CONFIG.supabaseUrl || '').includes('127.0.0.1')
            ? ' Run ./scripts/dev-up.sh to seed users.'
            : '';
        alert((error.message || 'Could not log in.') + hint);
    }
}
window.signInAsDevPersona = signInAsDevPersona;
window.bindLocalDevPersonaButtons = bindLocalDevPersonaButtons;

async function handleGoogleSignIn() {
    const cfg = window.GLOWE_BACKEND_CONFIG || {};
    const localSupabase = window.GloweDevAuth && window.GloweDevAuth.isLocalSupabaseUrl(cfg.supabaseUrl || '');
    const devAuthActive = window.GloweDevAuth
        && (window.GloweDevAuth.isActive() || localSupabase);
    if (devAuthActive) {
        if (typeof ensureGlobalUI === 'function') ensureGlobalUI();
        if (typeof upgradeLoginModal === 'function') upgradeLoginModal();
        if (typeof openModal === 'function') {
            openModal('login-modal');
        }
        return;
    }
    if (window.gloweBackend && window.gloweBackend.configured() && typeof window.gloweBackend.signInWithGoogle === 'function') {
        try {
            await window.gloweBackend.signInWithGoogle();
        } catch (error) {
            alert(error.message || 'Google sign-in could not start. Please try email registration.');
        }
        return;
    }
    showSuccessModal(
        'Google sign-in ready for backend',
        'In this static MVP, Google sign-in is shown as the intended flow. Once Supabase Auth is configured, this button will open the real Google login.'
    );
}

function redirectPendingOpportunity(existingValue = null) {
    const pendingOpportunity = existingValue || sessionStorage.getItem('pendingOpportunityApplication');
    if (!pendingOpportunity) return;
    sessionStorage.removeItem('pendingOpportunityApplication');
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const basePath = isInPagesDir ? '' : 'pages/';
    window.location.href = `${basePath}opportunity.html?id=${pendingOpportunity}`;
}

// Resolve the guest home href from any page (pages/* live one level down).
function gloweHomeHref(pathname) {
    const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
    return path.includes('/pages/') ? '../index.html' : 'index.html';
}

// Handle logout
async function logout() {
    // Clear the local identity first so the UI flips immediately even if the
    // async Supabase sign-out below is slow.
    clearGloweIdentity();
    updateAuthUI();
    refreshPersonalAreaIfVisible();

    // CRITICAL: await the Supabase sign-out BEFORE navigating. The session lives
    // under the 'glowe-auth-v1' storageKey; if we redirect before it is cleared,
    // the next page's session bridge (syncSupabaseSession) re-mirrors the live
    // Supabase user back into gloweUser/glowePersonalProfile and the previous
    // member's details reappear. We also drop the key directly as a backstop in
    // case signOut fails to load the client.
    if (window.gloweBackend && window.gloweBackend.configured()) {
        try { await window.gloweBackend.signOut(); } catch (error) { /* fall through */ }
    }
    localStorage.removeItem(GLOWE_SUPABASE_SESSION_KEY);

    // Always return to the guest home: a full nav tears down any open modal and
    // guarantees no member-only view survives the session change.
    window.location.href = gloweHomeHref();
}

// Update UI based on auth state
function updateAuthUI() {
    if (typeof window.ensureLogoBrand === 'function') window.ensureLogoBrand();
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    const userNameSpan = document.getElementById('user-name');
    const logoGreeting = document.querySelector('.logo-user-greeting');
    
    document.body.classList.toggle('glowe-signed-in', isLoggedIn());

    if (isLoggedIn()) {
        const user = getCurrentUser();
        const profile = typeof getPersonalProfile === 'function' ? getPersonalProfile() : {};
        const displayName = (typeof GloweLocalizedName !== 'undefined' && typeof getGloweLanguage === 'function')
            ? GloweLocalizedName.localizedProfileName(profile, getGloweLanguage())
            : (user.name || '');
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (logoGreeting) logoGreeting.hidden = false;
        if (userNameSpan) userNameSpan.textContent = (displayName || user.name || '').split(' ')[0];
        // Language is managed in Settings once signed in — remove the header toggle.
        if (typeof window.removeLanguageToggle === 'function') window.removeLanguageToggle();
        // Show admin link for GLOWE admins (async; runs after render).
        if (typeof window.applyAdminLink === 'function') {
            window.applyAdminLink();
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (logoGreeting) logoGreeting.hidden = true;
        // Anonymous visitors have no Settings page — expose the toggle in the header.
        if (typeof window.injectLanguageToggle === 'function') window.injectLanguageToggle();
    }

    // Auth-aware nav (Home ⇄ Personal Area) must track the same state. Re-run
    // the nav builder so login/logout flips the primary tab without a reload.
    if (typeof window.normalizeMainNavigation === 'function') {
        window.normalizeMainNavigation();
    }
}

// FR-GLOWE-023 — greet first-time guests once, then never again. Browsing stays
// otherwise transparent (no persistent guest banner).
const GLOWE_GUEST_WELCOMED_KEY = 'glowe-guest-welcomed';
function maybeShowGuestWelcome() {
    if (isLoggedIn()) return;
    if (localStorage.getItem(GLOWE_GUEST_WELCOMED_KEY) === '1') return;
    localStorage.setItem(GLOWE_GUEST_WELCOMED_KEY, '1');
    if (typeof window.showSuccessModal === 'function') {
        window.showSuccessModal(
            'Welcome to GloWe',
            "Welcome — you're browsing as a guest. Sign in with Google anytime to participate."
        );
    }
}

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', function() {
    updateAuthUI();
    maybeShowGuestWelcome();
    // Bridge any live Supabase session (e.g. after a Google OAuth redirect)
    // into the local gloweUser store. The listener fires INITIAL_SESSION on
    // subscribe, which performs the first sync.
    attachSupabaseAuthListener();
});
