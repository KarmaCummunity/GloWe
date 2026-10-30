// Status pill on post-detail hero — distinguishes open vs closed at a glance.
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PostStatus } from '@kc/domain';
import { makeUseStyles, useTheme, Text } from '@kc/ui';

type Props = Readonly<{
  status: PostStatus;
}>;

export function PostDetailStatusBadge({ status }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();

  if (status === 'open') {
    return (
      <View style={[styles.pill, styles.pillOpen]} accessibilityRole="text">
        <View style={styles.openDot} />
        <Text style={styles.pillTextOpen}>{t('post.detail.statusOpen')}</Text>
      </View>
    );
  }

  if (status === 'closed_delivered') {
    return (
      <View style={[styles.pill, styles.pillClosed]} accessibilityRole="text">
        <Ionicons name="checkmark-circle" size={15} color={colors.success} />
        <Text style={styles.pillTextClosed}>{t('post.detail.statusClosed')}</Text>
      </View>
    );
  }

  if (status === 'deleted_no_recipient') {
    return (
      <View style={[styles.pill, styles.pillPending]} accessibilityRole="text">
        <Ionicons name="time-outline" size={15} color={colors.warning} />
        <Text style={styles.pillTextPending}>{t('post.detail.statusPendingDelete')}</Text>
      </View>
    );
  }

  if (status === 'expired') {
    return (
      <View style={[styles.pill, styles.pillPending]} accessibilityRole="text">
        <Ionicons name="time-outline" size={15} color={colors.warning} />
        <Text style={styles.pillTextPending}>{t('post.detail.statusExpired')}</Text>
      </View>
    );
  }

  if (status === 'removed_admin') {
    return (
      <View style={[styles.pill, styles.pillRemoved]} accessibilityRole="text">
        <Ionicons name="shield-outline" size={15} color={colors.error} />
        <Text style={styles.pillTextRemoved}>{t('post.detail.statusRemovedAdmin')}</Text>
      </View>
    );
  }

  return null;
}

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOpen: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)',
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(249,115,22,0.35)',
  },
  pillClosed: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)',
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(34,197,94,0.4)',
  },
  pillPending: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)',
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.45)',
  },
  pillRemoved: {
    backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)',
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.45)',
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pillTextOpen: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? colors.textPrimary : colors.primaryDark,
  },
  pillTextClosed: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  pillTextPending: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  pillTextRemoved: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
}));
