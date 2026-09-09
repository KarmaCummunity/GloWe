// Shared search / filter / sort panel for GloWe list screens (FR-GLOWE-*).
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GloweListFilters = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Mirrors css/components/list-filters.css and the shell's `md` boundary (FR-GLOWE-029).
    const SHEET_MQ = '(max-width: 767px)';
    const FILTER_ICON = '<svg class="glowe-filter-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"></path></svg>';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    function countedLabel(n, singular, plural) {
        if (typeof gloweCountedLabel === 'function') {
            return gloweCountedLabel(n, n === 1 ? singular : (plural || singular));
        }
        return n + ' ' + (n === 1 ? singular : (plural || singular));
    }

    function text(key) {
        if (typeof gloweText === 'function') return gloweText(key);
        return key;
    }

    function localizePanel(panel) {
        if (!panel) return;
        if (typeof applyGloweDataI18n === 'function') applyGloweDataI18n(panel);
        if (typeof translateGloweTree === 'function') translateGloweTree(panel);
    }

    function buildInitialState(config) {
        const state = {};
        if (config.search) state[config.search.stateKey || 'query'] = '';
        if (config.sort) {
            state[config.sort.stateKey || 'sort'] = config.sort.defaultValue
                || (config.sort.options[0] && config.sort.options[0].value) || '';
        }
        (config.pillGroups || []).forEach(function (g) { state[g.stateKey] = g.defaultValue || 'all'; });
        (config.selectGroups || []).forEach(function (g) { state[g.stateKey] = g.defaultValue || 'all'; });
        if (config.tabs) state[config.tabs.stateKey || 'tab'] = config.tabs.defaultValue || 'all';
        return state;
    }

    function renderPillGroup(group) {
        const def = group.defaultValue || 'all';
        const pills = (group.options || []).map(function (o) {
            const active = o.value === def ? ' active' : '';
            return '<button class="filter-pill' + active + '" type="button" ' + group.attr + '="' + esc(o.value) + '" data-i18n="' + esc(o.label) + '">' + esc(o.label) + '</button>';
        }).join('');
        return '<details class="filter-accordion"' + (group.open ? ' open' : '') + '><summary><span class="filter-accordion-title" data-i18n="' + esc(group.title) + '">' + esc(group.title) + '</span></summary><div class="filter-pill-group glowe-filter-pill-scroll">' + pills + '</div></details>';
    }

    function renderSelectGroup(group) {
        const opts = (group.options || []).map(function (o) {
            const sel = o.value === (group.defaultValue || 'all') ? ' selected' : '';
            return '<option value="' + esc(o.value) + '"' + sel + ' data-i18n="' + esc(o.label) + '">' + esc(o.label) + '</option>';
        }).join('');
        return '<div class="form-group glowe-filter-select-group"><label for="' + esc(group.id) + '" data-i18n="' + esc(group.label) + '">' + esc(group.label) + '</label><select id="' + esc(group.id) + '" class="filter-input" aria-label="' + esc(group.ariaLabel || group.label) + '">' + opts + '</select></div>';
    }

    function renderPanel(config) {
        const id = config.id || 'glowe-filter';
        const variant = config.variant || 'panel';
        const extraClass = config.panelClass ? ' ' + config.panelClass : '';
        const panelClass = 'glowe-filter-panel' + (variant === 'compact' ? ' glowe-filter-panel--compact' : '') + extraClass;
        let html = '<div class="' + panelClass + '" aria-label="' + esc(config.ariaLabel || 'Filters') + '">';

        if (config.intro && variant !== 'compact') {
            html += '<div class="glowe-filter-intro">';
            if (config.intro.kicker) html += '<span class="section-label" data-i18n="' + esc(config.intro.kicker) + '">' + esc(config.intro.kicker) + '</span>';
            html += '<h2 data-i18n="' + esc(config.intro.title) + '">' + esc(config.intro.title) + '</h2>';
            if (config.intro.lead) html += '<p class="glowe-filter-lead" data-i18n="' + esc(config.intro.lead) + '">' + esc(config.intro.lead) + '</p>';
            html += '</div>';
        }

        const hasAdvanced = Boolean((config.pillGroups && config.pillGroups.length) || (config.selectGroups && config.selectGroups.length));
        html += '<div class="glowe-filter-toolbar' + (config.sort ? ' glowe-filter-toolbar--with-sort' : '') + '">';
        if (config.search) {
            const bare = config.search.hideLabel ? ' glowe-filter-search--bare' : '';
            const label = config.search.hideLabel ? '' : ('<label for="' + esc(config.search.id) + '" data-i18n="' + esc(config.search.label) + '">' + esc(config.search.label) + '</label>');
            html += '<div class="form-group glowe-filter-search' + bare + '">' + label + '<input id="' + esc(config.search.id) + '" class="filter-input" type="search" aria-label="' + esc(config.search.ariaLabel || config.search.label) + '" placeholder="' + esc(config.search.placeholder || '') + '"></div>';
        }
        if (config.sort) {
            const sortOpts = config.sort.options.map(function (o) {
                return '<option value="' + esc(o.value) + '" data-i18n="' + esc(o.label) + '">' + esc(o.label) + '</option>';
            }).join('');
            html += '<div class="form-group glowe-filter-sort"><label for="' + esc(config.sort.id) + '" data-i18n="' + esc(config.sort.label) + '">' + esc(config.sort.label) + '</label><select id="' + esc(config.sort.id) + '" class="filter-input" aria-label="' + esc(config.sort.ariaLabel || config.sort.label) + '">' + sortOpts + '</select></div>';
        }
        if (config.sheet && hasAdvanced) {
            html += '<button id="' + id + '-open" class="btn btn-outline glowe-filter-open" type="button" aria-haspopup="dialog" aria-controls="' + id + '-dialog" aria-expanded="false">' + FILTER_ICON + '<span class="glowe-filter-open-label" data-i18n="' + esc(config.sheet.openLabel) + '">' + esc(config.sheet.openLabel) + '</span><span class="glowe-filter-badge" id="' + id + '-badge" hidden>0</span></button>';
        }
        if (config.showClear !== false) {
            html += '<button id="' + id + '-clear" class="btn btn-outline glowe-filter-clear glowe-filter-clear--toolbar" type="button" data-i18n="Clear filters">Clear filters</button>';
        }
        html += '</div>';

        if (config.tabs) {
            const tabAttr = config.tabs.attr || 'data-glowe-tab';
            const tabsClass = config.tabs.tabsClass || 'glowe-filter-tabs';
            const defTab = config.tabs.defaultValue || 'all';
            html += '<div class="' + esc(tabsClass) + '">';
            (config.tabs.options || []).forEach(function (o) {
                const active = o.value === defTab ? 'active' : '';
                html += '<button type="button" class="' + active + '" ' + tabAttr + '="' + esc(o.value) + '" data-i18n="' + esc(o.label) + '">' + esc(o.label) + '</button>';
            });
            html += '</div>';
        }

        const advancedBody = (config.pillGroups || []).map(renderPillGroup).join('') + (config.selectGroups || []).map(renderSelectGroup).join('');
        if (hasAdvanced) {
            if (config.sheet) {
                html += '<div id="' + id + '-dialog" class="glowe-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-dialog-title" hidden><button type="button" class="glowe-filter-dialog-backdrop" data-glowe-filter-close tabindex="-1" aria-label="Close"></button><div class="glowe-filter-dialog-panel"><header class="glowe-filter-dialog-header"><h3 id="' + id + '-dialog-title" data-i18n="' + esc(config.sheet.dialogTitle) + '">' + esc(config.sheet.dialogTitle) + '</h3><button type="button" class="glowe-filter-dialog-close" data-glowe-filter-close aria-label="Close">&times;</button></header><div class="glowe-filter-advanced glowe-filter-dialog-body">' + advancedBody + '</div><footer class="glowe-filter-dialog-footer"><button id="' + id + '-sheet-clear" class="btn btn-outline" type="button" data-i18n="Clear filters">Clear filters</button><button id="' + id + '-sheet-apply" class="btn btn-primary" type="button" data-i18n="Show results">Show results</button></footer></div></div>';
            } else {
                html += '<div class="glowe-filter-advanced" id="' + id + '-advanced">' + advancedBody + '</div>';
            }
        }
        if (config.resultsId) html += '<p class="filter-results-note" id="' + esc(config.resultsId) + '" aria-live="polite"></p>';
        html += '</div>';
        return html;
    }

    function setPillActive(buttons, attr, value) {
        buttons.forEach(function (btn) { btn.classList.toggle('active', btn.getAttribute(attr) === value); });
    }

    function mount(panel, config, hooks) {
        hooks = hooks || {};
        const id = config.id || 'glowe-filter';
        const state = buildInitialState(config);
        let lastCount = 0;
        const sheetMq = window.matchMedia(SHEET_MQ);
        const searchInput = config.search ? panel.querySelector('#' + config.search.id) : null;
        const sortSelect = config.sort ? panel.querySelector('#' + config.sort.id) : null;
        const clearBtn = panel.querySelector('#' + id + '-clear');
        const resultsEl = config.resultsId ? panel.querySelector('#' + config.resultsId) : null;
        const filterOpen = panel.querySelector('#' + id + '-open');
        const filterDialog = panel.querySelector('#' + id + '-dialog');
        const filterBadge = panel.querySelector('#' + id + '-badge');
        const sheetClear = panel.querySelector('#' + id + '-sheet-clear');
        const sheetApply = panel.querySelector('#' + id + '-sheet-apply');
        const pillBindings = (config.pillGroups || []).map(function (group) {
            return { group: group, buttons: panel.querySelectorAll('[' + group.attr + ']') };
        });
        const selectBindings = (config.selectGroups || []).map(function (group) {
            return { group: group, el: panel.querySelector('#' + group.id) };
        });
        const tabAttr = config.tabs ? (config.tabs.attr || 'data-glowe-tab') : '';
        const tabButtons = config.tabs ? panel.querySelectorAll('[' + tabAttr + ']') : [];

        function isSheetMode() { return Boolean(config.sheet && sheetMq.matches); }
        function openSheet() {
            if (!filterDialog || !isSheetMode()) return;
            filterDialog.hidden = false;
            document.body.classList.add('glowe-filter-sheet-open');
            if (filterOpen) filterOpen.setAttribute('aria-expanded', 'true');
            localizePanel(panel);
            updateChrome();
        }
        function closeSheet() {
            if (!filterDialog || !isSheetMode()) return;
            filterDialog.hidden = true;
            document.body.classList.remove('glowe-filter-sheet-open');
            if (filterOpen) filterOpen.setAttribute('aria-expanded', 'false');
        }
        function syncSheetMode() {
            if (!filterDialog) return;
            if (isSheetMode()) {
                filterDialog.hidden = true;
                if (filterOpen) filterOpen.setAttribute('aria-expanded', 'false');
            } else {
                filterDialog.hidden = false;
                document.body.classList.remove('glowe-filter-sheet-open');
                if (filterOpen) filterOpen.setAttribute('aria-expanded', 'false');
            }
        }
        function countActive() {
            if (typeof hooks.countActive === 'function') return hooks.countActive(state);
            let n = 0;
            if (config.search && state[config.search.stateKey || 'query']) n += 1;
            (config.pillGroups || []).forEach(function (g) { if (state[g.stateKey] !== 'all') n += 1; });
            (config.selectGroups || []).forEach(function (g) { if (state[g.stateKey] !== 'all') n += 1; });
            return n;
        }
        function updateChrome(filteredCount) {
            const active = countActive();
            if (typeof filteredCount === 'number') lastCount = filteredCount;
            if (filterBadge) { filterBadge.hidden = active === 0; filterBadge.textContent = String(active); }
            if (clearBtn) clearBtn.hidden = active === 0 && !(config.search && state[config.search.stateKey || 'query']);
            if (sheetApply && hooks.results) {
                if (lastCount === 1 && hooks.results.singular) sheetApply.textContent = countedLabel(1, hooks.results.singular, hooks.results.plural);
                else if (lastCount > 0 && hooks.results.plural) sheetApply.textContent = countedLabel(lastCount, hooks.results.singular, hooks.results.plural);
                else sheetApply.textContent = text('Show results');
            }
        }
        function updateResults(note) {
            if (!resultsEl || !note) return;
            if (note.text != null) resultsEl.textContent = note.text;
            else if (note.count === 1 && hooks.results && hooks.results.singular) resultsEl.textContent = countedLabel(1, hooks.results.singular, hooks.results.plural);
            else if (note.count > 0 && hooks.results && hooks.results.plural) resultsEl.textContent = countedLabel(note.count, hooks.results.singular, hooks.results.plural);
            else if (note.hasFilters) resultsEl.textContent = text(hooks.results && hooks.results.empty ? hooks.results.empty : (note.empty || ''));
            else resultsEl.textContent = '';
            updateChrome(note.count);
        }
        function emitChange() {
            updateChrome();
            if (typeof hooks.onChange === 'function') hooks.onChange(Object.assign({}, state));
        }
        function reset() {
            Object.assign(state, buildInitialState(config));
            if (searchInput) searchInput.value = '';
            if (sortSelect) sortSelect.value = state[config.sort.stateKey || 'sort'];
            pillBindings.forEach(function (b) { setPillActive(b.buttons, b.group.attr, state[b.group.stateKey]); });
            selectBindings.forEach(function (b) { if (b.el) b.el.value = state[b.group.stateKey]; });
            if (config.tabs) {
                const tabKey = config.tabs.stateKey || 'tab';
                tabButtons.forEach(function (btn) { btn.classList.toggle('active', btn.getAttribute(tabAttr) === state[tabKey]); });
            }
            closeSheet();
            emitChange();
        }

        if (searchInput) searchInput.addEventListener('input', function () { state[config.search.stateKey || 'query'] = this.value; emitChange(); });
        if (sortSelect) sortSelect.addEventListener('change', function () { state[config.sort.stateKey || 'sort'] = this.value; emitChange(); });
        pillBindings.forEach(function (b) {
            b.buttons.forEach(function (button) {
                button.addEventListener('click', function () {
                    state[b.group.stateKey] = this.getAttribute(b.group.attr) || 'all';
                    setPillActive(b.buttons, b.group.attr, state[b.group.stateKey]);
                    emitChange();
                });
            });
        });
        selectBindings.forEach(function (b) {
            if (!b.el) return;
            b.el.addEventListener('change', function () { state[b.group.stateKey] = this.value; emitChange(); });
        });
        if (config.tabs) {
            const tabKey = config.tabs.stateKey || 'tab';
            tabButtons.forEach(function (button) {
                button.addEventListener('click', function () {
                    state[tabKey] = this.getAttribute(tabAttr) || 'all';
                    tabButtons.forEach(function (btn) { btn.classList.remove('active'); });
                    this.classList.add('active');
                    emitChange();
                });
            });
        }
        if (filterOpen) filterOpen.addEventListener('click', openSheet);
        if (sheetApply) sheetApply.addEventListener('click', closeSheet);
        if (sheetClear) sheetClear.addEventListener('click', reset);
        if (clearBtn) clearBtn.addEventListener('click', reset);
        panel.querySelectorAll('[data-glowe-filter-close]').forEach(function (node) { node.addEventListener('click', closeSheet); });
        if (typeof sheetMq.addEventListener === 'function') sheetMq.addEventListener('change', syncSheetMode);
        else if (typeof sheetMq.addListener === 'function') sheetMq.addListener(syncSheetMode);
        syncSheetMode();
        document.addEventListener('keydown', function onEscape(event) {
            if (event.key === 'Escape' && filterDialog && !filterDialog.hidden) closeSheet();
        });

        return {
            getState: function () { return Object.assign({}, state); },
            reset: reset,
            updateResults: updateResults,
            refreshI18n: function () { localizePanel(panel); },
            destroy: function () { closeSheet(); }
        };
    }

    return { SHEET_MQ: SHEET_MQ, renderPanel: renderPanel, mount: mount, presets: {} };
});
