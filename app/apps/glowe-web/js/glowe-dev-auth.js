// Local-dev-only sign-in helpers (localhost + local Supabase).
// Production and hosted dev keep Google-only auth (FR-GLOWE-001 AC2a).
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweDevAuth = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
    const DEFAULT_PASSWORD = 'GloweLocal!2026';

    const PERSONA_GROUPS = [
        {
            id: 'individual',
            title: 'Individual member',
            hint: 'Regular community member — seeded personas or a brand-new user.',
            items: [
                { kind: 'existing', email: 'glowe-local-alex@example.test', name: 'Alex Rivera', subtitle: 'Individual · seeded' },
                { kind: 'existing', email: 'glowe-local-sam@example.test', name: 'Sam Chen', subtitle: 'Individual · seeded' },
                { kind: 'existing', email: 'glowe-local-riley@example.test', name: 'Riley Stone', subtitle: 'Individual · seeded' },
                { kind: 'new', variant: 'individual', label: 'New individual', subtitle: 'Creates a fresh test user' }
            ]
        },
        {
            id: 'admin',
            title: 'Platform admin',
            hint: 'Full GloWe admin console (glowe_admin role).',
            items: [
                {
                    kind: 'existing',
                    email: 'glowe-local-admin@example.test',
                    name: 'Local Admin',
                    subtitle: 'Admin · seeded on first use',
                    role: 'admin',
                    profileType: 'individual'
                },
                { kind: 'new', variant: 'admin', label: 'New admin', subtitle: 'Fresh user + glowe_admin grant' }
            ]
        },
        {
            id: 'organization',
            title: 'Organization',
            hint: 'Org profiles with approval flows — same shapes as production.',
            items: [
                {
                    kind: 'existing',
                    email: 'glowe-local-org-harbor-food@example.test',
                    name: 'Harbor Food Circle',
                    subtitle: 'Organization · approved',
                    profileType: 'organization',
                    approvalStatus: 'approved'
                },
                {
                    kind: 'existing',
                    email: 'glowe-local-org-garden-futures@example.test',
                    name: 'Garden Futures Collective',
                    subtitle: 'Organization · pending approval',
                    profileType: 'organization',
                    approvalStatus: 'pending'
                },
                { kind: 'new', variant: 'org-approved', label: 'New organization (approved)', subtitle: 'Skip the approval queue' },
                { kind: 'new', variant: 'org-pending', label: 'New organization (pending)', subtitle: 'Test org review flow' }
            ]
        }
    ];

    // Flat list kept for tests and E2E helpers.
    const PERSONAS = PERSONA_GROUPS.flatMap((group) => group.items.filter((item) => item.kind === 'existing'));

    function isLocalHostname(hostname) {
        return LOCAL_HOSTS.has(String(hostname || '').toLowerCase());
    }

    function isLocalSupabaseUrl(url) {
        try {
            return LOCAL_HOSTS.has(new URL(url).hostname);
        } catch (_e) {
            return false;
        }
    }

    function isProductionHostedPage(loc) {
        const host = String(loc.hostname || '').toLowerCase();
        return host.endsWith('.pages.dev') || host.includes('karma-community');
    }

    function getBackendConfig(config) {
        if (config) return config;
        const g = typeof globalThis !== 'undefined' ? globalThis : root;
        return (g && g.GLOWE_BACKEND_CONFIG) || {};
    }

    function isLocalSupabaseConfigured(config) {
        const cfg = getBackendConfig(config);
        return isLocalSupabaseUrl(cfg.supabaseUrl || '');
    }

    function isActive(config, locationLike) {
        // When backend-config points at local Supabase, we are in local dev mode.
        if (!isLocalSupabaseConfigured(config)) return false;
        const loc = locationLike || (typeof location !== 'undefined' ? location : null);
        if (loc && isProductionHostedPage(loc)) return false;
        return true;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function createDevEmail(variant) {
        const stamp = Date.now().toString(36);
        const map = {
            individual: 'dev-individual-' + stamp + '@local.dev',
            admin: 'dev-admin-' + stamp + '@local.dev',
            'org-approved': 'dev-org-approved-' + stamp + '@local.dev',
            'org-pending': 'dev-org-pending-' + stamp + '@local.dev'
        };
        return map[variant] || ('dev-user-' + stamp + '@local.dev');
    }

    function createDevDisplayName(variant) {
        const map = {
            individual: 'Dev Individual',
            admin: 'Dev Admin',
            'org-approved': 'Dev Org Approved',
            'org-pending': 'Dev Org Pending'
        };
        return map[variant] || 'Dev User';
    }

    function signInPayloadFromItem(item) {
        if (item.kind === 'new') {
            const variant = item.variant;
            const profileType = variant === 'admin' || variant === 'individual' ? 'individual' : 'organization';
            const approvalStatus = variant === 'org-pending'
                ? 'pending'
                : (variant === 'org-approved' ? 'approved' : 'not_required');
            return {
                email: createDevEmail(variant),
                displayName: createDevDisplayName(variant),
                role: variant === 'admin' ? 'admin' : 'user',
                profileType,
                approvalStatus
            };
        }
        return {
            email: item.email,
            displayName: item.name,
            role: item.role || 'user',
            profileType: item.profileType || 'individual',
            approvalStatus: item.approvalStatus || (item.profileType === 'organization' ? 'pending' : 'not_required')
        };
    }

    function personaButtonHtml(item) {
        const payload = signInPayloadFromItem(item);
        const attrs = [
            'type="button"',
            'class="dev-auth-persona-btn' + (item.kind === 'new' ? ' dev-auth-persona-btn--new' : '') + '"',
            'data-dev-signin-email="' + escapeHtml(payload.email) + '"',
            'data-dev-signin-role="' + escapeHtml(payload.role) + '"',
            'data-dev-signin-profile-type="' + escapeHtml(payload.profileType) + '"',
            'data-dev-signin-approval="' + escapeHtml(payload.approvalStatus) + '"',
            'data-dev-signin-name="' + escapeHtml(payload.displayName) + '"'
        ];
        if (item.kind === 'new') {
            attrs.push('data-dev-signin-new="' + escapeHtml(item.variant) + '"');
        }
        const title = item.kind === 'new' ? item.label : item.name;
        const subtitle = item.subtitle || '';
        return (
            '<button ' + attrs.join(' ') + '>' +
            '<span class="dev-auth-persona-name">' + escapeHtml(title) + '</span>' +
            '<span class="dev-auth-persona-type">' + escapeHtml(subtitle) + '</span>' +
            '</button>'
        );
    }

    function personaGroupsHtml() {
        return PERSONA_GROUPS.map((group) => (
            '<section class="dev-auth-group" data-dev-auth-group="' + escapeHtml(group.id) + '">' +
            '<h3 class="dev-auth-group-title">' + escapeHtml(group.title) + '</h3>' +
            '<p class="dev-auth-group-hint">' + escapeHtml(group.hint) + '</p>' +
            '<div class="dev-auth-persona-grid">' +
            group.items.map(personaButtonHtml).join('') +
            '</div>' +
            '</section>'
        )).join('');
    }

    function loginModalHtml() {
        return (
            '<span class="close-modal" onclick="closeModal(\'login-modal\')">&times;</span>' +
            '<h2>Local dev sign-in</h2>' +
            '<p class="modal-intro">Google OAuth is disabled on the local Supabase stack. Pick a test persona below — each option mints a real Supabase session (same as production after sign-in).</p>' +
            '<div class="dev-auth-panel" data-no-i18n>' +
            personaGroupsHtml() +
            '<details class="dev-auth-advanced">' +
            '<summary>Advanced: email + password</summary>' +
            '<form id="login-form" class="dev-auth-form" onsubmit="handleLogin(event)">' +
            '<div class="form-group">' +
            '<label for="login-email">Email</label>' +
            '<input id="login-email" name="email" type="email" autocomplete="username" required placeholder="glowe-local-alex@example.test">' +
            '</div>' +
            '<div class="form-group">' +
            '<label for="login-password">Password</label>' +
            '<input id="login-password" name="password" type="password" autocomplete="current-password" required placeholder="' + DEFAULT_PASSWORD + '">' +
            '</div>' +
            '<button type="submit" class="btn btn-primary btn-block">Sign in with password</button>' +
            '</form>' +
            '</details>' +
            '<p class="dev-auth-footnote">Local only · password <code>' + DEFAULT_PASSWORD + '</code> · requires <code>mock-login</code> Edge Function</p>' +
            '</div>'
        );
    }

    return {
        DEFAULT_PASSWORD,
        PERSONAS,
        PERSONA_GROUPS,
        isActive,
        isLocalHostname,
        isLocalSupabaseUrl,
        isLocalSupabaseConfigured,
        createDevEmail,
        signInPayloadFromItem,
        loginModalHtml,
        personaGroupsHtml
    };
});
