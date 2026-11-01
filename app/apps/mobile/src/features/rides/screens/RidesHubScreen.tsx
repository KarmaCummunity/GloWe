// Rides world hub: intro and links, the route search, then the rides feed — offers and requests
// by departure, grouped by day (docs/spec/05_giving_worlds.md §5.3 "Feed", D75).
import React from 'react';
import { Screen } from '../../../components/ui/Screen';
import { WorldHubHeader } from '../../../components/giving/WorldMarketplaceHub';
import { RideMatchSearch } from '../../../components/giving/RideMatchSearch';
import { RidesFeedList } from '../../../components/giving/RidesFeedList';

export function RidesHubScreen() {
  return (
    <Screen blobs="content">
      <RidesFeedList
        header={
          <WorldHubHeader
            worldSlug="rides"
            icon="car-outline"
            introKey="donations.rides.hubBody"
            linksCategory="transport"
            handoffsPath="/(tabs)/donations/rides/handoffs"
            headerExtra={<RideMatchSearch />}
          />
        }
      />
    </Screen>
  );
}
