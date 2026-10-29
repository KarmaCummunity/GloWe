// Shared state of the unified create form — survives category switches.
import type { PostType } from '@kc/domain';
import { findCreateCategory, type CreateDirection } from './createCategories';

export interface UnifiedCreateShared {
  readonly categoryId: string;
  readonly direction: CreateDirection;
  readonly title: string;
  readonly description: string;
}

export function initialUnifiedCreateState(categoryId?: string | null): UnifiedCreateShared {
  return {
    categoryId: findCreateCategory(categoryId).id,
    direction: 'give',
    title: '',
    description: '',
  };
}

/** Switch category, keeping title/description/direction. */
export function switchCreateCategory(
  state: UnifiedCreateShared,
  nextCategoryId: string,
): UnifiedCreateShared {
  return { ...state, categoryId: findCreateCategory(nextCategoryId).id };
}

export function directionToPostType(direction: CreateDirection): PostType {
  return direction === 'give' ? 'Give' : 'Request';
}

export function postTypeToDirection(type: PostType): CreateDirection {
  return type === 'Give' ? 'give' : 'request';
}
