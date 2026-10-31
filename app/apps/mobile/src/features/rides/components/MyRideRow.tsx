// FR-RIDE-024 — single ride row on the driver dashboard.
// Renders ride summary + pending-count badge + inline expand of pending
// participants with approve/reject CTAs + an overflow menu (close/cancel).
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import type { RideListingRow } from '@kc/application';
import { useTheme, Text } from '@kc/ui';

import { Card } from '../../../components/ui/Card';
import { useRideParticipants } from '../hooks/useRideParticipants';
import {
  getCloseRideListingUseCase,
  getDecideRideJoinUseCase,
} from '../composition/ridesComposition';
import { PendingRequestRow } from './PendingRequestRow';
import { useMyRideRowStyles } from './myRideRow.styles';

interface Props {
  readonly ride: RideListingRow;
  /** When true, attaches participants subscription + actions; off for past rides. */
  readonly activeRow?: boolean;
}

export function MyRideRow({ ride, activeRow = true }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMyRideRowStyles();
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(false);
  const [actionRunning, setActionRunning] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const participants = useRideParticipants(ride.rideId, activeRow);
  const pendingCount = participants.pending.length;
  const approvedCount = participants.approved.length;

  const departsLabel = format(new Date(ride.departsAt), 'EEEE dd/MM HH:mm', { locale: dateFnsHe });
  const isOffer = ride.mode === 'offer';

  const decide = async (participantId: string, status: 'approved' | 'rejected') => {
    setActionRunning(participantId + ':' + status);
    try {
      await getDecideRideJoinUseCase().execute({ participantId, status });
      await participants.refetch();
      await queryClient.invalidateQueries({ queryKey: ['rides', 'my-rides'] });
    } finally {
      setActionRunning(null);
    }
  };

  const closeRide = async (next: 'closed' | 'cancelled') => {
    setActionRunning(next);
    try {
      await getCloseRideListingUseCase().execute({
        rideId: ride.rideId,
        ownerId: ride.ownerId,
        status: next,
      });
      await queryClient.invalidateQueries({ queryKey: ['rides', 'my-rides'] });
      await queryClient.invalidateQueries({ queryKey: ['rides', 'feed'] });
    } finally {
      setActionRunning(null);
      setMenuOpen(false);
    }
  };

  const statusPill = (() => {
    if (ride.status === 'open')
      return { key: 'donations.rides.status.open', tint: colors.giveTag, bg: colors.giveTagBg };
    if (ride.status === 'closed')
      return { key: 'donations.rides.status.closed', tint: colors.textSecondary, bg: colors.skeleton };
    if (ride.status === 'cancelled')
      return { key: 'donations.rides.status.cancelled', tint: colors.error, bg: colors.errorLight };
    return { key: 'donations.rides.status.expired', tint: colors.textSecondary, bg: colors.skeleton };
  })();

  return (
    <Card padding="base" style={styles.card}>
      <Pressable
        onPress={() =>
          router.push(`/(tabs)/donations/rides/${ride.rideId}`)
        }
        accessibilityRole="button"
        accessibilityLabel={ride.title}
        style={styles.headerBlock}
      >
        <View style={styles.topRow}>
          <View style={[styles.pill, { backgroundColor: statusPill.bg }]}>
            <Text style={[styles.pillText, { color: statusPill.tint }]}>{t(statusPill.key)}</Text>
          </View>
          <Text style={styles.timeText}>{departsLabel}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {ride.title}
        </Text>
        <Text style={styles.route} numberOfLines={1}>
          {ride.originCityName} → {ride.destCityName}
        </Text>
      </Pressable>

      {activeRow ? (
        <View style={styles.metaRow}>
          {isOffer && ride.seatsAvailable != null ? (
            <Text style={styles.metaText}>
              {t('donations.rides.dashboard.seats', {
                approved: approvedCount,
                total: ride.seatsAvailable,
              })}
            </Text>
          ) : null}

          {pendingCount > 0 ? (
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              accessibilityRole="button"
              style={styles.pendingChip}
            >
              <Ionicons name="time-outline" size={14} color={colors.textInverse} />
              <Text style={styles.pendingChipText}>
                {t('donations.rides.dashboard.pending', { count: pendingCount })}
              </Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textInverse}
              />
            </Pressable>
          ) : null}

          <View style={styles.spacer} />

          {ride.status === 'open' ? (
            <Pressable
              onPress={() => setMenuOpen((m) => !m)}
              accessibilityRole="button"
              accessibilityLabel={t('general.more')}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {menuOpen ? (
        <View style={styles.menu}>
          <Pressable
            style={styles.menuItem}
            onPress={() => void closeRide('closed')}
            disabled={actionRunning !== null}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.menuItemText}>{t('donations.rides.dashboard.close')}</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => void closeRide('cancelled')}
            disabled={actionRunning !== null}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.menuItemText, { color: colors.error }]}>
              {t('donations.rides.dashboard.cancel')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {expanded && pendingCount > 0 ? (
        <View style={styles.expanded}>
          {participants.pending.map((p) => (
            <PendingRequestRow
              key={p.participantId}
              participantId={p.participantId}
              userId={p.userId}
              note={p.note}
              busy={actionRunning?.startsWith(p.participantId) ?? false}
              onApprove={() => void decide(p.participantId, 'approved')}
              onReject={() => void decide(p.participantId, 'rejected')}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
