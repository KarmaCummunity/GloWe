// Composition root for ILegalDocumentRepository — FR-SETTINGS-010 server-driven legal docs.
// Singletons, lazy-instantiated. AsyncStorage backs the offline content cache.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSupabaseClient,
  SupabaseLegalDocumentRepository,
  LegalDocumentCache,
  type AsyncKVStorage,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import {
  LoadLegalDocumentUseCase,
  CheckPendingLegalAcksUseCase,
  AcceptLegalDocumentUseCase,
  type ILegalDocumentRepository,
} from '@kc/application';

let _repo: ILegalDocumentRepository | null = null;
let _load: LoadLegalDocumentUseCase | null = null;
let _check: CheckPendingLegalAcksUseCase | null = null;
let _accept: AcceptLegalDocumentUseCase | null = null;

function pickSupabaseStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    return globalThis.window?.localStorage;
  }
  return AsyncStorage;
}

// react-native AsyncStorage already implements the AsyncKVStorage shape we
// need for the legal cache (getItem / setItem / removeItem returning promises).
const legalCacheStorage: AsyncKVStorage = AsyncStorage;

function getRepo(): ILegalDocumentRepository {
  if (_repo) return _repo;
  const cache = new LegalDocumentCache(legalCacheStorage);
  _repo = new SupabaseLegalDocumentRepository(
    getSupabaseClient({ storage: pickSupabaseStorage() }),
    cache,
  );
  return _repo;
}

export function getLoadLegalDocumentUseCase(): LoadLegalDocumentUseCase {
  _load ??= new LoadLegalDocumentUseCase(getRepo());
  return _load;
}

export function getCheckPendingLegalAcksUseCase(): CheckPendingLegalAcksUseCase {
  _check ??= new CheckPendingLegalAcksUseCase(getRepo());
  return _check;
}

export function getAcceptLegalDocumentUseCase(): AcceptLegalDocumentUseCase {
  _accept ??= new AcceptLegalDocumentUseCase(getRepo());
  return _accept;
}
