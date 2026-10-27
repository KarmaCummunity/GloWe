// app/apps/mobile/src/components/admin/tasks/TaskAssigneeFilter.tsx
// V2-ADMIN-TASKS-3 — 3-state assignee filter for the /admin/tasks list.
//   value = null               → no filter ("all")
//   value = 'unassigned'       → only tasks with no assignee
//   value = '<userId>'         → only tasks assigned to that admin
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { AdminGrant } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { container } from '../../../lib/container';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export const UNASSIGNED_TOKEN = 'unassigned' as const;
export type AssigneeFilterValue = null | typeof UNASSIGNED_TOKEN | string;

export interface TaskAssigneeFilterProps {
  readonly value: AssigneeFilterValue;
  readonly onChange: (next: AssigneeFilterValue) => void;
}

export function TaskAssigneeFilter({ value, onChange }: TaskAssigneeFilterProps) {
  const styles = useStyles();
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label={L.admin.tasks.assigneeFilter.all}        active={value === null}              onPress={() => onChange(null)} />
      <Chip label={L.admin.tasks.assigneeFilter.unassigned} active={value === UNASSIGNED_TOKEN}  onPress={() => onChange(UNASSIGNED_TOKEN)} />
      {entries.map((e) => (
        <Chip
          key={e.userId}
          label={e.displayName}
          active={value === e.userId}
          onPress={() => onChange(value === e.userId ? null : e.userId)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row:  { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.secondaryLight,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
}));
