// validate-donation-link/dnsGuard.ts
//
// Address check for hostnames: every A / AAAA record a host resolves to must
// be a public address before the function fetches it. Complements the
// literal-address checks in index.ts, which only see what the URL spells.

/** Resolves one record type; returns [] when the name has no such record. */
export type ResolveRecords = (host: string, type: 'A' | 'AAAA') => Promise<string[]>;

export interface AddressPredicates {
  isPrivateIPv4: (address: string) => boolean;
  isPrivateIPv6: (address: string) => boolean;
}

/** Thrown when the runtime offers no DNS API, so the check cannot run at all. */
export class DnsUnavailableError extends Error {}

/** Deno's resolver, treating "no records of this type" as an empty answer. */
export const denoResolve: ResolveRecords = async (host, type) => {
  if (typeof Deno.resolveDns !== 'function') throw new DnsUnavailableError('Deno.resolveDns unavailable');
  try {
    return await Deno.resolveDns(host, type);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return [];
    if (err instanceof Deno.errors.PermissionDenied || err instanceof Deno.errors.NotSupported) {
      throw new DnsUnavailableError(String(err));
    }
    throw err;
  }
};

/**
 * True when `host` resolves to at least one address and every address is
 * public. Resolution failures and empty answers return false (fail closed).
 * If the runtime has no usable DNS API the check is skipped (returns true,
 * with a warning) so the literal-address checks still apply and valid links
 * keep working.
 */
export async function resolvesOnlyToPublic(
  host: string,
  resolve: ResolveRecords,
  predicates: AddressPredicates,
): Promise<boolean> {
  try {
    const [v4, v6] = await Promise.all([resolve(host, 'A'), resolve(host, 'AAAA')]);
    if (v4.length + v6.length === 0) return false;
    return !v4.some(predicates.isPrivateIPv4) && !v6.some(predicates.isPrivateIPv6);
  } catch (err) {
    if (err instanceof DnsUnavailableError) {
      console.warn('[validate-donation-link] DNS address check skipped:', err.message);
      return true;
    }
    return false;
  }
}
