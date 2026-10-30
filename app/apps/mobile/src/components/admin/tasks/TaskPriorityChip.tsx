// app/apps/mobile/src/components/admin/tasks/TaskPriorityChip.tsx
import { View } from 'react-native';
import type { AdminTaskPriority } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TaskPriorityChipProps {
  readonly priority: AdminTaskPriority;
}

const TONE: Record<AdminTaskPriority, 'muted' | 'neutral' | 'warning' | 'danger'> = {
  low:    'muted',
  medium: 'neutral',
  high:   'warning',
  urgent: 'danger',
};

export function TaskPriorityChip({ priority }: TaskPriorityChipProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const tone = TONE[priority];
  return (
    <View style={[styles.chip, styles[`chip_${tone}` as const]]}>
      <Text style={[styles.text, styles[`text_${tone}` as const]]}>
        {L.admin.tasks.priority[priority]}
      </Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  chip:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  chip_muted:   { backgroundColor: colors.border },
  chip_neutral: { backgroundColor: colors.secondaryLight },
  chip_warning: { backgroundColor: colors.warningLight },
  chip_danger:  { backgroundColor: colors.errorLight },
  text:         { fontSize: 10, fontWeight: '700' },
  text_muted:   { color: colors.textSecondary },
  text_neutral: { color: colors.textPrimary },
  text_warning: { color: colors.warning },
  text_danger:  { color: colors.error },
}));
