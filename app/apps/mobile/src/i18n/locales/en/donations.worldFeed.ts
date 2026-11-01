// FR-FEED-020 AC2 / AC3 — a giving world's feed: search, the seeker / offerer toggle and the
// "publish request" / "publish offer" buttons (PM decision 2026-11-01).
export const worldFeed = {
  modeA11y: 'Looking or offering',
  seeker: 'Looking',
  offerer: 'Offering',
  publishRequest: 'Post a request',
  publishOffer: 'Post an offer',
  searchPlaceholder: 'Search {{world}}…',
  offersTitle: 'Open offers',
  requestsTitle: 'Open requests',
  emptyOffers: 'No open offers right now. Post a request and someone may answer.',
  emptyRequests: 'No open requests right now. You can post an offer.',
  emptySearch: 'No results for this search.',
  loadFailed: 'We could not load the feed. Pull down to try again.',
  timeOpportunitiesLink: 'Volunteering with organisations',
} as const;
