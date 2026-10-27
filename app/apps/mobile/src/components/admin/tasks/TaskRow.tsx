// app/apps/mobile/src/components/admin/tasks/TaskRow.tsx
// FR-ADMIN-018 — single task row for /admin/tasks list.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type AdminTask, isOverdue } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { TaskStatusChip } from './TaskStatusChip';
import { TaskPriorityChip } from './TaskPriorityChip';
import { TaskCategoryChip } from './TaskCategoryChip';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TaskRowProps {
  readonly task: AdminTask;
}

function fmtDue(d: Date): string {
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function TaskRow({ task }: TaskRowProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const overdue = isOverdue(task);
  return (
    <Pressable
      style={styles.root}
      onPress={() =>
        router.push({ pathname: '/(admin)/tasks/[taskId]', params: { taskId: task.taskId } } as never)
      }
    >
      <View style={styles.header}>
        <TaskStatusChip status={task.status} />
        <TaskPriorityChip priority={task.priority} />
        <TaskCategoryChip category={task.category} />
        {overdue && (
          <View style={styles.overdueChip}>
            <Text style={styles.overdueText}>{L.admin.tasks.overdueBadge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{task.title}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {task.assigneeDisplayName
            ? L.admin.tasks.row.assignedTo(task.assigneeDisplayName)
            : L.admin.tasks.row.unassigned}
        </Text>
        {task.dueAt && (
          <Text style={[styles.metaText, overdue && styles.overdueLabel]}>
            {L.admin.tasks.row.dueOn(fmtDue(task.dueAt))}
          </Text>
        )}
        {task.commentCount > 0 && (
          <Text style={styles.metaText}>{L.admin.tasks.row.comments(task.commentCount)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: {
    padding: 14, gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  header:       { flexDirection: 'row', gap: 6, alignItems: 'center' },
  title:        { fontSize: 15, fontWeight: '600' },
  meta:         { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText:     { fontSize: 12, opacity: 0.7 },
  overdueLabel: { color: colors.error, opacity: 1 },
  overdueChip:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.errorLight },
  overdueText:  { fontSize: 10, fontWeight: '700', color: colors.error },
}));
