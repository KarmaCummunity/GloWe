// English — "My listings" screen copy (marketplace).
// Extracted from `donations.ts` (300-LOC cap). Spread into `marketplace` so keys stay `marketplace.myListings*`.

export const marketplaceMyListings = {
  myListingsNav: 'My listings',
  myListingsTitle: 'My listings',
  myListingsSubtitle: 'Edit, pause, mark fulfilled, or delete your marketplace posts. Fulfilling earns karma.',
  myListingsEmpty: 'You have no listings yet.',
  myListingsEdit: 'Edit',
  myListingsPause: 'Pause',
  myListingsResume: 'Resume',
  myListingsFulfill: 'Mark fulfilled',
  myListingsFulfillTitle: 'Mark as fulfilled?',
  myListingsFulfillHint: 'This closes the listing and awards karma for completing a give/request.',
  myListingsDelete: 'Delete',
  myListingsDeleteTitle: 'Delete listing?',
  myListingsDeleteHint: 'This permanently removes the listing.',
  myListingsSave: 'Save changes',
  myListingsUpdated: 'Updated {{date}}',
  myListingsHiddenHint: 'Hidden from others until the team reviews the reports',
} as const;
