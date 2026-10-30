// Compiled fallback for the KC direct-support channels (FR-DONATE-010 / FR-DONATE-011).
// The live list comes from `public.kc_support_channels` (migration 0447); these
// values are used only when it cannot be loaded, and by the About / Settings card.
import type { KcSupportChannel } from '@kc/domain';

export const KC_BIT_URL = 'https://www.bitpay.co.il/app/share-info?i=192485429007_19nlt4Un';
export const KC_PAYBOX_URL = 'https://links.payboxapp.com/XR2JbQRxMUb';

export const KC_SUPPORT_FALLBACK_CHANNELS: readonly KcSupportChannel[] = [
  { kind: 'bit', url: KC_BIT_URL, providerLabel: 'Bit' },
  { kind: 'paybox', url: KC_PAYBOX_URL, providerLabel: 'PayBox' },
];
