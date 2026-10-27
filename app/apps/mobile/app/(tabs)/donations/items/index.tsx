import React from 'react';
import { WorldGivingHub } from '../../../../src/components/giving/WorldGivingHub';

export default function ItemsWorldScreen() {
  return (
    <WorldGivingHub
      worldSlug="items"
      icon="gift-outline"
      introKey="givingHandoff.itemsHubIntro"
      handoffsPath="/(tabs)/donations/items/handoffs"
      createPath="/(tabs)/donations/marketplace/create/items"
    />
  );
}
