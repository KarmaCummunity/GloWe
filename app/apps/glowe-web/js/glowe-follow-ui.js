// GloWe follow UI controller (FR-GLOWE-026) — profile/org slots, connections page.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweFollowUI = api;
})(typeof self !== 'undefined' ? self : this, function () {
    function deps() {
        return {
            backend: window.gloweBackend,
            GF: window.GloweFollow,
            guest: window.GloweGuest,
            esc: window.escapeHtml,
            js: window.jsString,
            mark: window.renderEntityMark,
            ready: window.backendReady,
            loggedIn: window.gloweIsLoggedIn,
            modal: window.showSuccessModal,
            loadCounts: window.loadFollowCounts
        };
    }

    function text(key) {
        return typeof window.gloweText === 'function' ? window.gloweText(key) : key;
    }

    function guestButtonHtml(GF, targetId) {
        return GF.followButtonHtml({ state: 'not_following_public', label: '+ Follow' }, targetId);
    }

    async function buttonHtmlForMember(d, viewerId, targetId) {
        const raw = await d.backend.kcGetFollowState(targetId).catch(function () { return null; });
        if (!raw) return '';
        const info = d.GF.deriveButtonState(raw, viewerId, targetId);
        const html = d.GF.followButtonHtml(info, targetId);
        return info.showNote ? html + d.GF.privateNoteHtml() : html;
    }

    async function resolveForViewer(d, me, targetId) {
        if (String(me.id) === String(targetId)) return '';
        return buttonHtmlForMember(d, me.id, targetId);
    }

    function canResolveFollow(d, targetId) {
        return !!(targetId && d.GF && d.ready());
    }

    async function resolveFollowButtonHtml(targetId) {
        const d = deps();
        if (!canResolveFollow(d, targetId)) return '';
        const me = await d.backend.currentUser().catch(function () { return null; });
        if (!me) return guestButtonHtml(d.GF, targetId);
        return resolveForViewer(d, me, targetId);
    }

    async function applyFollow(backend, GF, modal, targetId) {
        try {
            await backend.kcFollow(targetId);
            return true;
        } catch (e) {
            if (GF.isAlreadyFollowingError(e)) return true;
            modal('Could not follow', GF.mapFollowError(e).message || 'Something went wrong');
            return false;
        }
    }

    function confirmUnfollow(targetId) {
        const nameEl = document.querySelector('[data-follow-name="' + targetId + '"]');
        const name = (nameEl && nameEl.textContent) || text('this profile');
        const message = text('Stop following') + ' ' + name + '?';
        if (window.GloweUiDialog) {
            return window.GloweUiDialog.confirm({ title: text('Unfollow'), message: message, confirmLabel: text('Unfollow') });
        }
        return Promise.resolve(window.confirm(message));
    }

    async function applyUnfollow(backend, GF, modal, targetId) {
        if (!(await confirmUnfollow(targetId))) return false;
        try {
            await backend.kcUnfollow(targetId);
            return true;
        } catch (e) {
            modal('Could not unfollow', GF.mapFollowError(e).message || 'Something went wrong');
            return false;
        }
    }

    async function toggleByState(d, targetId, info) {
        if (info.state === 'following') {
            return applyUnfollow(d.backend, d.GF, d.modal, targetId);
        }
        if (info.state === 'not_following_public') {
            return applyFollow(d.backend, d.GF, d.modal, targetId);
        }
        return false;
    }

    async function executeToggle(d, me, targetId) {
        const raw = await d.backend.kcGetFollowState(targetId).catch(function () { return null; });
        const ok = await toggleByState(d, targetId, d.GF.deriveButtonState(raw || {}, me.id, targetId));
        if (ok) await refreshFollowUi(targetId);
    }

    async function runFollowToggle(targetId) {
        if (!targetId) return;
        const d = deps();
        const me = await d.backend.currentUser().catch(function () { return null; });
        if (!me) return;
        await executeToggle(d, me, targetId);
    }

    function handleFollowToggle(targetId) {
        const d = deps();
        const proceed = function () { return runFollowToggle(targetId); };
        if (d.guest) d.guest.requireMemberForAction('follow-profile', {}, proceed);
        else proceed();
    }

    function setCountText(selector, value) {
        const el = document.querySelector(selector);
        if (el) el.textContent = String(value);
    }

    async function refreshCountNodes(d, targetId) {
        const counts = await d.backend.kcPublicCounts(targetId).catch(function () { return null; });
        if (!counts) return;
        setCountText('[data-followers-count="' + targetId + '"]', counts.followers);
        setCountText('[data-following-count="' + targetId + '"]', counts.following);
    }

    async function refreshFollowUi(targetId) {
        const d = deps();
        const html = await resolveFollowButtonHtml(targetId);
        document.querySelectorAll('[data-follow-slot="' + targetId + '"]').forEach(function (n) {
            n.innerHTML = html;
        });
        await refreshCountNodes(d, targetId);
        if (typeof d.loadCounts === 'function') d.loadCounts();
    }

    async function fillSlot(id) {
        const html = await resolveFollowButtonHtml(id);
        document.querySelectorAll('[data-follow-slot="' + id + '"]').forEach(function (s) {
            s.innerHTML = html;
        });
    }

    async function hydrateFollowSlots(root) {
        const slots = (root || document).querySelectorAll('[data-follow-slot]');
        const ids = Array.from(slots).map(function (s) { return s.getAttribute('data-follow-slot'); });
        await Promise.all(Array.from(new Set(ids.filter(Boolean))).map(fillSlot));
    }

    function profileFollowStatsHtml(profileId) {
        const GF = window.GloweFollow;
        if (!profileId || !GF) return '';
        return '<a class="profile-stat-link" href="' + GF.connectionsPageUrl(profileId, 'followers') + '">' +
            '<strong data-followers-count="' + profileId + '">—</strong><span>Followers</span></a>' +
            '<a class="profile-stat-link" href="' + GF.connectionsPageUrl(profileId, 'following') + '">' +
            '<strong data-following-count="' + profileId + '">—</strong><span>Following</span></a>';
    }

    function personalFollowStatsHtml(profileId, followCounts) {
        const GF = window.GloweFollow;
        const c = followCounts || { followers: 0, following: 0 };
        if (!profileId || !GF) {
            return '<div><strong>' + c.followers + '</strong><span>Followers</span></div>' +
                '<div><strong>' + c.following + '</strong><span>Following</span></div>';
        }
        return '<a class="profile-stat-link" href="' + GF.connectionsPageUrl(profileId, 'followers') + '">' +
            '<strong data-followers-count="' + profileId + '">' + c.followers + '</strong><span>Followers</span></a>' +
            '<a class="profile-stat-link" href="' + GF.connectionsPageUrl(profileId, 'following') + '">' +
            '<strong data-following-count="' + profileId + '">' + c.following + '</strong><span>Following</span></a>';
    }

    function applyPublicCounts(container, profileId, counts) {
        const fEl = container.querySelector('[data-followers-count="' + profileId + '"]');
        const gEl = container.querySelector('[data-following-count="' + profileId + '"]');
        if (fEl) fEl.textContent = String(counts.followers);
        if (gEl) gEl.textContent = String(counts.following);
    }

    function canLoadPublicCounts(d, profileId, container) {
        return !!(profileId && container && d.GF && d.ready());
    }

    function loadProfilePublicFollowCounts(profileId, container) {
        const d = deps();
        if (!canLoadPublicCounts(d, profileId, container)) return;
        d.backend.kcPublicCounts(profileId).then(function (counts) {
            if (counts) applyPublicCounts(container, profileId, counts);
        }).catch(function () {});
    }

    function connectionsEmptyHtml(message) {
        return '<div class="empty-state"><h3>' + message + '</h3></div>';
    }

    function connectionsTabsHtml(userId, tab) {
        const GF = window.GloweFollow;
        return '<div class="connections-tabs">' +
            '<a class="' + (tab === 'followers' ? 'active' : '') + '" href="' + GF.connectionsPageUrl(userId, 'followers') + '">Followers</a>' +
            '<a class="' + (tab === 'following' ? 'active' : '') + '" href="' + GF.connectionsPageUrl(userId, 'following') + '">Following</a>' +
            '</div>';
    }

    function connectionsRowHtml(mapped) {
        const d = deps();
        return '<div class="connections-row">' +
            '<a class="connections-row-main" href="' + mapped.profileHref + '">' +
            d.mark(mapped.name, 'avatar') +
            '<strong data-follow-name="' + mapped.userId + '">' + d.esc(mapped.name) + '</strong></a>' +
            '<span class="follow-slot" data-follow-slot="' + mapped.userId + '" data-follow-name="' + d.js(mapped.name) + '"></span>' +
            '</div>';
    }

    async function fetchConnectionRows(backend, userId, tab) {
        if (tab === 'following') {
            return backend.kcListFollowing(userId).catch(function () { return []; });
        }
        return backend.kcListFollowers(userId).catch(function () { return []; });
    }

    async function paintEmptyConnections(container, head, tab) {
        const empty = tab === 'following' ? 'Not following anyone yet' : 'No followers yet';
        container.innerHTML = head + connectionsEmptyHtml(empty);
    }

    async function paintConnections(container, d, ownerName, userId, tab, rows) {
        const head = '<h2>' + d.esc(ownerName) + '</h2>' + connectionsTabsHtml(userId, tab);
        if (!rows.length) {
            await paintEmptyConnections(container, head, tab);
            return;
        }
        const ids = rows.map(function (r) { return r.user_id; });
        const gloweProfiles = await d.backend.kcCounterpartProfiles(ids).catch(function () { return {}; });
        const list = rows.map(function (r) {
            return connectionsRowHtml(d.GF.mapFollowListRow(r, gloweProfiles[r.user_id]));
        }).join('');
        container.innerHTML = head + '<div class="connections-list">' + list + '</div>';
        await hydrateFollowSlots(container);
    }

    async function renderConnectionsList(container, userId, tab) {
        const d = deps();
        container.innerHTML = connectionsEmptyHtml('Loading…');
        const profiles = await d.backend.kcCounterpartProfiles([userId]).catch(function () { return {}; });
        const ownerName = (profiles[userId] && profiles[userId].name) || 'GloWe member';
        const rows = await fetchConnectionRows(d.backend, userId, tab);
        await paintConnections(container, d, ownerName, userId, tab, rows);
    }

    function connectionsGateHtml(kind) {
        if (kind === 'signin') {
            return '<div class="empty-state"><h3>Sign in to see connections</h3><p>Followers and following lists are available after you sign in.</p><button class="btn btn-primary" type="button" onclick="handleGoogleSignIn()">Sign up / Sign in</button></div>';
        }
        if (kind === 'unavailable') {
            return '<div class="empty-state"><h3>Connections unavailable</h3><p>Please try again shortly.</p></div>';
        }
        return '<div class="empty-state"><h3>Profile not found</h3><p>Missing user id.</p></div>';
    }

    function connectionsQuery() {
        const params = new URLSearchParams(window.location.search);
        return {
            userId: params.get('user'),
            tab: params.get('tab') === 'following' ? 'following' : 'followers'
        };
    }

    function connectionsAccessGate(d) {
        if (!d.loggedIn()) return 'signin';
        if (!d.ready()) return 'unavailable';
        return null;
    }

    async function initConnectionsPage() {
        const container = document.getElementById('connections-content');
        if (!container) return;
        const gate = connectionsAccessGate(deps());
        if (gate) {
            container.innerHTML = connectionsGateHtml(gate);
            return;
        }
        const q = connectionsQuery();
        if (!q.userId) {
            container.innerHTML = connectionsGateHtml('missing');
            return;
        }
        await renderConnectionsList(container, q.userId, q.tab);
    }

    return {
        resolveFollowButtonHtml: resolveFollowButtonHtml,
        handleFollowToggle: handleFollowToggle,
        refreshFollowUi: refreshFollowUi,
        hydrateFollowSlots: hydrateFollowSlots,
        profileFollowStatsHtml: profileFollowStatsHtml,
        personalFollowStatsHtml: personalFollowStatsHtml,
        loadProfilePublicFollowCounts: loadProfilePublicFollowCounts,
        initConnectionsPage: initConnectionsPage
    };
});
