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

async function resolveSupabaseUserFromBridge(authEvent, sessionFromEvent) {
    // Prefer the session handed to onAuthStateChange — it is local and avoids a
    // network getUser() race that falsely reports null during rapid Home reloads
    // (which then cleared gloweUser and flashed the guest marketing home).
    if (sessionFromEvent && sessionFromEvent.user) {
        return sessionFromEvent.user;
    }
    if (authEvent === 'SIGNED_OUT') return null;

    const client = await window.gloweBackend.getClient();
    if (!client || !client.auth) return null;

    // getSession() reads persisted local storage; do NOT use getUser() here —
    // getUser() hits the network and can return null while the JWT is still valid.
    if (typeof client.auth.getSession === 'function') {
        const { data } = await client.auth.getSession();
        if (data && data.session && data.session.user) return data.session.user;
        return null;
    }

    // Fallback for older clients.
    return window.gloweBackend.currentUser();
}

function applySignedOutBridge(wasLoggedIn) {
    clearGloweIdentity();
    if (wasLoggedIn) {
        updateAuthUI();
        // Prefer in-place UI swap over location.reload(): a reload while Home is
        // being tapped repeatedly re-enters the guest HTML shell and stacks
        // async races. Pages that need a full re-render still refresh via
        // updateAuthUI / refreshPersonalAreaIfVisible.
        refreshPersonalAreaIfVisible();
        return;
    }
    refreshPersonalAreaIfVisible();
}

async function syncSupabaseSession(authEvent, sessionFromEvent) {
    if (!(window.gloweBackend && window.gloweBackend.configured())) return;

    let supabaseUser = null;
    try {
        supabaseUser = await resolveSupabaseUserFromBridge(authEvent, sessionFromEvent);
    } catch (error) {
        // Transient bridge failure — keep the cached gloweUser so we never flash
        // the guest home for a still-signed-in member.
        return;
    }

    if (!supabaseUser) {
        // Only tear down when Supabase confirms there is no local session
        // (SIGNED_OUT or getSession() empty). Never on a flaky getUser().
        applySignedOutBridge(isLoggedIn());
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
    client.auth.onAuthStateChange((event, session) => {
        // Defer to avoid the supabase-js deadlock when calling client methods
        // from inside the auth-state callback.
        setTimeout(() => { syncSupabaseSession(event, session); }, 0);
    });
}

// Wave 1.6 — email/password registration helpers removed (Google-only, D-61 / TD-143).

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

// Wave 1.6 — production auth is Google-only (FR-GLOWE-001 / D-61). Dev local
// personas still use the email form via GloweDevAuth; every other path routes
// to Google OAuth. The fake email-verification modal is gone.
function handleLogin(event) {
    event.preventDefault();
    if (window.GloweDevAuth && (window.GloweDevAuth.isActive() || window.GloweDevAuth.isLocalSupabaseConfigured())) {
        const emailEl = document.getElementById('login-email');
        const email = emailEl ? emailEl.value : '';
        signInAsDevPersona({ email, role: 'user', profileType: 'individual', approvalStatus: 'not_required' });
        return;
    }
    if (typeof handleGoogleSignIn === 'function') handleGoogleSignIn();
}

async function handleRegister(event) {
    event.preventDefault();
    if (typeof handleGoogleSignIn === 'function') handleGoogleSignIn();
}

function sendRegistrationEmailCode() {
    // No-op: fake email verification removed in Wave 1.6.
    if (typeof handleGoogleSignIn === 'function') handleGoogleSignIn();
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
    // FR-GLOWE-016 AC2 — swap guest ↔ member home immediately on auth change.
    if (typeof window.refreshHomeForAuthState === 'function') {
        window.refreshHomeForAuthState();
    }
    // FR-GLOWE-016 / TD-180 — refresh + (re)subscribe the chat unread badge.
    if (typeof window.refreshMessagesBadge === 'function') {
        window.refreshMessagesBadge();
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
