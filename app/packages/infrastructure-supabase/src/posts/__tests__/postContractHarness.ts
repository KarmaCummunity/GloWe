// Local-stack harness for the IPostRepository contract (G39). Imported only by
// SupabasePostRepository.contract.integration.test.ts (kept out of the main
// bundle by the __tests__ location).
//
// Opt-in like sqlProbes: CI_LOCAL_SUPABASE=true selects the `supabase start`
// stack with the CLI's documented demo keys (valid for 127.0.0.1 only); an
// explicit SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY wins.
// Without either the suite skips, so `pnpm test` stays green offline.

import type { Address } from '@kc/domain';
import type { PostRepositoryActor } from '@kc/application';
import { createIntegrationClient } from '../../__tests__/integrationSupabaseClient';
import { SupabasePostRepository } from '../SupabasePostRepository';

const USE_LOCAL = process.env['CI_LOCAL_SUPABASE'] === 'true';
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const SUPABASE_URL =
  process.env['SUPABASE_URL'] ?? process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? (USE_LOCAL ? LOCAL_URL : undefined);
export const ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? (USE_LOCAL ? LOCAL_ANON_KEY : undefined);
export const SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? (USE_LOCAL ? LOCAL_SERVICE_KEY : undefined);

export const skipContract = !SUPABASE_URL || !ANON_KEY || !SERVICE_KEY;

const PASSWORD = 'contract-p4ssword!!';

/** Seeds users on the stack and hands out one signed-in SupabasePostRepository per actor. */
export class PostContractHarness {
  private readonly admin = createIntegrationClient(SUPABASE_URL!, SERVICE_KEY!);
  private readonly cleanup: Array<() => Promise<void>> = [];

  /** The first seeded city: the contract only needs an address the FK accepts. */
  async anyAddress(): Promise<Address> {
    const { data, error } = await this.admin.from('cities').select('city_id, name_he').limit(1).single();
    if (error || !data) throw new Error(`contract harness: no city on the stack (${error?.message ?? 'empty'})`);
    return { city: data.city_id, cityName: data.name_he, street: 'Contract St', streetNumber: '1' };
  }

  /** New confirmed auth user, signed in through the anon key so RLS applies exactly as in the app. */
  async newActor(): Promise<PostRepositoryActor> {
    const email = `contract-${crypto.randomUUID().slice(0, 8)}@kc.test`;
    const { data, error } = await this.admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`contract harness: createUser failed (${error?.message})`);
    const userId = data.user.id;
    // Deleting the auth user cascades to public.users and the actor's posts.
    this.cleanup.push(async () => {
      await this.admin.auth.admin.deleteUser(userId);
    });
    // The on_auth_user_created trigger created the profile row; `posts_insert_self`
    // requires account_status = active, which the trigger grants a confirmed email.
    // Stated explicitly so a stack whose trigger lags does not fail every case.
    const { error: profileError } = await this.admin
      .from('users')
      .update({ account_status: 'active', display_name: 'contract actor' })
      .eq('user_id', userId);
    if (profileError) throw new Error(`contract harness: profile update failed (${profileError.message})`);

    const client = createIntegrationClient(SUPABASE_URL!, ANON_KEY!);
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (signInError) throw new Error(`contract harness: sign-in failed (${signInError.message})`);
    return { userId, repo: new SupabasePostRepository(client) };
  }

  async teardown(): Promise<void> {
    for (const fn of this.cleanup.reverse()) {
      await fn().catch(() => undefined);
    }
  }
}
