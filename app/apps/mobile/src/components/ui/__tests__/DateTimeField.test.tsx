// @vitest-environment jsdom
// FR-POST-001 AC6 — the tap-to-open date field: empty state, the date sheet (web input),
// confirm / cancel, shortcuts, and the `datetime-local` value helpers.
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@kc/ui';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'he' } }) }));
vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null, DateTimePickerAndroid: { open: vi.fn() } }));

import { DateTimeField, fromWebLocalValue, toWebLocalValue } from '../DateTimeField';

function renderField(value: Date | null, onChange = vi.fn()) {
  render(
    <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>
      <DateTimeField
        testID="when"
        value={value}
        onChange={onChange}
        label="מועד"
        placeholder="בחירת תאריך"
        shortcuts={[{ label: '+30', offsetMinutes: 30 }]}
      />
    </ThemeProvider>,
  );
  return onChange;
}

afterEach(() => cleanup());

describe('DateTimeField', () => {
  it('shows the placeholder while empty', () => {
    renderField(null);
    expect(screen.getByText('בחירת תאריך')).toBeTruthy();
  });

  it('confirms the picked moment from the sheet', () => {
    const onChange = renderField(null);
    fireEvent.click(screen.getByTestId('when'));
    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2031-05-04T09:15' } });
    fireEvent.click(screen.getByTestId('when-confirm'));
    expect(onChange).toHaveBeenCalledWith(new Date('2031-05-04T09:15'));
  });

  it('cancel keeps the value untouched', () => {
    const onChange = renderField(new Date('2031-05-04T09:15'));
    fireEvent.click(screen.getByTestId('when'));
    fireEvent.click(screen.getByText('general.cancel'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a shortcut sets a moment relative to now', () => {
    const onChange = renderField(null);
    const before = Date.now();
    fireEvent.click(screen.getByText('+30'));
    const picked = (onChange.mock.calls[0]![0] as Date).getTime();
    expect(picked).toBeGreaterThanOrEqual(before + 30 * 60_000);
    expect(picked).toBeLessThan(before + 31 * 60_000);
  });

  it('round-trips the datetime-local format and rejects bad input', () => {
    const d = new Date(2031, 0, 2, 3, 4);
    expect(toWebLocalValue(d)).toBe('2031-01-02T03:04');
    expect(fromWebLocalValue('2031-01-02T03:04')).toEqual(d);
    expect(fromWebLocalValue('')).toBeNull();
  });
});
