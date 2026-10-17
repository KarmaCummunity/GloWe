// app/apps/mobile/app/(admin)/org-approvals/index.tsx
// V2-ADMIN-ORG-7 — V2 §13.12 Admin Org Approvals foundation.
// Lists pending NGO applications and lets a privileged admin approve or
// reject each one. The "approval = create organization" side-effect is
// out of scope here — it lands in a separate slice when the org world
// schema is built.
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  hasPermission, isOrgApplicationError,
  type AdminPermission, type AdminRole,
  type OrgApplication, type OrgApplicationStatus,
} from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { container } from '../../../src/lib/container';
import { useLocaleBundle, type LocaleBundle } from '../../../src/i18n/useLocaleBundle';
import { KcFlashList } from '../../../src/components/lists/KcFlashList';

type StatusFilter = OrgApplicationStatus | 'all';

const STATUS_TABS: readonly StatusFilter[] = ['pending', 'approved', 'rejected', 'all'];

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

function fmt(dt: Date): string {
  return dt.toLocaleString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OrgApprovalsScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.orgApprovals;
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StatusFilter>('pending');

  const filters = useMemo(() => ({
    status: tab === 'all' ? undefined : tab,
    limit: 100,
  }), [tab]);

  const query = useQuery({
    queryKey: ['admin.org-approvals', filters],
    queryFn:  () => container.listOrgApplications.execute(filters),
    enabled:  can('org.review_applications'),
    staleTime: 30_000,
  });

  const decide = useMutation({
    mutationFn: (vars: { applicationId: string; approve: boolean; note: string }) =>
      container.decideOrgApplication.execute({
        applicationId: vars.applicationId,
        approve: vars.approve,
        note: vars.note.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin.org-approvals'] });
    },
  });

  if (rolesLoading) {
    return <View style={styles.center}><Text>{t.loading}</Text></View>;
  }
  if (!can('org.review_applications')) {
    return <View style={styles.center}><Text style={styles.deniedTitle}>{t.forbiddenTitle}</Text></View>;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {STATUS_TABS.map((s) => (
          <Pressable
            key={s}
            onPress={() => setTab(s)}
            style={[styles.chip, tab === s && styles.chipActive]}
          >
            <Text style={[styles.chipText, tab === s && styles.chipTextActive]}>
              {t.filters[s]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.totalLabel}>{t.totalCount(query.data?.totalCount ?? 0)}</Text>
      <KcFlashList
        data={[...(query.data?.rows ?? [])]}
        keyExtractor={(a) => a.applicationId}
        renderItem={({ item }) => (
          <ApplicationCard
            application={item}
            busy={decide.isPending}
            onDecide={async (approve, note) => {
              const ok = await confirmAction(approve ? t.actions.confirmApprove : t.actions.confirmReject, L);
              if (!ok) return;
              try {
                await decide.mutateAsync({ applicationId: item.applicationId, approve, note });
              } catch (err) {
                const code = isOrgApplicationError(err) ? err.code : 'unknown';
                const msg = t.errors[code as keyof typeof t.errors] ?? t.errors.unknown;
                if (Platform.OS === 'web') {
                  if (typeof window !== 'undefined') window.alert(msg);
                } else {
                  Alert.alert(msg);
                }
              }
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} />
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
              <Text style={styles.emptyHint}>{t.emptyHint}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

interface ApplicationCardProps {
  readonly application: OrgApplication;
  readonly busy: boolean;
  readonly onDecide: (approve: boolean, note: string) => Promise<void>;
}

function ApplicationCard({ application, busy, onDecide }: ApplicationCardProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.orgApprovals;
  const [note, setNote] = useState('');

  const showActions = application.status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.orgName}>{application.orgName}</Text>
        <View style={[styles.statusChip, styles[`status_${application.status}` as const]]}>
          <Text style={styles.statusChipText}>{t.status[application.status]}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {t.row.submittedBy(application.applicantName ?? application.applicantUserId.slice(0, 8))}
      </Text>
      <Text style={styles.meta}>{t.row.submittedAt(fmt(application.createdAt))}</Text>
      {application.orgDescription && (
        <Text style={styles.description} numberOfLines={6}>{application.orgDescription}</Text>
      )}
      <View style={styles.contactCol}>
        {application.contactEmail && <Text style={styles.contact}>✉ {application.contactEmail}</Text>}
        {application.contactPhone && <Text style={styles.contact}>📞 {application.contactPhone}</Text>}
        {application.websiteUrl && <Text style={styles.contact}>🔗 {application.websiteUrl}</Text>}
      </View>

      {application.status !== 'pending' && application.reviewerName && (
        <Text style={styles.meta}>{t.row.decidedBy(application.reviewerName)}</Text>
      )}
      {application.reviewedAt && (
        <Text style={styles.meta}>{t.row.decidedAt(fmt(application.reviewedAt))}</Text>
      )}
      {application.reviewNote && (
        <View style={styles.notePreview}>
          <Text style={styles.noteLabel}>{t.row.noteLabel}</Text>
          <Text style={styles.noteText}>{application.reviewNote}</Text>
        </View>
      )}

      {showActions && (
        <>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t.row.noteLabel}
            multiline
          />
          <View style={styles.actions}>
            <Pressable
              disabled={busy}
              onPress={() => { void onDecide(false, note); }}
              style={[styles.actionBtn, styles.rejectBtn, busy && styles.actionBtnDisabled]}
            >
              <Text style={styles.rejectText}>{busy ? t.actions.busy : t.actions.reject}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => { void onDecide(true, note); }}
              style={[styles.actionBtn, styles.approveBtn, busy && styles.actionBtnDisabled]}
            >
              <Text style={styles.approveText}>{busy ? t.actions.busy : t.actions.approve}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { fontSize: 18, fontWeight: '700' },
  title:       { fontSize: 22, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  chips:       { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    backgroundColor: colors.secondaryLight,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
  totalLabel:     { paddingHorizontal: 16, paddingBottom: 8, fontSize: 11, opacity: 0.6 },
  empty:          { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle:     { fontSize: 16, fontWeight: '600' },
  emptyHint:      { fontSize: 13, opacity: 0.6, textAlign: 'center' },

  card: {
    margin: 12, padding: 14, gap: 6,
    borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orgName:        { fontSize: 16, fontWeight: '700', flex: 1, paddingEnd: 8 },
  statusChip:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  status_pending:  { backgroundColor: colors.warningLight },
  status_approved: { backgroundColor: colors.successLight },
  status_rejected: { backgroundColor: colors.errorLight },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  meta:           { fontSize: 12, opacity: 0.65 },
  description:    { fontSize: 13, marginTop: 4 },
  contactCol:     { gap: 2, marginTop: 4 },
  contact:        { fontSize: 12, opacity: 0.75 },
  notePreview:    { marginTop: 4, padding: 8, borderRadius: 6, backgroundColor: colors.skeleton, gap: 2 },
  noteLabel:      { fontSize: 11, fontWeight: '700', opacity: 0.75 },
  noteText:       { fontSize: 12 },
  noteInput: {
    marginTop: 8, padding: 10, minHeight: 50,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.background, textAlignVertical: 'top',
  },
  actions:        { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  actionBtn:      { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  approveBtn:     { backgroundColor: colors.primary },
  approveText:    { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
  rejectBtn:      { backgroundColor: colors.errorLight },
  rejectText:     { color: colors.error, fontSize: 13, fontWeight: '700' },
  actionBtnDisabled: { opacity: 0.5 },
}));