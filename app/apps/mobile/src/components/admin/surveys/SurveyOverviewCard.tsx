// app/apps/mobile/src/components/admin/surveys/SurveyOverviewCard.tsx
// FR-ADMIN-021 — selectable survey summary card (counts + last response).
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdminSurveyOverviewItem } from '@kc/domain';
import { makeUseStyles, shadow, useTheme, Text } from '@kc/ui';
import { textAlignStart, rowDirectionStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export interface SurveyOverviewCardProps {
  readonly item: AdminSurveyOverviewItem;
  readonly onPress: () => void;
}

export function SurveyOverviewCard({ item, onPress }: SurveyOverviewCardProps): ReactElement {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  const t = L.admin.surveys.overview;
  const last = fmt(item.lastResponseAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={2}>{item.titleHe}</Text>
        {!item.isActive ? (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>{t.inactiveBadge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metrics}>
        <Metric value={String(item.respondentCount)} label={t.respondents(item.respondentCount)} />
        <Metric value={String(item.responseTotal)} label={t.responses(item.responseTotal)} />
        <Metric value={String(item.questionCount)} label={t.questions(item.questionCount)} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          {last ? t.lastResponse(last) : t.noResponses}
        </Text>
        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
      </View>
    </Pressable>
  );
}

function Metric({ value, label }: { value: string; label: string }): ReactElement {
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    ...shadow.card,
  },
  pressed: { opacity: 0.7 },
  top: { flexDirection: rowDirectionStart, alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  inactiveBadge: {
    backgroundColor: colors.skeleton,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  metrics: { flexDirection: rowDirectionStart, gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  metricLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  footer: { flexDirection: rowDirectionStart, alignItems: 'center', justifyContent: 'space-between' },
  footerText: { flex: 1, fontSize: 12, color: colors.textSecondary, textAlign: textAlignStart() },
}));
