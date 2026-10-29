// Unified create: active category (from ?category= deep link or picker) + header.
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { isMarketplaceWorldLaunchEnabled, type PostType } from '@kc/domain';
import { UnifiedCreateHeader } from '../components/CreatePostForm/UnifiedCreateHeader';
import { useRemoteAppFlags } from './useLaunchWorldFlags';
import { findCreateCategory, visibleCreateCategories } from '../lib/unifiedCreate/createCategories';
import { directionToPostType, postTypeToDirection } from '../lib/unifiedCreate/unifiedCreateState';

export function useUnifiedCreateCategory(type: PostType, setType: (t: PostType) => void) {
  const params = useLocalSearchParams<{ category?: string }>();
  const remoteFlags = useRemoteAppFlags();
  const categories = visibleCreateCategories((slug) => isMarketplaceWorldLaunchEnabled(slug, remoteFlags));
  const [categoryId, setCategoryId] = useState(() => findCreateCategory(params.category).id);
  useEffect(() => {
    if (params.category) setCategoryId(findCreateCategory(params.category).id);
  }, [params.category]);
  const activeCategory = findCreateCategory(categoryId);
  const direction = postTypeToDirection(type);
  const header = (
    <UnifiedCreateHeader
      categories={categories}
      categoryId={activeCategory.id}
      onCategoryChange={setCategoryId}
      direction={direction}
      onDirectionChange={(d) => setType(directionToPostType(d))}
    />
  );
  return { activeCategory, direction, header };
}
