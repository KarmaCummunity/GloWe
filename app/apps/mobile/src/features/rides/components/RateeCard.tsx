// FR-RIDE-037 — single ratee card used by RateRideScreen.
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, spacing, typography, useTheme } from '@kc/ui';

import { AvatarInitials } from '../../../components/AvatarInitials';
import { rtlTextAlignStart } from '../../../lib/rtlTextAlignStart';
import { rowDirectionStart } from '../../../lib/rtlLayout';
import { getUserRepo } from '../../../services/userComposition';
import { getSubmitRideRatingUseCase } from '../composition/ridesComposition';

export interface RateeTarget {
  readonly userId: string;
  readonly role: 'owner' | 'rider';
}

interface Props {
  readonly rideId: string;
  readonly target: RateeTarget;
  readonly alreadyRated: boolean;
  readonly onSubmitted: () => void;
}

export function RateeCard({ rideId, target, alreadyRated, onSubmitted }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();

  const userQuery = useQuery({
    queryKey: ['user', target.userId],
    queryFn: () => getUserRepo().findById(target.userId),
    staleTime: 60_000,
  });
  const name = userQuery.data?.displayName ?? t('profile.fallbackName');

  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5 | 0>(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) {
      Alert.alert(t('donations.rides.rate.pickStars'));
      return;
    }
    setBusy(true);
    try {
      await getSubmitRideRatingUseCase().execute({
        rideId,
        rateeId: target.userId,
        stars: stars as 1 | 2 | 3 | 4 | 5,
        comment: comment.trim() || null,
      });
      onSubmitted();
    } catch (err) {
      Alert.alert(t('donations.rides.rate.errorSubmit'), (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (alreadyRated) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <AvatarInitials name={name} avatarUrl={userQuery.data?.avatarUrl ?? null} size={36} />
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.role}>
              {target.role === 'owner'
                ? t('donations.rides.rate.roleOwner')
                : t('donations.rides.rate.roleRider')}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
        <Text style={styles.submittedText}>{t('donations.rides.rate.alreadySubmitted')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AvatarInitials name={name} avatarUrl={userQuery.data?.avatarUrl ?? null} size={36} />
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>
            {target.role === 'owner'
              ? t('donations.rides.rate.roleOwner')
              : t('donations.rides.rate.roleRider')}
          </Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setStars(n as 1 | 2 | 3 | 4 | 5)}
            accessibilityRole="button"
            accessibilityLabel={`${n} ⭐`}
            hitSlop={6}
          >
            <Ionicons
              name={n <= stars ? 'star' : 'star-outline'}
              size={32}
              color={n <= stars ? colors.warning : colors.textDisabled}
            />
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={setComment}
        placeholder={t('donations.rides.rate.commentPlaceholder')}
        placeholderTextColor={colors.textDisabled}
        multiline
        maxLength={300}
        textAlign="right"
        numberOfLines={3}
      />

      <Pressable
        style={[styles.submitBtn, (busy || stars === 0) && styles.btnDisabled]}
        onPress={() => void handleSubmit()}
        disabled={busy || stars === 0}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.submitBtnText}>{t('donations.rides.rate.submit')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: rowDirectionStart,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  nameBlock: { flex: 1 },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '700' as const },
  role: { ...typography.caption, color: colors.textSecondary },
  starsRow: {
    flexDirection: rowDirectionStart,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  commentInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceCream,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    minHeight: 80,
    textAlign: rtlTextAlignStart,
    textAlignVertical: 'top' as const,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center' as const,
  },
  submitBtnText: { ...typography.body, color: colors.textInverse, fontWeight: '700' as const },
  btnDisabled: { opacity: 0.55 },
  submittedText: { ...typography.caption, color: colors.success, textAlign: 'center' as const },
}));
