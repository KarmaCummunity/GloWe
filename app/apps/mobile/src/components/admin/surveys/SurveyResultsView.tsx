// app/apps/mobile/src/components/admin/surveys/SurveyResultsView.tsx
// FR-ADMIN-021 — survey detail: per-question stats + per-user answers.
import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdminSurveyResults } from '@kc/domain';
import { makeUseStyles, useTheme, Text } from '@kc/ui';
import { textAlignStart, rowDirectionStart } from '../../../lib/rtlLayout';
import { AdminListEmpty } from '../AdminListEmpty';
import { QuestionStatCard } from './QuestionStatCard';
import { RespondentCard } from './RespondentCard';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface SurveyResultsViewProps {
  readonly results: AdminSurveyResults | null;
  readonly isLoading: boolean;
  readonly onBack: () => void;
}

export function SurveyResultsView({
  results,
  isLoading,
  onBack,
}: SurveyResultsViewProps): ReactElement {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  const t = L.admin.surveys;

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        <Text style={styles.backText}>{t.backToList}</Text>
      </Pressable>

      {isLoading && !results ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : !results ? (
        <AdminListEmpty title={t.errorTitle} hint="" />
      ) : (
        <>
          <Text style={styles.heading}>{results.titleHe}</Text>
          <Text style={styles.subheading}>
            {t.overview.versionLabel(results.version)} · {t.overview.respondents(results.respondentCount)}
          </Text>

          <Text style={styles.sectionTitle}>{t.stats.sectionTitle}</Text>
          <View style={styles.list}>
            {results.questions.map((q) => (
              <QuestionStatCard key={q.id} stat={q} />
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t.respondents.sectionTitle}</Text>
          {results.respondents.length === 0 ? (
            <AdminListEmpty title={t.respondents.emptyTitle} hint="" />
          ) : (
            <View style={styles.list}>
              {results.respondents.map((r) => (
                <RespondentCard key={r.userId} respondent={r} questions={results.questions} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: { gap: 12 },
  back: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 6, paddingVertical: 4 },
  backText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  center: { paddingVertical: 40, alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  subheading: { fontSize: 13, color: colors.textSecondary, textAlign: textAlignStart() },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: colors.textSecondary,
    textAlign: textAlignStart(), marginTop: 8,
  },
  list: { gap: 12 },
}));
