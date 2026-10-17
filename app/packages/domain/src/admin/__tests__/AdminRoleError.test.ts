import { describe, expect, it } from 'vitest';
import { AdminRoleError, isAdminRoleError } from '../AdminRoleError';

describe('AdminRoleError', () => {
  it('defaults message to the code', () => {
    const err = new AdminRoleError('forbidden');
    expect(err.code).toBe('forbidden');
    expect(err.message).toBe('forbidden');
    expect(err.name).toBe('AdminRoleError');
  });

  it('accepts an explicit message', () => {
    const err = new AdminRoleError('invalid_role', 'bad role');
    expect(err.message).toBe('bad role');
  });

  it('isAdminRoleError narrows instances', () => {
    expect(isAdminRoleError(new AdminRoleError('unknown'))).toBe(true);
    expect(isAdminRoleError(new Error('x'))).toBe(false);
  });
});
