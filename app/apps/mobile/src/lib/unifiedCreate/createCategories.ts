// FR-POST-001 + marketplace create — one create form for every domain.
// Mapped to spec: FR-POST-001 (single create surface, category-adaptive fields).
// Category config drives which fields the unified create form renders and which
// write path (legacy post vs marketplace listing) is used on submit.
import { MARKETPLACE_CREATE_WORLD_SLUGS, ROUTED_WORLDS } from '@kc/domain';

export type CreateEngine = 'post' | 'listing';
export type CreateDirection = 'give' | 'request';

/** Fields every category shares (kept when switching category). */
export const SHARED_CREATE_FIELDS = ['title', 'description', 'location', 'images'] as const;

export type SharedCreateField = (typeof SHARED_CREATE_FIELDS)[number];
export type SpecificCreateField =
  | 'postCategory'
  | 'condition'
  | 'estimatedValue'
  | 'urgency'
  | 'exposure'
  | 'listingKind'
  | 'listingDetails'
  | 'rideRoute'
  | 'externalBody'
  | 'radius';
export type CreateField = SharedCreateField | SpecificCreateField;

export interface CreateCategoryConfig {
  readonly id: string;
  readonly engine: CreateEngine;
  /** i18n key for the chip label. */
  readonly labelKey: string;
  /** Marketplace world slug for listing categories. */
  readonly worldSlug: string | null;
  readonly specificFields: readonly SpecificCreateField[];
}

export const GENERAL_CREATE_CATEGORY = 'general';

const POST_CATEGORY: CreateCategoryConfig = {
  id: GENERAL_CREATE_CATEGORY,
  engine: 'post',
  labelKey: 'post.unifiedCreate.general',
  worldSlug: null,
  specificFields: ['postCategory', 'condition', 'estimatedValue', 'urgency', 'exposure'],
};

function listingCategory(slug: string): CreateCategoryConfig {
  const specific: SpecificCreateField[] = ['listingKind'];
  if (slug === 'rides') specific.push('rideRoute');
  specific.push('listingDetails');
  if ((ROUTED_WORLDS as readonly string[]).includes(slug)) specific.push('externalBody');
  specific.push('radius');
  return {
    id: slug,
    engine: 'listing',
    labelKey: `marketplace.world.${slug}`,
    worldSlug: slug,
    specificFields: specific,
  };
}

export const CREATE_CATEGORIES: readonly CreateCategoryConfig[] = [
  POST_CATEGORY,
  ...MARKETPLACE_CREATE_WORLD_SLUGS.map(listingCategory),
];

export function findCreateCategory(id: string | null | undefined): CreateCategoryConfig {
  return CREATE_CATEGORIES.find((c) => c.id === id) ?? POST_CATEGORY;
}

/** Fields rendered for a category + direction, in render order. */
export function createFieldsFor(
  category: CreateCategoryConfig,
  direction: CreateDirection,
): readonly CreateField[] {
  const specific = category.specificFields.filter((f) => {
    if (f === 'condition' || f === 'estimatedValue') return direction === 'give';
    if (f === 'urgency') return direction === 'request';
    return true;
  });
  return [...SHARED_CREATE_FIELDS, ...specific];
}

export function hasCreateField(
  category: CreateCategoryConfig,
  direction: CreateDirection,
  field: CreateField,
): boolean {
  return createFieldsFor(category, direction).includes(field);
}

/** Categories visible in the picker (listing worlds respect launch flags). */
export function visibleCreateCategories(
  isWorldEnabled: (slug: string) => boolean,
): readonly CreateCategoryConfig[] {
  return CREATE_CATEGORIES.filter((c) => c.worldSlug === null || isWorldEnabled(c.worldSlug));
}

/** Single entry route for every create button; preselects a category. */
export function createRouteFor(categoryId?: string | null): string {
  const base = '/(tabs)/create';
  if (!categoryId || categoryId === GENERAL_CREATE_CATEGORY) return base;
  return `${base}?category=${encodeURIComponent(categoryId)}`;
}
