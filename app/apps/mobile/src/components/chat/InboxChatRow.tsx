// Single inbox row — FR-CHAT-001, FR-CHAT-016.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { ChatWithPreview } from '@kc/application';
import { makeUseStyles, typography, spacing, useTheme } from '@kc/ui';
import { AvatarInitials } from '../AvatarInitials';
import { OnlineDot } from './OnlineDot';
import { formatRelativeChatTime } from '../../lib/formatRelativeChatTime';
import { formatInboxPreview } from '../../lib/formatInboxPreview';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';
interface Props {
  readonly item: ChatWithPreview;
  readonly onOpen: (chatId: string) => void;
  readonly onRequestHide: (chatId: string, otherUserId: string | null) => void;
}

// Memoized: the inbox KcFlashList re-renders on every search keystroke and
// refresh, but each row only depends on its own `item` and stable parent
// callbacks — without memo every row re-rendered on each keystroke.
function InboxChatRowInner({ item, onOpen, onRequestHide }: Props) {
  const { t } = useTranslation();
  const styles = useInboxChatRowStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.chatRow}>
      <TouchableOpacity style={styles.chatRowMain} onPress={() => onOpen(item.chatId)}>
        <View>
          <AvatarInitials
            name={item.otherParticipant.displayName ?? t('common.deletedUser')}
            avatarUrl={item.otherParticipant.avatarUrl}
            size={48}
          />
          <OnlineDot userId={item.otherParticipant.isDeleted ? null : item.otherParticipant.userId} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTime}>
              {formatRelativeChatTime(item.lastMessage?.createdAt ?? item.lastMessageAt)}
            </Text>
            <Text style={styles.chatName}>{item.otherParticipant.displayName ?? t('common.deletedUser')}</Text>
          </View>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {formatInboxPreview(item.lastMessage, t)}
          </Text>
        </View>
      </TouchableOpacity>
      {item.unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.unreadCount > 9 ? '9+' : String(item.unreadCount)}
          </Text>
        </View>
      ) : (
        <View style={{ width: 22 }} />
      )}
      <Pressable
        onPress={() => onRequestHide(item.chatId, item.otherParticipant.userId)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={t('chat.hideChatA11y')}
        android_ripple={null}
        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export const InboxChatRow = React.memo(InboxChatRowInner);

const useInboxChatRowStyles = makeUseStyles(({ colors }) => ({
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  chatRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chatInfo: { flex: 1, gap: 4 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: {
    ...typography.body,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
  },
  chatTime: { ...typography.caption, color: colors.textSecondary },
  chatPreview: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { ...typography.caption, color: colors.textInverse, fontSize: 11, fontWeight: '600' as const },
}));

export function InboxChatRowSeparator() {
  const styles = useInboxChatRowSeparatorStyles();
  return <View style={styles.line} />;
}

const useInboxChatRowSeparatorStyles = makeUseStyles(({ colors }) => ({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginRight: spacing.base },
}));