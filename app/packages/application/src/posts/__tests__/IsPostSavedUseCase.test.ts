import { describe, expect, it } from 'vitest';
import { IsPostSavedUseCase } from '../IsPostSavedUseCase';
import { FakeSavedPostsRepository } from './fakeSavedPostsRepository';

describe('IsPostSavedUseCase', () => {
  it('rejects blank postId', async () => {
    const uc = new IsPostSavedUseCase(new FakeSavedPostsRepository());
    await expect(uc.execute('  ')).rejects.toThrow('postId is required');
  });

  it('forwards to the repository', async () => {
    const repo = new FakeSavedPostsRepository();
    repo.isPostSavedResult = true;
    const uc = new IsPostSavedUseCase(repo);
    await expect(uc.execute('p1')).resolves.toBe(true);
    expect(repo.lastIsPostSavedPostId).toBe('p1');
  });
});
