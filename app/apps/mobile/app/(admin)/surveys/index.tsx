// app/apps/mobile/app/(admin)/surveys/index.tsx
// FR-ADMIN-021 — Admin Portal survey results & free-feedback dashboard.
// Two tabs: "Surveys" (overview → per-survey stats + per-user answers) and
// "Feedback" (free-text entries). RBAC-gated by surveys.view.
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { type AdminPermission, type AdminRole, hasPermission } from '@kc/domain';
import { makeUseStyles, useTheme } from '@kc/ui';
import { useAdminRoles } from '../../../src/hooks/useAdminRoles';
import {
  useAdminSurveyOverview,
  useAdminSurveyResults,
  useAdminUserFeedback,
} from '../../../src/hooks/useAdminSurveys';
import { AdminScreenHeader } from '../../../src/components/admin/AdminScreenHeader';
import { AdminListEmpty } from '../../../src/components/admin/AdminListEmpty';
import { SurveyOverviewCard } from '../../../src/components/admin/surveys/SurveyOverviewCard';
import { SurveyResultsView } from '../../../src/components/admin/surveys/SurveyResultsView';
import { FeedbackCard } from '../../../src/components/admin/surveys/FeedbackCard';
import { rowDirectionStart } from '../../../src/lib/rtlLayout';
import { useLocaleBundle } from '../../../src/i18n/useLocaleBundle';

type Tab = 'surveys' | 'feedback';

export default function AdminSurveysScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  const t = L.admin.surveys;
  const { roles, isLoading: rolesLoading } = useAdminRoles();
  const [tab, setTab] = useState<Tab>('surveys');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const can = (perm: AdminPermission) => hasPermission(roles as readonly AdminRole[], perm);
  const allowed = can('surveys.view');

  const overview = useAdminSurveyOverview(allowed && tab === 'surveys');
  const results = useAdminSurveyResults(allowed && selectedSlug ? selectedSlug : null);
  const feedback = useAdminUserFeedback(allowed && tab === 'feedback');

  if (rolesLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!allowed) {
    return (
      <View style={styles.center}>
        <Text style={styles.deniedTitle}>{t.forbiddenTitle}</Text>
      </View>
    );
  }

  const refreshing =
    tab === 'surveys'
      ? (selectedSlug ? results.isRefetching : overview.isRefetching)
      : feedback.isRefetching;

  const onRefresh = () => {
    if (tab === 'feedback') { feedback.refetch(); return; }
    if (selectedSlug) { results.refetch(); return; }
    overview.refetch();
  };

  return (
    <View style={styles.root}>
      <AdminScreenHeader title={t.title} subtitle={t.subtitle} />

      <View style={styles.tabs}>
        <TabButton label={t.tabs.surveys} active={tab === 'surveys'} onPress={() => setTab('surveys')} />
        <TabButton label={t.tabs.feedback} active={tab === 'feedback'} onPress={() => setTab('feedback')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'surveys' && selectedSlug ? (
          <SurveyResultsView
            results={results.results}
            isLoading={results.isLoading}
            onBack={() => setSelectedSlug(null)}
          />
        ) : tab === 'surveys' ? (
          <SurveysList
            loading={overview.isLoading}
            isEmpty={overview.surveys.length === 0}
            onSelect={setSelectedSlug}
            surveys={overview.surveys}
          />
        ) : (
          <FeedbackList loading={feedback.isLoading} entries={feedback.feedback} />
        )}
      </ScrollView>
    </View>
  );
}

function SurveysList({
  loading, isEmpty, surveys, onSelect,
}: {
  loading: boolean;
  isEmpty: boolean;
  surveys: ReturnType<typeof useAdminSurveyOverview>['surveys'];
  onSelect: (slug: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = useLocaleBundle().admin.surveys.overview;
  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} /></View>;
  if (isEmpty) return <AdminListEmpty title={t.emptyTitle} hint={t.emptyHint} />;
  return (
    <View style={styles.list}>
      {surveys.map((s) => (
        <SurveyOverviewCard key={s.slug} item={s} onPress={() => onSelect(s.slug)} />
      ))}
    </View>
  );
}

function FeedbackList({
  loading, entries,
}: {
  loading: boolean;
  entries: ReturnType<typeof useAdminUserFeedback>['feedback'];
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = useLocaleBundle().admin.surveys.feedback;
  if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} /></View>;
  if (entries.length === 0) return <AdminListEmpty title={t.emptyTitle} hint={t.emptyHint} />;
  return (
    <View style={styles.list}>
      {entries.map((e) => <FeedbackCard key={e.id} entry={e} />)}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]} accessibilityRole="button">
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  tabs: {
    flexDirection: rowDirectionStart,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primarySurface, borderColor: colors.primaryLight },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.primaryDark },
  content: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  list: { gap: 12 },
}));
