// Composition root for IUserRealtime — wires SupabaseUserRealtime into the app.
// Mirrors userComposition.ts singleton pattern. FR-KARMA-009.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSupabaseClient,
  SupabaseUserRealtime,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import type { IUserRealtime } from '@kc/application';

function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    return globalThis.window?.localStorage;
  }
  return AsyncStorage;
}

let instance: IUserRealtime | null = null;

export function getUserRealtime(): IUserRealtime {
  if (!instance) {
    instance = new SupabaseUserRealtime(getSupabaseClient({ storage: pickStorage() }));
  }
  return instance;
}
