import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient, type SupabaseAuthStorage } from '@kc/infrastructure-supabase';
import type { RemoteFeatureFlags } from '../config/featureFlags';

function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    if (typeof globalThis.window === 'undefined' || !globalThis.window.localStorage) return undefined;
    return globalThis.window.localStorage;
  }
  return AsyncStorage;
}

/** Reads public.app_flags (0403). Any failure → {} so compiled defaults apply. */
export async function fetchRemoteFeatureFlags(): Promise<RemoteFeatureFlags> {
  try {
    const { data, error } = await getSupabaseClient({ storage: pickStorage() })
      .from('app_flags')
      .select('key, enabled');
    if (error || !data) return {};
    return Object.fromEntries(data.map((row) => [row.key, row.enabled]));
  } catch {
    return {};
  }
}
