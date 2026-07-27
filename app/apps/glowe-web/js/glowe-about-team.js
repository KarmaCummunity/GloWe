// GloWe About team roster (FR-GLOWE-027) — pure helpers + role copy.
// Profile name/avatar come from about_team_profiles; role titles/bios are copy keys.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweAboutTeam = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const ROLE_COPY = {
        founder: {
            role: 'Founder & CEO',
            bio: 'Michal leads GloWe as founder and CEO — building a community where field knowledge and mutual support can travel further.'
        },
        tech_partner: {
            role: 'Technology partner & product developer',
            bio: 'Nave is the technology partner and product developer — shaping the platform that connects people, knowledge, and practical action.'
        }
    };

    function trim(value) {
        return String(value == null ? '' : value).trim();
    }

    function resolveRoleCopy(roleKey) {
        const copy = ROLE_COPY[String(roleKey || '')];
        if (!copy || typeof copy !== 'object') return null;
        return copy;
    }

    // fallow-ignore-next-line complexity
    function mapTeamRow(row) {
        const r = row || {};
        const roleKey = trim(r.role_key || r.roleKey);
        const copy = resolveRoleCopy(roleKey);
        if (!copy) return null;
        const userId = trim(r.user_id || r.userId);
        if (!userId) return null;
        return {
            roleKey: roleKey,
            sortOrder: Number(r.sort_order != null ? r.sort_order : r.sortOrder) || 0,
            userId: userId,
            displayName: trim(r.display_name || r.displayName) || 'GloWe member',
            avatarUrl: trim(r.avatar_url || r.avatarUrl) || '',
            shareHandle: trim(r.share_handle || r.shareHandle) || '',
            role: copy.role,
            bio: copy.bio,
            profileHref: 'profile?id=' + encodeURIComponent(userId)
        };
    }

    function mapTeamRows(rows) {
        const list = Array.isArray(rows) ? rows : [];
        return list
            .map(mapTeamRow)
            .filter(Boolean)
            .sort(function (a, b) {
                return a.sortOrder - b.sortOrder || a.roleKey.localeCompare(b.roleKey);
            });
    }

    function initialsFromName(name) {
        const parts = trim(name).split(/\s+/).filter(Boolean);
        if (!parts.length) return 'GW';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // Distinct from glowe-dev-auth escapeHtml (also escapes apostrophes for attribute safety).
    // fallow-ignore-next-line code-duplication
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function teamCardHtml(member) {
        const m = member || {};
        const name = escapeHtml(m.displayName);
        const role = escapeHtml(m.role);
        const bio = escapeHtml(m.bio);
        const href = escapeHtml(m.profileHref);
        const avatar = trim(m.avatarUrl);
        const avatarHtml = avatar
            ? '<img class="about-team-avatar" src="' + escapeHtml(avatar) + '" alt="" width="64" height="64">'
            : '<div class="about-team-avatar about-team-avatar--initials" aria-hidden="true">' +
                escapeHtml(initialsFromName(m.displayName)) + '</div>';
        return (
            '<article class="about-team-card">' +
                '<a class="about-team-card-link" href="' + href + '">' +
                    avatarHtml +
                    '<div class="about-team-meta">' +
                        '<h3 class="about-team-name">' + name + '</h3>' +
                        '<p class="about-team-role">' + role + '</p>' +
                    '</div>' +
                '</a>' +
                '<p class="about-team-bio">' + bio + '</p>' +
                '<a class="about-team-profile-cta" href="' + href + '">View profile</a>' +
            '</article>'
        );
    }

    function teamListHtml(members) {
        const list = Array.isArray(members) ? members : [];
        if (!list.length) return '';
        return (
            '<div class="about-team-grid">' +
                list.map(teamCardHtml).join('') +
            '</div>'
        );
    }

    return {
        ROLE_COPY: ROLE_COPY,
        resolveRoleCopy: resolveRoleCopy,
        mapTeamRow: mapTeamRow,
        mapTeamRows: mapTeamRows,
        initialsFromName: initialsFromName,
        teamCardHtml: teamCardHtml,
        teamListHtml: teamListHtml
    };
});
