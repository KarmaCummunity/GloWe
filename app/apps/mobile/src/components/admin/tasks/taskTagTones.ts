// Kit `Chip` tag tones for the admin task status, priority and category tags
// (spec 17 §4.1 / §4.3, TD-243). Each value keeps the colour family the tag had
// before the kit; the kit has no "muted" tone, so the former muted values
// (archived, low, other) share `neutral` and their labels tell them apart.
import type { AdminTaskCategory, AdminTaskPriority, AdminTaskStatus } from '@kc/domain';
import type { ChipTone } from '../../ui/Chip';

export const TASK_STATUS_TONE: Readonly<Record<AdminTaskStatus, ChipTone>> = {
  open: 'neutral',
  in_progress: 'info',
  blocked: 'warning',
  done: 'success',
  archived: 'neutral',
};

export const TASK_PRIORITY_TONE: Readonly<Record<AdminTaskPriority, ChipTone>> = {
  low: 'neutral',
  medium: 'neutral',
  high: 'warning',
  urgent: 'error',
};

export const TASK_CATEGORY_TONE: Readonly<Record<AdminTaskCategory, ChipTone>> = {
  moderation: 'error',
  support: 'info',
  engineering: 'brand',
  product: 'success',
  operations: 'neutral',
  marketing: 'warning',
  finance: 'brand',
  other: 'neutral',
};
