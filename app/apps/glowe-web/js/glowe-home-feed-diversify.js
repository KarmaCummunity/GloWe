// Diversity pass for GloweHomeFeed (FR-GLOWE-016 AC2). DOM-free.
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweHomeFeedDiversify = api;
})(typeof self !== 'undefined' ? self : this, function () {
    const FORUM_GROUP = 'forum_group';

    function diversifyFeed(ranked, options) {
        const opts = options || {};
        const maxRun = opts.maxRun == null ? 2 : opts.maxRun;
        const maxForumGroupPerWindow = opts.maxForumGroupPerWindow == null ? 1 : opts.maxForumGroupPerWindow;
        const windowSize = opts.window == null ? 10 : opts.window;
        const pool = (ranked || []).slice();
        const out = [];

        function forumGroupsInWindow() {
            const start = Math.max(0, out.length - windowSize + 1);
            let n = 0;
            for (let i = start; i < out.length; i++) {
                if (out[i].kind === FORUM_GROUP) n += 1;
            }
            return n;
        }

        function runKind() {
            if (!out.length) return null;
            const kind = out[out.length - 1].kind;
            let n = 0;
            for (let i = out.length - 1; i >= 0 && out[i].kind === kind; i--) n += 1;
            return { kind: kind, count: n };
        }

        while (pool.length) {
            const run = runKind();
            let pick = -1;
            for (let i = 0; i < pool.length; i++) {
                const cand = pool[i];
                if (run && cand.kind === run.kind && run.count >= maxRun) continue;
                if (cand.kind === FORUM_GROUP && forumGroupsInWindow() >= maxForumGroupPerWindow) continue;
                pick = i;
                break;
            }
            if (pick < 0) {
                const dropIdx = pool.findIndex(function (c) {
                    return c.kind === FORUM_GROUP && forumGroupsInWindow() >= maxForumGroupPerWindow;
                });
                if (dropIdx >= 0) {
                    pool.splice(dropIdx, 1);
                    continue;
                }
                pick = 0;
            }
            out.push(pool.splice(pick, 1)[0]);
        }
        return out;
    }

    return { diversifyFeed: diversifyFeed };
});
