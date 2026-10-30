// V2-ADMIN-CRM-8 — single CRM contact card.
import { Pressable, StyleSheet, View } from 'react-native';
import type { CrmContact } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface ContactCardProps {
  readonly contact: CrmContact;
  readonly onEdit: () => void;
  readonly onMarkContacted: () => void;
  readonly onDelete: () => void;
}

function fmt(d: Date): string {
  return d.toLocaleString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function ContactCard({ contact, onEdit, onMarkContacted, onDelete }: ContactCardProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.crm;
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
        <View style={[styles.statusChip, styles[`statusChip_${contact.status}` as const]]}>
          <Text style={styles.statusChipText}>{t.status[contact.status]}</Text>
        </View>
      </View>
      {contact.organization && <Text style={styles.meta}>{t.row.orgPrefix} {contact.organization}</Text>}
      {contact.roleTitle    && <Text style={styles.meta}>{t.row.rolePrefix} {contact.roleTitle}</Text>}
      {contact.email        && <Text style={styles.meta}>{t.row.emailPrefix} {contact.email}</Text>}
      {contact.phone        && <Text style={styles.meta}>{t.row.phonePrefix} {contact.phone}</Text>}
      {contact.tags.length > 0 && (
        <Text style={styles.meta}>{t.row.tagsPrefix} {contact.tags.join(', ')}</Text>
      )}
      {contact.notes && <Text style={styles.notes} numberOfLines={3}>{contact.notes}</Text>}
      <View style={styles.metaRow}>
        <Text style={styles.metaSubtle}>
          {contact.lastContactedAt ? t.row.lastContactedAt(fmt(contact.lastContactedAt)) : t.row.neverContacted}
        </Text>
        <Text style={styles.metaSubtle}>{t.row.updatedAt(fmt(contact.updatedAt))}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onMarkContacted} style={[styles.action, styles.actionMuted]}>
          <Text style={styles.actionText}>{t.row.markContacted}</Text>
        </Pressable>
        <Pressable onPress={onEdit} style={[styles.action, styles.actionPrimary]}>
          <Text style={styles.actionPrimaryText}>{t.row.edit}</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.action, styles.actionDanger]}>
          <Text style={styles.actionDangerText}>{t.row.delete}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    margin: 12, padding: 14, gap: 4,
    borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  cardHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contactName:  { fontSize: 15, fontWeight: '700', flex: 1, paddingEnd: 8 },
  statusChip:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusChip_cold:     { backgroundColor: colors.secondaryLight },
  statusChip_warm:     { backgroundColor: colors.warningLight },
  statusChip_active:   { backgroundColor: colors.successLight },
  statusChip_inactive: { backgroundColor: colors.border },
  statusChipText:      { fontSize: 11, fontWeight: '700' },
  meta:        { fontSize: 12, opacity: 0.7 },
  notes:       { fontSize: 12, marginTop: 4, opacity: 0.85 },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaSubtle:  { fontSize: 10, opacity: 0.55 },
  actions:     { flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'flex-end' },
  action:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  actionMuted: { backgroundColor: colors.secondaryLight },
  actionText:  { fontSize: 12, fontWeight: '600' },
  actionPrimary: { backgroundColor: colors.primary },
  actionPrimaryText: { fontSize: 12, fontWeight: '700', color: colors.textInverse },
  actionDanger:  { backgroundColor: colors.errorLight },
  actionDangerText: { fontSize: 12, fontWeight: '700', color: colors.error },
}));
