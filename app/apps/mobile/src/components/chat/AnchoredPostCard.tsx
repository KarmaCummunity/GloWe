// FR-CHAT-014 + FR-CHAT-015 — sticky anchored-post card; ClosureSheet + explainer render here for chat-initiated closure.
import { useEffect, useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { makeUseStyles, radius, shadow, spacing, typography, useTheme } from '@kc/ui';
import type { GestureResponderEvent } from 'react-native';
import type { PostType } from '@kc/domain';
import { getPostByIdUseCase } from '../../services/postsComposition';
import { getUserRepo } from '../../services/userComposition';
import { useChatStore } from '../../store/chatStore';
import { useClosureStore } from '../../store/closureStore';
import { ClosureSheet } from '../closure/ClosureSheet';
import { ClosureExplainerSheet } from '../closure/ClosureExplainerSheet';
import { invalidatePersonalStatsCaches } from '../../lib/invalidatePersonalStatsCaches';
import { invalidateMyProfilePostQueries } from '../../lib/invalidateMyProfilePostQueries';
import { AnchoredPostCardPreview } from './AnchoredPostCardPreview';
import { rowDirectionStart } from '../../lib/rtlLayout';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

interface Props {
  chatId: string;
  anchorPostId: string | null;
  viewerId: string;
  /** Null when the counterpart has deleted their account (FK SET NULL since migration 0028). */
  counterpartId: string | null;
}

const TYPE_LABEL_KEYS: Record<PostType, string> = {
  Give: 'chat.anchoredTypeGive',
  Request: 'chat.anchoredTypeRequest',
};

export function AnchoredPostCard({ chatId, anchorPostId, viewerId, counterpartId }: Props) {
  const { t } = useTranslation();
  const styles = useAnchoredPostCardStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const startClosure = useClosureStore((s) => s.start);
  const closureStep = useClosureStore((s) => s.step);
  const closureInitiator = useClosureStore((s) => s.initiator);
  const resetClosure = useClosureStore((s) => s.reset);
  const messages = useChatStore((s) => s.threads[chatId]);

  const query = useQuery({
    queryKey: ['post', anchorPostId, viewerId],
    queryFn: () => getPostByIdUseCase().execute({ postId: anchorPostId!, viewerId }),
    enabled: Boolean(anchorPostId),
    staleTime: 60_000, // PERF-3: chat anchored post — closure event invalidates explicitly
  });

  // FR-CHAT-014 AC7 — counterpart contact phone via chat-scoped RPC (TD-163).
  const counterpartPhoneQuery = useQuery({
    queryKey: ['chat-counterparty-contact', chatId],
    queryFn: () => getUserRepo().getChatCounterpartyContact(chatId),
    enabled: Boolean(counterpartId),
    staleTime: 60_000,
  });
  const counterpartPhone = counterpartPhoneQuery.data ?? null;

  // When a `post_closed` system message lands in this chat, invalidate the
  // post query so the card hides — but only when there is no active closure
  // in progress (mid-closure the query will be invalidated by the done handler
  // below, after the explainer sheet is dismissed).
  const sawPostClosedSysMsg = useMemo(() => {
    if (!messages || !anchorPostId) return false;
    return messages.some(
      (m) =>
        m.kind === 'system' &&
        m.systemPayload != null &&
        (m.systemPayload as Record<string, unknown>).kind === 'post_closed' &&
        (m.systemPayload as Record<string, unknown>).post_id === anchorPostId,
    );
  }, [messages, anchorPostId]);

  useEffect(() => {
    if (sawPostClosedSysMsg && closureStep === 'idle') {
      void queryClient.invalidateQueries({ queryKey: ['post', anchorPostId] });
      invalidateMyProfilePostQueries(queryClient, viewerId);
      invalidatePersonalStatsCaches(queryClient, viewerId);
    }
  }, [sawPostClosedSysMsg, closureStep, anchorPostId, viewerId, queryClient]);

  // When closure was initiated from this chat card, handle the done state here.
  // OwnerActionsBar (post-detail context) guards its own handler so it won't
  // fire for chat-initiated closures.
  useEffect(() => {
    if (closureStep === 'done' && closureInitiator === 'chat') {
      resetClosure();
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      invalidateMyProfilePostQueries(queryClient, viewerId);
      void queryClient.invalidateQueries({ queryKey: ['post', anchorPostId] });
      invalidatePersonalStatsCaches(queryClient, viewerId);
    }
  }, [closureStep, closureInitiator, resetClosure, queryClient, anchorPostId, viewerId]);

  const post = query.data?.post ?? null;
  const isOwner = post ? post.ownerId === viewerId : false;

  // FR-CHAT-014 AC3/AC4: hide card when there is no open post. Keep the
  // component mounted (for modals) while a chat-initiated closure is in
  // flight so the ClosureExplainerSheet is not unmounted mid-flow.
  const showCard = Boolean(anchorPostId && post && post.status === 'open');
  const isActiveChatClosure = closureInitiator === 'chat' && closureStep !== 'idle';

  if (!showCard && !isActiveChatClosure) return null;

  const typeLabel = post ? t(TYPE_LABEL_KEYS[post.type]) : '';
  const isGive = post?.type === 'Give';
  const ctaText = post?.type === 'Give' ? t('closure.markGiveCta') : t('closure.markRequestCta');

  const openPost = () => {
    if (!post) return;
    router.push({ pathname: '/post/[id]', params: { id: post.postId } });
  };

  const handleCall = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (!counterpartPhone) return;
    void Linking.openURL(`tel:${counterpartPhone}`);
  };

  const handleClose = (e: GestureResponderEvent) => {
    e.stopPropagation();
    if (!post) return;
    void startClosure(post.postId, viewerId, post.type, {
      // Skip preselection when counterpart was deleted — closure picker stays empty.
      ...(counterpartId != null ? { preselectedRecipientId: counterpartId } : {}),
      initiator: 'chat',
    });
  };

  return (
    <>
      {showCard ? (
        <Pressable
          onPress={openPost}
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={t('chat.anchoredOpenA11y')}
        >
          <AnchoredPostCardPreview type={post!.type} mediaPaths={post!.mediaAssets} />
          <View style={styles.body}>
            <View style={styles.typeTagRow}>
              <View style={[styles.typeTag, isGive ? styles.typeTagGive : styles.typeTagReq]}>
                <Text style={[styles.typeTagText, isGive ? styles.typeTagTextGive : styles.typeTagTextReq]}>
                  {typeLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {post!.title}
            </Text>
            {counterpartPhone ? (
              <Pressable
                onPress={handleCall}
                style={styles.phoneRow}
                accessibilityRole="link"
                accessibilityLabel={t('chat.anchoredCallCounterpartA11y', { phone: counterpartPhone })}
                hitSlop={6}
              >
                <Ionicons name="call" size={14} color={colors.primary} />
                <Text style={styles.phoneText} numberOfLines={1}>
                  {counterpartPhone}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {isOwner ? (
            <Pressable
              onPress={handleClose}
              style={styles.cta}
              accessibilityRole="button"
              accessibilityLabel={ctaText}
            >
              <Text style={styles.ctaText}>{ctaText}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      ) : null}
      {(isOwner || isActiveChatClosure) ? (
        <>
          <ClosureSheet />
          <ClosureExplainerSheet />
        </>
      ) : null}
    </>
  );
}

const useAnchoredPostCardStyles = makeUseStyles(({ colors }) => ({
  card: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  body: { flex: 1, gap: 6, minWidth: 0 },
  typeTagRow: { flexDirection: 'row', justifyContent: 'flex-end', width: '100%' },
  typeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  typeTagGive: { backgroundColor: colors.giveTagBg },
  typeTagReq: { backgroundColor: colors.requestTagBg },
  typeTagText: { ...typography.caption, fontWeight: '600' },
  typeTagTextGive: { color: colors.giveTag },
  typeTagTextReq: { color: colors.requestTag },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: rtlTextAlignStart,
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: rowDirectionStart,
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  phoneText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  cta: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  ctaText: { ...typography.button, color: colors.textInverse, fontSize: 14 },
}));
