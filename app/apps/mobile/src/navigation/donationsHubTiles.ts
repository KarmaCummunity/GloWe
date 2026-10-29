import type { Ionicons } from '@expo/vector-icons';

export interface DonationHubTile {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  subtitleKey: string;
  href: string;
  testID: string;
}

export const DONATIONS_HUB_FEATURED: DonationHubTile = {
  key: 'items',
  icon: 'gift',
  titleKey: 'donations.hubItemsFeaturedTitle',
  subtitleKey: 'donations.hubItemsFeaturedSubtitle',
  href: '/(tabs)',
  testID: 'donation-tile-items',
};

export const DONATIONS_HUB_TILES: DonationHubTile[] = [
  { key: 'time', icon: 'time-outline', titleKey: 'donations.time.title', subtitleKey: 'donations.time.subtitle', href: '/(tabs)/donations/time', testID: 'donation-tile-time' },
  { key: 'money', icon: 'cash-outline', titleKey: 'donations.money.title', subtitleKey: 'donations.money.subtitle', href: '/(tabs)/donations/money', testID: 'donation-tile-money' },
  { key: 'food', icon: 'restaurant-outline', titleKey: 'donations.categories.food.title', subtitleKey: 'donations.categories.food.subtitle', href: '/(tabs)/donations/food', testID: 'donation-tile-food' },
  { key: 'housing', icon: 'home-outline', titleKey: 'donations.categories.housing.title', subtitleKey: 'donations.categories.housing.subtitle', href: '/(tabs)/donations/category/housing', testID: 'donation-tile-housing' },
  { key: 'transport', icon: 'car-outline', titleKey: 'donations.rides.hubTitle', subtitleKey: 'donations.rides.hubSubtitle', href: '/(tabs)/donations/rides', testID: 'donation-tile-rides' },
  { key: 'knowledge', icon: 'school-outline', titleKey: 'donations.categories.knowledge.title', subtitleKey: 'donations.categories.knowledge.subtitle', href: '/(tabs)/donations/knowledge', testID: 'donation-tile-knowledge' },
  { key: 'animals', icon: 'paw-outline', titleKey: 'donations.categories.animals.title', subtitleKey: 'donations.categories.animals.subtitle', href: '/(tabs)/donations/category/animals', testID: 'donation-tile-animals' },
  { key: 'medical', icon: 'medical-outline', titleKey: 'donations.categories.medical.title', subtitleKey: 'donations.categories.medical.subtitle', href: '/(tabs)/donations/category/medical', testID: 'donation-tile-medical' },
];
