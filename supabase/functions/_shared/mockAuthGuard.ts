// STRICT local-dev guard for mock-login. Hosted Supabase projects always fail this
// check: public URLs use *.supabase.co; local CLI uses kong internally.

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function isLocalSupabaseUrl(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isLocalEdgeRuntimeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'kong' || host.endsWith('.kong');
  } catch {
    return false;
  }
}

function isHostedSupabaseUrl(url: string): boolean {
  return /\.supabase\.co$/i.test(url) || url.includes('.supabase.co');
}

/** True only when this Edge Function runs against a local Supabase stack. */
export function isMockAuthEnvironment(supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''): boolean {
  if (!supabaseUrl || isHostedSupabaseUrl(supabaseUrl)) return false;
  return isLocalSupabaseUrl(supabaseUrl) || isLocalEdgeRuntimeUrl(supabaseUrl);
}
