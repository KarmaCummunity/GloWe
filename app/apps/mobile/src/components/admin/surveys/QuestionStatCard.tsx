// app/apps/mobile/src/components/admin/surveys/QuestionStatCard.tsx
// FR-ADMIN-021 — per-question aggregate stats with a 1..7 distribution chart, or per-option
// counts for a single-choice question (KC#1058).
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { AdminSurveyQuestionStat } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { textAlignStart, rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export function QuestionStatCard({ stat }: { stat: AdminSurveyQuestionStat }): ReactElement {
  if (stat.questionType === 'single_choice_with_optional_text') {
    return <ChoiceStatCard stat={stat} />;
  }
  return <RatingStatCard stat={stat} />;
}

/** Single-choice question: one horizontal bar per option, in option order. */
function ChoiceStatCard({ stat }: { stat: AdminSurveyQuestionStat }): ReactElement {
  const styles = useStyles();
  const t = useLocaleBundle().admin.surveys.stats;
  const max = Math.max(1, ...stat.choiceCounts.map((c) => c.count));

  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={2}>{stat.shortLabelHe}</Text>
      <Text style={styles.prompt} numberOfLines={3}>{stat.promptHe}</Text>
      <Text style={styles.prompt}>{t.choiceDistributionTitle}</Text>
      {stat.choiceCounts.map((choice) => (
        <View key={choice.key} style={styles.choiceRow}>
          <Text style={styles.choiceLabel} numberOfLines={2}>{choice.labelHe}</Text>
          <View style={styles.choiceTrack}>
            <View style={[styles.choiceFill, { width: `${(choice.count / max) * 100}%` }]} />
          </View>
          <Text style={styles.barCount}>{choice.count}</Text>
        </View>
      ))}
      <Text style={styles.responses}>
        {stat.responseCount} {t.responsesLabel}
      </Text>
    </View>
  );
}

function RatingStatCard({ stat }: { stat: AdminSurveyQuestionStat }): ReactElement {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.surveys.stats;
  const max = Math.max(1, ...stat.distribution);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={2}>{stat.shortLabelHe}</Text>
        <View style={styles.avgPill}>
          <Text style={styles.avgValue}>
            {stat.avgRating == null ? '—' : stat.avgRating.toFixed(1)}
          </Text>
          <Text style={styles.avgCaption}>{t.avgLabel}</Text>
        </View>
      </View>

      <Text style={styles.prompt} numberOfLines={3}>{stat.promptHe}</Text>

      <View style={styles.chart}>
        {stat.distribution.map((count, idx) => (
          <View key={idx} style={styles.barCol}>
            <Text style={styles.barCount}>{count}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${(count / max) * 100}%` }]} />
            </View>
            <Text style={styles.barLabel}>{idx + 1}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.anchor} numberOfLines={1}>{stat.ratingAnchorLowHe}</Text>
        <Text style={styles.responses}>
          {stat.responseCount} {t.responsesLabel}
        </Text>
        <Text style={styles.anchor} numberOfLines={1}>{stat.ratingAnchorHighHe}</Text>
      </View>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: rowDirectionStart, alignItems: 'flex-start', gap: 12 },
  label: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  avgPill: {
    minWidth: 56,
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  avgValue: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  avgCaption: { fontSize: 10, fontWeight: '600', color: colors.primary },
  prompt: { fontSize: 13, color: colors.textSecondary, textAlign: textAlignStart() },
  chart: {
    flexDirection: rowDirectionStart,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    height: 96,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barCount: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  barTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: colors.skeleton,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 6, minHeight: 2 },
  barLabel: { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
  footer: { flexDirection: rowDirectionStart, alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  anchor: { flex: 1, fontSize: 11, color: colors.textDisabled, textAlign: 'center' },
  responses: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  choiceRow: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 8 },
  choiceLabel: { width: '40%', fontSize: 12, color: colors.textPrimary, textAlign: textAlignStart() },
  choiceTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.skeleton,
    overflow: 'hidden',
  },
  choiceFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary, minWidth: 2 },
}));
