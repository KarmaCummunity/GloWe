import { WorldMarketplaceHub } from '../../../../src/components/giving/WorldMarketplaceHub';
import { WorldLaunchGateBySlug } from '../../../../src/components/worlds/WorldLaunchGate';

export default function KnowledgeHubScreen() {
  return (
    <WorldLaunchGateBySlug worldSlug="knowledge">
      <WorldMarketplaceHub
        worldSlug="knowledge"
        icon="school-outline"
        introKey="donations.knowledge.hubBody"
        createPath="/(tabs)/donations/marketplace/create/knowledge"
        linksCategory="knowledge"
        handoffsPath="/(tabs)/donations/knowledge/handoffs"
      />
    </WorldLaunchGateBySlug>
  );
}
