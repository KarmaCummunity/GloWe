// app/apps/mobile/app/(admin)/tasks/new.tsx
// FR-ADMIN-018 — create new admin task (title required + optional fields).
import { useState } from 'react';
import { router } from 'expo-router';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  ADMIN_TASK_CATEGORY_DEFAULT,
  ADMIN_TASK_PRIORITIES, type AdminPermission, type AdminRole,
  type AdminTaskCategory, type AdminTaskPriority,
  hasPermission, isAdminTaskError,
} from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { useCreateAdminTask } from '../../../src/hooks/useAdminTaskMutations';
import { AssigneePicker } from '../../../src/components/admin/tasks/AssigneePicker';
import { TaskCategoryPicker } from '../../../src/components/admin/tasks/TaskCategoryPicker';
import { useLocaleBundle, type LocaleBundle } from '../../../src/i18n/useLocaleBundle';

export default function NewTaskScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const { roles } = useAdminRoles();
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AdminTaskPriority>('medium');
  const [category, setCategory] = useState<AdminTaskCategory>(ADMIN_TASK_CATEGORY_DEFAULT);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [labelsRaw, setLabelsRaw] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const create = useCreateAdminTask();
  const canSubmit = title.trim().length > 0 && !create.isPending;

  if (!can('tasks.create')) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>{L.admin.tasks.forbiddenTitle}</Text>
      </View>
    );
  }

  async function submit() {
    if (!canSubmit) return;
    setErrorCode(null);
    setErrorDetail(null);
    try {
      const labels = labelsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const taskId = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category,
        assigneeId,
        labels,
      });
      router.replace({ pathname: '/(admin)/tasks/[taskId]', params: { taskId } } as never);
    } catch (e) {
      console.error('[admin tasks] create failed', e);
      if (isAdminTaskError(e)) {
        setErrorCode(e.code);
        setErrorDetail(null);
      } else {
        setErrorCode('unknown');
        setErrorDetail(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{L.admin.tasks.form.newTitle}</Text>

      <Text style={styles.label}>{L.admin.tasks.form.titleLabel}</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={L.admin.tasks.form.titlePlaceholder}
        maxLength={200}
      />

      <Text style={styles.label}>{L.admin.tasks.form.descriptionLabel}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder={L.admin.tasks.form.descriptionPlaceholder}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>{L.admin.tasks.form.priorityLabel}</Text>
      <View style={styles.priorityRow}>
        {ADMIN_TASK_PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPriority(p)}
            style={[styles.priorityChip, priority === p && styles.priorityChipActive]}
          >
            <Text style={[styles.priorityChipText, priority === p && styles.priorityChipTextActive]}>
              {L.admin.tasks.priority[p]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{L.admin.tasks.form.categoryLabel}</Text>
      <TaskCategoryPicker value={category} onChange={setCategory} />

      {can('admins.view') && (
        <>
          <Text style={styles.label}>{L.admin.tasks.form.assigneeLabel}</Text>
          <AssigneePicker value={assigneeId} onChange={setAssigneeId} />
        </>
      )}

      <Text style={styles.label}>{L.admin.tasks.form.labelsLabel}</Text>
      <TextInput
        style={styles.input}
        value={labelsRaw}
        onChangeText={setLabelsRaw}
        placeholder={L.admin.tasks.form.labelsPlaceholder}
      />

      {errorCode !== null && (
        <>
          <Text style={styles.error}>
            {L.admin.tasks.errors[errorCode as keyof LocaleBundle['admin']['tasks']['errors']]
              ?? L.admin.tasks.errors.unknown}
          </Text>
          {errorDetail !== null && (
            <Text style={styles.errorDetail}>{errorDetail}</Text>
          )}
        </>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>{L.admin.tasks.form.cancel}</Text>
        </Pressable>
        <Pressable
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          disabled={!canSubmit}
          onPress={() => { void submit(); }}
        >
          <Text style={styles.submitBtnText}>{L.admin.tasks.form.submit}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:           { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, gap: 8 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle:    { fontSize: 18, fontWeight: '700' },
  title:          { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  label:          { fontSize: 12, opacity: 0.7, marginTop: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 14, textAlign: 'right', backgroundColor: colors.surface,
  },
  multiline:      { minHeight: 80, textAlignVertical: 'top' },
  priorityRow:    { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  priorityChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.secondaryLight,
  },
  priorityChipActive:     { backgroundColor: colors.primary },
  priorityChipText:       { fontSize: 13, fontWeight: '600' },
  priorityChipTextActive: { color: colors.textInverse },
  error:                  { color: colors.error, fontSize: 12, marginTop: 8 },
  errorDetail:            { color: colors.error, fontSize: 11, marginTop: 2, opacity: 0.65 },
  actions:                { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn:              { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText:          { fontSize: 14, fontWeight: '500' },
  submitBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    backgroundColor: colors.primary,
  },
  submitBtnDisabled:      { opacity: 0.5 },
  submitBtnText:          { color: colors.textInverse, fontSize: 14, fontWeight: '700' },
}));
