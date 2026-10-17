// Items / food hub: the shared world hub with urgency + availability row meta.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { WorldMarketplaceHub } from './WorldMarketplaceHub';

type Props = {
  worldSlug: 'items' | 'food';
  icon: 'gift-outline' | 'restaurant-outline';
  introKey: 'givingHandoff.itemsHubIntro' | 'givingHandoff.foodHubIntro';
  handoffsPath: string;
  createPath: string;
};

export function WorldGivingHub({ worldSlug, icon, introKey, handoffsPath, createPath }: Props) {
  const { t } = useTranslation();
  return (
    <WorldMarketplaceHub
      worldSlug={worldSlug}
      icon={icon}
      introKey={introKey}
      handoffsPath={handoffsPath}
      createPath={createPath}
      createLabelKey="givingHandoff.createListing"
      rowMeta={(item) =>
        `${worldSlug === 'food' && item.urgencyLevel >= 4 ? `${t('givingHandoff.urgencyHigh')} · ` : ''}${t(
          `marketplace.availability.${item.availabilityStatus}`,
          { defaultValue: item.availabilityStatus },
        )} · ${t(`marketplace.world.${worldSlug}`)}`
      }
    />
  );
}
