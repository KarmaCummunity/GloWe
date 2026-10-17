import { describe, expect, it } from 'vitest';
import { ListPostActorIdentityUseCase } from '../ListPostActorIdentityUseCase';
import { FakePostRepository } from './fakePostRepository';

describe('ListPostActorIdentityUseCase', () => {
  it('forwards postId to the repository', async () => {
    const repo = new FakePostRepository();
    repo.listPostActorIdentitiesResult = [];
    const uc = new ListPostActorIdentityUseCase(repo);
    const rows = await uc.execute({ postId: 'p1' });
    expect(repo.lastListPostActorIdentityPostId).toBe('p1');
    expect(rows).toEqual([]);
  });
});
