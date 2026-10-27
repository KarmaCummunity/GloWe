// V2-ADMIN-CRM-8 — bottom-sheet modal for create / edit CRM contact.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import {
  CRM_CONTACT_STATUSES, isCrmContactError,
  type CrmContact, type CrmContactStatus,
} from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { container } from '../../../lib/container';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface ContactFormModalProps {
  readonly initial: CrmContact | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

export function ContactFormModal({ initial, onClose, onSaved }: ContactFormModalProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.crm;
  const isEdit = initial !== null;
  const [name, setName]           = useState(initial?.name ?? '');
  const [organization, setOrg]    = useState(initial?.organization ?? '');
  const [email, setEmail]         = useState(initial?.email ?? '');
  const [phone, setPhone]         = useState(initial?.phone ?? '');
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? '');
  const [status, setStatus]       = useState<CrmContactStatus>(initial?.status ?? 'cold');
  const [tagsRaw, setTagsRaw]     = useState(initial ? initial.tags.join(', ') : '');
  const [notes, setNotes]         = useState(initial?.notes ?? '');
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      container.upsertCrmContact.execute({
        contactId:    initial?.contactId ?? null,
        name:         name.trim(),
        organization: organization.trim() || null,
        email:        email.trim()        || null,
        phone:        phone.trim()        || null,
        roleTitle:    roleTitle.trim()    || null,
        notes:        notes.trim()        || null,
        tags:         tagsRaw.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
        status,
      }),
    onSuccess: () => onSaved(),
    onError:   (err) => {
      const code = isCrmContactError(err) ? err.code : 'unknown';
      setErrorMsg(t.errors[code as keyof typeof t.errors] ?? t.errors.unknown);
    },
  });

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isEdit ? t.form.editTitle : t.form.createTitle}</Text>

        <Field label={t.form.nameLabel}         value={name}         onChange={setName} />
        <Field label={t.form.organizationLabel} value={organization} onChange={setOrg} />
        <Field label={t.form.emailLabel}        value={email}        onChange={setEmail} />
        <Field label={t.form.phoneLabel}        value={phone}        onChange={setPhone} />
        <Field label={t.form.roleLabel}         value={roleTitle}    onChange={setRoleTitle} />

        <Text style={styles.label}>{t.form.statusLabel}</Text>
        <View style={styles.statusRow}>
          {CRM_CONTACT_STATUSES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[styles.statusOption, status === s && styles.statusOptionActive]}
            >
              <Text style={[styles.statusOptionText, status === s && styles.statusOptionTextActive]}>
                {t.status[s]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field label={t.form.tagsLabel}  value={tagsRaw} onChange={setTagsRaw} />
        <Field label={t.form.notesLabel} value={notes}   onChange={setNotes} multiline />

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
            <Text style={styles.submitText}>
              {save.isPending ? t.form.submitting : t.form.submit}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label, value, onChange, multiline = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly multiline?: boolean;
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
  statusRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusOption:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.secondaryLight },
  statusOptionActive: { backgroundColor: colors.primary },
  statusOptionText:       { fontSize: 12, fontWeight: '600' },
  statusOptionTextActive: { color: colors.textInverse },
  errorText:  { color: colors.error, fontSize: 12 },
  actions:    { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancel:     { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 13, fontWeight: '500' },
  submit:     { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
}));
