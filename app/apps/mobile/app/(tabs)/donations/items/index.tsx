import React from 'react';
import { WorldGivingHub } from '../../../../src/components/giving/WorldGivingHub';
import { WorldLaunchGateBySlug } from '../../../../src/components/worlds/WorldLaunchGate';

export default function ItemsWorldScreen() {
  return (
    <WorldLaunchGateBySlug worldSlug="items">
      <WorldGivingHub
        worldSlug="items"
        icon="gift-outline"
        introKey="givingHandoff.itemsHubIntro"
        handoffsPath="/(tabs)/donations/items/handoffs"
      />
    </WorldLaunchGateBySlug>
  );
}
