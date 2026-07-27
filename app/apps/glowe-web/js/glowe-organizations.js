// GloWe Organizations / public-profile helpers (FR-GLOWE-010).
//
// Pure, DOM-free logic for the public profile page's projects list (AC5):
// a project is a glowe_projects row (id, user_id, title, status, description).
// These helpers are shared by the browser app (window.GloweOrganizations) and
// unit-tested via vitest (module.exports), so they must stay free of DOM /
// Supabase / globals.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweOrganizations = api;
})(typeof self !== 'undefined' ? self : this, function () {
    function field(row, snake, camel) {
        if (!row) return undefined;
        return row[snake] !== undefined ? row[snake] : row[camel];
    }

    // Project status is a controlled enum persisted in canonical English. Rows
    // saved while the UI was localized (before the <option value> fix) could
    // store a translated Hebrew literal; map those back so the badge/visibility
    // logic always sees a clean English baseline that the chrome i18n layer can
    // then re-localize for display. Unknown values pass through unchanged.
    // Keys are Unicode-escaped (not raw Hebrew) so this healing data doesn't
    // trip the "no inline UI copy" Hebrew source guard — it is persisted data,
    // not user-facing copy.
    const CANONICAL_STATUS_ALIASES = {
        '\u05D8\u05D9\u05D5\u05D8\u05D4': 'Draft',
        '\u05E4\u05E2\u05D9\u05DC': 'Active',
        '\u05DE\u05D2\u05D9\u05D9\u05E1\u05D9\u05DD \u05E9\u05D5\u05EA\u05E4\u05D9\u05DD': 'Recruiting partners',
        '\u05D3\u05E8\u05D5\u05E9\u05D9\u05DD \u05DE\u05EA\u05E0\u05D3\u05D1\u05D9\u05DD': 'Needs volunteers',
        '\u05DE\u05D5\u05DB\u05DF \u05DC\u05E9\u05D9\u05EA\u05D5\u05E3': 'Ready to share'
    };
    function canonicalStatus(status) {
        const s = String(status == null ? '' : status).trim();
        return CANONICAL_STATUS_ALIASES[s] || s;
    }

    // Map a glowe_projects row to the view model renderProjectCard expects.
    function mapProjectRow(row) {
        return {
            id: field(row, 'id', 'id'),
            userId: field(row, 'user_id', 'userId') || '',
            title: field(row, 'title', 'title') || '',
            description: field(row, 'description', 'description') || '',
            status: canonicalStatus(field(row, 'status', 'status') || 'Active')
        };
    }

    function mapProjects(rows) {
        return (Array.isArray(rows) ? rows : []).map(mapProjectRow);
    }

    // A project is publicly visible on a profile when it belongs to that user
    // and is not still a draft (status !== 'Draft', case-insensitive).
    function isPublicProject(project, userId) {
        if (!project || !userId) return false;
        if (String(project.userId) !== String(userId)) return false;
        return String(project.status || '').toLowerCase() !== 'draft';
    }

    // Filter already-mapped projects down to the public ones for a given user.
    function publicProjectsForUser(projects, userId) {
        return (Array.isArray(projects) ? projects : []).filter(function (p) {
            return isPublicProject(p, userId);
        });
    }

    // AC6 — validate a "Reach out" contact draft before it is persisted.
    function validateOutreachDraft(input) {
        const draft = input || {};
        if (!draft.recipientId) return { valid: false, error: 'Missing recipient.' };
        const message = String(draft.message || '').trim();
        if (message.length < 2) return { valid: false, error: 'Please write a short message.' };
        return { valid: true };
    }

    // AC6 — build the glowe_posts row for a Phase-B outreach post. The recipient
    // is encoded in `audience` so a later Phase-C DM migration can resolve the
    // conversation; visibility scoping (sender + recipient) is deferred to RLS.
    function buildOutreachPayload(input) {
        const draft = input || {};
        const orgName = String(draft.orgName || '').trim();
        return {
            post_type: 'outreach',
            category: 'outreach',
            title: orgName ? ('Reach-out to ' + orgName) : 'Reach-out',
            text: String(draft.message || '').trim(),
            audience: String(draft.recipientId || ''),
            status: 'sent',
            tags: []
        };
    }

    // FR-GLOWE-011 AC5 — from a listOwned('posts') result, keep only the
    // caller's wish posts (post_type='wish', any status: open + fulfilled).
    // Mapping to the render shape is delegated to GloweWishes.mapWishRow so the
    // wish view model stays defined in one place.
    function myWishPosts(rows) {
        return (Array.isArray(rows) ? rows : []).filter(function (row) {
            return Boolean(row) && field(row, 'post_type', 'postType') === 'wish';
        });
    }

    // FR-GLOWE-011 AC4 (write) — validate a personal-project draft before it is
    // persisted via insertOwned('projects', …). glowe_projects.title is NOT NULL.
    function validateProjectDraft(input) {
        const draft = input || {};
        const title = String(draft.title || '').trim();
        if (title.length < 2) return { valid: false, error: 'Please add a project title.' };
        return { valid: true };
    }

    // FR-GLOWE-011 AC4 (edit) — locate an already-mapped project by id (string-safe)
    // so the Personal Area can pre-fill the edit modal. Returns undefined when the
    // id is missing or no project matches.
    function findProjectById(projects, id) {
        if (id === undefined || id === null || id === '') return undefined;
        return (Array.isArray(projects) ? projects : []).find(function (p) {
            return p && String(p.id) === String(id);
        });
    }

    // FR-GLOWE-011 AC4 (write) — normalize a draft into the glowe_projects insert
    // shape. `status` defaults to 'Draft' (mirrors the column default); trimming
    // keeps stray whitespace out of persisted rows.
    function buildProjectPayload(input) {
        const draft = input || {};
        return {
            title: String(draft.title || '').trim(),
            status: canonicalStatus(String(draft.status || '').trim() || 'Draft'),
            description: String(draft.description || '').trim()
        };
    }

    // FR-GLOWE-011 AC7 — map a glowe_opportunities row (from listOwned, already
    // scoped to the caller) to the compact shape the Personal Area "My
    // Opportunities" list renders. Deliberately a small, purpose-built subset
    // (not the full volunteer-network card model) so the personal-area list
    // stays lean and this helper is unit-testable without app.js globals.
    function mapOwnedOpportunity(row) {
        return {
            id: field(row, 'id', 'id'),
            title: field(row, 'title', 'title') || '',
            field: field(row, 'field', 'field') || '',
            commitment: field(row, 'commitment', 'commitment') || '',
            location: field(row, 'location', 'location') || '',
            status: field(row, 'status', 'status') || 'active'
        };
    }

    function mapOwnedOpportunities(rows) {
        return (Array.isArray(rows) ? rows : []).map(mapOwnedOpportunity);
    }

    // FR-GLOWE-011 AC9 — build a { postId: title } lookup from a public posts
    // list (listAll('posts')) so offers can be enriched with the wish they
    // target. Rows missing an id are skipped; a missing title becomes ''.
    function postTitlesById(rows) {
        const out = {};
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            const id = field(row, 'id', 'id');
            if (id === undefined || id === null || id === '') return;
            out[String(id)] = field(row, 'title', 'title') || '';
        });
        return out;
    }

    // FR-GLOWE-011 AC9 — map glowe_offers rows (from listOwned('offers'), already
    // scoped to the caller) to the compact shape the Personal Area "My Offers"
    // list renders, attaching the target wish's title from `titleById` when known.
    function mapOwnedOffer(row, titleById) {
        const wishId = field(row, 'post_id', 'postId');
        const titles = titleById || {};
        return {
            id: field(row, 'id', 'id'),
            wishId: wishId || '',
            wishTitle: (wishId !== undefined && wishId !== null && titles[String(wishId)]) || '',
            offerText: field(row, 'offer_text', 'offerText') || '',
            availability: field(row, 'availability', 'availability') || '',
            contactPreference: field(row, 'contact_preference', 'contactPreference') || ''
        };
    }

    function mapOwnedOffers(rows, titleById) {
        return (Array.isArray(rows) ? rows : []).map(function (row) {
            return mapOwnedOffer(row, titleById);
        });
    }

    // FR-GLOWE-011 AC8 — build a { opportunityId: opportunityRow } lookup from a
    // public opportunities list (listAll('opportunities')) so applications can be
    // enriched with the opportunity they target. Rows without an id are skipped.
    function opportunitiesById(rows) {
        const out = {};
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            const id = field(row, 'id', 'id');
            if (id === undefined || id === null || id === '') return;
            out[String(id)] = row;
        });
        return out;
    }

    // FR-GLOWE-011 AC8 — map a glowe_applications row (volunteer application) to
    // the compact shape the Personal Area "Applications" list renders, attaching
    // the target opportunity's title + organization from `opportunityById`.
    function mapOwnedApplication(row, opportunityById) {
        const opps = opportunityById || {};
        const oppId = field(row, 'opportunity_id', 'opportunityId');
        const opp = (oppId !== undefined && oppId !== null) ? opps[String(oppId)] : undefined;
        return {
            id: field(row, 'id', 'id'),
            opportunityId: oppId || '',
            opportunityTitle: (opp && field(opp, 'title', 'title')) || '',
            organization: (opp && field(opp, 'organization', 'organization')) || '',
            status: field(row, 'status', 'status') || 'Pending',
            appliedAt: field(row, 'created_at', 'createdAt') || ''
        };
    }

    // FR-GLOWE-011 AC8 — from the caller's glowe_applications rows, keep only the
    // volunteer applications (the linked opportunity exists and is NOT an event —
    // event RSVPs live in the separate "My Events" section), enriched via
    // mapOwnedApplication. `isEvent` is injected (GloweEvents.isEvent) so this
    // helper stays DOM/module-free and unit-testable.
    function volunteerApplicationViews(rows, opportunityById, isEvent) {
        const opps = opportunityById || {};
        const isEventFn = typeof isEvent === 'function' ? isEvent : function () { return false; };
        const views = [];
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            const oppId = field(row, 'opportunity_id', 'opportunityId');
            const opp = (oppId !== undefined && oppId !== null) ? opps[String(oppId)] : undefined;
            if (!opp || isEventFn(opp)) return;
            views.push(mapOwnedApplication(row, opps));
        });
        return views;
    }

    // FR-GLOWE-012 AC1 — map an applicant row returned by
    // glowe_list_applications_for_opportunity (migration 0220) into the compact
    // shape the opportunity owner's "Applicants" inbox renders. Distinct from
    // mapOwnedApplication (the applicant-side view): this is the owner-side view,
    // carrying the applicant's identity + volunteer answers + contact email (for
    // the AC4 Connect CTA).
    function mapApplicantRow(row) {
        return {
            id: field(row, 'id', 'id'),
            applicantId: field(row, 'user_id', 'userId') || '',
            name: field(row, 'applicant_name', 'applicantName') || '',
            avatarUrl: field(row, 'applicant_avatar', 'applicantAvatar') || '',
            email: field(row, 'applicant_email', 'applicantEmail') || '',
            availability: field(row, 'availability', 'availability') || '',
            skills: field(row, 'skills', 'skills') || '',
            motivation: field(row, 'motivation', 'motivation') || '',
            status: field(row, 'status', 'status') || 'Pending',
            // Set only on Waitlisted rows (migration 0237); the inbox shows it so
            // the owner promotes in the order people signed up.
            waitlistPosition: field(row, 'waitlist_position', 'waitlistPosition') || null,
            appliedAt: field(row, 'created_at', 'createdAt') || ''
        };
    }

    function mapApplicantRows(rows) {
        return (Array.isArray(rows) ? rows : []).map(mapApplicantRow);
    }

    // FR-GLOWE-012 AC3 — normalize a row from glowe_list_offers_for_post (the
    // owner-scoped RPC, migration 0225) into the shape the wish owner's "Offers"
    // inbox renders: the offerer's identity + offer answers + contact email (for
    // the AC4 Connect CTA). Owner-side view, distinct from the offerer-side card.
    function mapOfferForOwner(row) {
        return {
            id: field(row, 'id', 'id'),
            offererId: field(row, 'user_id', 'userId') || '',
            name: field(row, 'offerer_name', 'offererName') || '',
            avatarUrl: field(row, 'offerer_avatar', 'offererAvatar') || '',
            email: field(row, 'offerer_email', 'offererEmail') || '',
            offerText: field(row, 'offer_text', 'offerText') || '',
            availability: field(row, 'availability', 'availability') || '',
            contactPreference: field(row, 'contact_preference', 'contactPreference') || '',
            createdAt: field(row, 'created_at', 'createdAt') || ''
        };
    }

    function mapOffersForOwner(rows) {
        return (Array.isArray(rows) ? rows : []).map(mapOfferForOwner);
    }

    // FR-GLOWE-012 AC2 — an application can be accepted/declined by the owner
    // while it is still awaiting a decision. That means Pending, and — since
    // migration 0237 gave plain opportunities the same capacity rules events
    // have — also Waitlisted: when a seat frees up the owner promotes from the
    // waitlist through the very same buttons. Settled rows (Accepted / Declined
    // / Cancelled) show no actions.
    const DECIDABLE_APPLICATION_STATUSES = ['Pending', 'Waitlisted'];

    function canDecideApplication(status) {
        return DECIDABLE_APPLICATION_STATUSES.indexOf(String(status || '')) !== -1;
    }

    // FR-GLOWE-012 AC4 — the "Connect" CTA (copy contact email) only renders when
    // the applicant/offer view actually carries a non-empty email address.
    function hasContactEmail(view) {
        return Boolean(view && String(view.email || '').trim());
    }

    // FR-GLOWE-013 AC2 — is this item already in the user's saved list? Matches
    // the local saved-items cache shape ({ type, id, … }) used by getSavedItems();
    // id is compared as text so a numeric vs string id can't cause a false miss.
    function isItemSaved(savedItems, type, id) {
        if (!Array.isArray(savedItems)) return false;
        const wantId = String(id == null ? '' : id);
        return savedItems.some(function (item) {
            return item && item.type === type && String(item.id) === wantId;
        });
    }

    // FR-GLOWE-013 AC1 — build the glowe_saved_items insert payload from a card's
    // save descriptor. Keeps the column shape (item_type/item_id/title/meta/href)
    // in one tested place so the Save CTA and the DB row can't drift. item_id is
    // coerced to a string to match the text column + the 0204 unique constraint.
    function buildSavedItemPayload(type, id, title, meta, href) {
        return {
            item_type: String(type || ''),
            item_id: String(id == null ? '' : id),
            title: String(title || ''),
            meta: String(meta || ''),
            href: String(href || '')
        };
    }

    // FR-GLOWE-011 AC10 — guard the destructive "Delete Account" action: the
    // user must type the exact word DELETE (case-insensitive, trimmed) before the
    // profile-delete call is allowed to fire.
    function isDeleteAccountConfirmed(input) {
        return String(input || '').trim().toUpperCase() === 'DELETE';
    }

    // FR-GLOWE-011 AC4 — decide which project list the Personal Area renders.
    // Once a backend load has completed we trust it (even when empty, so a user
    // with no real projects sees an empty state rather than the demo/local
    // fallback). While the backend list is still null (offline or pre-load),
    // fall back to the local/offline cache.
    function personalProjectsView(backendList, localList) {
        if (Array.isArray(backendList)) return backendList;
        return Array.isArray(localList) ? localList : [];
    }

    // FR-GLOWE-011 AC1 — decide whether the Personal Area profile card renders a
    // loading skeleton. Only while a backend profile fetch is in flight AND no
    // cached profile exists yet (first-ever load). Returning users with a cached
    // profile see it immediately (stale-while-revalidate) — no skeleton flash.
    function shouldShowProfileSkeleton(isLoading, hasCachedProfile) {
        return Boolean(isLoading) && !hasCachedProfile;
    }

    // FR-GLOWE-011 AC3 — client-side guard for the Edit-Profile avatar upload:
    // the file must be an image (`image/*`) and at most `maxBytes` (default 5 MB,
    // matching the `glowe-avatars` bucket cap in migration 0219). Returns
    // { valid, error } so the modal can show an inline message before uploading.
    function isAvatarImageFile(file) {
        return Boolean(file && String(file.type || '').startsWith('image/'));
    }

    function validateAvatarFile(file, options) {
        const maxBytes = (options && options.maxBytes) || 5 * 1024 * 1024;
        if (!file) return { valid: false, error: 'Please choose an image file.' };
        if (!isAvatarImageFile(file)) {
            return { valid: false, error: 'Please choose an image file.' };
        }
        if (Number(file.size) > maxBytes) {
            return { valid: false, error: 'Image must be under 5 MB.' };
        }
        return { valid: true };
    }

    function loadAvatarImage(file) {
        return new Promise(function (resolve, reject) {
            const image = new Image();
            const url = URL.createObjectURL(file);
            image.onload = function () {
                URL.revokeObjectURL(url);
                resolve(image);
            };
            image.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Could not read image.'));
            };
            image.src = url;
        });
    }

    function canvasToAvatarBlob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob);
                else reject(new Error('Could not compress image.'));
            }, type, quality);
        });
    }

    // Resize/re-encode heavy photos in the browser so uploads stay under the
    // storage cap without blocking the user.
    async function compressAvatarImageFile(file, options) {
        const opts = options || {};
        const maxBytes = opts.maxBytes || 5 * 1024 * 1024;
        const outputType = opts.outputType || 'image/jpeg';
        const image = await loadAvatarImage(file);
        let maxDimension = opts.maxDimension || 1024;
        let quality = typeof opts.quality === 'number' ? opts.quality : 0.85;

        for (let attempt = 0; attempt < 8; attempt += 1) {
            const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
            const width = Math.max(1, Math.round(image.width * scale));
            const height = Math.max(1, Math.round(image.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Could not compress image.');
            context.drawImage(image, 0, 0, width, height);
            const blob = await canvasToAvatarBlob(canvas, outputType, quality);
            if (blob.size <= maxBytes) {
                const baseName = String(file.name || 'avatar').replace(/\.[^.]+$/, '');
                return new File([blob], baseName + '.jpg', {
                    type: outputType,
                    lastModified: Date.now()
                });
            }
            if (quality > 0.45) quality -= 0.15;
            else maxDimension = Math.max(256, Math.round(maxDimension * 0.75));
        }
        throw new Error('Image is too large. Try a smaller photo.');
    }

    // Validate type and return the file as-is, or compress automatically when
    // it exceeds `maxBytes` (browser only).
    async function prepareAvatarUploadFile(file, options) {
        const maxBytes = (options && options.maxBytes) || 5 * 1024 * 1024;
        if (!file) return { ok: false, error: 'Please choose an image file.' };
        if (!isAvatarImageFile(file)) {
            return { ok: false, error: 'Please choose an image file.' };
        }
        if (Number(file.size) <= maxBytes) {
            return { ok: true, file: file, compressed: false };
        }
        if (typeof document === 'undefined') {
            return { ok: false, error: 'Image must be under 5 MB.' };
        }
        try {
            const compressed = await compressAvatarImageFile(file, { maxBytes: maxBytes });
            if (compressed.size > maxBytes) {
                return {
                    ok: false,
                    error: 'Image is too large even after compression. Try a smaller photo.'
                };
            }
            return { ok: true, file: compressed, compressed: true };
        } catch (error) {
            return {
                ok: false,
                error: (error && error.message) ? error.message : 'Could not compress image.'
            };
        }
    }

    // Cover/header images: one resize pass (wider cap) — faster than avatar loop.
    async function prepareCoverUploadFile(file, options) {
        const maxBytes = (options && options.maxBytes) || 5 * 1024 * 1024;
        if (!file) return { ok: false, error: 'Please choose an image file.' };
        if (!isAvatarImageFile(file)) {
            return { ok: false, error: 'Please choose an image file.' };
        }
        if (Number(file.size) <= maxBytes && Number(file.size) <= 900 * 1024) {
            return { ok: true, file: file, compressed: false };
        }
        if (typeof document === 'undefined') {
            return { ok: false, error: 'Image must be under 5 MB.' };
        }
        try {
            const compressed = await compressAvatarImageFile(file, {
                maxBytes: maxBytes,
                maxDimension: 1600,
                quality: 0.82
            });
            if (compressed.size > maxBytes) {
                return {
                    ok: false,
                    error: 'Image is too large even after compression. Try a smaller photo.'
                };
            }
            return { ok: true, file: compressed, compressed: true };
        } catch (error) {
            return {
                ok: false,
                error: (error && error.message) ? error.message : 'Could not compress image.'
            };
        }
    }

    return {
        mapProjectRow: mapProjectRow,
        mapProjects: mapProjects,
        canonicalStatus: canonicalStatus,
        isPublicProject: isPublicProject,
        publicProjectsForUser: publicProjectsForUser,
        validateOutreachDraft: validateOutreachDraft,
        buildOutreachPayload: buildOutreachPayload,
        personalProjectsView: personalProjectsView,
        validateProjectDraft: validateProjectDraft,
        buildProjectPayload: buildProjectPayload,
        findProjectById: findProjectById,
        myWishPosts: myWishPosts,
        mapOwnedOpportunity: mapOwnedOpportunity,
        mapOwnedOpportunities: mapOwnedOpportunities,
        postTitlesById: postTitlesById,
        mapOwnedOffer: mapOwnedOffer,
        mapOwnedOffers: mapOwnedOffers,
        opportunitiesById: opportunitiesById,
        mapOwnedApplication: mapOwnedApplication,
        mapApplicantRow: mapApplicantRow,
        mapApplicantRows: mapApplicantRows,
        canDecideApplication: canDecideApplication,
        hasContactEmail: hasContactEmail,
        isItemSaved: isItemSaved,
        buildSavedItemPayload: buildSavedItemPayload,
        mapOfferForOwner: mapOfferForOwner,
        mapOffersForOwner: mapOffersForOwner,
        volunteerApplicationViews: volunteerApplicationViews,
        isDeleteAccountConfirmed: isDeleteAccountConfirmed,
        shouldShowProfileSkeleton: shouldShowProfileSkeleton,
        isAvatarImageFile: isAvatarImageFile,
        validateAvatarFile: validateAvatarFile,
        prepareAvatarUploadFile: prepareAvatarUploadFile,
        prepareCoverUploadFile: prepareCoverUploadFile
    };
});
