import {
  CancelGivingHandoffUseCase,
  ClaimFoodGivingUseCase,
  ConfirmItemHandoffUseCase,
  GetListingHandoffUseCase,
  ListMyGivingHandoffsUseCase,
  MarkGivingHandedOverUseCase,
  RateGivingHandoffUseCase,
  ReserveItemGivingUseCase,
} from '@kc/application';
import { marketplaceRepository } from './marketplaceComposition';

function repo() {
  return marketplaceRepository();
}

export const givingHandoffUseCases = {
  getForListing: () => new GetListingHandoffUseCase(repo()),
  listMine: () => new ListMyGivingHandoffsUseCase(repo()),
  reserveItem: () => new ReserveItemGivingUseCase(repo()),
  confirmItem: () => new ConfirmItemHandoffUseCase(repo()),
  claimFood: () => new ClaimFoodGivingUseCase(repo()),
  cancel: () => new CancelGivingHandoffUseCase(repo()),
  markHandedOver: () => new MarkGivingHandedOverUseCase(repo()),
  rate: () => new RateGivingHandoffUseCase(repo()),
};
