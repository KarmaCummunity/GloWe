// Survey question card — extracted from [slug].tsx to stay under 300-LOC cap.
// FR-SETTINGS-016 AC1-2: rating row with per-question anchors + optional text.
import React from 'react';
import { Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography, useTheme } from '@kc/ui';
import type { SurveyQuestion } from '@kc/domain';
import { Card } from '../../../components/ui/Card';
import { SurveyRatingRow } from '../../../components/survey/SurveyRatingRow';
import {
  hebrewSurveyFieldTextStyle,
  SURVEY_TEXT_ALIGN,
} from '../../../components/survey/hebrewSurveyFieldStyle';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { webTextRtl } from '../../../lib/webRtlStyle';

export type QuestionPanelProps = {
  readonly question: SurveyQuestion;
  readonly index: number;
  readonly ratingValue: number | null;
  readonly textValue: string;
  readonly onRating: (rating: number) => void;
  readonly onText: (text: string) => void;
};

export function SurveyQuestionPanel({
  question,
  index,
  ratingValue,
  textValue,
  onRating,
  onText,
}: QuestionPanelProps) {
  const styles = usePanelStyles();
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card padding="base" style={styles.card}>
      <Text style={styles.questionIndex}>
        {t('survey.questionIndex', { index: index + 1 })}
      </Text>
      <Text style={styles.prompt}>{question.promptHe}</Text>
      <Text style={styles.context}>{question.contextHe}</Text>

      <Text style={styles.fieldLabel} accessibilityRole="text">
        {t('survey.ratingFieldLabel')}
      </Text>
      <SurveyRatingRow
        value={ratingValue}
        onChange={onRating}
        ratingAnchorLow={question.ratingAnchorLowHe || undefined}
        ratingAnchorHigh={question.ratingAnchorHighHe || undefined}
      />

      <Text style={styles.fieldLabel} accessibilityRole="text">
        {t('survey.textFieldLabel')}
      </Text>
      <TextInput
        style={[styles.textInput, hebrewSurveyFieldTextStyle()]}
        value={textValue}
        onChangeText={onText}
        placeholder={question.textPlaceholderHe}
        placeholderTextColor={colors.textDisabled}
        textAlign={SURVEY_TEXT_ALIGN}
        multiline
        maxLength={500}
        accessibilityLabel={question.textPlaceholderHe}
      />
    </Card>
  );
}

const usePanelStyles = makeUseStyles(({ colors }) => ({
  card: { gap: spacing.sm, alignSelf: 'stretch' },
  questionIndex: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textAlign: rtlTextAlignStart,
    ...webTextRtl,
  },
  prompt: {
    ...typography.h3,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    lineHeight: 26,
    ...webTextRtl,
  },
  context: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    lineHeight: 23,
    ...webTextRtl,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: rtlTextAlignStart,
    marginTop: spacing.xs,
    ...webTextRtl,
  },
  textInput: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 88,
    maxHeight: 128,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
}));
