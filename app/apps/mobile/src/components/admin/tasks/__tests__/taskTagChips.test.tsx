// @vitest-environment jsdom
// Admin task tags (FR-ADMIN-018, spec 17 §4.1 / §4.1.1, TD-243): the status,
// priority and category chips are kit `Chip` tags whose tone follows the value.
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ADMIN_TASK_CATEGORIES, ADMIN_TASK_PRIORITIES, ADMIN_TASK_STATUSES } from '@kc/domain';
import { ThemeProvider, lightColors } from '@kc/ui';
// eslint-disable-next-line no-restricted-imports -- the test asserts the rendered Hebrew copy, which the mocked useLocaleBundle serves
import { adminTasksHe } from '../../../../i18n/locales/he/modules/adminTasks';

vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../../../../i18n/useLocaleBundle', () => ({
  useLocaleBundle: () => ({ admin: { tasks: adminTasksHe } }),
}));

import { toneColors } from '../../../ui/chipStyles';
import { TaskStatusChip } from '../TaskStatusChip';
import { TaskPriorityChip } from '../TaskPriorityChip';
import { TaskCategoryChip } from '../TaskCategoryChip';
import { TASK_CATEGORY_TONE, TASK_PRIORITY_TONE, TASK_STATUS_TONE } from '../taskTagTones';
import type { ChipTone } from '../../../ui/Chip';

afterEach(cleanup);

/** jsdom reports colours as `rgb(r, g, b)`; convert a token hex to compare. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** Renders `tag` and checks it is a read-only label on the fill of `tone`. */
function expectTag(tag: React.ReactElement, label: string, tone: ChipTone) {
  const { getByText, queryByRole } = render(
    <ThemeProvider mode="light" systemScheme="light" setMode={() => {}}>{tag}</ThemeProvider>,
  );
  const chip = getByText(label).parentElement as HTMLElement;
  expect(getComputedStyle(chip).backgroundColor).toBe(rgb(toneColors(tone, lightColors).background));
  expect(getComputedStyle(chip).minHeight).toBe('28px');
  expect(queryByRole('button')).toBeNull();
  expect(queryByRole('checkbox')).toBeNull();
  cleanup();
}

describe('admin task tag tones', () => {
  it('carries the meaning of each value in its tone', () => {
    expect(TASK_STATUS_TONE).toEqual({
      open: 'neutral', in_progress: 'info', blocked: 'warning', done: 'success', archived: 'neutral',
    });
    expect(TASK_PRIORITY_TONE).toEqual({ low: 'neutral', medium: 'neutral', high: 'warning', urgent: 'error' });
    expect(TASK_CATEGORY_TONE.moderation).toBe('error');
    expect(TASK_CATEGORY_TONE.engineering).toBe('brand');
    expect(TASK_CATEGORY_TONE.other).toBe('neutral');
  });

  it('has a tone for every value the domain defines', () => {
    expect(Object.keys(TASK_STATUS_TONE).sort()).toEqual([...ADMIN_TASK_STATUSES].sort());
    expect(Object.keys(TASK_PRIORITY_TONE).sort()).toEqual([...ADMIN_TASK_PRIORITIES].sort());
    expect(Object.keys(TASK_CATEGORY_TONE).sort()).toEqual([...ADMIN_TASK_CATEGORIES].sort());
  });
});

describe('admin task tags', () => {
  it('renders each status as a compact tag with its label and tone', () => {
    for (const status of ADMIN_TASK_STATUSES) {
      expectTag(<TaskStatusChip status={status} />, adminTasksHe.status[status], TASK_STATUS_TONE[status]);
    }
  });

  it('renders each priority as a compact tag with its label and tone', () => {
    for (const priority of ADMIN_TASK_PRIORITIES) {
      expectTag(<TaskPriorityChip priority={priority} />, adminTasksHe.priority[priority], TASK_PRIORITY_TONE[priority]);
    }
  });

  it('renders each category as a compact tag with its label and tone', () => {
    for (const category of ADMIN_TASK_CATEGORIES) {
      expectTag(<TaskCategoryChip category={category} />, adminTasksHe.category[category], TASK_CATEGORY_TONE[category]);
    }
  });
});
