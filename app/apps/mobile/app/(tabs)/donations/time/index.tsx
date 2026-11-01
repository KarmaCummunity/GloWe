// Time world screen (FR-FEED-020 AC2; product book docs/spec/05 §5.4): intro and the world's
// sub-screens (my shifts, organisations' opportunities, organiser tools, contact), then the
// world feed — search, seeker / offerer and member offers / requests of time.
import React from 'react';
import { TimeWorldScreen } from '../../../../src/components/giving/TimeWorldScreen';
import { WorldLaunchGateByFlag } from '../../../../src/components/worlds/WorldLaunchGate';

export default function TimeWorldRoute() {
  return (
    <WorldLaunchGateByFlag flagKey="world_time_enabled">
      <TimeWorldScreen />
    </WorldLaunchGateByFlag>
  );
}
