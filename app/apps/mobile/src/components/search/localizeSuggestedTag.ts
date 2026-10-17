import { ALL_CATEGORIES } from '@kc/domain';

type TFn = (key: string) => string;

const CATEGORY_BY_TAG: Record<string, string> = Object.fromEntries(
  ALL_CATEGORIES.map((c) => [c.toLowerCase(), c]),
);

/**
 * Suggested hashtags come from `search_hashtags`, which stores post category
 * slugs (e.g. `furniture`, `babygear`). Show them in the UI language
 * (#984): known categories use the `search.categories.*` labels; anything else
 * is shown as-is.
 */
export function localizeSuggestedTag(tag: string, t: TFn): string {
  const category = CATEGORY_BY_TAG[tag.trim().toLowerCase().replace(/[-_\s]/g, '')];
  if (!category) return tag;
  const key = `search.categories.${category}`;
  const label = t(key);
  return label && label !== key ? label : tag;
}
