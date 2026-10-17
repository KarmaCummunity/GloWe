import { describe, expect, it } from 'vitest';
import { WhatsAppAdminError, isWhatsAppAdminError } from '../WhatsAppAdmin';

describe('WhatsAppAdminError', () => {
  it('defaults message to code and sets name', () => {
    const e = new WhatsAppAdminError('forbidden');
    expect(e.message).toBe('forbidden');
    expect(e.name).toBe('WhatsAppAdminError');
    expect(e.code).toBe('forbidden');
  });

  it('accepts an optional message', () => {
    const e = new WhatsAppAdminError('unknown', 'detail');
    expect(e.message).toBe('detail');
  });

  it('isWhatsAppAdminError narrows only this class', () => {
    expect(isWhatsAppAdminError(new WhatsAppAdminError('not_found'))).toBe(true);
    expect(isWhatsAppAdminError(new Error('x'))).toBe(false);
    expect(isWhatsAppAdminError(null)).toBe(false);
  });
});
