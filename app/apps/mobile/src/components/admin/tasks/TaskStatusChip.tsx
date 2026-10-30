// app/apps/mobile/src/components/admin/tasks/TaskStatusChip.tsx
import { StyleSheet, View } from 'react-native';
import type { AdminTaskStatus } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TaskStatusChipProps {
  readonly status: AdminTaskStatus;
}

const TONE: Record<AdminTaskStatus, 'neutral' | 'info' | 'warning' | 'success' | 'muted'> = {
  open:        'neutral',
  in_progress: 'info',
  blocked:     'warning',
  done:        'success',
  archived:    'muted',
};

export function TaskStatusChip({ status }: TaskStatusChipProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const tone = TONE[status];
  return (
    <View style={[styles.chip, styles[`chip_${tone}` as const]]}>
      <Text style={[styles.text, styles[`text_${tone}` as const]]}>
        {L.admin.tasks.status[status]}
      </Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  chip:          { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  chip_neutral:  { backgroundColor: colors.secondaryLight },
  chip_info:     { backgroundColor: colors.infoLight },
  chip_warning:  { backgroundColor: colors.warningLight },
  chip_success:  { backgroundColor: colors.successLight },
  chip_muted:    { backgroundColor: colors.border },
  text:          { fontSize: 11, fontWeight: '700' },
  text_neutral:  { color: colors.textPrimary },
  text_info:     { color: colors.info },
  text_warning:  { color: colors.warning },
  text_success:  { color: colors.success },
  text_muted:    { color: colors.textSecondary },
}));

void StyleSheet;
