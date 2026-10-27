// ─────────────────────────────────────────────
// Composition root for ISearchRepository — mirrors postsComposition.ts.
// Mapped to SRS: FR-FEED-017+ (universal search engine).
// ─────────────────────────────────────────────

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSupabaseClient,
  SupabaseSearchRepository,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import {
  UniversalSearchUseCase,
  type ISearchRepository,
} from '@kc/application';

let _repo: ISearchRepository | null = null;
let _search: UniversalSearchUseCase | null = null;

function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    if (typeof globalThis.window === 'undefined' || !globalThis.window.localStorage) return undefined;
    return globalThis.window.localStorage;
  }
  return AsyncStorage;
}

function getRepo(): ISearchRepository {
  if (_repo) return _repo;
  _repo = new SupabaseSearchRepository(getSupabaseClient({ storage: pickStorage() }));
  return _repo;
}

export function getUniversalSearchUseCase(): UniversalSearchUseCase {
  _search ??= new UniversalSearchUseCase(getRepo());
  return _search;
}
