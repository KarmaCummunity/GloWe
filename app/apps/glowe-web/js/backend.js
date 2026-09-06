// GloWe backend adapter.
// Uses Supabase when configured, while preserving the local MVP fallback.
(function () {
    const config = window.GLOWE_BACKEND_CONFIG || {};
    let clientPromise = null;

    // GloWe shares the Karma Community Supabase project. To avoid colliding with
    // KC's native tables (e.g. public.posts, public.users), all GloWe-owned
    // tables are namespaced with this prefix. See migration 0204_glowe_schema.sql.
    const TABLE_PREFIX = 'glowe_';
    const tbl = (name) => `${TABLE_PREFIX}${name}`;

    function configured() {
        return Boolean(config.supabaseUrl && config.supabaseAnonKey);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                existing.addEventListener('load', resolve, { once: true });
                if (window.supabase) resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('Could not load Supabase client.'));
            document.head.appendChild(script);
        });
    }

    async function getClient() {
        if (!configured()) return null;
        if (!clientPromise) {
            clientPromise = (async () => {
                if (!window.supabase) await loadScript(config.supabaseCdn);
                return window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true,
                        // Separate GloWe's session from the KC app's session.
                        // Both use the same Supabase project; without a distinct key
                        // they share sb-<ref>-auth-token in localStorage, so signing
                        // out of one would also sign out the other.
                        storageKey: 'glowe-auth-v1'
                    }
                });
            })();
        }
        return clientPromise;
    }

    // Non-Latin scripts that need an English variant (FR-GLOWE-024). Mirrors
    // GloweLocalizedName.isPrimarilyLatin so backend works before that script loads.
    const NON_LATIN_NAME = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u0370-\u03FF\u4E00-\u9FFF]/;

    function isPrimarilyLatinName(text) {
        const t = String(text || '').trim();
        if (!t) return true;
        return !NON_LATIN_NAME.test(t);
    }

    function trimName(value) {
        return String(value == null ? '' : value).trim().slice(0, 120);
    }

    // Resolve English name: explicit user value wins; Latin primary is copied;
    // otherwise call glowe-generate-name-en (failures → '').
    async function resolveEnglishName(supabaseClient, primary, explicitEn, context) {
        const explicit = trimName(explicitEn);
        if (explicit) return explicit;
        const source = trimName(primary);
        if (!source) return '';
        if (isPrimarilyLatinName(source)) return source;
        try {
            const { data, error } = await supabaseClient.functions.invoke('glowe-generate-name-en', {
                body: { names: [{ field: 'name', text: source, context: context || 'person' }] }
            });
            if (error) return '';
            const first = data && Array.isArray(data.results) ? data.results[0] : null;
            return trimName(first && first.textEn);
        } catch (_e) {
            return '';
        }
    }

    function profilePayload(profile = {}, user = null) {
        return {
            id: user ? user.id : profile.id,
            display_name: profile.name || profile.display_name || '',
            display_name_en: profile.nameEn || profile.display_name_en || null,
            email: profile.email || (user ? user.email : ''),
            profile_type: profile.type || profile.profileTypeLabel || profile.profile_type || '',
            country: profile.country || '',
            public_link: profile.publicLink || profile.public_link || '',
            focus: profile.focus || '',
            about: profile.about || profile.story || '',
            needs: profile.needs || profile.publicActions || '',
            location: profile.location || '',
            languages: profile.languages || [],
            availability: profile.availability || profile.size || '',
            skills: profile.skills || profile.interests || [],
            avatar_url: profile.avatarUrl || profile.avatar_url || '',
            // NOT NULL in glowe_profiles — null here caused silent upsert failures
            // when saving avatar/cover-only patches (FR-GLOWE-011 AC3).
            profile_status: profile.profileStatus || profile.profile_status || 'Draft',
            org_name: profile.orgName || profile.org_name || null,
            org_name_en: profile.orgNameEn || profile.org_name_en || null,
            raw_profile: profile
        };
    }

    // Migration 0236 revoked client SELECT on the PII columns of glowe_profiles
    // (email, raw_profile, org contact details, registration number, reviewer
    // notes). `select('*')` therefore fails for client roles — every read must
    // name its columns, and this is the one list that does it. Keep it in sync
    // with the `grant select (...)` block in 0236 and the glowe_public_profiles
    // view; supabase/tests/0236_glowe_publish_guards.sql pins both ends.
    const PROFILE_PUBLIC_COLUMNS = [
        'id', 'display_name', 'display_name_en', 'avatar_url',
        'account_type', 'approval_status', 'onboarding_complete',
        'profile_type', 'profile_status', 'public_link', 'country',
        'focus', 'about', 'needs', 'location', 'languages', 'availability', 'skills',
        'org_name', 'org_name_en', 'org_website', 'org_country', 'org_field',
        'org_description', 'org_size', 'created_at', 'updated_at'
    ].join(', ');

    // Other people's profiles come from the projection view, never the base
    // table: the view carries the same row policy but cannot accidentally grow
    // a private column later.
    const PROFILES_PUBLIC_VIEW = 'glowe_public_profiles';

    // PostgREST UPSERT (Prefer: resolution=merge-duplicates) requires
    // table-level SELECT. Migration 0236 only grants column-level SELECT on
    // glowe_profiles, so `.upsert()` returns 403 "permission denied for
    // table". Plain INSERT and PATCH still work. Prefer update-then-insert.
    async function saveProfileRow(supabaseClient, payload) {
        const id = payload && payload.id;
        if (!id) throw new Error('profile id required');
        const { data: updated, error: updateError } = await supabaseClient
            .from(tbl('profiles'))
            .update(payload)
            .eq('id', id)
            .select(PROFILE_PUBLIC_COLUMNS)
            .maybeSingle();
        if (updateError) throw updateError;
        if (updated) return updated;
        // UPDATE may succeed but RETURNING empty (RLS/select quirks). Fetch before INSERT
        // so we never hit a duplicate-key error on an existing row.
        const { data: existing, error: fetchError } = await supabaseClient
            .from(tbl('profiles'))
            .select(PROFILE_PUBLIC_COLUMNS)
            .eq('id', id)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (existing) return existing;
        const { data: inserted, error: insertError } = await supabaseClient
            .from(tbl('profiles'))
            .insert(payload)
            .select(PROFILE_PUBLIC_COLUMNS)
            .single();
        if (insertError) throw insertError;
        return inserted;
    }

    // `privateRow` is the owner-only slice from glowe_get_self_private_fields().
    // It is absent for every profile except your own, so orgContactEmail and
    // friends are empty strings on public profiles — by design (0236).
    // Columns every viewer may read (the grant list above).
    function publicProfileFields(row) {
        return {
            id: row.id,
            name: row.display_name,
            nameEn: row.display_name_en || '',
            type: row.profile_type,
            focus: row.focus,
            about: row.about,
            needs: row.needs,
            location: row.location,
            languages: row.languages || [],
            availability: row.availability,
            skills: row.skills || [],
            avatarUrl: row.avatar_url,
            profileStatus: row.profile_status,
            // Onboarding & account type (migration 0205).
            accountType: row.account_type || null,
            onboardingComplete: row.onboarding_complete === true,
            approvalStatus: row.approval_status || 'not_required',
            country: row.country || '',
            orgName: row.org_name || '',
            orgNameEn: row.org_name_en || '',
            orgWebsite: row.org_website || '',
            orgCountry: row.org_country || '',
            orgField: row.org_field || '',
            orgDescription: row.org_description || '',
            orgSize: row.org_size || ''
        };
    }

    // Owner-only columns (migration 0236). Empty for other people's profiles,
    // which is why every value here has a neutral default rather than undefined.
    function privateProfileFields(priv) {
        return {
            email: priv.email || '',
            orgRegistrationNumber: priv.org_registration_number || '',
            orgContactName: priv.org_contact_name || '',
            orgContactEmail: priv.org_contact_email || '',
            orgContactPhone: priv.org_contact_phone || '',
            orgSubmittedAt: priv.org_submitted_at || null,
            orgReviewedAt: priv.org_reviewed_at || null,
            orgReviewNote: priv.org_review_note || ''
        };
    }

    function fromProfileRow(row, privateRow = null) {
        if (!row) return null;
        const priv = privateRow || {};
        const raw = priv.raw_profile || {};
        const merged = {
            ...raw,
            ...publicProfileFields(row),
            ...privateProfileFields(priv)
        };
        // Column wins when set; raw_profile keeps cover + legacy avatar snapshots.
        merged.avatarUrl = firstOf(row.avatar_url, raw.avatarUrl, raw.avatar_url, '');
        merged.coverImageUrl = firstOf(raw.coverImageUrl, raw.cover_image_url, '');
        return merged;
    }

    // Admin RPCs (glowe_list_pending_orgs) are SECURITY DEFINER and return the
    // full row including the private columns, so reviewers keep reading them
    // straight off the row rather than through the owner-only RPC.
    function fromReviewerProfileRow(row) {
        return fromProfileRow(row, row);
    }

    function toProjectRow(payload = {}) {
        return {
            title: payload.title || '',
            status: payload.status || 'Draft',
            description: payload.description || ''
        };
    }

    // First argument that is non-empty (0 counts as a value); the LAST
    // argument is the fallback.
    function firstOf(...vals) {
        for (let i = 0; i < vals.length - 1; i += 1) {
            const v = vals[i];
            if (v || v === 0) return v;
        }
        return vals[vals.length - 1];
    }

    function toCapacity(value) {
        if (value === undefined || value === null || value === '') return null;
        return Number(value);
    }

    // glowe_opportunities.skills/requirements/responsibilities are text[].
    // Never coerce missing values to '' — PostgREST rejects that with 400.
    function toTextArray(value) {
        return Array.isArray(value) ? value : [];
    }

    // Event fields (additive model, migration 0211) — only forwarded when an
    // event is being created (FR-GLOWE-016 AC4), so plain opportunity inserts
    // keep their previous column set.
    function toEventColumns(payload, startAt) {
        return {
            start_at: startAt,
            end_at: firstOf(payload.end_at, payload.endAt, null),
            event_type: firstOf(payload.event_type, payload.eventType, 'physical'),
            event_link: firstOf(payload.event_link, payload.eventLink, ''),
            capacity: toCapacity(firstOf(payload.capacity, '')),
            registration_mode: firstOf(payload.registration_mode, payload.registrationMode, 'gated')
        };
    }

    function toOpportunityRow(payload = {}) {
        const row = {
            title: firstOf(payload.title, ''),
            organization: firstOf(payload.organization, ''),
            organization_en: firstOf(payload.organizationEn, payload.organization_en, null) || null,
            org_icon: firstOf(payload.orgIcon, payload.org_icon, ''),
            location: firstOf(payload.location, ''),
            commitment: firstOf(payload.commitment, ''),
            duration: firstOf(payload.duration, ''),
            field: firstOf(payload.field, ''),
            description: firstOf(payload.description, ''),
            skills: toTextArray(payload.skills),
            requirements: toTextArray(payload.requirements),
            responsibilities: toTextArray(payload.responsibilities),
            featured: Boolean(payload.featured)
        };
        const startAt = firstOf(payload.start_at, payload.startAt, null);
        if (startAt) Object.assign(row, toEventColumns(payload, startAt));
        return row;
    }

    function toPostRow(payload = {}) {
        return {
            title: payload.title || '',
            category: payload.category || '',
            text: payload.text || payload.content || '',
            tags: Array.isArray(payload.tags) ? payload.tags : [],
            audience: payload.audience || '',
            language: payload.language || '',
            link: payload.link || '',
            author_name: payload.authorName || payload.author_name || '',
            author_name_en: payload.authorNameEn || payload.author_name_en || null,
            author_avatar_url: payload.authorAvatarUrl || payload.author_avatar_url || null,
            // Wish discriminator + lifecycle (migration 0215). Defaults keep
            // community posts unchanged.
            post_type: payload.post_type || 'community',
            wish_type: payload.wish_type || null,
            impact_area: payload.impact_area || null,
            status: payload.status || 'open'
        };
    }

    function toOfferRow(payload = {}) {
        return {
            post_id: payload.post_id || payload.postId || '',
            offer_text: payload.offer_text || payload.offerText || '',
            availability: payload.availability || '',
            contact_preference: payload.contact_preference || payload.contactPreference || ''
        };
    }

    function prepareTablePayload(table, payload = {}) {
        if (table === 'projects') return toProjectRow(payload);
        if (table === 'opportunities') return toOpportunityRow(payload);
        if (table === 'posts') return toPostRow(payload);
        if (table === 'offers') return toOfferRow(payload);
        return payload;
    }

    async function currentUser() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        // Prefer getSession() (local JWT) — matches auth.js and avoids flaky
        // getUser() network calls that can 500 while the session is still valid.
        if (typeof supabaseClient.auth.getSession === 'function') {
            const { data } = await supabaseClient.auth.getSession();
            if (data && data.session && data.session.user) return data.session.user;
        }
        try {
            const { data, error } = await supabaseClient.auth.getUser();
            if (error) {
                console.warn('auth.getUser failed:', error.message);
                return null;
            }
            return data && data.user ? data.user : null;
        } catch (e) {
            console.warn('auth.getUser threw:', e && e.message ? e.message : e);
            return null;
        }
    }

    async function signUp({ email, password, profile }) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: profile.name,
                    profile_type: profile.profileTypeLabel || profile.type
                }
            }
        });
        if (error) throw error;
        const user = data.user || await currentUser();
        if (user) await upsertProfile({ ...profile, id: user.id, email: user.email }, user);
        return data;
    }

    async function signIn(email, password) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    }

    async function setSession(session) {
        const supabaseClient = await getClient();
        if (!supabaseClient || !session) return null;
        const { data, error } = await supabaseClient.auth.setSession(session);
        if (error) throw error;
        return data;
    }

    async function mockLogin(payload = {}) {
        if (!configured()) return { error: 'backend_not_configured' };
        const url = `${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/mock-login`;
        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: {
                    apikey: config.supabaseAnonKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            return { error: 'network_error', message: err && err.message ? err.message : 'fetch failed' };
        }
        let body = null;
        try {
            body = await res.json();
        } catch (_e) {
            body = null;
        }
        if (!res.ok) {
            return {
                error: (body && body.error) || 'mock_login_failed',
                message: (body && body.message) || `HTTP ${res.status}`,
                status: res.status
            };
        }
        if (!body || !body.session) {
            return { error: 'no_session', message: 'mock-login returned no session' };
        }
        return body;
    }

    // Prefer a clean same-origin return URL (no hash). If redirectTo is rejected
    // by Supabase Auth's allowlist, Google lands on site_url (pages.dev) instead
    // of local — keep this deterministic for local GloWe on :4321.
    function oauthRedirectTo() {
        try {
            const u = new URL(window.location.href);
            return u.origin + u.pathname + u.search;
        } catch (_e) {
            return window.location.origin + '/';
        }
    }

    async function signInWithGoogle() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const redirectTo = oauthRedirectTo();
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                // Take control of navigation so local redirects are not dropped.
                skipBrowserRedirect: true
            }
        });
        if (error) throw error;
        if (data && data.url) {
            window.location.assign(data.url);
        }
        return data;
    }

    async function signOut() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        // scope:'local' clears only GloWe's own session (stored under
        // 'glowe-auth-v1') without revoking the server-side refresh token.
        // This keeps any active KC session untouched.
        const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
        if (error) throw error;
        return true;
    }

    // FR-GLOWE-011 AC10 — delete the caller's own glowe_profiles row. The row's
    // primary key IS the auth user id (no separate user_id column), so this
    // deletes by id; RLS ("glowe owner write profiles": auth.uid() = id) enforces
    // that a member can only remove their own profile. auth.users is untouched
    // (removing it requires KC super-admin), so the member can sign up again.
    async function deleteProfile() {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const { error } = await supabaseClient.from(tbl('profiles')).delete().eq('id', user.id);
        if (error) throw error;
        return true;
    }

    // Own profile. Two round trips in parallel: the public columns off the base
    // table (the row policy always lets you see yourself) plus the owner-only
    // PII slice, which is the only way to read email / org contact details /
    // org_review_note since migration 0236.
    async function fetchProfile() {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const [rowRes, privRes] = await Promise.all([
            supabaseClient
                .from(tbl('profiles'))
                .select(PROFILE_PUBLIC_COLUMNS)
                .eq('id', user.id)
                .maybeSingle(),
            supabaseClient.rpc('glowe_get_self_private_fields')
        ]);
        if (rowRes.error) throw rowRes.error;
        if (privRes.error) {
            // Non-fatal: the public half of the profile is still usable.
            console.warn('glowe_get_self_private_fields failed:', privRes.error.message);
        }
        return fromProfileRow(rowRes.data, privRes.data || null);
    }

    async function upsertProfile(profile, explicitUser = null) {
        const supabaseClient = await getClient();
        const user = explicitUser || await currentUser();
        if (!supabaseClient || !user) return null;
        const merged = { ...profile, id: user.id, email: user.email };
        const needsPersonEn = !trimName(merged.nameEn || merged.display_name_en)
            && trimName(merged.name || merged.display_name)
            && !isPrimarilyLatinName(merged.name || merged.display_name);
        const needsOrgEn = (merged.orgName || merged.org_name)
            && !trimName(merged.orgNameEn || merged.org_name_en)
            && !isPrimarilyLatinName(merged.orgName || merged.org_name);
        // Auto-generate English when missing and the primary is non-Latin (FR-GLOWE-024).
        if (needsPersonEn) {
            merged.nameEn = await resolveEnglishName(
                supabaseClient,
                merged.name || merged.display_name,
                '',
                'person'
            );
        }
        if (needsOrgEn) {
            merged.orgNameEn = await resolveEnglishName(
                supabaseClient,
                merged.orgName || merged.org_name,
                '',
                'organization'
            );
        }
        const payload = profilePayload(merged, user);
        // Writing the PII columns is still allowed for their owner; only SELECT
        // was revoked (0236), so the returning clause must name public columns.
        // The private half is echoed back from the payload we just sent.
        // Avoid `.upsert()` — PostgREST rejects it under 0236 column grants.
        const data = await saveProfileRow(supabaseClient, payload);
        return fromProfileRow(data, { email: payload.email, raw_profile: payload.raw_profile });
    }

    // FR-GLOWE-023 — register the member from the Google identity on first sign-in
    // so they are a real profile immediately. Writes only id/email/display_name/
    // avatar_url; account_type/onboarding_complete keep their DB defaults, so the
    // FR-GLOWE-002 onboarding step still enriches non-blockingly. No-op if a
    // profile already exists. Failures are non-fatal (the caller keeps browsing).
    async function ensureProfileFromGoogle(user) {
        const supabaseClient = await getClient();
        if (!supabaseClient || !user) return null;
        const existing = await fetchProfile().catch(() => null);
        if (existing) return existing;
        const meta = user.user_metadata || {};
        const displayName = meta.name || meta.full_name
            || (user.email ? user.email.split('@')[0] : 'GloWe member');
        const displayNameEn = await resolveEnglishName(supabaseClient, displayName, '', 'person');
        const payload = {
            id: user.id,
            email: user.email || meta.email || '',
            display_name: displayName,
            display_name_en: displayNameEn || null,
            avatar_url: meta.avatar_url || meta.picture || '',
        };
        try {
            // First sign-in only — fetchProfile() already returned null, so INSERT
            // (not upsert). Upsert 403s under migration 0236 column grants.
            const { data, error } = await supabaseClient
                .from(tbl('profiles'))
                .insert(payload)
                .select(PROFILE_PUBLIC_COLUMNS)
                .maybeSingle();
            if (error) throw error;
            return fromProfileRow(data, { email: payload.email });
        } catch (err) {
            console.warn('ensureProfileFromGoogle failed (non-fatal):', err && err.message ? err.message : err);
            return null;
        }
    }

    // FR-GLOWE-011 AC3 — upload a profile image to the `glowe-avatars` Storage
    // bucket (migration 0219) and return its public URL. The object is written to
    // an owner-scoped folder (`<user_id>/…`) so the bucket's insert/update RLS
    // policy (`storage.foldername(name)[1] = auth.uid()`) permits the write.
    // Returns null when unauthenticated/unconfigured (legacy callers). Throws on
    // storage errors. When the backend is configured but the session is missing,
    // throws a user-facing message instead of falling through to Cloudinary.
    async function uploadProfileImageFile(file, objectPrefix) {
        const supabaseClient = await getClient();
        if (!file) throw new Error('Please choose an image file.');
        if (!supabaseClient) return null;
        const user = await currentUser();
        if (!user) {
            throw new Error('Your session expired. Please sign out and sign in again, then retry.');
        }
        const extByMime = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
        const ext = extByMime[file.type] || 'jpg';
        const path = `${user.id}/${objectPrefix}-${Date.now()}.${ext}`;
        const { error } = await supabaseClient.storage
            .from('glowe-avatars')
            .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
        if (error) throw error;
        const { data } = supabaseClient.storage.from('glowe-avatars').getPublicUrl(path);
        return data ? data.publicUrl : null;
    }

    // FR-GLOWE-011 AC3 — profile avatar in `glowe-avatars` (migration 0219).
    async function uploadAvatar(file) {
        return uploadProfileImageFile(file, 'avatar');
    }

    // FR-GLOWE-011 — profile cover/header image (same bucket + owner folder).
    async function uploadCover(file) {
        return uploadProfileImageFile(file, 'cover');
    }

    // Post-sign-in onboarding (FR-GLOWE-002 + FR-GLOWE-024). Writes only the
    // onboarding-related columns via upsert so a partial pre-existing profile
    // row is preserved. Individuals are approved implicitly ('not_required');
    // organizations are submitted for KC admin review ('pending') and stay
    // view-only until then. English name variants are user-supplied or
    // auto-generated when the source name is non-Latin.
    async function completeOnboarding(details = {}) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const isOrg = details.accountType === 'organization';
        const org = details.org || {};
        const displayName = details.displayName || '';
        const displayNameEn = await resolveEnglishName(
            supabaseClient, displayName, details.displayNameEn, 'person'
        );
        const orgName = isOrg ? (org.name || '') : null;
        const orgNameEn = isOrg
            ? await resolveEnglishName(supabaseClient, orgName, org.nameEn, 'organization')
            : null;
        const payload = {
            id: user.id,
            email: user.email,
            display_name: displayName,
            display_name_en: displayNameEn || null,
            about: details.about || '',
            country: details.country || '',
            account_type: isOrg ? 'organization' : 'individual',
            onboarding_complete: true,
            approval_status: isOrg ? 'pending' : 'not_required',
            profile_type: isOrg ? 'Organization' : 'Individual',
            org_name: orgName,
            org_name_en: orgNameEn || null,
            org_website: isOrg ? (org.website || '') : null,
            org_registration_number: isOrg ? (org.registrationNumber || '') : null,
            org_country: isOrg ? (org.country || details.country || '') : null,
            org_field: isOrg ? (org.field || '') : null,
            org_description: isOrg ? (org.description || '') : null,
            org_contact_name: isOrg ? (org.contactName || '') : null,
            org_contact_email: isOrg ? (org.contactEmail || user.email || '') : null,
            org_contact_phone: isOrg ? (org.contactPhone || '') : null,
            org_size: isOrg ? (org.size || '') : null,
            org_submitted_at: isOrg ? new Date().toISOString() : null
        };
        // Avoid `.upsert()` — PostgREST rejects it under 0236 column grants.
        const data = await saveProfileRow(supabaseClient, payload);
        if (isOrg && data.approval_status !== 'pending') {
            throw new Error(
                'Your organization application could not be queued for review. '
                + 'Please try again or contact GloWe support.'
            );
        }
        // Echo the private half back from the payload rather than re-reading it
        // through glowe_get_self_private_fields() — we just wrote these values.
        return fromProfileRow(data, {
            email: payload.email,
            org_registration_number: payload.org_registration_number,
            org_contact_name: payload.org_contact_name,
            org_contact_email: payload.org_contact_email,
            org_contact_phone: payload.org_contact_phone,
            org_submitted_at: payload.org_submitted_at
        });
    }

    // Org review queue (FR-GLOWE-003). Both RPCs are reviewer-gated server-side
    // (super_admin/moderator); a non-reviewer caller gets a PostgREST error
    // surfaced from the 42501 the function raises — the Admin page treats that
    // as "not authorized" and shows a locked state rather than a crash.
    async function listPendingOrgs() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_list_pending_orgs');
        if (error) throw error;
        return (data || []).map(fromReviewerProfileRow);
    }

    async function setOrgApproval(profileId, decision, note = '') {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_set_org_approval', {
            p_profile_id: profileId,
            p_decision: decision,
            p_note: note ? String(note) : null
        });
        if (error) throw error;
        return fromReviewerProfileRow(data);
    }

    // Fetch all public records from a table (no user filter). RLS on the table
    // controls what anonymous vs. authenticated callers can see.
    async function listAll(table, { orderBy = 'created_at', ascending = false } = {}) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient
            .from(tbl(table))
            .select('*')
            .order(orderBy, { ascending });
        if (error) throw error;
        return data || [];
    }

    // Public About team roster (KC view about_team_profiles). FR-GLOWE-027.
    async function listAboutTeam() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient
            .from('about_team_profiles')
            .select('role_key, sort_order, user_id, display_name, avatar_url, share_handle')
            .order('sort_order', { ascending: true })
            .limit(20);
        if (error) throw error;
        return data || [];
    }

    // Fetch approved organization profiles from glowe_profiles.
    async function listApprovedOrgs() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient
            .from(PROFILES_PUBLIC_VIEW)
            .select(PROFILE_PUBLIC_COLUMNS)
            .eq('account_type', 'organization')
            .eq('approval_status', 'approved')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((row) => fromProfileRow(row));
    }

    // Fetch individual profiles (volunteers / members).
    async function listMembers() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient
            .from(PROFILES_PUBLIC_VIEW)
            .select(PROFILE_PUBLIC_COLUMNS)
            .eq('account_type', 'individual')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((row) => fromProfileRow(row));
    }

    async function listOwned(table) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const { data, error } = await supabaseClient
            .from(tbl(table))
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    // The server-side guards (migrations 0205, 0211, 0236) raise Postgres errors
    // whose text is precise but not presentable. Translate the ones an ordinary
    // user can actually trigger; anything unrecognised keeps its original
    // message so real bugs stay debuggable instead of being masked.
    const BACKEND_ERROR_COPY = [
        [/glowe_publish_forbidden/i,
            'Your account cannot publish this yet. Organizations need to be approved first, and volunteering opportunities and events are organization-only.'],
        [/rate_limit_exceeded/i,
            'That is a lot of activity in a short time. Please wait a few minutes and try again.'],
        [/approval_status is admin-managed/i,
            'Approval is decided by a GloWe reviewer.'],
        [/registration must start as Pending/i,
            'Registrations cannot approve themselves.'],
        // Registration outcomes (migration 0237).
        [/already have an active registration/i,
            'You have already signed up for this one.'],
        [/cannot register for your own listing/i,
            'This is your own listing — you can manage applicants from the page instead.'],
        [/not open for registration|already ended/i,
            'This listing is no longer open for registration.'],
        [/sign in/i,
            'Please sign in to continue.'],
        [/server-managed fields/i,
            'Some of those fields are managed by GloWe and cannot be set here.'],
        [/permission denied/i,
            'You do not have access to that information.']
    ];

    function describeBackendError(error) {
        const raw = String((error && (error.message || error.hint)) || '');
        const match = BACKEND_ERROR_COPY.find(([pattern]) => pattern.test(raw));
        return match ? match[1] : (raw || 'Something went wrong. Please try again.');
    }

    // Keeps the original error as `cause` and logs it, so the console still has
    // the exact Postgres message while the UI shows the friendly one.
    function toFriendlyError(error, context) {
        console.warn('[glowe:backend] ' + (context || 'request') + ' rejected:', error);
        const friendly = new Error(describeBackendError(error));
        friendly.code = error && error.code;
        friendly.cause = error;
        return friendly;
    }

    async function insertOwned(table, payload) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const row = prepareTablePayload(table, payload);
        const { data, error } = await supabaseClient
            .from(tbl(table))
            .insert({ ...row, user_id: user.id })
            .select()
            .single();
        if (error) throw toFriendlyError(error, 'insert ' + table);
        return data;
    }

    async function removeOwned(table, filters) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        let query = supabaseClient.from(tbl(table)).delete().eq('user_id', user.id);
        Object.entries(filters || {}).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { error } = await query;
        if (error) throw error;
        return true;
    }

    // Patch a row the caller owns (RLS owner-write enforces ownership too).
    async function updateOwned(table, id, patch) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const { data, error } = await supabaseClient
            .from(tbl(table))
            .update(patch)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function apiRequest(path, options = {}) {
        if (!configured()) return null;
        const method = (options.method || 'GET').toUpperCase();
        const body = options.body ? JSON.parse(options.body) : {};
        if (path === '/api/profile' && method === 'GET') return fetchProfile();
        if (path === '/api/profile' && method === 'PUT') return upsertProfile(body);
        if (path === '/api/projects' && method === 'GET') return listOwned('projects');
        if (path === '/api/projects' && method === 'POST') return insertOwned('projects', body);
        if (path === '/api/opportunities' && method === 'GET') return listOwned('opportunities');
        if (path === '/api/opportunities' && method === 'POST') return insertOwned('opportunities', body);
        if (path === '/api/posts' && method === 'GET') return listOwned('posts');
        if (path === '/api/posts' && method === 'POST') return insertOwned('posts', body);
        return null;
    }

    // FR-GLOWE-012 AC5 — the single apply/RSVP entry point (migration 0237).
    // Serves plain volunteering opportunities and events alike; pass whichever
    // field set the form collected. The RETURNED status is authoritative: an
    // 'open' listing confirms instantly, a full one waitlists, a 'gated' one
    // stays Pending. Never assume 'Pending' the way the old direct insert did.
    async function applyToOpportunity(opportunityId, {
        email = '', phone = '', comment = '',
        availability = '', skills = '', motivation = ''
    } = {}) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_apply_to_opportunity', {
            p_opportunity_id: String(opportunityId),
            p_email: email ? String(email) : null,
            p_phone: phone ? String(phone) : null,
            p_comment: comment ? String(comment) : null,
            p_availability: availability ? String(availability) : null,
            p_skills: skills ? String(skills) : null,
            p_motivation: motivation ? String(motivation) : null
        });
        if (error) throw toFriendlyError(error, 'apply to ' + opportunityId);
        return data;
    }

    // Event RSVP. Goes through the event-only SQL wrapper rather than straight
    // to glowe_apply_to_opportunity, because that wrapper adds the one check the
    // unified RPC cannot make: that the target really is an event and not a
    // plain volunteering opportunity. Same return shape, same outcome rules.
    async function registerForEvent(opportunityId, { email = '', phone = '', comment = '' } = {}) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_register_for_event', {
            p_opportunity_id: String(opportunityId),
            p_email: email ? String(email) : null,
            p_phone: phone ? String(phone) : null,
            p_comment: comment ? String(comment) : null
        });
        if (error) throw toFriendlyError(error, 'register for event ' + opportunityId);
        return data;
    }

    // Cancel the current user's own registration. The 0211 status guard permits a
    // client to move only their own row to 'Cancelled'.
    async function cancelRegistration(registrationId) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const { data, error } = await supabaseClient
            .from(tbl('applications'))
            .update({ status: 'Cancelled' })
            .eq('id', registrationId)
            .eq('user_id', user.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // All registrations belonging to the current user (owner-only RLS).
    async function listMyRegistrations() {
        return listOwned('applications');
    }

    // Organizer view of an event's registrations (migration 0213). The RPC is
    // owner-scoped and returns rows enriched with the registrant's display name.
    async function listEventRegistrations(opportunityId) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.rpc('glowe_list_event_registrations', {
            p_opportunity_id: String(opportunityId)
        });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // FR-GLOWE-012 AC1 — opportunity owner's applicant inbox (migration 0220). The
    // RPC is owner-scoped and returns each glowe_applications row enriched with the
    // applicant's GloWe display name, avatar and email (for the Connect CTA).
    async function listApplicationsForOpportunity(opportunityId) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.rpc('glowe_list_applications_for_opportunity', {
            p_opportunity_id: String(opportunityId)
        });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // FR-GLOWE-012 AC2 — opportunity owner accepts/declines an application
    // (migration 0221). Owner-scoped SECURITY DEFINER RPC; decision must be
    // 'Accepted' or 'Declined'. Returns the updated glowe_applications row — and
    // since migration 0237 an accept can come back 'Waitlisted' when the
    // opportunity is at capacity, so callers must read the returned status.
    async function updateApplicationStatus(applicationId, decision) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_update_application_status', {
            p_application_id: String(applicationId),
            p_decision: String(decision)
        });
        if (error) throw toFriendlyError(error, 'decide application ' + applicationId);
        return data;
    }

    // FR-GLOWE-012 AC3 — wish owner's offer inbox (migration 0225). The RPC is
    // owner-scoped (gated to the glowe_posts owner) and returns each glowe_offers
    // row enriched with the offerer's GloWe display name, avatar and email.
    async function listOffersForPost(postId) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.rpc('glowe_list_offers_for_post', {
            p_post_id: String(postId)
        });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // Organizer accept/decline of a registration (migration 0213). Accept applies
    // capacity routing (→ Waitlisted when full); decline requires a reason.
    async function decideEventRegistration(registrationId, decision, note = '') {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_decide_event_registration', {
            p_registration_id: String(registrationId),
            p_decision: String(decision),
            p_note: note ? String(note) : null
        });
        if (error) throw error;
        return data;
    }

    // Reveal a digital event's link to an entitled caller (migration 0214). The
    // server returns null when not accepted / not yet revealed.
    async function getEventLink(opportunityId) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_get_event_link', {
            p_opportunity_id: String(opportunityId)
        });
        if (error) throw error;
        return data || null;
    }

    // Organizer cancels their own event (migration 0214).
    async function cancelEvent(opportunityId) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_cancel_event', {
            p_opportunity_id: String(opportunityId)
        });
        if (error) throw error;
        return data;
    }

    // ── Moderation & reporting (FR-GLOWE-015, migration 0227) ───────────────
    // File a report on a content item. The payload shape is built by the tested
    // GloweModeration.buildReportPayload helper; reporter_id is stamped here.
    // A duplicate report surfaces as a 23505 error — callers show "already
    // reported" via GloweModeration.isDuplicateReportError.
    async function submitReport(payload) {
        const supabaseClient = await getClient();
        const user = await currentUser();
        if (!supabaseClient || !user) return null;
        const { data, error } = await supabaseClient
            .from(tbl('reports'))
            .insert({ ...payload, reporter_id: user.id })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // Admin review queue — GLOWE admins only (server-gated, 42501 otherwise).
    async function adminListReports() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.rpc('glowe_admin_list_reports');
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    async function adminDismissReport(reportId) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_admin_dismiss_report', {
            p_report_id: String(reportId)
        });
        if (error) throw error;
        return data;
    }

    async function adminRemoveContent(targetType, targetId, reportId = null) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { error } = await supabaseClient.rpc('glowe_admin_remove_content', {
            p_type: String(targetType),
            p_id: String(targetId),
            p_report_id: reportId ? String(reportId) : null
        });
        if (error) throw error;
        return true;
    }

    // Production synthetic probes — GLOWE admins only (migration 0232).
    async function adminHealthSummary() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.rpc('glowe_admin_health_summary');
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    async function adminListHealthChecks(limit = 50) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        const { data, error } = await supabaseClient.rpc('glowe_admin_list_health_checks', {
            p_limit: limit
        });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    // FR-GLOWE-016 AC2 / Wave 2.1 — ranked home feed from Postgres (migration 0240).
    // Maps RPC rows to the GloweHomeFeed item shape. Returns null when the
    // backend is offline so callers can fall back to the legacy six-fetch path.
    async function fetchHomeFeed(limit = 10, offset = 0) {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const { data, error } = await supabaseClient.rpc('glowe_home_feed', {
            p_limit: Math.max(1, Math.min(Number(limit) || 10, 50)),
            p_offset: Math.max(0, Number(offset) || 0)
        });
        if (error) throw error;
        const HF = (typeof window !== 'undefined') ? window.GloweHomeFeed : null;
        return (Array.isArray(data) ? data : []).map(function (row) {
            const kind = row.kind || 'post';
            const id = row.id == null ? '' : String(row.id);
            const groupId = row.group_id || '';
            return {
                kind: kind,
                id: id,
                title: row.title || '',
                snippet: row.snippet || '',
                createdAt: row.created_at || '',
                authorLabel: row.author_label || '',
                authorNameEn: row.author_name_en || '',
                authorId: row.author_id || '',
                authorAvatarUrl: row.author_avatar_url || '',
                commentCount: Number(row.comment_count) || 0,
                saveCount: Number(row.save_count) || 0,
                hrefPath: HF && typeof HF.defaultHref === 'function'
                    ? HF.defaultHref(kind, id, groupId ? { groupId: groupId } : null)
                    : '',
                tagKey: row.tag_key || 'Post',
                category: row.category || '',
                groupId: groupId,
                hotScore: Number(row.hot_score) || 0
            };
        });
    }

    // ── Direct messaging on KC's shared chat backend (FR-GLOWE-016 AC6) ──────
    // GloWe reuses KC's public.chats / public.messages directly (D-61): these
    // tables are NOT glowe_-prefixed. RLS scopes everything to the signed-in
    // participant; a fresh Google user is account_status='active' and may
    // create chats and messages immediately.

    // Client + signed-in user resolved together; null when either is missing.
    async function kcContext() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return null;
        const user = await currentUser();
        return user ? { supabaseClient, user } : null;
    }

    // Unwrap a PostgREST result: throw on error, fall back when data is empty.
    function kcUnwrap(result, fallback) {
        if (result.error) throw result.error;
        return result.data == null ? fallback : result.data;
    }

    // KC chats store participants in canonical order (participant_a < participant_b).
    function kcCanonicalPair(me, other) {
        return me < other ? [me, other] : [other, me];
    }

    const CHAT_COLUMNS = 'chat_id, participant_a, participant_b, last_message_at';
    const CHAT_DM_SELECT = CHAT_COLUMNS + ', is_support_thread, inbox_hidden_at_a, inbox_hidden_at_b';

    // Find (or create) the 1:1 DM chat with another user — KC parity with
    // supabaseDmChat.findOrCreateDmChat (visible DM, support-thread reuse,
    // support-pair conflict recovery).
    async function kcGetOrCreateDmChat(otherUserId) {
        const ctx = await kcContext();
        const pick = window.GloweMessages && window.GloweMessages.pickDmChatRow;
        const isConflict = window.GloweMessages && window.GloweMessages.isSupportPairConflict;
        if (!ctx || !otherUserId || !pick || !isConflict) return null;

        const { data: otherUser, error: otherErr } = await ctx.supabaseClient
            .from('users')
            .select('user_id')
            .eq('user_id', otherUserId)
            .maybeSingle();
        if (otherErr || !otherUser) return null;

        const [a, b] = kcCanonicalPair(ctx.user.id, otherUserId);
        const viewerIsA = ctx.user.id === a;
        const { data: rows, error: listErr } = await ctx.supabaseClient
            .from('chats')
            .select(CHAT_DM_SELECT)
            .eq('participant_a', a)
            .eq('participant_b', b)
            .order('last_message_at', { ascending: false })
            .limit(50);
        if (listErr) return null;

        const list = rows || [];
        const reuse = pick(list, viewerIsA);
        if (reuse) return reuse;

        const insertRes = await ctx.supabaseClient
            .from('chats')
            .insert({ participant_a: a, participant_b: b })
            .select(CHAT_COLUMNS)
            .single();
        if (!insertRes.error) return insertRes.data;

        if (isConflict(insertRes.error)) {
            const { data: support } = await ctx.supabaseClient
                .from('chats')
                .select(CHAT_COLUMNS)
                .eq('participant_a', a)
                .eq('participant_b', b)
                .eq('is_support_thread', true)
                .maybeSingle();
            if (support) return support;
        }

        const fallback = list.find(function (r) { return r && !r.is_support_thread; });
        return fallback || list[0] || null;
    }

    // The caller's chat inbox, newest activity first.
    async function kcListMyChats(limit = 50) {
        const ctx = await kcContext();
        if (!ctx) return [];
        return kcUnwrap(await ctx.supabaseClient
            .from('chats')
            .select(`${CHAT_COLUMNS}, is_support_thread, inbox_hidden_at_a, inbox_hidden_at_b`)
            .or(`participant_a.eq.${ctx.user.id},participant_b.eq.${ctx.user.id}`)
            .order('last_message_at', { ascending: false })
            .limit(limit), []);
    }

    // Last message per chat, for inbox previews.
    async function kcLastMessages(chatIds) {
        const ctx = await kcContext();
        if (!ctx || !chatIds.length) return [];
        return kcUnwrap(await ctx.supabaseClient
            .from('messages')
            .select('chat_id, sender_id, kind, body, created_at')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false })
            .limit(chatIds.length * 8), []);
    }

    // Per-chat unread counts (viewer is auth.uid() server-side).
    async function kcUnreadCounts(chatIds) {
        const ctx = await kcContext();
        if (!ctx || !chatIds.length) return [];
        return kcUnwrap(await ctx.supabaseClient.rpc('rpc_unread_counts_for_chats', {
            p_viewer_id: ctx.user.id,
            p_chat_ids: chatIds
        }), []);
    }

    // Global unread total for the header badge (excludes hidden chats).
    // Note: includes support-thread unreads; GloWe's header badge prefers
    // summing inbox-visible chats via kcUnreadCounts instead (FR-GLOWE-016).
    async function kcUnreadTotal() {
        const ctx = await kcContext();
        if (!ctx) return 0;
        const { data, error } = await ctx.supabaseClient.rpc('rpc_chat_unread_total');
        return error ? 0 : Number(data) || 0;
    }

    // Realtime inbox hook (KC-parity): fire `onChange` on message INSERT/UPDATE
    // so the header badge / inbox can refresh. Debounced 200ms like mobile.
    // Returns an unsubscribe function (no-op when not authenticated).
    async function kcSubscribeInboxChanges(onChange) {
        const ctx = await kcContext();
        if (!ctx || typeof onChange !== 'function') return function () {};
        let timer = null;
        const fire = function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () { onChange(); }, 200);
        };
        const topic = 'glowe-inbox:' + ctx.user.id + ':' + Math.random().toString(36).slice(2, 10);
        const channel = ctx.supabaseClient
            .channel(topic)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fire)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, fire)
            .subscribe();
        return function () {
            if (timer) clearTimeout(timer);
            void ctx.supabaseClient.removeChannel(channel);
        };
    }

    async function kcGetMessages(chatId, limit = 50) {
        const ctx = await kcContext();
        if (!ctx || !chatId) return [];
        return kcUnwrap(await ctx.supabaseClient
            .from('messages')
            .select('message_id, chat_id, sender_id, kind, body, created_at, status')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .limit(limit), []);
    }

    async function kcSendMessage(chatId, body) {
        const ctx = await kcContext();
        const trimmed = String(body ?? '').trim().slice(0, 2000);
        if (!ctx || !trimmed) return null;
        return kcUnwrap(await ctx.supabaseClient
            .from('messages')
            .insert({ chat_id: chatId, sender_id: ctx.user.id, body: trimmed, kind: 'user', status: 'pending' })
            .select('message_id, chat_id, sender_id, body, created_at')
            .single(), null);
    }

    async function kcMarkChatRead(chatId) {
        const ctx = await kcContext();
        if (!ctx || !chatId) return null;
        kcUnwrap(await ctx.supabaseClient.rpc('rpc_chat_mark_read', { p_chat_id: chatId }), null);
        return true;
    }

    // Compact identity for a chat counterpart (orgs show their org name).
    // Includes English variants so the messages UI can localize (FR-GLOWE-024).
    function kcProfileSummary(row) {
        const isOrg = row.account_type === 'organization';
        const primary = isOrg
            ? firstOf(row.org_name, row.display_name, 'GloWe member')
            : firstOf(row.display_name, 'GloWe member');
        const nameEn = isOrg
            ? firstOf(row.org_name_en, row.display_name_en, '')
            : firstOf(row.display_name_en, '');
        let name = primary;
        if (typeof window !== 'undefined' && window.GloweLocalizedName
            && typeof window.getGloweLanguage === 'function') {
            name = window.GloweLocalizedName.resolveLocalizedName(
                primary, nameEn, window.getGloweLanguage()
            ) || primary;
        }
        return {
            name,
            nameEn: nameEn || '',
            avatarUrl: firstOf(row.avatar_url, ''),
            accountType: firstOf(row.account_type, null)
        };
    }

    // Display names/avatars for chat counterparts, from GloWe profiles
    // (public-read). Returns { userId: {name, avatarUrl, accountType} }.
    async function kcCounterpartProfiles(userIds) {
        const ctx = await kcContext();
        if (!ctx || !userIds.length) return {};
        const result = await ctx.supabaseClient
            .from(PROFILES_PUBLIC_VIEW)
            .select('id, display_name, display_name_en, avatar_url, account_type, org_name, org_name_en')
            .in('id', userIds);
        const out = {};
        (result.data || []).forEach((row) => { out[row.id] = kcProfileSummary(row); });
        return out;
    }

    // GloWe and KC share the same auth.users identity, and every signup gets a
    // public.users row via the handle_new_user trigger — so the KC follow graph
    // (followers_count/following_count on users_public) applies to GloWe members
    // too, with no separate GloWe follow system needed. Returns null when signed
    // out or the row is missing (e.g. account_status not active).
    async function kcFollowCounts() {
        const ctx = await kcContext();
        if (!ctx) return null;
        const { data, error } = await ctx.supabaseClient
            .from('users_public')
            .select('followers_count, following_count')
            .eq('user_id', ctx.user.id)
            .maybeSingle();
        if (error || !data) return null;
        return { followers: data.followers_count || 0, following: data.following_count || 0 };
    }

    const FOLLOW_USER_EMBED =
        '(user_id, display_name, avatar_url, privacy_mode, account_status, followers_count, following_count)';

    function followErrorText(error) {
        return String(error.message || '') + ' ' + String(error.details || '');
    }

    function isFollowPkeyConflict(error) {
        if (!error) return false;
        if (error.code !== '23505') return false;
        return followErrorText(error).indexOf('follow_edges_pkey') !== -1;
    }

    function alreadyFollowingRow(followerId, followedId) {
        return {
            follower_id: followerId,
            followed_id: followedId,
            created_at: new Date().toISOString()
        };
    }

    function resolveFollowInsert(result, followerId, followedId) {
        if (!result.error) return result.data;
        // Idempotent: PK conflict means already following (FR-FOLLOW-001 AC1)
        if (isFollowPkeyConflict(result.error)) {
            return alreadyFollowingRow(followerId, followedId);
        }
        throw result.error;
    }

    async function kcFollow(targetUserId) {
        const ctx = await kcContext();
        if (!ctx || !targetUserId) return null;
        const result = await ctx.supabaseClient
            .from('follow_edges')
            .insert({ follower_id: ctx.user.id, followed_id: targetUserId })
            .select('follower_id, followed_id, created_at')
            .single();
        return resolveFollowInsert(result, ctx.user.id, targetUserId);
    }

    async function kcUnfollow(targetUserId) {
        const ctx = await kcContext();
        if (!ctx || !targetUserId) return false;
        kcUnwrap(await ctx.supabaseClient
            .from('follow_edges')
            .delete()
            .eq('follower_id', ctx.user.id)
            .eq('followed_id', targetUserId), null);
        return true;
    }

    function mapFollowTarget(t) {
        if (!t) return null;
        return {
            userId: t.user_id,
            privacyMode: t.privacy_mode,
            accountStatus: t.account_status
        };
    }

    async function loadFollowState(ctx, targetUserId) {
        const [targetRes, edgeRes] = await Promise.all([
            ctx.supabaseClient
                .from('users')
                .select('user_id, privacy_mode, account_status')
                .eq('user_id', targetUserId)
                .maybeSingle(),
            ctx.supabaseClient
                .from('follow_edges')
                .select('follower_id')
                .eq('follower_id', ctx.user.id)
                .eq('followed_id', targetUserId)
                .maybeSingle()
        ]);
        if (targetRes.error) throw targetRes.error;
        if (edgeRes.error) throw edgeRes.error;
        return {
            target: mapFollowTarget(targetRes.data),
            followingExists: edgeRes.data !== null
        };
    }

    // MVP: users + follow_edges only (skip follow_requests — private hides Follow).
    async function kcGetFollowState(targetUserId) {
        const ctx = await kcContext();
        if (!ctx || !targetUserId) return { target: null, followingExists: false };
        return loadFollowState(ctx, targetUserId);
    }

    function followListLimit(limit) {
        return Math.min(Math.max(Number(limit) || 50, 1), 100);
    }

    function mapFollowEmbed(data, embedKey) {
        return (data || [])
            .map(function (r) { return r && r[embedKey]; })
            .filter(Boolean);
    }

    function buildFollowListQuery(ctx, userId, limit, cursor, opts) {
        let q = ctx.supabaseClient
            .from('follow_edges')
            .select(opts.select)
            .eq(opts.eqCol, userId)
            .order('created_at', { ascending: false })
            .limit(followListLimit(limit));
        if (cursor) q = q.lt(opts.cursorCol, cursor);
        return q;
    }

    async function kcListFollowSide(userId, limit, cursor, opts) {
        const ctx = await kcContext();
        if (!ctx || !userId) return [];
        const data = kcUnwrap(await buildFollowListQuery(ctx, userId, limit, cursor, opts), []);
        return mapFollowEmbed(data, opts.embedKey);
    }

    async function kcListFollowers(userId, limit, cursor) {
        return kcListFollowSide(userId, limit, cursor, {
            select: 'follower:follower_id' + FOLLOW_USER_EMBED,
            eqCol: 'followed_id',
            cursorCol: 'follower_id',
            embedKey: 'follower'
        });
    }

    async function kcListFollowing(userId, limit, cursor) {
        return kcListFollowSide(userId, limit, cursor, {
            select: 'followed:followed_id' + FOLLOW_USER_EMBED,
            eqCol: 'follower_id',
            cursorCol: 'followed_id',
            embedKey: 'followed'
        });
    }

    function publicCountsFromRow(data) {
        return {
            followers: data.followers_count || 0,
            following: data.following_count || 0
        };
    }

    async function fetchPublicCounts(ctx, userId) {
        const { data, error } = await ctx.supabaseClient
            .from('users_public')
            .select('followers_count, following_count')
            .eq('user_id', userId)
            .maybeSingle();
        if (error) return null;
        if (!data) return null;
        return publicCountsFromRow(data);
    }

    async function kcPublicCounts(userId) {
        const ctx = await kcContext();
        if (!ctx || !userId) return null;
        return fetchPublicCounts(ctx, userId);
    }

    async function isGloweAdmin() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return false;
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) return false;
        // get_my_admin_roles() returns the caller's active roles via SECURITY DEFINER.
        // Both glowe_admin and super_admin grant GLOWE admin access.
        const { data, error } = await supabaseClient.rpc('get_my_admin_roles');
        if (error || !Array.isArray(data)) return false;
        return data.includes('glowe_admin') || data.includes('super_admin');
    }

    async function fetchAdminCounts() {
        const supabaseClient = await getClient();
        if (!supabaseClient) return { members: 0, orgs: 0 };
        // Counts only — select a single granted column so the query does not
        // touch the PII columns revoked in migration 0236.
        const [membersRes, orgsRes] = await Promise.all([
            supabaseClient.from(tbl('profiles')).select('id', { count: 'exact', head: true })
                .eq('account_type', 'individual'),
            supabaseClient.from(tbl('profiles')).select('id', { count: 'exact', head: true })
                .eq('account_type', 'organization')
        ]);
        return { members: membersRes.count || 0, orgs: orgsRes.count || 0 };
    }

    // Someone else's profile page. Reads the public projection, which hides
    // unapproved organizations entirely. Viewing your own id is routed to
    // fetchProfile() so a pending org can still open its own profile.
    async function fetchProfileById(id) {
        const supabaseClient = await getClient();
        if (!supabaseClient || !id) return null;
        const user = await currentUser();
        if (user && user.id === id) return fetchProfile();
        const { data, error } = await supabaseClient
            .from(PROFILES_PUBLIC_VIEW)
            .select(PROFILE_PUBLIC_COLUMNS)
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return fromProfileRow(data);
    }

    // Batch-read public author marks for feed cards (FR-GLOWE-008 / FR-GLOWE-016).
    // Used when a post snapshot is missing author_name / avatar but still has
    // user_id — existing rows must resolve to a real profile, not "GloWe Member".
    async function fetchPublicAuthorsByUserIds(ids) {
        const unique = [...new Set((ids || []).filter(Boolean).map(String))];
        if (!unique.length) return {};
        const supabaseClient = await getClient();
        if (!supabaseClient) return {};
        const { data, error } = await supabaseClient
            .from(PROFILES_PUBLIC_VIEW)
            .select('id, display_name, display_name_en, avatar_url, account_type, org_name, org_name_en')
            .in('id', unique);
        if (error) throw error;
        const out = {};
        (data || []).forEach(function (row) {
            if (!row || !row.id) return;
            const isOrg = row.account_type === 'organization';
            const primary = isOrg
                ? (row.org_name || row.display_name || '')
                : (row.display_name || '');
            const english = isOrg
                ? (row.org_name_en || row.display_name_en || '')
                : (row.display_name_en || '');
            out[row.id] = {
                displayName: primary,
                displayNameEn: english,
                avatarUrl: row.avatar_url || ''
            };
        });
        return out;
    }

    // Batch-read public avatar URLs for feed author marks (FR-GLOWE-008).
    async function fetchPublicAvatarsByUserIds(ids) {
        const authors = await fetchPublicAuthorsByUserIds(ids);
        const out = {};
        Object.keys(authors).forEach(function (id) {
            if (authors[id] && authors[id].avatarUrl) out[id] = authors[id].avatarUrl;
        });
        return out;
    }

    // FR-GLOWE-024 — lazy-fill missing English names for public profiles so EN
    // readers see Latin names even when onboarding never supplied one. Anon OK
    // (edge function mode B). Failures return [] so callers keep source names.
    async function ensureProfileEnglishNames(profileIds) {
        const ids = (profileIds || []).filter(Boolean).map(String);
        if (!ids.length) return [];
        const supabaseClient = await getClient();
        if (!supabaseClient) return [];
        try {
            const { data, error } = await supabaseClient.functions.invoke('glowe-generate-name-en', {
                body: { profileIds: ids }
            });
            if (error) {
                console.warn('ensureProfileEnglishNames failed:', error.message || error);
                return [];
            }
            return (data && Array.isArray(data.profiles)) ? data.profiles : [];
        } catch (e) {
            console.warn('ensureProfileEnglishNames failed:', e && e.message ? e.message : e);
            return [];
        }
    }

    window.gloweBackend = {
        configured,
        getClient,
        currentUser,
        signUp,
        signIn,
        setSession,
        mockLogin,
        signInWithGoogle,
        signOut,
        deleteProfile,
        fetchProfile,
        fetchProfileById,
        fetchPublicAvatarsByUserIds,
        fetchPublicAuthorsByUserIds,
        ensureProfileEnglishNames,
        upsertProfile,
        ensureProfileFromGoogle,
        uploadAvatar,
        uploadCover,
        completeOnboarding,
        listPendingOrgs,
        setOrgApproval,
        fetchAdminCounts,
        isGloweAdmin,
        listAll,
        listAboutTeam,
        listApprovedOrgs,
        listMembers,
        listOwned,
        insertOwned,
        removeOwned,
        updateOwned,
        describeBackendError,
        applyToOpportunity,
        registerForEvent,
        cancelRegistration,
        listMyRegistrations,
        listEventRegistrations,
        listApplicationsForOpportunity,
        updateApplicationStatus,
        listOffersForPost,
        decideEventRegistration,
        getEventLink,
        cancelEvent,
        submitReport,
        adminListReports,
        adminDismissReport,
        adminRemoveContent,
        adminHealthSummary,
        adminListHealthChecks,
        fetchHomeFeed,
        kcGetOrCreateDmChat,
        kcListMyChats,
        kcLastMessages,
        kcUnreadCounts,
        kcUnreadTotal,
        kcSubscribeInboxChanges,
        kcGetMessages,
        kcSendMessage,
        kcMarkChatRead,
        kcCounterpartProfiles,
        kcFollowCounts,
        kcFollow,
        kcUnfollow,
        kcGetFollowState,
        kcListFollowers,
        kcListFollowing,
        kcPublicCounts,
        apiRequest
    };
})();
