import { describe, it, expect } from 'vitest';
import type { SearchFilters } from '@kc/domain';
import { UniversalSearchUseCase } from '../UniversalSearchUseCase';
import type {
  ISearchRepository,
  UniversalSearchResults,
} from '../../ports/ISearchRepository';

interface SearchCall {
  query: string;
  filters: SearchFilters;
  viewerId: string | null;
  limits: { posts: number; users: number; links: number };
}

class StubSearchRepo implements ISearchRepository {
  calls: SearchCall[] = [];
  toReturn: UniversalSearchResults = {
    posts: [],
    users: [],
    links: [],
    orgs: [],
    hashtags: [],
    suggestedQueries: [],
    postsTotal: 0,
    usersTotal: 0,
    linksTotal: 0,
    orgsTotal: 0,
    hashtagsTotal: 0,
  };

  async search(
    query: string,
    filters: SearchFilters,
    viewerId: string | null,
    limits: { posts: number; users: number; links: number },
  ): Promise<UniversalSearchResults> {
    this.calls.push({ query, filters, viewerId, limits });
    return this.toReturn;
  }
}

const EMPTY_FILTERS: SearchFilters = {};

describe('UniversalSearchUseCase — gating, viewerId, pass-through', () => {
  describe('query length gating', () => {
    it('returns empty without calling the repo for a single-character query', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      const result = await uc.execute({
        query: 'a',
        filters: EMPTY_FILTERS,
        viewerId: 'u1',
      });

      expect(repo.calls).toHaveLength(0);
      expect(result).toEqual({
        posts: [],
        users: [],
        links: [],
        orgs: [],
        hashtags: [],
        suggestedQueries: [],
        postsTotal: 0,
        usersTotal: 0,
        linksTotal: 0,
        orgsTotal: 0,
        hashtagsTotal: 0,
      });
    });

    it('treats whitespace-only query as a single char after trim and returns empty', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      const result = await uc.execute({
        query: '  a  ',
        filters: EMPTY_FILTERS,
        viewerId: null,
      });

      expect(repo.calls).toHaveLength(0);
      expect(result.usersTotal).toBe(0);
    });

    it('calls the repo with the empty string for an empty query (explore mode)', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      await uc.execute({ query: '', filters: EMPTY_FILTERS, viewerId: 'u1' });

      expect(repo.calls).toHaveLength(1);
      expect(repo.calls[0]!.query).toBe('');
    });

    it('treats a whitespace-only query as explore mode (trimmed to empty)', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      await uc.execute({ query: '   ', filters: EMPTY_FILTERS, viewerId: 'u1' });

      expect(repo.calls).toHaveLength(1);
      expect(repo.calls[0]!.query).toBe('');
    });

    it('forwards a >= 2-char query (trimmed) to the repo', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      await uc.execute({ query: '  car  ', filters: EMPTY_FILTERS, viewerId: 'u1' });

      expect(repo.calls).toHaveLength(1);
      expect(repo.calls[0]!.query).toBe('car');
    });
  });

  describe('viewerId forwarding', () => {
    it('forwards a non-null viewerId verbatim', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      await uc.execute({ query: 'car', filters: EMPTY_FILTERS, viewerId: 'u_viewer' });

      expect(repo.calls[0]!.viewerId).toBe('u_viewer');
    });

    it('forwards a null viewerId (guest preview) verbatim', async () => {
      const repo = new StubSearchRepo();
      const uc = new UniversalSearchUseCase(repo);

      await uc.execute({ query: 'car', filters: EMPTY_FILTERS, viewerId: null });

      expect(repo.calls[0]!.viewerId).toBeNull();
    });
  });

  describe('result pass-through', () => {
    it('returns whatever the repository returns', async () => {
      const repo = new StubSearchRepo();
      const expected: UniversalSearchResults = {
        posts: [],
        users: [
          {
            userId: 'u1',
            displayName: 'Test',
            shareHandle: 'test',
            avatarUrl: null,
            biography: null,
            city: 'tel-aviv',
            cityName: 'Tel Aviv',
            followersCount: 5,
            itemsGivenCount: 2,
          },
        ],
        links: [],
        orgs: [],
        hashtags: [],
        suggestedQueries: [],
        postsTotal: 0,
        usersTotal: 1,
        linksTotal: 0,
        orgsTotal: 0,
        hashtagsTotal: 0,
      };
      repo.toReturn = expected;
      const uc = new UniversalSearchUseCase(repo);

      const result = await uc.execute({
        query: 'test',
        filters: EMPTY_FILTERS,
        viewerId: null,
      });

      expect(result).toBe(expected);
    });
  });
});
