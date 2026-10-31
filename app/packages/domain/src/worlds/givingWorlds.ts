// D45 / D62 — the one list of giving worlds and domains in code
// (docs/spec/04_product_structure.md, 05, 06). A giving world is the *type* of
// giving; a domain is a topic tag on a post and has its own hub (S38).
// `app_design` is not a world (D18); legacy marketplace slugs such as
// `medical`, `animals`, `environment` and `creative` are domains.

export const GIVING_WORLD_SLUGS = [
  'items', 'food', 'rides', 'time', 'money', 'housing', 'knowledge', 'experiences',
] as const;
export type GivingWorldSlug = (typeof GIVING_WORLD_SLUGS)[number];

export const DOMAIN_SLUGS = [
  'medical', 'animals', 'environment', 'elderly', 'democracy', 'employment',
  'sport', 'tech', 'heritage', 'culture', 'spirituality',
] as const;
export type DomainSlug = (typeof DOMAIN_SLUGS)[number];

export function isGivingWorldSlug(value: string): value is GivingWorldSlug {
  return (GIVING_WORLD_SLUGS as readonly string[]).includes(value);
}

export function isDomainSlug(value: string): value is DomainSlug {
  return (DOMAIN_SLUGS as readonly string[]).includes(value);
}
