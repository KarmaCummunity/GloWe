import React from 'react';
import { WorldGivingHub } from '../../../../src/components/giving/WorldGivingHub';
import { WorldLaunchGateBySlug } from '../../../../src/components/worlds/WorldLaunchGate';

export default function FoodWorldScreen() {
  return (
    <WorldLaunchGateBySlug worldSlug="food">
      <WorldGivingHub
        worldSlug="food"
        icon="restaurant-outline"
        introKey="givingHandoff.foodHubIntro"
        handoffsPath="/(tabs)/donations/food/handoffs"
        createPath="/(tabs)/donations/marketplace/create/food"
      />
    </WorldLaunchGateBySlug>
  );
}
