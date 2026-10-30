// Spec 07 §7.7 / KC#1106, KC#1114 — rating step after a handoff: both sides rate 1–5 with an
// optional note. Ratings are seen only by the KC team (D24), so the hint says so. Picking a star
// only selects it; the rating is sent with the note on submit.
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography, Text, TextInput } from '@kc/ui';

/** Upper bound for the note; long enough for a sentence or two of thanks or context. */
export const HANDOFF_RATING_NOTE_MAX_LENGTH = 300;

const STARS = [1, 2, 3, 4, 5] as const;

interface Props {
  readonly busy: boolean;
  readonly onSubmit: (rating: number, note: string | null) => void;
}

export function HandoffRatingForm({ busy, onSubmit }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const submit = () => {
    if (rating === null) return;
    const trimmed = note.trim();
    onSubmit(rating, trimmed.length > 0 ? trimmed : null);
  };

  return (
    <View style={styles.root} testID="handoff-rating-form">
      <Text style={styles.title}>{t('givingHandoff.ratingTitle')}</Text>
      <Text style={styles.hint}>{t('givingHandoff.ratingHint')}</Text>
      <View style={styles.stars}>
        {STARS.map((star) => {
          const filled = rating !== null && star <= rating;
          return (
            <Pressable
              key={star}
              testID={`handoff-rating-star-${star}`}
              disabled={busy}
              onPress={() => setRating(star)}
              accessibilityRole="button"
              accessibilityLabel={t('givingHandoff.ratingStarA11y', { count: star })}
              accessibilityState={{ selected: rating === star, disabled: busy }}
            >
              <Text style={[styles.star, filled && styles.starFilled]}>{filled ? '★' : '☆'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>{t('givingHandoff.ratingNoteLabel')}</Text>
      <TextInput
        testID="handoff-rating-note"
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder={t('givingHandoff.ratingNotePlaceholder')}
        maxLength={HANDOFF_RATING_NOTE_MAX_LENGTH}
        multiline
        editable={!busy}
      />
      <Pressable
        testID="handoff-rating-submit"
        style={[styles.btn, (rating === null || busy) && styles.btnDisabled]}
        disabled={rating === null || busy}
        onPress={submit}
        accessibilityRole="button"
        accessibilityState={{ disabled: rating === null || busy }}
      >
        <Text style={styles.btnText}>{t('givingHandoff.ratingSubmit')}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  root: { gap: spacing.sm },
  title: { ...typography.h4, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary },
  stars: { flexDirection: 'row' as const, gap: spacing.sm },
  star: { ...typography.h2, color: colors.textSecondary },
  starFilled: { color: colors.primary },
  label: { ...typography.caption, color: colors.textSecondary },
  input: {
    ...typography.body,
    minHeight: spacing['3xl'],
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    textAlignVertical: 'top' as const,
  },
  btn: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center' as const },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...typography.button, color: colors.textInverse },
}));
