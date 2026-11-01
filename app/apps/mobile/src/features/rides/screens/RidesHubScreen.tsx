// Rides world hub: intro and links, "publish request" / "publish offer" (FR-FEED-020 AC3), the
// route search, then the rides feed — offers and requests by departure, grouped by day
// (docs/spec/05_giving_worlds.md §5.3 "Feed", D75).
import React from 'react';
import { Screen } from '../../../components/ui/Screen';
import { WorldHubHeader } from '../../../components/giving/WorldMarketplaceHub';
import { RideMatchSearch } from '../../../components/giving/RideMatchSearch';
import { RidesFeedList } from '../../../components/giving/RidesFeedList';
import { WorldPublishButtons } from '../../../components/giving/WorldPublishButtons';

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
            showCreateLink={false}
            headerExtra={
              <>
                <WorldPublishButtons worldSlug="rides" />
                <RideMatchSearch />
              </>
            }
          />
        }
      />
    </Screen>
  );
}
