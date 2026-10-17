import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { MarketplaceListingDetail } from '@kc/domain';
import { useAuthStore } from '../../store/authStore';
import { givingHandoffUseCases } from '../../services/givingHandoffComposition';
import { ridesKnowledgeRpcs } from '../../services/ridesKnowledgeComposition';
import { track } from '../../lib/analytics';
import { hapticSuccess } from '../../lib/haptics';
import { handoffErrorKey } from '../../lib/marketplaceCreateErrors';

const useStyles = makeUseStyles(({ colors }) => ({
  box: { gap: spacing.sm, padding: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceRaised },
  status: { ...typography.caption, color: colors.textSecondary },
  btn: { padding: spacing.md, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' as const },
  btnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnText: { ...typography.button, color: colors.textInverse },
  btnTextSecondary: { color: colors.primary },
  stars: { flexDirection: 'row' as const, gap: spacing.sm },
}));

interface Props {
  detail: MarketplaceListingDetail;
}

export function GivingHandoffActions({ detail }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const userId = useAuthStore((s) => s.session?.userId ?? null);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const handoff = useQuery({
    queryKey: ['giving-handoff', detail.listingId],
    queryFn: () => givingHandoffUseCases.getForListing().execute(detail.listingId),
    enabled: Boolean(userId) && detail.direction === 'give',
  });

  if (detail.direction !== 'give') return null;
  const handoffWorlds = ['items', 'food', 'rides', 'knowledge'] as const;
  if (!(handoffWorlds as readonly string[]).includes(detail.worldSlug)) return null;
  if (!userId || detail.ownerId === userId) {
    if (!handoff.data) return null;
  }

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['giving-handoff', detail.listingId] });
    await qc.invalidateQueries({ queryKey: ['marketplace'] });
  };

  const run = async (fn: () => Promise<void>, event?: 'match_made') => {
    setBusy(true);
    try {
      await fn();
      if (event === 'match_made') {
        track('match_made', { world: detail.worldSlug });
      }
      hapticSuccess();
      await invalidate();
    } catch (err) {
      alert(t(handoffErrorKey(err) ?? 'givingHandoff.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const h = handoff.data;
  const isOwner = userId === detail.ownerId;
  const isRecipient = h != null && userId === h.recipientId;

  return (
    <View style={styles.box}>
      <Text style={typography.h3}>{t('givingHandoff.sectionTitle')}</Text>
      {h ? <Text style={styles.status}>{t('givingHandoff.status', { status: h.status })}</Text> : null}

      {!h && detail.worldSlug === 'items' && !isOwner ? (
        <>
          <Pressable
            style={styles.btn}
            disabled={busy}
            onPress={() => run(async () => { await givingHandoffUseCases.reserveItem().execute(detail.listingId, 'pickup'); }, 'match_made')}
          >
            <Text style={styles.btnText}>{t('givingHandoff.reserveItem')}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            disabled={busy}
            onPress={() => run(async () => { await givingHandoffUseCases.reserveItem().execute(detail.listingId, 'delivery'); }, 'match_made')}
          >
            <Text style={[styles.btnText, styles.btnTextSecondary]}>{t('givingHandoff.reserveDelivery')}</Text>
          </Pressable>
        </>
      ) : null}

      {!h && detail.worldSlug === 'food' && !isOwner ? (
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() => run(async () => { await givingHandoffUseCases.claimFood().execute(detail.listingId); }, 'match_made')}
        >
          <Text style={styles.btnText}>{t('givingHandoff.claimFood')}</Text>
        </Pressable>
      ) : null}

      {!h && detail.worldSlug === 'rides' && !isOwner ? (
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() => run(async () => { await ridesKnowledgeRpcs.bookRideSeat(detail.listingId, 1); }, 'match_made')}
        >
          <Text style={styles.btnText}>{t('givingHandoff.bookRideSeat')}</Text>
        </Pressable>
      ) : null}

      {!h && detail.worldSlug === 'knowledge' && !isOwner ? (
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() => run(async () => { await ridesKnowledgeRpcs.bookKnowledgeSlot(detail.listingId); }, 'match_made')}
        >
          <Text style={styles.btnText}>{t('givingHandoff.bookKnowledgeSlot')}</Text>
        </Pressable>
      ) : null}

      {h?.status === 'reserved' && isOwner && detail.worldSlug !== 'knowledge' ? (
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() =>
            run(async () => {
              if (detail.worldSlug === 'rides') {
                await ridesKnowledgeRpcs.confirmRideBooking(h.handoffId);
              } else if (detail.worldSlug === 'items' || detail.worldSlug === 'food') {
                await givingHandoffUseCases.confirmItem().execute(h.handoffId);
              }
            })
          }
        >
          <Text style={styles.btnText}>{t('givingHandoff.confirmReservation')}</Text>
        </Pressable>
      ) : null}

      {(h?.status === 'confirmed' || (h?.status === 'reserved' && (detail.worldSlug === 'knowledge'))) && (isOwner || isRecipient) ? (
        <>
          <Pressable
            style={styles.btn}
            disabled={busy}
            onPress={() =>
              run(async () => {
                if (detail.worldSlug === 'rides') {
                  await ridesKnowledgeRpcs.completeRideTrip(h.handoffId);
                } else if (detail.worldSlug === 'knowledge') {
                  await ridesKnowledgeRpcs.completeKnowledgeSession(h.handoffId);
                } else {
                  await givingHandoffUseCases.markHandedOver().execute(h.handoffId);
                }
              })
            }
          >
            <Text style={styles.btnText}>
              {detail.worldSlug === 'rides'
                ? t('givingHandoff.completeTrip')
                : detail.worldSlug === 'knowledge'
                  ? t('givingHandoff.completeSession')
                  : t('givingHandoff.markHandedOver')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            disabled={busy}
            onPress={() => run(async () => { await givingHandoffUseCases.cancel().execute(h.handoffId); })}
          >
            <Text style={[styles.btnText, styles.btnTextSecondary]}>{t('givingHandoff.cancel')}</Text>
          </Pressable>
        </>
      ) : null}

      {h?.status === 'handed_over' && (isOwner || isRecipient) ? (
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await givingHandoffUseCases.rate().execute(h.handoffId, star);
                  alert(t('givingHandoff.ratingThanks'));
                })
              }
            >
              <Text style={typography.h2}>★</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
