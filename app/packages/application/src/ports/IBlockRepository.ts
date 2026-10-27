/** Apple 1.2 / FR-MOD — a user blocks another user (mutual invisibility enforced server-side). */
export interface IBlockRepository {
  isBlocking(blockerId: string, blockedId: string): Promise<boolean>;
  block(blockerId: string, blockedId: string): Promise<void>;
  unblock(blockerId: string, blockedId: string): Promise<void>;
}
