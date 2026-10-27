// app/apps/mobile/app/(admin)/tasks/[taskId]/index.tsx
// FR-ADMIN-018 — admin task detail with status FSM, comments, activity timeline.
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  ADMIN_TASK_STATUSES, type AdminPermission, type AdminRole,
  type AdminTaskCategory, type AdminTaskStatus,
  hasPermission, isAdminTaskError, isStatusTransitionAllowed,
} from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAuthStore } from '../../../../src/store/authStore';
import { useAdminRoles } from '../../../../src/hooks/useAdminRoles';
import { useAdminTaskDetail } from '../../../../src/hooks/useAdminTasks';
import {
  useAddAdminTaskComment, useDeleteAdminTask, useSetAdminTaskStatus, useUpdateAdminTask,
} from '../../../../src/hooks/useAdminTaskMutations';
import { TaskStatusChip } from '../../../../src/components/admin/tasks/TaskStatusChip';
import { TaskPriorityChip } from '../../../../src/components/admin/tasks/TaskPriorityChip';
import { TaskCategoryChip } from '../../../../src/components/admin/tasks/TaskCategoryChip';
import { TaskCategoryPicker } from '../../../../src/components/admin/tasks/TaskCategoryPicker';
import { TaskActivityTimeline } from '../../../../src/components/admin/tasks/TaskActivityTimeline';
import { useLocaleBundle, type LocaleBundle } from '../../../../src/i18n/useLocaleBundle';

async function confirmAction(message: string, L: LocaleBundle): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.confirm(message);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(L.admin.tasks.detail.confirmTitle, message, [
      { text: L.admin.tasks.detail.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: L.admin.tasks.detail.confirmOk, onPress: () => resolve(true) },
    ]);
  });
}

