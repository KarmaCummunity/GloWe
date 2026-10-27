// V2-ADMIN-TIME-10 — modal for create/edit own timesheet draft.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { isTimesheetError, type TimesheetEntry } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { container } from '../../../lib/container';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface TimesheetFormModalProps {
  readonly initial: TimesheetEntry | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

export function TimesheetFormModal({ initial, onClose, onSaved }: TimesheetFormModalProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.time;
  const isEdit = initial !== null;
  const today = new Date().toISOString().slice(0, 10);
  const [workDate,    setWorkDate]    = useState(initial?.workDate ?? today);
  const [hoursText,   setHoursText]   = useState(initial ? (initial.hoursX100 / 100).toString() : '');
  const [project,     setProject]     = useState(initial?.project ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const hours = Number.parseFloat(hoursText);
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        throw new Error('invalid_hours');
      }
      const hoursX100 = Math.round(hours * 100);
      return container.upsertTimesheet.execute({
        entryId: initial?.entryId ?? null,
        workDate,
        hoursX100,
        project:     project.trim() || null,
        description: description.trim() || null,
      });
    },
    onSuccess: () => onSaved(),
    onError:   (err) => {
      const code = isTimesheetError(err) ? err.code : 'unknown';
      setErrorMsg(t.errors[code as keyof typeof t.errors] ?? t.errors.unknown);
    },
  });

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isEdit ? t.form.editTitle : t.form.createTitle}</Text>

        <Field label={t.form.workDateLabel}    value={workDate}    onChange={setWorkDate} />
        <Field label={t.form.hoursLabel}       value={hoursText}   onChange={setHoursText} numeric />
        <Field label={t.form.projectLabel}     value={project}     onChange={setProject} />
        <Field label={t.form.descriptionLabel} value={description} onChange={setDescription} multiline />

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <View style={styles.actions}>
          <Pressable style={styles.cancel} onPress={onClose} disabled={save.isPending}>
            <Text style={styles.cancelText}>{t.form.cancel}</Text>
          </Pressable>
          <Pressable
            style={[styles.submit, save.isPending && styles.submitDisabled]}
            onPress={() => { void save.mutateAsync(); }}
            disabled={save.isPending}
          >
            <Text style={styles.submitText}>{t.form.submit}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChange, multiline = false, numeric = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly multiline?: boolean;
  readonly numeric?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheet:   { maxHeight: '90%', backgroundColor: colors.surface,
             borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  content: { padding: 16, gap: 10 },
  title:   { fontSize: 18, fontWeight: '700' },
  fieldRow:{ gap: 4 },
  label:   { fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    padding: 10, fontSize: 13, backgroundColor: colors.background, textAlign: 'right',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  errorText:  { color: colors.error, fontSize: 12 },
  actions:    { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancel:     { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 13, fontWeight: '500' },
  submit:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
}));
