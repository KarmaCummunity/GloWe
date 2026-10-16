import type { IModerationAdminRepository } from '../ports/IModerationAdminRepository';

export interface AdminRemoveListingInput {
  listingId: string;
}

export class AdminRemoveListingUseCase {
  constructor(private readonly repo: IModerationAdminRepository) {}

  async execute(input: AdminRemoveListingInput): Promise<void> {
    await this.repo.removeListing(input.listingId);
  }
}