export default function TaskDetailScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const params = useLocalSearchParams<{ taskId: string }>();
  const taskId = params.taskId;
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const myId = useAuthStore((s) => s.session?.userId ?? null);
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);
  const q = useAdminTaskDetail(taskId);

  const setStatus = useSetAdminTaskStatus();
  const addComment = useAddAdminTaskComment();
  const remove = useDeleteAdminTask();
  const update = useUpdateAdminTask();

  const [commentBody, setCommentBody] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (rolesLoading || q.isLoading) {
    return <View style={styles.center}><Text>{L.admin.tasks.loading}</Text></View>;
  }
  if (!can('tasks.view')) {
    return <View style={styles.center}><Text style={styles.deniedTitle}>{L.admin.tasks.forbiddenTitle}</Text></View>;
  }
  if (!q.detail) {
    return <View style={styles.center}><Text>{L.admin.tasks.detail.notFound}</Text></View>;
  }

  const t = q.detail.task;
  const canMoveStatus =
    can('tasks.view')
    && (hasPermission(roles as readonly AdminRole[], 'tasks.delete_any')
        || t.createdBy === myId
        || t.assigneeId === myId);
  const canDelete =
    hasPermission(roles as readonly AdminRole[], 'tasks.delete_any') || t.createdBy === myId;

  async function moveStatus(newStatus: AdminTaskStatus) {
    setErrorCode(null);
    try {
      await setStatus.mutateAsync({ taskId, newStatus });
    } catch (e) {
      setErrorCode(isAdminTaskError(e) ? e.code : 'unknown');
    }
  }

  async function changeCategory(next: AdminTaskCategory) {
    if (q.detail && next === q.detail.task.category) return;
    setErrorCode(null);
    try {
      await update.mutateAsync({ taskId, patch: { category: next } });
    } catch (e) {
      setErrorCode(isAdminTaskError(e) ? e.code : 'unknown');
    }
  }

  async function submitComment() {
    if (commentBody.trim().length === 0) return;
    setErrorCode(null);
    try {
      await addComment.mutateAsync({ taskId, body: commentBody });
      setCommentBody('');
    } catch (e) {
      setErrorCode(isAdminTaskError(e) ? e.code : 'unknown');
    }
  }

  async function deleteTask() {
    const ok = await confirmAction(L.admin.tasks.detail.deleteConfirm, L);
    if (!ok) return;
    setErrorCode(null);
    try {
      await remove.mutateAsync(taskId);
      router.back();
    } catch (e) {
      setErrorCode(isAdminTaskError(e) ? e.code : 'unknown');
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} />}
    >
      <View style={styles.headerRow}>
        <TaskStatusChip status={t.status} />
        <TaskPriorityChip priority={t.priority} />
        <TaskCategoryChip category={t.category} />
      </View>
      <Text style={styles.title}>{t.title}</Text>
      {t.description && <Text style={styles.description}>{t.description}</Text>}
      <View style={styles.metaCol}>
        <Text style={styles.metaText}>
          {t.assigneeDisplayName
            ? L.admin.tasks.row.assignedTo(t.assigneeDisplayName)
            : L.admin.tasks.row.unassigned}
        </Text>
        <Text style={styles.metaText}>
          {L.admin.tasks.detail.createdBy(t.createdByDisplayName ?? '?')}
        </Text>
        {t.dueAt && (
          <Text style={styles.metaText}>
            {L.admin.tasks.row.dueOn(t.dueAt.toLocaleDateString('he-IL'))}
          </Text>
        )}
      </View>

      {canMoveStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{L.admin.tasks.detail.changeStatus}</Text>
          <View style={styles.statusRow}>
            {ADMIN_TASK_STATUSES
              .filter((s) => isStatusTransitionAllowed(t.status, s) && s !== t.status)
              .map((s) => (
                <Pressable
                  key={s}
                  disabled={setStatus.isPending}
                  onPress={() => { void moveStatus(s); }}
                  style={styles.statusBtn}
                >
                  <Text style={styles.statusBtnText}>{L.admin.tasks.status[s]}</Text>
                </Pressable>
              ))}
          </View>
        </View>
      )}

      {canMoveStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{L.admin.tasks.detail.changeCategory}</Text>
          <TaskCategoryPicker
            value={t.category}
            onChange={(c) => { void changeCategory(c); }}
            disabled={update.isPending}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{L.admin.tasks.detail.activity}</Text>
        <TaskActivityTimeline activities={q.detail.activities} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{L.admin.tasks.detail.addComment}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={commentBody}
          onChangeText={setCommentBody}
          placeholder={L.admin.tasks.detail.commentPlaceholder}
          multiline
          numberOfLines={3}
        />
        <Pressable
          style={[styles.commentBtn, addComment.isPending && styles.commentBtnDisabled]}
          disabled={addComment.isPending || commentBody.trim().length === 0}
          onPress={() => { void submitComment(); }}
        >
          <Text style={styles.commentBtnText}>{L.admin.tasks.detail.submitComment}</Text>
        </Pressable>
      </View>

      {errorCode !== null && (
        <Text style={styles.error}>
          {L.admin.tasks.errors[errorCode as keyof LocaleBundle['admin']['tasks']['errors']]
            ?? L.admin.tasks.errors.unknown}
        </Text>
      )}

      {canDelete && (
        <Pressable style={styles.deleteBtn} onPress={() => { void deleteTask(); }}>
          <Text style={styles.deleteBtnText}>{L.admin.tasks.detail.deleteBtn}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:            { flex: 1, backgroundColor: colors.background },
  content:         { padding: 16, gap: 10 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle:     { fontSize: 18, fontWeight: '700' },
  headerRow:       { flexDirection: 'row', gap: 8 },
  title:           { fontSize: 20, fontWeight: '700' },
  description:     { fontSize: 14, opacity: 0.85 },
  metaCol:         { gap: 4 },
  metaText:        { fontSize: 12, opacity: 0.65 },
  section:         { marginTop: 14, gap: 8 },
  sectionTitle:    { fontSize: 14, fontWeight: '700' },
  statusRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.secondaryLight,
  },
  statusBtnText:   { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 14, textAlign: 'right', backgroundColor: colors.surface,
  },
  multiline:       { minHeight: 60, textAlignVertical: 'top' },
  commentBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary,
  },
  commentBtnDisabled: { opacity: 0.5 },
  commentBtnText:  { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
  error:           { color: colors.error, fontSize: 12, marginTop: 8 },
  deleteBtn: {
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    backgroundColor: colors.errorLight, alignSelf: 'flex-start',
  },
  deleteBtnText:   { color: '#7f1d1d', fontWeight: '700', fontSize: 13 },
}));
