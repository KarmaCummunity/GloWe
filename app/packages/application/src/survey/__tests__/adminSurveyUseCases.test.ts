import { describe, expect, it, vi } from 'vitest';
import type {
  AdminSurveyOverviewItem,
  AdminFeedbackEntry,
} from '@kc/domain';
import type { ISurveyAdminRepository } from '../../ports/ISurveyAdminRepository';
import { GetAdminSurveyOverviewUseCase } from '../GetAdminSurveyOverviewUseCase';
import { GetAdminSurveyResultsUseCase } from '../GetAdminSurveyResultsUseCase';
import { ListUserFeedbackUseCase } from '../ListUserFeedbackUseCase';

function makeRepo(over: Partial<ISurveyAdminRepository> = {}): ISurveyAdminRepository {
  return {
    listOverview: vi.fn(async () => [] as AdminSurveyOverviewItem[]),
    getResults: vi.fn(async () => ({
      slug: 's',
      titleHe: 't',
      version: 1,
      respondentCount: 0,
      questions: [],
      respondents: [],
    })),
    listFeedback: vi.fn(async () => [] as AdminFeedbackEntry[]),
    ...over,
  };
}

describe('admin survey use cases', () => {
  it('GetAdminSurveyOverviewUseCase delegates to repo.listOverview', async () => {
    const repo = makeRepo();
    await new GetAdminSurveyOverviewUseCase(repo).execute();
    expect(repo.listOverview).toHaveBeenCalledTimes(1);
  });

  it('GetAdminSurveyResultsUseCase forwards the slug', async () => {
    const repo = makeRepo();
    await new GetAdminSurveyResultsUseCase(repo).execute('ux-experience');
    expect(repo.getResults).toHaveBeenCalledWith('ux-experience');
  });

  it('ListUserFeedbackUseCase applies default pagination', async () => {
    const repo = makeRepo();
    await new ListUserFeedbackUseCase(repo).execute();
    expect(repo.listFeedback).toHaveBeenCalledWith(50, 0);
  });

  it('ListUserFeedbackUseCase forwards explicit pagination', async () => {
    const repo = makeRepo();
    await new ListUserFeedbackUseCase(repo).execute({ limit: 10, offset: 20 });
    expect(repo.listFeedback).toHaveBeenCalledWith(10, 20);
  });
});
