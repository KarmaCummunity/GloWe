// Local-stack harness for the IPostRepository contract (G39). Imported only by
// SupabasePostRepository.contract.integration.test.ts (kept out of the main
// bundle by the __tests__ location).
//
// Credentials come from the environment only — SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY — never from literals in the repo. ci-backend exports
// them from `supabase status -o env` after `supabase start`; locally:
//   eval "$(supabase status -o env)"
//   SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY \
//     pnpm --filter @kc/infrastructure-supabase test contract.integration
// Without them vitest.config.ts does not collect the contract suites at all.

import type { Address } from '@kc/domain';
import type { PostRepositoryActor } from '@kc/application';
import { createIntegrationClient } from '../../__tests__/integrationSupabaseClient';
import { SupabasePostRepository } from '../SupabasePostRepository';

const PASSWORD = 'contract-p4ssword!!';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`contract harness: ${name} is not set — export the running stack with \`supabase status -o env\``);
  }
  return value;
}

/** Seeds users on the stack and hands out one signed-in SupabasePostRepository per actor. */
export class PostContractHarness {
  private readonly url = requireEnv('SUPABASE_URL');
  private readonly anonKey = requireEnv('SUPABASE_ANON_KEY');
  private readonly admin = createIntegrationClient(this.url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'));
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

    const client = createIntegrationClient(this.url, this.anonKey);
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
