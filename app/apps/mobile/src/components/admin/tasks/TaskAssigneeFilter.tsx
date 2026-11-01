// app/apps/mobile/src/components/admin/tasks/TaskAssigneeFilter.tsx
// V2-ADMIN-TASKS-3 — 3-state assignee filter for the /admin/tasks list.
//   value = null               → no filter ("all")
//   value = 'unassigned'       → only tasks with no assignee
//   value = '<userId>'         → only tasks assigned to that admin
import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet } from 'react-native';
import { adminChipScroll } from '../adminChipScroll';
import { AdminFilterChip } from '../AdminFilterChip';
import type { AdminGrant } from '@kc/domain';
import { spacing } from '@kc/ui';
import { container } from '../../../lib/container';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export const UNASSIGNED_TOKEN = 'unassigned' as const;
export type AssigneeFilterValue = null | typeof UNASSIGNED_TOKEN | string;

export interface TaskAssigneeFilterProps {
  readonly value: AssigneeFilterValue;
  readonly onChange: (next: AssigneeFilterValue) => void;
}

export function TaskAssigneeFilter({ value, onChange }: TaskAssigneeFilterProps) {
  const L = useLocaleBundle();
  const q = useQuery({
    queryKey: ['admin.admins.list', { includeRevoked: false }],
    queryFn:  () => container.listAdmins.execute({ includeRevoked: false }),
    staleTime: 60_000,
  });

  const seen = new Set<string>();
  const entries: { userId: string; displayName: string }[] = [];
  for (const g of (q.data ?? []) as readonly AdminGrant[]) {
    if (g.revokedAt !== null) continue;
    if (seen.has(g.userId)) continue;
    seen.add(g.userId);
    entries.push({ userId: g.userId, displayName: g.displayName ?? L.admin.admins.row.unnamed });
  }

  return (
    <ScrollView horizontal style={adminChipScroll.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, adminChipScroll.content]}>
      <AdminFilterChip label={L.admin.tasks.assigneeFilter.all}        active={value === null}              onPress={() => onChange(null)} />
      <AdminFilterChip label={L.admin.tasks.assigneeFilter.unassigned} active={value === UNASSIGNED_TOKEN}  onPress={() => onChange(UNASSIGNED_TOKEN)} />
      {entries.map((e) => (
        <AdminFilterChip
          key={e.userId}
          label={e.displayName}
          active={value === e.userId}
          onPress={() => onChange(value === e.userId ? null : e.userId)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
});
