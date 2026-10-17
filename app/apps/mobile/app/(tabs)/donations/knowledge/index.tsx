import { WorldMarketplaceHub } from '../../../../src/components/giving/WorldMarketplaceHub';

export default function KnowledgeHubScreen() {
  return (
    <WorldMarketplaceHub
      worldSlug="knowledge"
      icon="school-outline"
      introKey="donations.knowledge.hubBody"
      createPath="/(tabs)/donations/marketplace/create/knowledge"
      linksCategory="knowledge"
      handoffsPath="/(tabs)/donations/knowledge/handoffs"
    />
  );
}
