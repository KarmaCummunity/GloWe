// One "Matches for you" row (matching v2): counterpart listing, why it matched, accept/decline.
import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, radius, spacing, typography } from '@kc/ui';
import type { MatchSuggestion } from '@kc/infrastructure-supabase';
import { Card } from '../ui/Card';
import { GhostButton, PrimaryButton, SecondaryButton } from '../ui/Buttons';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
import { matchStateOf, scorePercent } from '../../lib/matching';

interface Props {
  readonly match: MatchSuggestion;
  readonly busy?: boolean;
  readonly onRespond: (candidateId: string, response: 'accept' | 'decline') => void;
}

const useStyles = makeUseStyles(({ colors }) => ({
  title: { ...typography.h3, color: colors.textPrimary, textAlign: rtlTextAlignStart },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textAlign: rtlTextAlignStart },
  reason: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: rtlTextAlignStart },
  badge: {
    alignSelf: 'flex-start' as const,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  badgeText: { ...typography.caption, color: colors.primary },
  actions: { flexDirection: 'row' as const, gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' as const },
}));

export function MatchSuggestionCard({ match, busy, onRespond }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const router = useRouter();
  const state = matchStateOf(match);
  const owner = match.otherOwner.displayName ?? t('matches.someone');
  const openListing = () =>
    router.push({ pathname: '/(tabs)/donations/marketplace/[listingId]', params: { listingId: match.otherListingId } } as never);

  return (
    <Card testID={`match-card-${match.candidateId}`}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {t(`matches.state.${state}`)} · {t('matches.score', { pct: scorePercent(match.score) })}
        </Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{match.otherListingTitle}</Text>
      <Text style={styles.meta} numberOfLines={2}>
        {t(match.myRole === 'offer' ? 'matches.forYourOffer' : 'matches.forYourRequest', { title: match.myListingTitle })}
      </Text>
      <Text style={styles.meta}>
        {owner}
        {match.distanceKm != null ? ` · ${t('matches.distanceKm', { km: Math.round(match.distanceKm) })}` : ''}
      </Text>
      {match.reason ? <Text style={styles.reason}>{match.reason}</Text> : null}
      <View style={styles.actions}>
        {state === 'new' || state === 'theyAccepted' ? (
          <>
            <PrimaryButton
              label={t('matches.accept')}
              icon="checkmark"
              loading={busy}
              onPress={() => onRespond(match.candidateId, 'accept')}
              testID={`match-accept-${match.candidateId}`}
            />
            <SecondaryButton
              label={t('matches.decline')}
              icon="close"
              disabled={busy}
              onPress={() => onRespond(match.candidateId, 'decline')}
              testID={`match-decline-${match.candidateId}`}
            />
          </>
        ) : null}
        <GhostButton label={t('matches.viewListing')} icon="open-outline" onPress={openListing} />
      </View>
    </Card>
  );
}
