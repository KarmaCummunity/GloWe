import { describe, it, expect, vi } from 'vitest';
import { LoadPublicResearchBundleUseCase } from '../LoadPublicResearchBundleUseCase';
import { PublicResearchError } from '@kc/domain';
import { makeFakeRepo, makeBundle } from './publicResearchFakeRepository';

describe('LoadPublicResearchBundleUseCase', () => {
  it('returns the bundle from the repo', async () => {
    const bundle = makeBundle({ slug: 'market-research-2024', version: 3 });
    const repo = makeFakeRepo({ loadBundle: vi.fn().mockResolvedValue(bundle) });
    const uc = new LoadPublicResearchBundleUseCase(repo);

    const result = await uc.execute('market-research-2024');

    expect(result).toEqual(bundle);
    expect(repo.loadBundle).toHaveBeenCalledWith('market-research-2024');
  });

  it('throws PublicResearchError survey_not_found when repo throws it', async () => {
    const repo = makeFakeRepo({
      loadBundle: vi.fn().mockRejectedValue(
        new PublicResearchError('survey_not_found'),
      ),
    });
    const uc = new LoadPublicResearchBundleUseCase(repo);

    await expect(uc.execute('missing-slug')).rejects.toMatchObject({
      code: 'survey_not_found',
    });
  });

  it('wraps unknown repo error as PublicResearchError network', async () => {
    const repo = makeFakeRepo({
      loadBundle: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    const uc = new LoadPublicResearchBundleUseCase(repo);

    await expect(uc.execute('market-research-2024')).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('passes the slug through to the repo unchanged', async () => {
    const repo = makeFakeRepo();
    const uc = new LoadPublicResearchBundleUseCase(repo);

    await uc.execute('alt-platforms-q4');

    expect(repo.loadBundle).toHaveBeenCalledWith('alt-platforms-q4');
  });

  it('throws PublicResearchError survey_not_found when repo returns null', async () => {
    const repo = makeFakeRepo({
      loadBundle: vi.fn().mockResolvedValue(null),
    });
    const uc = new LoadPublicResearchBundleUseCase(repo);

    await expect(uc.execute('market-research-2024')).rejects.toMatchObject({
      code: 'survey_not_found',
    });
  });
});
