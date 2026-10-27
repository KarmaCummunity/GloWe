import React from 'react';
import { WorldGivingHub } from '../../../../src/components/giving/WorldGivingHub';

export default function FoodWorldScreen() {
  return (
    <WorldGivingHub
      worldSlug="food"
      icon="restaurant-outline"
      introKey="givingHandoff.foodHubIntro"
      handoffsPath="/(tabs)/donations/food/handoffs"
      createPath="/(tabs)/donations/marketplace/create/food"
    />
  );
}
