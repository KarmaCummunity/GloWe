import { describe, it, expect, vi } from 'vitest';
import { LoadSurveyBundleUseCase } from '../LoadSurveyBundleUseCase';
import { SurveyError } from '@kc/domain';
import { makeFakeRepo, makeBundle } from './surveyFakeRepository';

describe('LoadSurveyBundleUseCase', () => {
  it('returns the bundle from the repo', async () => {
    const bundle = makeBundle({ slug: 'ux-experience', version: 2 });
    const repo = makeFakeRepo({ getBundle: vi.fn().mockResolvedValue(bundle) });
    const uc = new LoadSurveyBundleUseCase(repo);

    const result = await uc.execute({ slug: 'ux-experience' });

    expect(result).toEqual(bundle);
    expect(repo.getBundle).toHaveBeenCalledWith('ux-experience');
  });

  it('throws SurveyError not_found when repo throws not_found', async () => {
    const repo = makeFakeRepo({
      getBundle: vi.fn().mockRejectedValue(new SurveyError('not_found')),
    });
    const uc = new LoadSurveyBundleUseCase(repo);

    await expect(uc.execute({ slug: 'missing-slug' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('wraps unknown repo error as SurveyError network', async () => {
    const repo = makeFakeRepo({
      getBundle: vi.fn().mockRejectedValue(new Error('connection refused')),
    });
    const uc = new LoadSurveyBundleUseCase(repo);

    await expect(uc.execute({ slug: 'ux-experience' })).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('passes the slug through to the repo unchanged', async () => {
    const repo = makeFakeRepo();
    const uc = new LoadSurveyBundleUseCase(repo);

    await uc.execute({ slug: 'alt-platforms-research' });

    expect(repo.getBundle).toHaveBeenCalledWith('alt-platforms-research');
  });

  it('throws SurveyError not_found when repo returns null', async () => {
    const repo = makeFakeRepo({
      getBundle: vi.fn().mockResolvedValue(null),
    });
    const uc = new LoadSurveyBundleUseCase(repo);

    await expect(uc.execute({ slug: 'ux-experience' })).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});
