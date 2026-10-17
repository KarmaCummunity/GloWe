import { Platform } from 'react-native';
import { MarketplaceMapView as NativeMarketplaceMapView } from './MarketplaceMapView.native';
import { MarketplaceMapView as WebMarketplaceMapView } from './MarketplaceMapView.web';

export const MarketplaceMapView = Platform.OS === 'web' ? WebMarketplaceMapView : NativeMarketplaceMapView;
