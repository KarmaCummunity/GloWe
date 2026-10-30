// app/apps/mobile/src/components/admin/surveys/FeedbackCard.tsx
// FR-ADMIN-021 — one free-text feedback entry (FR-SETTINGS-017).
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { AdminFeedbackEntry } from '@kc/domain';
import { makeUseStyles, Text } from '@kc/ui';
import { textAlignStart, rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function FeedbackCard({ entry }: { entry: AdminFeedbackEntry }): ReactElement {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.surveys.feedback;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.displayName ?? t.anonymous}
        </Text>
        {entry.rating != null ? (
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>{entry.rating}/7</Text>
          </View>
        ) : (
          <Text style={styles.noRating}>{t.noRating}</Text>
        )}
      </View>
      <Text style={styles.body}>{entry.body}</Text>
      <Text style={styles.meta}>{fmt(entry.createdAt)}</Text>
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
    gap: 8,
  },
  header: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  ratingPill: {
    backgroundColor: colors.primarySurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  noRating: { fontSize: 11, color: colors.textDisabled },
  body: { fontSize: 14, color: colors.textPrimary, textAlign: textAlignStart(), lineHeight: 20 },
  meta: { fontSize: 11, color: colors.textSecondary, textAlign: textAlignStart() },
}));
