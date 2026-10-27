// Composition root for IAboutRepository — About landing team roster.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSupabaseClient,
  SupabaseAboutRepository,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import { ListAboutTeamMembersUseCase, type IAboutRepository } from '@kc/application';

let _about: IAboutRepository | null = null;
let _listTeamMembers: ListAboutTeamMembersUseCase | null = null;

function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    if (typeof globalThis.window === 'undefined' || !globalThis.window.localStorage) return undefined;
    return globalThis.window.localStorage;
  }
  return AsyncStorage;
}

function getAboutRepo(): IAboutRepository {
  if (_about) return _about;
  _about = new SupabaseAboutRepository(getSupabaseClient({ storage: pickStorage() }));
  return _about;
}

export function getListAboutTeamMembersUseCase(): ListAboutTeamMembersUseCase {
  if (!_listTeamMembers) {
    _listTeamMembers = new ListAboutTeamMembersUseCase(getAboutRepo());
  }
  return _listTeamMembers;
}
