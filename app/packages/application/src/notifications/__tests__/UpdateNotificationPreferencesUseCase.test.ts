import { describe, it, expect } from 'vitest';
import { UpdateNotificationPreferencesUseCase } from '../UpdateNotificationPreferencesUseCase';

interface Prefs { critical: boolean; social: boolean }

class FakeUserRepo {
  prefs: Prefs = { critical: true, social: true };
  async updateNotificationPreferences(
    _userId: string,
    partial: { critical?: boolean; social?: boolean },
  ): Promise<Prefs> {
    this.prefs = { ...this.prefs, ...partial };
    return this.prefs;
  }
}

describe('UpdateNotificationPreferencesUseCase', () => {
  it('updates only the supplied field', async () => {
    const repo = new FakeUserRepo();
    const uc = new UpdateNotificationPreferencesUseCase(repo);
    const result = await uc.execute({ userId: 'u1', critical: false });
    expect(result).toEqual({ critical: false, social: true });
  });

  it('updates both when both supplied', async () => {
    const repo = new FakeUserRepo();
    const uc = new UpdateNotificationPreferencesUseCase(repo);
    const result = await uc.execute({ userId: 'u1', critical: false, social: false });
    expect(result).toEqual({ critical: false, social: false });
  });
});
