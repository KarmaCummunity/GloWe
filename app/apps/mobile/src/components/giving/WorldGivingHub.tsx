// Mapped to spec: FR-FEED-020 AC2. Items / food world screen: the shared world feed (search,
// seeker / offerer, publish button, subcategory + distance refinements) with urgency and
// availability as each card's meta line.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { WorldHubHeader } from './WorldMarketplaceHub';
import { WorldFeedScreen } from './WorldFeedScreen';

type Props = {
  worldSlug: 'items' | 'food';
  icon: 'gift-outline' | 'restaurant-outline';
  introKey: 'givingHandoff.itemsHubIntro' | 'givingHandoff.foodHubIntro';
  handoffsPath: string;
};

/** Food offers at urgency 4+ (expiring soon) are flagged first on their card. */
const URGENT_LEVEL = 4;

export function WorldGivingHub({ worldSlug, icon, introKey, handoffsPath }: Props) {
  const { t } = useTranslation();
  return (
    <WorldFeedScreen
      worldSlug={worldSlug}
      withRefinements
      header={
        <WorldHubHeader
          worldSlug={worldSlug}
          icon={icon}
          introKey={introKey}
          handoffsPath={handoffsPath}
          showCreateLink={false}
        />
      }
      rowMeta={(item) =>
        `${worldSlug === 'food' && item.urgencyLevel >= URGENT_LEVEL ? `${t('givingHandoff.urgencyHigh')} · ` : ''}${t(
          `marketplace.availability.${item.availabilityStatus}`,
          { defaultValue: item.availabilityStatus },
        )}`
      }
    />
  );
}
