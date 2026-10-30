import type { SupabaseClient } from '@supabase/supabase-js';
import type { DonationCategorySlug, DonationLink } from '@kc/domain';
import { DonationLinkError } from '@kc/application';
import type {
  AddDonationLinkInput,
  IDonationLinksRepository,
  UpdateDonationLinkInput,
} from '@kc/application';
import type { Database } from '../database.types';
import {
  donationLinkErrorFromInvokeData,
  donationLinkErrorFromInvokeFailure,
} from './parseDonationLinkInvokeError';

type LinkRow = Database['public']['Tables']['donation_links']['Row'];

function mapRow(row: LinkRow): DonationLink {
  return {
    id: row.id,
    categorySlug: row.category_slug as DonationCategorySlug,
    url: row.url,
    displayName: row.display_name,
    description: row.description,
    submittedBy: row.submitted_by,
    validatedAt: row.validated_at,
    hiddenAt: row.hidden_at,
    createdAt: row.created_at,
  };
}

export class SupabaseDonationLinksRepository implements IDonationLinksRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByCategory(slug: DonationCategorySlug): Promise<DonationLink[]> {
    const { data, error } = await this.client
      .from('donation_links')
      .select('id, category_slug, url, display_name, description, submitted_by, validated_at, hidden_at, created_at')
      .eq('category_slug', slug)
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new DonationLinkError('network', error.message, error);
    return (data ?? []).map((row) => mapRow(row as unknown as LinkRow));
  }

  async addViaEdgeFunction(input: AddDonationLinkInput): Promise<DonationLink> {
    const { data, error } = await this.client.functions.invoke<{
      ok: boolean;
      code?: string;
      link?: LinkRow;
    }>('validate-donation-link', {
      body: {
        category_slug: input.categorySlug,
        url: input.url,
        display_name: input.displayName,
        description: input.description ?? null,
      },
    });
    if (error) throw await donationLinkErrorFromInvokeFailure(error);
    if (!data || !data.ok || !data.link) {
      throw donationLinkErrorFromInvokeData(data);
    }
    return mapRow(data.link);
  }

  async updateViaEdgeFunction(input: UpdateDonationLinkInput): Promise<DonationLink> {
    const { data, error } = await this.client.functions.invoke<{
      ok: boolean;
      code?: string;
      link?: LinkRow;
    }>('validate-donation-link', {
      body: {
        link_id: input.linkId,
        category_slug: input.categorySlug,
        url: input.url,
        display_name: input.displayName,
        description: input.description ?? null,
      },
    });
    if (error) throw await donationLinkErrorFromInvokeFailure(error);
    if (!data || !data.ok || !data.link) {
      throw donationLinkErrorFromInvokeData(data);
    }
    return mapRow(data.link);
  }

  async softHide(linkId: string): Promise<void> {
    const userId = (await this.client.auth.getUser()).data.user?.id ?? null;
    const { error } = await this.client
      .from('donation_links')
      .update({ hidden_at: new Date().toISOString(), hidden_by: userId })
      .eq('id', linkId);
    if (error) throw new DonationLinkError('network', error.message, error);
  }

  async deleteById(linkId: string): Promise<void> {
    const { error } = await this.client.from('donation_links').delete().eq('id', linkId);
    if (error) throw new DonationLinkError('network', error.message, error);
  }

  async report(linkId: string): Promise<void> {
    const { error } = await this.client.rpc('report_donation_link', { p_link_id: linkId });
    if (error) throw new DonationLinkError('network', error.message, error);
  }
}
