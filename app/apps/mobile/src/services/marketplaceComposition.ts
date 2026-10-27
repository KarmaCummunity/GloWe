import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSupabaseClient,
  SupabaseMarketplaceRepository,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import type { IMarketplaceRepository } from '@kc/application';

let _repo: IMarketplaceRepository | null = null;

function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    return globalThis.window?.localStorage;
  }
  return AsyncStorage;
}

export function getMarketplaceSupabaseClient() {
  return getSupabaseClient({ storage: pickStorage() });
}

export function marketplaceRepository(): IMarketplaceRepository {
  if (!_repo) {
    _repo = new SupabaseMarketplaceRepository(getSupabaseClient({ storage: pickStorage() }));
  }
  return _repo;
}
