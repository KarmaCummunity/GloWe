// Screen-specific filter configs for GloweListFilters (FR-GLOWE-*).
(function (root) {
    'use strict';
    if (typeof GloweListFilters === 'undefined') return;

    const IMPACT_AREAS = [
        'Education', 'Climate', 'Health', 'Social Justice', 'Tech for Good',
        'Community Building', 'Food Security', 'Knowledge Sharing', 'Civic Innovation',
        'Business-Social Collaboration'
    ];

    function pillOptions(allLabel, values) {
        return [{ value: 'all', label: allLabel }].concat(values.map(function (v) {
            return { value: v, label: v };
        }));
    }

    function selectOptions(pairs) {
        return pairs.map(function (p) { return { value: p[0], label: p[1] }; });
    }

    GloweListFilters.presets = {
        organizations: function () {
            return {
                id: 'organization-filters',
                ariaLabel: 'Organization filters',
                intro: {
                    kicker: 'Find the right people',
                    title: 'Search organizations, companies, and initiatives',
                    lead: 'Filter by region, profile type, or keywords connected to mission, field, needs, and projects.'
                },
                search: {
                    stateKey: 'query',
                    id: 'organization-search',
                    label: 'Search keywords',
                    placeholder: 'Education, climate, mentors, Jerusalem...',
                    ariaLabel: 'Search organizations'
                },
                sheet: { openLabel: 'Region, type & field', dialogTitle: 'Filter organizations' },
                resultsId: 'organization-results-count',
                pillGroups: [
                    {
                        stateKey: 'region', attr: 'data-org-region', title: 'Region', open: true,
                        options: selectOptions([
                            ['all', 'All regions'], ['israel', 'Israel'], ['tel-aviv', 'Tel Aviv area'],
                            ['jerusalem', 'Jerusalem area'], ['haifa', 'Haifa & North'],
                            ['south', 'South & Negev'], ['global', 'Global / Remote']
                        ])
                    },
                    {
                        stateKey: 'type', attr: 'data-org-type', title: 'Profile type',
                        options: selectOptions([
                            ['all', 'All types'], ['ngo', 'NGO / Nonprofit'],
                            ['business', 'Company / Impact Business'], ['initiative', 'Social Initiative / Project']
                        ])
                    },
                    {
                        stateKey: 'field', attr: 'data-org-field', title: 'Field / sector',
                        options: pillOptions('All fields', IMPACT_AREAS.filter(function (a) {
                            return a !== 'Business-Social Collaboration';
                        }))
                    }
                ]
            };
        },

        wishes: function () {
            const wishTypes = [
                'Volunteers Needed', 'Resource Request', 'Partnership Opportunity', 'Looking for Mentors',
                'Funding Support', 'Knowledge Sharing', 'Open Call', 'Equipment / Space',
                'Visibility / Media', 'Volunteer Offer'
            ];
            return {
                id: 'wish-filters',
                ariaLabel: 'Wish filters',
                intro: {
                    kicker: 'Refine',
                    title: 'Find the right request',
                    lead: 'Search, filter, and sort open needs from across the community.'
                },
                search: {
                    stateKey: 'query',
                    id: 'wish-search',
                    label: 'Search',
                    placeholder: 'Search by title, author, city, or topic',
                    ariaLabel: 'Search wishes'
                },
                sort: {
                    stateKey: 'sort',
                    id: 'wish-sort',
                    label: 'Sort',
                    ariaLabel: 'Sort wishes',
                    defaultValue: 'newest',
                    options: selectOptions([
                        ['newest', 'Newest first'], ['oldest', 'Oldest first'], ['title', 'Title A–Z']
                    ])
                },
                sheet: { openLabel: 'Type & impact area', dialogTitle: 'Filter wishes' },
                resultsId: 'wish-results-count',
                pillGroups: [
                    {
                        stateKey: 'type', attr: 'data-wish-type', title: 'Wish Type', open: true,
                        options: pillOptions('All wishes', wishTypes)
                    },
                    {
                        stateKey: 'area', attr: 'data-impact-area', title: 'Impact Areas',
                        options: pillOptions('All areas', IMPACT_AREAS)
                    }
                ]
            };
        },

        opportunities: function () {
            return {
                id: 'opportunity-filters',
                ariaLabel: 'Opportunity filters',
                intro: {
                    kicker: 'Volunteer Network',
                    title: 'Find the right role',
                    lead: 'Search and filter volunteer roles, events, and collaboration opportunities.'
                },
                search: {
                    stateKey: 'search',
                    id: 'search-opportunities',
                    label: 'Search',
                    placeholder: 'Search volunteer roles...',
                    ariaLabel: 'Search volunteer roles...'
                },
                sheet: { openLabel: 'Location, field & type', dialogTitle: 'Filter opportunities' },
                resultsId: 'opportunity-results-count',
                selectGroups: [
                    {
                        stateKey: 'location', id: 'filter-location', label: 'Location',
                        options: selectOptions([
                            ['all', 'All Locations'], ['remote', 'Remote'], ['israel', 'Israel'],
                            ['tel aviv', 'Tel Aviv'], ['jerusalem', 'Jerusalem'], ['haifa', 'Haifa'], ['global', 'Global']
                        ])
                    },
                    {
                        stateKey: 'field', id: 'filter-field', label: 'Field',
                        options: selectOptions([
                            ['all', 'All Fields'], ['technology', 'Technology'], ['education', 'Education'],
                            ['environment', 'Environment'], ['community', 'Community'], ['advocacy', 'Advocacy'], ['health', 'Health']
                        ])
                    },
                    {
                        stateKey: 'commitment', id: 'filter-commitment', label: 'Commitment',
                        options: selectOptions([
                            ['all', 'All Types'], ['part-time', 'Part-time'], ['full-time', 'Full-time'],
                            ['flexible', 'Flexible'], ['project-based', 'Project-based']
                        ])
                    },
                    {
                        stateKey: 'event', id: 'filter-event', label: 'Events',
                        options: selectOptions([
                            ['all', 'All listings'], ['events', 'Events only'], ['upcoming', 'Upcoming events'],
                            ['physical', 'In-person events'], ['digital', 'Online events']
                        ])
                    }
                ]
            };
        },

        communityFeed: function () {
            return {
                id: 'community-feed-filters',
                variant: 'compact',
                panelClass: 'community-feed-controls',
                ariaLabel: 'Community feed filters',
                showClear: false,
                search: {
                    stateKey: 'query',
                    id: 'community-feed-search',
                    label: 'Search',
                    hideLabel: true,
                    placeholder: 'Search posts, topics, people, or needs...',
                    ariaLabel: 'Search posts, topics, people, or needs...'
                },
                tabs: {
                    stateKey: 'feedFilter',
                    attr: 'data-feed-filter',
                    tabsClass: 'glowe-filter-tabs community-feed-tabs',
                    defaultValue: 'all',
                    options: selectOptions([
                        ['all', 'For you'], ['question', 'Questions'], ['need', 'Needs'],
                        ['knowledge', 'Knowledge'], ['event', 'Events']
                    ])
                }
            };
        }
    };
})(typeof self !== 'undefined' ? self : this);
