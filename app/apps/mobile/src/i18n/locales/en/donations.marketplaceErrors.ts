// English — marketplace create-listing rule and server error copy.
// Extracted from `donations.ts` (300-LOC cap). Composed into `marketplace.errors`.
// Keys mirror MARKETPLACE_SERVER_ERROR_CODES in @kc/domain (marketplaceWorldRules.ts).

export const marketplaceErrors = {
  items_image_required: 'Item listings need at least one photo.',
  food_expiry_required: 'Please enter a future expiry date and time for the food.',
  routed_world_requires_external_body: 'Please choose a verified organisation before publishing in this world.',
  medical_listing_requires_external_body: 'This medical listing type requires a verified organisation.',
  external_body_invalid: 'The selected organisation is not verified or does not belong to this world. Please choose another.',
  world_permission_denied: 'Publishing in this world is open to verified members only. Complete account verification and try again.',
  food_posting_banned: 'Food posting is temporarily blocked for your account.',
  ride_cost_share_cap_exceeded: 'The ride cost share is above the allowed maximum.',
  money_active_campaign_cap: 'You can have up to 5 active campaigns in the money world.',
  matchmaking_min_age: 'Matchmaking is for ages 18 and up.',
  details_schema_mismatch: 'Some listing details are invalid. Please check the fields.',
  listing_details_schema_mismatch: 'Some listing details are invalid. Please check the fields.',
  media_path_must_be_owned: 'One of the photos was not uploaded from your account. Please re-upload it.',
  member_inactive: 'Your account is not active, so you cannot publish.',
  auth_required: 'Please sign in to publish.',
  kind_not_found: 'This listing type is no longer available. Please choose another.',
  generic: 'Publishing failed. Please try again.',
} as const;
