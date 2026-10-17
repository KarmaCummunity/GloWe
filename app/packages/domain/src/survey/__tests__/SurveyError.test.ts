import { describe, expect, it } from 'vitest';
import { SurveyError, isSurveyError } from '../SurveyError';

describe('SurveyError', () => {
  it('formats message with optional detail', () => {
    expect(new SurveyError('not_found').message).toBe('survey_error:not_found');
    expect(new SurveyError('validation', 'body_too_short').message).toBe(
      'survey_error:validation:body_too_short',
    );
  });

  it('carries cause and narrows via isSurveyError', () => {
    const cause = new Error('net');
    const err = new SurveyError('network', undefined, { cause });
    expect(err.cause).toBe(cause);
    expect(isSurveyError(err)).toBe(true);
    expect(isSurveyError(cause)).toBe(false);
  });
});
