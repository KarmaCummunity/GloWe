// app/apps/mobile/src/components/admin/admins/AdminsListView.tsx
// FR-ADMIN-022 — the "list" tab of the admins screen: one card per user with an
// include-revoked toggle. Split out of the screen to keep each unit small.
import { useMemo, useState } from 'react';
import { RefreshControl, Switch, Text, View } from 'react-native';
import { type AdminPerson, groupGrantsByUser } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useAdminsList } from '../../../hooks/useAdminsList';
import { rowDirectionStart, textAlignStart } from '../../../lib/rtlLayout';
import { AdminPersonCard } from './AdminPersonCard';
import { buildAdminListItems, type AdminListItem } from './adminListItems';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';
import { KcFlashList } from '../../lists/KcFlashList';

export interface AdminsListViewProps {
  readonly isWide: boolean;
  readonly onSelect: (userId: string) => void;
}

function renderItem(item: AdminListItem, onSelect: (userId: string) => void, styles: ReturnType<typeof useStyles>) {
  if (item.kind === 'header') {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{item.title}</Text>
        <Text style={styles.sectionHeaderCount}>{item.count}</Text>
      </View>
    );
  }
  return <AdminPersonCard person={item.person} onPress={onSelect} />;
}

export function AdminsListView({ isWide, onSelect }: AdminsListViewProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const list = useAdminsList(includeRevoked);
  const people = useMemo<readonly AdminPerson[]>(() => groupGrantsByUser(list.grants), [list.grants]);
  const items = useMemo(() => buildAdminListItems(people, includeRevoked), [people, includeRevoked]);

  return (
    <View style={styles.fill}>
      <View style={styles.toggleRow}>
        <Switch value={includeRevoked} onValueChange={setIncludeRevoked} />
        <Text style={styles.toggleLabel}>{L.admin.admins.includeRevokedLabel}</Text>
      </View>
      <KcFlashList
        data={items}
        keyExtractor={(it, i) => (it.kind === 'header' ? `h:${it.title}` : `p:${it.person.userId}:${i}`)}
        contentContainerStyle={[styles.listContent, isWide && styles.listContentWide]}
        renderItem={({ item }) => renderItem(item, onSelect, styles)}
        ListEmptyComponent={list.isLoading ? null : <EmptyState />}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={list.refetch} />}
      />
    </View>
  );
}

function EmptyState() {
  const styles = useStyles();
  const L = useLocaleBundle();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{L.admin.admins.emptyTitle}</Text>
      <Text style={styles.emptyHint}>{L.admin.admins.emptyHint}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  fill:        { flex: 1 },
  toggleRow:   { flexDirection: rowDirectionStart, alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  toggleLabel: { fontSize: 13, color: colors.textSecondary },
  listContent:     { paddingBottom: 24 },
  listContentWide: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  sectionHeader: {
    flexDirection: rowDirectionStart, justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  sectionHeaderText:  { fontSize: 14, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  sectionHeaderCount: { fontSize: 12, color: colors.textSecondary },
  empty:      { padding: 32, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  emptyHint:  { fontSize: 13, opacity: 0.6, textAlign: 'center', color: colors.textSecondary },
}));