// app/apps/mobile/app/(admin)/tasks/index.tsx
// FR-ADMIN-018 — admin tasks list screen with chip filters.
import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminChipScroll } from '../../../src/components/admin/adminChipScroll';
import {
  ADMIN_TASK_CATEGORIES,
  ADMIN_TASK_STATUSES, type AdminPermission, type AdminRole,
  type AdminTaskCategory, type AdminTaskStatus,
  hasPermission,
} from '@kc/domain';
import type { AdminTaskListFilters } from '@kc/application';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { useAdminTasksList } from '../../../src/hooks/useAdminTasks';
import { AdminScreenHeader } from '../../../src/components/admin/AdminScreenHeader';
import { TaskRow } from '../../../src/components/admin/tasks/TaskRow';
import {
  TaskAssigneeFilter,
  UNASSIGNED_TOKEN,
  type AssigneeFilterValue,
} from '../../../src/components/admin/tasks/TaskAssigneeFilter';
import {
  TaskDueRangeFilter,
  isValidIsoDate,
} from '../../../src/components/admin/tasks/TaskDueRangeFilter';
import { KcFlashList } from '../../../src/components/lists/KcFlashList';
import { useLocaleBundle } from '../../../src/i18n/useLocaleBundle';

function parseDueFrom(value: string): Date | undefined {
  if (!isValidIsoDate(value) || value.length === 0) return undefined;
  return new Date(`${value}T00:00:00.000Z`);
}

function parseDueTo(value: string): Date | undefined {
  if (!isValidIsoDate(value) || value.length === 0) return undefined;
  // End-of-day so a "to" of 2026-06-01 includes anything dated that day.
  return new Date(`${value}T23:59:59.999Z`);
}

export default function TasksScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const [statusFilter, setStatusFilter] = useState<AdminTaskStatus | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<AdminTaskCategory | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilterValue>(null);
  const [dueFromText, setDueFromText] = useState('');
  const [dueToText, setDueToText] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filters = useMemo<AdminTaskListFilters>(() => {
    const baseAssignee = assigneeFilter && assigneeFilter !== UNASSIGNED_TOKEN
      ? assigneeFilter
      : undefined;
    return {
      status:         statusFilter   ?? undefined,
      category:       categoryFilter ?? undefined,
      assigneeId:     baseAssignee,
      unassignedOnly: assigneeFilter === UNASSIGNED_TOKEN ? true : undefined,
      dueFrom:        parseDueFrom(dueFromText),
      dueTo:          parseDueTo(dueToText),
      onlyMine,
      overdue:        overdueOnly,
    };
  }, [statusFilter, categoryFilter, assigneeFilter, dueFromText, dueToText, onlyMine, overdueOnly]);

  const q = useAdminTasksList(filters);
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);

  if (rolesLoading) {
    return <View style={styles.center}><Text>{L.admin.tasks.loading}</Text></View>;
  }
  if (!can('tasks.view')) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>{L.admin.tasks.forbiddenTitle}</Text>
      </View>
    );
  }

  const filtersBar = (
    <View style={styles.filterCard}>
      <Text style={styles.filterTitle}>{L.admin.tasks.filtersTitle}</Text>

      <ScrollView horizontal style={adminChipScroll.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, adminChipScroll.content]}>
        <FilterChip
          label={L.admin.tasks.filters.all}
          active={statusFilter === null && !overdueOnly}
          onPress={() => { setStatusFilter(null); setOverdueOnly(false); }}
        />
        {ADMIN_TASK_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={L.admin.tasks.status[s]}
            active={statusFilter === s}
            onPress={() => { setStatusFilter(statusFilter === s ? null : s); }}
          />
        ))}
        <FilterChip
          label={L.admin.tasks.filters.overdue}
          active={overdueOnly}
          onPress={() => setOverdueOnly((v) => !v)}
        />
        <FilterChip
          label={L.admin.tasks.filters.onlyMine}
          active={onlyMine}
          onPress={() => setOnlyMine((v) => !v)}
        />
      </ScrollView>

      <ScrollView horizontal style={adminChipScroll.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, adminChipScroll.content]}>
        <FilterChip
          label={L.admin.tasks.categoryFilters.all}
          active={categoryFilter === null}
          onPress={() => setCategoryFilter(null)}
        />
        {ADMIN_TASK_CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={L.admin.tasks.category[c]}
            active={categoryFilter === c}
            onPress={() => setCategoryFilter(categoryFilter === c ? null : c)}
          />
        ))}
      </ScrollView>

      {can('admins.view') && (
        <TaskAssigneeFilter value={assigneeFilter} onChange={setAssigneeFilter} />
      )}

      <TaskDueRangeFilter
        fromValue={dueFromText}
        toValue={dueToText}
        onChange={({ from, to }) => { setDueFromText(from); setDueToText(to); }}
        onClear={() => { setDueFromText(''); setDueToText(''); }}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <AdminScreenHeader
        title={L.admin.tasks.title}
        subtitle={!q.isLoading ? L.admin.tasks.countLabel(q.tasks.length) : undefined}
        right={can('tasks.create') ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(admin)/tasks/new')}
            style={styles.newBtn}
          >
            <Text style={styles.newBtnText}>{L.admin.tasks.newBtn}</Text>
          </Pressable>
        ) : undefined}
      />

      <KcFlashList
        data={[...q.tasks]}
        keyExtractor={(t) => t.taskId}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}><TaskRow task={item} /></View>
        )}
        ListHeaderComponent={filtersBar}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} />
        }
        ListEmptyComponent={
          !q.isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{L.admin.tasks.emptyTitle}</Text>
              <Text style={styles.emptyHint}>{L.admin.tasks.emptyHint}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

interface FilterChipProps {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
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
  root:            { flex: 1, backgroundColor: colors.background },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle:     { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  newBtn:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primary },
  newBtnText:      { color: colors.textInverse, fontWeight: '700', fontSize: 13 },

  listContent: {
    paddingBottom: 96,
    gap: 10,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  rowWrap: { paddingHorizontal: 16 },

  filterCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  chips:           { gap: 8, paddingVertical: 2 },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipActive:      { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:        { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  chipTextActive:  { color: colors.textInverse },
  empty:           { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle:      { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  emptyHint:       { fontSize: 13, opacity: 0.6, textAlign: 'center', color: colors.textSecondary },
}));