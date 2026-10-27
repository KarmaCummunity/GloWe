import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SandboxPaymentProvider,
  SupabasePaymentsRepository,
  getSupabaseClient,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import {
  CancelStandingOrderUseCase,
  ConfirmDonationUseCase,
  CreateStandingOrderUseCase,
  DonateNowUseCase,
  GetDonationReceiptUseCase,
  GetNonprofitPublicPageUseCase,
  ListDonationHistoryUseCase,
  ListMyStandingOrdersUseCase,
  ListVerifiedNonprofitsUseCase,
  PauseStandingOrderUseCase,
  ResumeStandingOrderUseCase,
} from '@kc/application';
import * as Crypto from 'expo-crypto';

function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    return globalThis.window?.localStorage;
  }
  return AsyncStorage;
}

let _repo: SupabasePaymentsRepository | null = null;
let _provider: SandboxPaymentProvider | null = null;

function repo() {
  _repo ??= new SupabasePaymentsRepository(getSupabaseClient({ storage: pickStorage() }));
  return _repo;
}

function provider() {
  _provider ??= new SandboxPaymentProvider(repo());
  return _provider;
}

export const paymentsUseCases = {
  listNonprofits: () => new ListVerifiedNonprofitsUseCase(repo()),
  getNonprofitPage: () => new GetNonprofitPublicPageUseCase(repo()),
  donateNow: () => new DonateNowUseCase(provider()),
  confirmDonation: () => new ConfirmDonationUseCase(provider()),
  createStandingOrder: () => new CreateStandingOrderUseCase(repo()),
  listStandingOrders: () => new ListMyStandingOrdersUseCase(repo()),
  cancelStandingOrder: () => new CancelStandingOrderUseCase(repo()),
  pauseStandingOrder: () => new PauseStandingOrderUseCase(repo()),
  resumeStandingOrder: () => new ResumeStandingOrderUseCase(repo()),
  listHistory: () => new ListDonationHistoryUseCase(repo()),
  getReceipt: () => new GetDonationReceiptUseCase(repo()),
};

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Crypto.randomUUID()}`;
}
