// GloWe bilingual display names (FR-GLOWE-024).
//
// Proper names are NOT routed through the UGC translation cache
// (FR-TRANSLATE-005 AC4). Instead each person/org stores an English variant
// (display_name_en / org_name_en) and content snapshots stamp author_name_en /
// organization_en at create time. This module picks the right variant for the
// reader's interface language.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweLocalizedName = api;
})(typeof self !== 'undefined' ? self : this, function () {
    // Non-Latin letter scripts that need an English variant.
    const NON_LATIN = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u4E00-\u9FFF]/;

    function trim(value) {
        return String(value == null ? '' : value).trim();
    }

    // True when the text has no Hebrew/Arabic/Cyrillic/Greek/CJK letters.
    function isPrimarilyLatin(text) {
        const t = trim(text);
        if (!t) return true;
        return !NON_LATIN.test(t);
    }

    // Reader language: EN prefers the English column; otherwise the primary
    // (source) name. Always falls back to whichever is non-empty.
    function resolveLocalizedName(primary, english, lang) {
        const p = trim(primary);
        const e = trim(english);
        if (String(lang || '').toLowerCase().split('-')[0] === 'en') {
            return e || p || '';
        }
        return p || e || '';
    }

    // Source + English pair for a fromProfileRow-shaped profile (FR-GLOWE-024).
    function profileNamePair(profile) {
        const p = profile || {};
        const isOrg = p.accountType === 'organization';
        if (isOrg) {
            return {
                primary: trim(p.orgName || p.name),
                english: trim(p.orgNameEn || p.nameEn)
            };
        }
        return {
            primary: trim(p.name),
            english: trim(p.nameEn)
        };
    }

    // First token of the localized display name (welcome / header chips).
    function localizedFirstName(profile, lang, fallback) {
        const display = localizedProfileName(profile, lang) || fallback || 'there';
        return display.split(/\s+/).filter(Boolean)[0] || fallback || 'there';
    }

    // Person vs organization display name from a fromProfileRow-shaped profile.
    function localizedProfileName(profile, lang) {
        const p = profile || {};
        const isOrg = p.accountType === 'organization';
        if (isOrg) {
            return resolveLocalizedName(
                p.orgName || p.name,
                p.orgNameEn || p.nameEn,
                lang
            ) || 'Organization';
        }
        return resolveLocalizedName(p.name, p.nameEn, lang) || 'GloWe Member';
    }

    // Author snapshot on a post/wish card (primary + optional English).
    function localizedAuthorName(row, lang, fallback) {
        const r = row || {};
        const primary = r.authorName != null ? r.authorName : r.author_name;
        const english = r.authorNameEn != null ? r.authorNameEn : r.author_name_en;
        return resolveLocalizedName(primary, english, lang) || fallback || 'Community Member';
    }

    // Organization snapshot on an opportunity card.
    function localizedOrganizationName(row, lang, fallback) {
        const r = row || {};
        const primary = r.organization;
        const english = r.organizationEn != null ? r.organizationEn : r.organization_en;
        return resolveLocalizedName(primary, english, lang) || fallback || 'GloWe Member';
    }

    // When English is blank and the primary is already Latin, copy it.
    function englishNameOrCopy(primary, english) {
        const e = trim(english);
        if (e) return e;
        const p = trim(primary);
        if (p && isPrimarilyLatin(p)) return p;
        return '';
    }

    // True when a fromProfileRow-shaped profile still needs an English fill.
    function profileNeedsEnglishName(profile) {
        const p = profile || {};
        const isOrg = p.accountType === 'organization';
        if (isOrg) {
            const primary = trim(p.orgName || p.name);
            const english = trim(p.orgNameEn || p.nameEn);
            return Boolean(primary) && !english && !isPrimarilyLatin(primary);
        }
        const primary = trim(p.name);
        const english = trim(p.nameEn);
        return Boolean(primary) && !english && !isPrimarilyLatin(primary);
    }

    // Apply { id, displayNameEn?, orgNameEn? } patches onto profile objects.
    function applyEnglishNamePatches(profiles, patches) {
        const byId = {};
        (patches || []).forEach(function (patch) {
            if (patch && patch.id) byId[String(patch.id)] = patch;
        });
        return (profiles || []).map(function (profile) {
            if (!profile || !profile.id) return profile;
            const patch = byId[String(profile.id)];
            if (!patch) return profile;
            const next = Object.assign({}, profile);
            if (patch.displayNameEn) next.nameEn = patch.displayNameEn;
            if (patch.orgNameEn) next.orgNameEn = patch.orgNameEn;
            return next;
        });
    }

    // Best English name from a generate-name-en profile patch.
    function englishFromProfilePatch(patch) {
        if (!patch) return '';
        return trim(patch.orgNameEn) || trim(patch.displayNameEn) || '';
    }

    // Stamp missing authorNameEn / authorEn on posts/comments from profile
    // patches keyed by authorId / userId.
    function applyAuthorEnglishFromProfiles(items, patches, idKeys) {
        const keys = idKeys && idKeys.length ? idKeys : ['authorId', 'userId'];
        const byId = {};
        (patches || []).forEach(function (patch) {
            if (patch && patch.id) byId[String(patch.id)] = englishFromProfilePatch(patch);
        });
        return (items || []).map(function (item) {
            if (!item) return item;
            const existing = trim(item.authorNameEn) || trim(item.authorEn);
            if (existing) return item;
            let authorId = '';
            for (let i = 0; i < keys.length; i += 1) {
                if (item[keys[i]]) {
                    authorId = String(item[keys[i]]);
                    break;
                }
            }
            const english = authorId ? byId[authorId] : '';
            if (!english) return item;
            const next = Object.assign({}, item);
            if (Object.prototype.hasOwnProperty.call(item, 'authorName') || Object.prototype.hasOwnProperty.call(item, 'authorNameEn')) {
                next.authorNameEn = english;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'author') || Object.prototype.hasOwnProperty.call(item, 'authorEn')) {
                next.authorEn = english;
            }
            return next;
        });
    }

    // True when a post/comment-like row still needs an English author fill.
    function authorNeedsEnglishName(row) {
        const r = row || {};
        const primary = trim(r.authorName != null ? r.authorName : r.author);
        const english = trim(r.authorNameEn != null ? r.authorNameEn : (r.authorEn || ''));
        return Boolean(primary) && !english && !isPrimarilyLatin(primary);
    }

    // True when an opportunity row still needs an English organization fill.
    function organizationNeedsEnglishName(row) {
        const r = row || {};
        const primary = trim(r.organization);
        const english = trim(r.organizationEn != null ? r.organizationEn : r.organization_en);
        return Boolean(primary) && !english && !isPrimarilyLatin(primary);
    }

    // Stamp missing organizationEn from owner profile patches (generate-on-read).
    function applyOrganizationEnglishFromProfiles(items, patches) {
        const byId = {};
        (patches || []).forEach(function (patch) {
            if (patch && patch.id) byId[String(patch.id)] = patch;
        });
        return (items || []).map(function (item) {
            if (!item || !organizationNeedsEnglishName(item)) return item;
            const ownerId = item.ownerId || item.userId;
            if (!ownerId) return item;
            const patch = byId[String(ownerId)];
            if (!patch) return item;
            const english = trim(patch.orgNameEn) || trim(patch.displayNameEn);
            if (!english) return item;
            const next = Object.assign({}, item);
            next.organizationEn = english;
            return next;
        });
    }

    const NAME_MARK_CLASSES = ['entity-mark', 'avatar', 'comment-avatar', 'wish-image'];

    function isNameMark(el) {
        if (!el || !el.classList) return false;
        for (let i = 0; i < NAME_MARK_CLASSES.length; i += 1) {
            if (el.classList.contains(NAME_MARK_CLASSES[i])) return true;
        }
        return false;
    }

    function initialsForName(name) {
        return String(name || '')
            .replace(/&/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (word) { return word[0]; })
            .join('')
            .toUpperCase() || 'GW';
    }

    // When the UGC toggle shows source prose, show the primary name; otherwise
    // follow the reader interface language (FR-GLOWE-024 + FR-TRANSLATE-005 AC7).
    function nameForToggleView(primary, english, lang, showingSource) {
        if (showingSource) return trim(primary) || trim(english) || '';
        return resolveLocalizedName(primary, english, lang);
    }

    function applyToggleNamesInCard(card, showingSource, lang) {
        if (!card || !card.querySelectorAll) return;
        card.querySelectorAll('[data-ln-primary]').forEach(function (el) {
            if (el.closest('[data-tr-card]') !== card) return;
            const primary = el.getAttribute('data-ln-primary') || '';
            const english = el.getAttribute('data-ln-english') || '';
            const text = nameForToggleView(primary, english, lang, showingSource);
            el.textContent = isNameMark(el) ? initialsForName(text) : text;
        });
    }

    return {
        isPrimarilyLatin: isPrimarilyLatin,
        resolveLocalizedName: resolveLocalizedName,
        profileNamePair: profileNamePair,
        localizedFirstName: localizedFirstName,
        localizedProfileName: localizedProfileName,
        localizedAuthorName: localizedAuthorName,
        localizedOrganizationName: localizedOrganizationName,
        englishNameOrCopy: englishNameOrCopy,
        profileNeedsEnglishName: profileNeedsEnglishName,
        applyEnglishNamePatches: applyEnglishNamePatches,
        englishFromProfilePatch: englishFromProfilePatch,
        applyAuthorEnglishFromProfiles: applyAuthorEnglishFromProfiles,
        authorNeedsEnglishName: authorNeedsEnglishName,
        organizationNeedsEnglishName: organizationNeedsEnglishName,
        applyOrganizationEnglishFromProfiles: applyOrganizationEnglishFromProfiles,
        nameForToggleView: nameForToggleView,
        applyToggleNamesInCard: applyToggleNamesInCard,
        initialsForName: initialsForName
    };
});
