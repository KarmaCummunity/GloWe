import { describe, it, expect } from 'vitest';
import type { KcSupportChannel } from '@kc/domain';
import { GetKcSupportOptionsUseCase } from '../GetKcSupportOptionsUseCase';
import { KcSupportChannelsError } from '../KcSupportChannelsError';
import type { IKcSupportChannelsRepository } from '../../ports/IKcSupportChannelsRepository';

const bit: KcSupportChannel = { kind: 'bit', url: 'https://bit.example/pay', providerLabel: 'Bit' };
const standing: KcSupportChannel = {
  kind: 'card_standing_order',
  url: 'https://pay.grow.link/monthly',
  providerLabel: 'Grow',
};

function repoReturning(result: KcSupportChannel[] | Error): IKcSupportChannelsRepository {
  return {
    listActiveChannels: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe('GetKcSupportOptionsUseCase', () => {
  it('uses server-configured channels when they load', async () => {
    const useCase = new GetKcSupportOptionsUseCase(repoReturning([standing]), [bit]);
    expect(await useCase.execute()).toEqual({ oneTime: [], standingOrder: standing });
  });

  it('falls back to compiled channels when the repository fails', async () => {
    const failing = repoReturning(new KcSupportChannelsError('network', 'offline'));
    const useCase = new GetKcSupportOptionsUseCase(failing, [bit]);
    expect(await useCase.execute()).toEqual({ oneTime: [bit], standingOrder: null });
  });

  it('does not fall back when the server returns an empty list (operator disabled all)', async () => {
    const useCase = new GetKcSupportOptionsUseCase(repoReturning([]), [bit]);
    expect(await useCase.execute()).toEqual({ oneTime: [], standingOrder: null });
  });
});
