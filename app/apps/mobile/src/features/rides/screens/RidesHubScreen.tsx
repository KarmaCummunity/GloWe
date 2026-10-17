// Rides world hub — marketplace listings + curated transport links.
import React from 'react';
import { WorldMarketplaceHub } from '../../../components/giving/WorldMarketplaceHub';
import { RideMatchSearch } from '../../../components/giving/RideMatchSearch';

export function RidesHubScreen() {
  return (
    <WorldMarketplaceHub
      worldSlug="rides"
      icon="car-outline"
      introKey="donations.rides.hubBody"
      createPath="/(tabs)/donations/marketplace/create/rides"
      linksCategory="transport"
      handoffsPath="/(tabs)/donations/rides/handoffs"
      headerExtra={<RideMatchSearch />}
    />
  );
}
