// English — marketplace world labels + external-organisation picker copy.
// Extracted from `donations.ts` (300-LOC cap). Composed into `marketplace.world` / `marketplace.orgPicker`.

export const marketplaceWorldLabels = {
  money: 'Money',
  time: 'Time',
  items: 'Items',
  food: 'Food',
  rides: 'Rides',
  housing: 'Housing',
  knowledge: 'Knowledge',
  medical: 'Blood & medical',
  animals: 'Animals',
  environment: 'Environment',
  creative: 'Creative',
  app_design: 'App design',
  romantic_matchmaking: 'Matchmaking',
} as const;

export const marketplaceOrgPicker = {
  label: 'Verified organisation',
  hint: 'Listings in this world go through a verified organisation. Choose who will handle it.',
  title: 'Choose an organisation',
  placeholder: 'Search organisations…',
  empty: 'No verified organisations found.',
  error: 'Could not load organisations.',
  required: 'Please choose a verified organisation before publishing.',
} as const;

/** Hub browse refinements (KC#1102 / KC#1111): world subcategory and distance from home. */
export const marketplaceBrowseRefine = {
  subcategoryRowA11y: 'Filter by category',
  allSubcategories: 'All categories',
  radiusRowA11y: 'Distance from home',
  radius: 'Up to {{km}} km',
} as const;
