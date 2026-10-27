import { describe, expect, it, vi } from 'vitest';
import { CrmContactError } from '@kc/domain';
import { DeleteCrmContactUseCase } from '../DeleteCrmContactUseCase';
import { ListCrmContactsUseCase } from '../ListCrmContactsUseCase';
import { MarkCrmContactContactedUseCase } from '../MarkCrmContactContactedUseCase';
import { UpsertCrmContactUseCase } from '../UpsertCrmContactUseCase';
import type { ICrmContactsRepository } from '../ICrmContactsRepository';

function makeRepo(): ICrmContactsRepository & {
  list:            ReturnType<typeof vi.fn>;
  upsert:          ReturnType<typeof vi.fn>;
  delete:          ReturnType<typeof vi.fn>;
  markContacted:   ReturnType<typeof vi.fn>;
} {
  return {
    list:            vi.fn(async () => ({ rows: [], totalCount: 0 })),
    upsert:          vi.fn(async () => 'new-id'),
    delete:          vi.fn(async () => undefined),
    markContacted:   vi.fn(async () => undefined),
  };
}

describe('CRM use cases — delegate to repo', () => {
  it('Delete forwards the id', async () => {
    const repo = makeRepo();
    await new DeleteCrmContactUseCase(repo).execute('c1');
    expect(repo.delete).toHaveBeenCalledWith('c1');
  });

  it('List forwards filters and returns the page', async () => {
    const repo = makeRepo();
    const page = { rows: [], totalCount: 9 };
    repo.list.mockResolvedValueOnce(page);
    const out = await new ListCrmContactsUseCase(repo).execute({ status: 'warm', limit: 25 });
    expect(repo.list).toHaveBeenCalledWith({ status: 'warm', limit: 25 });
    expect(out).toBe(page);
  });

  it('MarkContacted forwards the id', async () => {
    const repo = makeRepo();
    await new MarkCrmContactContactedUseCase(repo).execute('c2');
    expect(repo.markContacted).toHaveBeenCalledWith('c2');
  });
});

describe('UpsertCrmContactUseCase', () => {
  it('rejects creation when name is missing', async () => {
    const repo = makeRepo();
    await expect(new UpsertCrmContactUseCase(repo).execute({}))
      .rejects.toBeInstanceOf(CrmContactError);
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('rejects creation when name is blank', async () => {
    const repo = makeRepo();
    await expect(new UpsertCrmContactUseCase(repo).execute({ name: '   ' }))
      .rejects.toBeInstanceOf(CrmContactError);
  });

  it('forwards the input to the repo when valid', async () => {
    const repo = makeRepo();
    const input = { name: 'Alice', email: 'alice@example.com' } as never;
    const out = await new UpsertCrmContactUseCase(repo).execute(input);
    expect(repo.upsert).toHaveBeenCalledWith(input);
    expect(out).toBe('new-id');
  });

  it('allows updates without a name (existing contactId)', async () => {
    const repo = makeRepo();
    const input = { contactId: 'c1', notes: 'updated' } as never;
    await new UpsertCrmContactUseCase(repo).execute(input);
    expect(repo.upsert).toHaveBeenCalledWith(input);
  });
});
