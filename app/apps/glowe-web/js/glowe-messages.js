// GloWe direct-messaging helpers (FR-GLOWE-016 AC6, supersedes FR-GLOWE-014).
//
// Pure, DOM-free logic for the messages inbox and thread view riding on KC's
// shared public.chats / public.messages (D-61). Shared by the browser app
// (window.GloweMessages) and unit-tested via vitest (module.exports), so they
// must stay free of DOM / Supabase / globals.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweMessages = api;
})(typeof self !== 'undefined' ? self : this, function () {
    // Map a chats row to the inbox view model for `meId`.
    function mapChatRow(row, meId) {
        const r = row || {};
        const me = String(meId || '');
        const a = r.participant_a == null ? '' : String(r.participant_a);
        const b = r.participant_b == null ? '' : String(r.participant_b);
        const otherId = a === me ? b : a;
        const hiddenAt = a === me ? r.inbox_hidden_at_a : r.inbox_hidden_at_b;
        return {
            chatId: r.chat_id,
            otherId: otherId,
            lastMessageAt: r.last_message_at || '',
            isSupport: Boolean(r.is_support_thread),
            hiddenForMe: Boolean(hiddenAt)
        };
    }

    // Inbox rows: mapped, visible (not hidden), deduped per counterpart
    // (newest chat wins — the list arrives newest-first). Support-flagged
    // threads stay listed: KC auto-marks any chat with a super admin
    // (GloWe team members) as is_support_thread, and those are still DMs.
    function inboxRows(rows, meId) {
        const seen = {};
        const out = [];
        (Array.isArray(rows) ? rows : []).forEach(function (row) {
            const chat = mapChatRow(row, meId);
            if (!chat.chatId || chat.hiddenForMe || !chat.otherId) return;
            if (seen[chat.otherId]) return;
            seen[chat.otherId] = true;
            out.push(chat);
        });
        return out;
    }

    // Attach the newest message preview per chat from a mixed message list
    // (messages arrive newest-first). Mutates nothing; returns new objects.
    function attachPreviews(chats, messages) {
        const previewByChat = {};
        (Array.isArray(messages) ? messages : []).forEach(function (m) {
            if (!m || !m.chat_id) return;
            const key = String(m.chat_id);
            if (!previewByChat[key]) previewByChat[key] = m;
        });
        return (Array.isArray(chats) ? chats : []).map(function (chat) {
            const preview = previewByChat[String(chat.chatId)];
            return Object.assign({}, chat, {
                previewText: preview ? String(preview.body || '') : '',
                previewAt: preview ? preview.created_at : chat.lastMessageAt
            });
        });
    }

    // Attach unread counts from rpc_unread_counts_for_chats rows.
    function attachUnread(chats, counts) {
        const unreadByChat = {};
        (Array.isArray(counts) ? counts : []).forEach(function (c) {
            if (c && c.chat_id !== undefined) unreadByChat[String(c.chat_id)] = Number(c.unread_count) || 0;
        });
        return (Array.isArray(chats) ? chats : []).map(function (chat) {
            return Object.assign({}, chat, { unread: unreadByChat[String(chat.chatId)] || 0 });
        });
    }

    // Header badge total — sum of inbox-visible chat unreads only (excludes
    // support / hidden threads that GloWe does not list in the inbox).
    function sumUnread(chats) {
        return (Array.isArray(chats) ? chats : []).reduce(function (total, chat) {
            return total + (Number(chat && chat.unread) || 0);
        }, 0);
    }

    // First message seeded into a need/offer conversation — carries the item's
    // title so the owner knows the context (FR-GLOWE-016 AC6).
    function buildFirstMessage(kind, title, text) {
        const prefix = kind === 'need' ? 'Re: ' : (kind === 'org' ? 'To ' : 'Re: ');
        const head = String(title || '').trim();
        const body = String(text || '').trim();
        const parts = [];
        if (head) parts.push(prefix + head);
        if (body) parts.push(body);
        return parts.join('\n\n').slice(0, 2000);
    }

    // Map a messages row to the thread view model.
    function mapMessageRow(row, meId) {
        const r = row || {};
        return {
            id: r.message_id,
            mine: String(r.sender_id || '') === String(meId || ''),
            isSystem: r.kind === 'system',
            text: String(r.body || ''),
            createdAt: r.created_at || ''
        };
    }

    function mapMessageRows(rows, meId) {
        return (Array.isArray(rows) ? rows : []).map(function (r) { return mapMessageRow(r, meId); });
    }

    // Friendly inbox timestamp: time for today, date otherwise.
    function formatChatTime(value, nowMs, locale) {
        if (!value) return '';
        const ms = Date.parse(value);
        if (Number.isNaN(ms)) return '';
        const then = new Date(ms);
        const now = new Date(typeof nowMs === 'number' ? nowMs : Date.now());
        const sameDay = then.getFullYear() === now.getFullYear()
            && then.getMonth() === now.getMonth()
            && then.getDate() === now.getDate();
        try {
            return sameDay
                ? then.toLocaleTimeString(locale || undefined, { hour: '2-digit', minute: '2-digit' })
                : then.toLocaleDateString(locale || undefined, { month: 'short', day: 'numeric' });
        } catch (_e) {
            return then.toISOString().slice(0, 10);
        }
    }

    // A message draft must be non-empty and within KC's 2000-char body cap.
    function validateMessageDraft(text) {
        const t = String(text || '').trim();
        if (!t) return { valid: false, error: 'Please write a message.' };
        if (t.length > 2000) return { valid: false, error: 'Messages are capped at 2000 characters.' };
        return { valid: true, error: '' };
    }

    // KC parity (supabaseDmChat.ts): prefer a visible non-support DM; otherwise
    // reuse an existing support thread (e.g. messaging a super admin).
    function pickDmChatRow(rows, viewerIsA) {
        const list = Array.isArray(rows) ? rows : [];
        const visibleDm = list.find(function (r) {
            return r && !r.is_support_thread
                && (viewerIsA ? !r.inbox_hidden_at_a : !r.inbox_hidden_at_b);
        });
        if (visibleDm) return visibleDm;
        return list.find(function (r) { return r && r.is_support_thread; }) || null;
    }

    function isSupportPairConflict(error) {
        if (!error || error.code !== '23505') return false;
        const blob = String((error.message || '') + ' ' + (error.details || ''));
        return blob.indexOf('chats_unique_support_pair') !== -1;
    }

    return {
        mapChatRow: mapChatRow,
        inboxRows: inboxRows,
        attachPreviews: attachPreviews,
        attachUnread: attachUnread,
        sumUnread: sumUnread,
        buildFirstMessage: buildFirstMessage,
        mapMessageRow: mapMessageRow,
        mapMessageRows: mapMessageRows,
        formatChatTime: formatChatTime,
        validateMessageDraft: validateMessageDraft,
        pickDmChatRow: pickDmChatRow,
        isSupportPairConflict: isSupportPairConflict
    };
});
