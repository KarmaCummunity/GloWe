// app/apps/mobile/app/(admin)/posts/index.tsx
// FR-ADMIN-019 — admin posts search screen.
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { adminChipScroll } from '../../../src/components/admin/adminChipScroll';
import { type AdminPermission, type AdminRole, hasPermission } from '@kc/domain';
import { makeUseStyles, radius, spacing, Text, TextInput, typography } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import { useAdminPostSearch } from '../../../src/hooks/useAdminContentSearch';
import { AdminScreenHeader } from '../../../src/components/admin/AdminScreenHeader';
import { PostSearchRow } from '../../../src/components/admin/content/PostSearchRow';
import { useLocaleBundle } from '../../../src/i18n/useLocaleBundle';
import { rtlTextAlignStart } from '../../../src/lib/rtlTextAlignStart';
import { KcFlashList } from '../../../src/components/lists/KcFlashList';

const STATUS_OPTIONS = [
  { value: null,                       key: 'all' as const },
  { value: 'open',                     key: 'open' as const },
  { value: 'closed_delivered',         key: 'closed' as const },
  { value: 'deleted_no_recipient',     key: 'deletedNoRecipient' as const },
  { value: 'removed_admin',            key: 'removedAdmin' as const },
  { value: 'hidden_pending_review',    key: 'hiddenForReview' as const },
  { value: 'expired',                  key: 'expired' as const },
];

export default function PostsScreen() {
  const styles = useStyles();
  const L = useLocaleBundle();
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filters = useMemo(() => ({
    query: query.trim() || undefined,
    status: statusFilter ?? undefined,
  }), [query, statusFilter]);

  const result = useAdminPostSearch(filters);
  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);

  if (rolesLoading) {
    return <View style={styles.center}><Text>{L.admin.content.loading}</Text></View>;
  }
  if (!can('posts.search')) {
    return <View style={styles.center}><Text style={styles.deniedTitle}>{L.admin.content.forbiddenTitle}</Text></View>;
  }

  return (
    <View style={styles.root}>
      <AdminScreenHeader title={L.admin.content.postsTitle} />
      <TextInput // brand-guard-allow: search bar, not a form field (spec 17 §4.1)
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={L.admin.content.searchPostsPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ScrollView horizontal style={adminChipScroll.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, adminChipScroll.content]}>
        {STATUS_OPTIONS.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => setStatusFilter(s.value)}
            style={[styles.chip, statusFilter === s.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, statusFilter === s.value && styles.chipTextActive]}>
              {L.admin.content.postStatusFilter[s.key]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.totalLabel}>{L.admin.content.totalCount(result.page.totalCount)}</Text>
      <KcFlashList
        data={[...result.page.rows]}
        keyExtractor={(p) => p.postId}
        renderItem={({ item }) => <PostSearchRow row={item} />}
        refreshControl={<RefreshControl refreshing={result.isRefetching} onRefresh={result.refetch} />}
        ListEmptyComponent={
          !result.isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{L.admin.content.postsEmpty}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root:        { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  deniedTitle: { ...typography.h3, ...typography.bold },
  search: {
    marginHorizontal: spacing.base, marginBottom: spacing.sm, padding: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    textAlign: rtlTextAlignStart, ...typography.body,
  },
  chips:          { paddingHorizontal: spacing.base, gap: spacing.sm, paddingBottom: spacing.sm },
  chip:           { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radius.lg, backgroundColor: colors.secondaryLight },
  chipActive:     { backgroundColor: colors.primary },
  chipText:       { ...typography.label },
  chipTextActive: { color: colors.textInverse },
  totalLabel:     { paddingHorizontal: spacing.base, paddingBottom: spacing.xs, ...typography.caption, opacity: 0.6 },
  empty:          { padding: spacing['2xl'], alignItems: 'center' },
  emptyText:      { ...typography.body, opacity: 0.6 },
}));
