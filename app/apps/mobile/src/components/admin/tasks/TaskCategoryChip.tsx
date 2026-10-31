// app/apps/mobile/src/components/admin/tasks/TaskCategoryChip.tsx
// V2-ADMIN-TASKS-2 — category badge for task row + detail.
import { View } from 'react-native';
import type { AdminTaskCategory } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TaskCategoryChipProps {
  readonly category: AdminTaskCategory;
}

type Tone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'muted' | 'accent';

const TONE: Record<AdminTaskCategory, Tone> = {
  moderation:  'danger',
  support:     'info',
  engineering: 'accent',
  product:     'success',
  operations:  'neutral',
  marketing:   'warning',
  finance:     'accent',
  other:       'muted',
};

export function TaskCategoryChip({ category }: TaskCategoryChipProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const tone = TONE[category];
  return (
    <View style={[styles.chip, styles[`chip_${tone}` as const]]}>
      <Text style={[styles.text, styles[`text_${tone}` as const]]}>
        {L.admin.tasks.category[category]}
      </Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  chip:           { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  chip_neutral:   { backgroundColor: colors.secondaryLight },
  chip_info:      { backgroundColor: colors.infoLight },
  chip_warning:   { backgroundColor: colors.warningLight },
  chip_danger:    { backgroundColor: colors.errorLight },
  chip_success:   { backgroundColor: colors.successLight },
  chip_muted:     { backgroundColor: colors.border },
  chip_accent:    { backgroundColor: colors.primarySurface },
  text:           { fontSize: 10, fontWeight: '700' },
  text_neutral:   { color: colors.textPrimary },
  text_info:      { color: colors.info },
  text_warning:   { color: colors.warning },
  text_danger:    { color: colors.error },
  text_success:   { color: colors.success },
  text_muted:     { color: colors.textSecondary },
  text_accent:    { color: colors.primary },
}));
