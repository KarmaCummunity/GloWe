import {
  SandboxPaymentProvider,
  SupabaseKcSupportChannelsRepository,
  SupabasePaymentsRepository,
  getSupabaseClient,
} from '@kc/infrastructure-supabase';
import {
  CancelStandingOrderUseCase,
  ConfirmDonationUseCase,
  CreateStandingOrderUseCase,
  DonateNowUseCase,
  GetDonationReceiptUseCase,
  GetKcSupportOptionsUseCase,
  GetNonprofitPublicPageUseCase,
  ListDonationHistoryUseCase,
  ListMyStandingOrdersUseCase,
  ListVerifiedNonprofitsUseCase,
  PauseStandingOrderUseCase,
  ResumeStandingOrderUseCase,
} from '@kc/application';
import * as Crypto from 'expo-crypto';
import { pickAuthStorage } from './authSecureStorage';
import { KC_SUPPORT_FALLBACK_CHANNELS } from '../config/kcSupportChannels';

let _repo: SupabasePaymentsRepository | null = null;
let _provider: SandboxPaymentProvider | null = null;

function client() {
  return getSupabaseClient({ storage: pickAuthStorage() });
}

function repo() {
  _repo ??= new SupabasePaymentsRepository(client());
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
  /** FR-DONATE-011 — direct support for KC; compiled channels cover offline / outage. */
  kcSupportOptions: () =>
    new GetKcSupportOptionsUseCase(
      new SupabaseKcSupportChannelsRepository(client()),
      KC_SUPPORT_FALLBACK_CHANNELS,
    ),
};

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Crypto.randomUUID()}`;
}
