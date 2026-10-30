// app/apps/mobile/src/components/admin/surveys/RespondentCard.tsx
// FR-ADMIN-021 — one respondent's full answer set for a survey (rating or chosen option).
import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import type {
  AdminSurveyRespondent,
  AdminSurveyRespondentAnswer,
  AdminSurveyQuestionStat,
} from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { textAlignStart, rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export interface RespondentCardProps {
  readonly respondent: AdminSurveyRespondent;
  readonly questions: readonly AdminSurveyQuestionStat[];
}

export function RespondentCard({ respondent, questions }: RespondentCardProps): ReactElement {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.surveys.respondents;
  const labelFor = (qid: string): string =>
    questions.find((q) => q.id === qid)?.shortLabelHe ?? '';
  // Pill text: "5/7" for a rating, the option label for a single-choice answer (KC#1058).
  const valueFor = (a: AdminSurveyRespondentAnswer): string => {
    if (a.choiceKey == null) return a.rating == null ? '—' : `${a.rating}/7`;
    const options = questions.find((q) => q.id === a.questionId)?.choiceCounts ?? [];
    return options.find((o) => o.key === a.choiceKey)?.labelHe ?? a.choiceKey;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(respondent.displayName ?? '?').trim().charAt(0) || '?'}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {respondent.displayName ?? t.anonymous}
          </Text>
          <Text style={styles.meta}>{t.submittedAt(fmt(respondent.submittedAt))}</Text>
        </View>
      </View>

      <View style={styles.answers}>
        {respondent.answers.map((a) => (
          <View key={a.questionId} style={styles.answerRow}>
            <View style={styles.answerTop}>
              <Text style={styles.qLabel} numberOfLines={1}>{labelFor(a.questionId)}</Text>
              <View style={styles.ratingPill}>
                <Text style={styles.ratingText} numberOfLines={1}>{valueFor(a)}</Text>
              </View>
            </View>
            {a.answerText ? (
              <Text style={styles.answerText}>{a.answerText}</Text>
            ) : (
              <Text style={styles.noText}>{t.noText}</Text>
            )}
          </View>
        ))}
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
    padding: 14,
    gap: 12,
  },
  header: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  meta: { fontSize: 11, color: colors.textSecondary, textAlign: textAlignStart() },
  answers: { gap: 8 },
  answerRow: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerTop: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 8 },
  qLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.textSecondary, textAlign: textAlignStart() },
  ratingPill: {
    backgroundColor: colors.secondaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.textPrimary },
  answerText: { fontSize: 13, color: colors.textPrimary, textAlign: textAlignStart() },
  noText: { fontSize: 12, color: colors.textDisabled, textAlign: textAlignStart(), fontStyle: 'italic' },
}));
