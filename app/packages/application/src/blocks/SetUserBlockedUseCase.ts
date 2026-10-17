import type { IBlockRepository } from '../ports/IBlockRepository';

export interface SetUserBlockedInput {
  blockerId: string;
  targetUserId: string;
  blocked: boolean;
}

/** Block or unblock a user. Blocking yourself is rejected before hitting the server. */
export class SetUserBlockedUseCase {
  constructor(private readonly repo: IBlockRepository) {}

  async execute(input: SetUserBlockedInput): Promise<void> {
    if (!input.blockerId || !input.targetUserId) throw new Error('block_missing_user');
    if (input.blockerId === input.targetUserId) throw new Error('block_self');
    if (input.blocked) await this.repo.block(input.blockerId, input.targetUserId);
    else await this.repo.unblock(input.blockerId, input.targetUserId);
  }
}
