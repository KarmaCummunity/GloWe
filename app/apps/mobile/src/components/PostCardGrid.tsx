// app/apps/mobile/src/components/PostCardGrid.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { he as dateFnsHe } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing } from '@kc/ui';
import type { PostWithOwner } from '@kc/application';
import type { IdentityRoleForViewedProfile } from '@kc/domain';
import { TranslatableText, type TranslatableStatus } from './TranslatableText';
import { PROFILE_GRID_COLUMNS, usePostGridCardWidth } from '../hooks/useShellContentWidth';
import { postOwnerDisplayLabel } from '../lib/postOwnerDisplayLabel';
import { getSupabasePublicImageUrl, getSupabaseFeedImageUrl } from '../lib/imageUrl';
import { AvatarInitials } from './AvatarInitials';
import { PostMenuButton } from './post/PostMenuButton';
import { KCImage } from './ui/KCImage';
import { usePostCardGridStyles } from './PostCardGrid.styles';
import { finishMark } from '../lib/observability/perfMarks';
import { cleanDisplayTitle } from '../lib/displayTitle';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const CATEGORY_ICON: Record<string, IoniconName> = {
  Furniture: 'bed-outline',
  Clothing: 'shirt-outline',
  Books: 'book-outline',
  Toys: 'game-controller-outline',
  BabyGear: 'happy-outline',
  Kitchen: 'restaurant-outline',
  Sports: 'football-outline',
  Electronics: 'phone-portrait-outline',
  Tools: 'construct-outline',
}

const OWNER_AVATAR_SIZE = 24;
const OVERLAY_ICON = '#FFFFFF';

interface PostCardGridProps {
  post: PostWithOwner;
  onPressOverride?: () => void;
  /** Per-post press handler — receives the full post so the parent avoids per-item closures. */
  onCardPress?: (post: PostWithOwner) => void;
  /** Grid density — home feed uses 2; profile grids use 3. */
  columns?: 2 | 3;
  gap?: number;
  /** Closed-posts tab: economic-role badge (giver/receiver). */
  identityRole?: IdentityRoleForViewedProfile;
  /** Forwarded to post detail for D-31 identity projection on closed-posts grids. */
  closedPostsProfileUserId?: string;
  /** FR-TRANSLATE-003 — reader-language translated fields (feed viewport-gated). */
  translatedFields?: { title?: string; description?: string };
  /** FR-TRANSLATE-003 — per-field translation status; defaults to 'source'. */
  titleStatus?: TranslatableStatus;
  descriptionStatus?: TranslatableStatus;
}

function PostCardGridInner({
  post,
  onPressOverride,
  onCardPress,
  columns = 2,
  gap = spacing.sm,
  identityRole,
  closedPostsProfileUserId,
  translatedFields,
  titleStatus,
  // descriptionStatus is accepted for the card contract but the grid card
  // renders only the title; description is translated for post-detail reuse.
}: PostCardGridProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = usePostCardGridStyles();
  const cardWidth = usePostGridCardWidth(columns, gap);
  const isProfileGrid = columns === PROFILE_GRID_COLUMNS;
  const isGive = post.type === 'Give';

  const timeAgo = React.useMemo(
    () => formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: dateFnsHe }),
    [post.createdAt],
  );

  const locationText = post.locationDisplayLevel === 'CityOnly'
    ? post.address.cityName
    : `${post.address.cityName}, ${post.address.street}`;

  const firstImagePath = post.mediaAssets[0]?.path ?? null;
  // PERF-4: serve the 400px thumb for the grid surface (~25-40KB vs ~300-500KB
  // for the 2048px full). KCImage falls back to the full URL if the thumb is
  // missing (e.g., for posts uploaded before the thumb pipeline shipped — the
  // backfill Edge Function eventually fills these in).
  const thumbUrl = React.useMemo(
    () => firstImagePath
      ? getSupabaseFeedImageUrl('post-images', firstImagePath, cardWidth)
      : null,
    [firstImagePath, cardWidth],
  );
  const fullUrl = React.useMemo(
    () => firstImagePath
      ? getSupabasePublicImageUrl({ bucket: 'post-images', path: firstImagePath })
      : null,
    [firstImagePath],
  );

  const ownerLabel = postOwnerDisplayLabel(post, t);
  const placeholderBg = isGive ? colors.primarySurface : `${colors.secondary}18`;
  const economicRole = identityRole ? deriveEconomicRole(post.type, identityRole) : null;

  const onImageLoadOnce = React.useCallback(() => {
    finishMark('image.first_paint');
  }, []);

  const navigateToPost = React.useCallback(() => {
    if (onCardPress) {
      onCardPress(post);
      return;
    }
    if (onPressOverride) {
      onPressOverride();
      return;
    }
    const q =
      closedPostsProfileUserId != null
        ? `?fromProfile=${encodeURIComponent(closedPostsProfileUserId)}`
        : '';
    router.push(`/post/${post.postId}${q}` as never);
  }, [onCardPress, onPressOverride, post, closedPostsProfileUserId, router]);

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      activeOpacity={0.86}
      onPress={navigateToPost}
    >
      <View style={[styles.imageArea, { height: cardWidth * 0.78, backgroundColor: placeholderBg }]}>
        {thumbUrl ? (
          <KCImage uri={thumbUrl} fallbackUri={fullUrl} style={styles.image} contentFit="cover" onLoad={onImageLoadOnce} />
        ) : (
          <View style={styles.placeholderTint}>
            <Ionicons
              name={CATEGORY_ICON[post.category] ?? (isGive ? 'gift-outline' : 'hand-left-outline')}
              size={isProfileGrid ? 28 : 40}
              color={isGive ? colors.giveTag : colors.secondary}
            />
          </View>
        )}

        <View style={[styles.typePill, isProfileGrid && styles.typePillDense]}>
          <Text
            style={[
              styles.typePillText,
              isGive ? styles.givePillText : styles.requestPillText,
              isProfileGrid && styles.typePillTextDense,
            ]}
          >
            {isGive ? t('feed.giveTypeShort') : t('feed.requestTypeShort')}
          </Text>
        </View>

        {economicRole ? (
          <View style={[styles.roleBadge, isProfileGrid && styles.roleBadgeDense]}>
            <Text style={[styles.roleBadgeText, isProfileGrid && styles.roleBadgeTextDense]}>
              {economicRole === 'giver' ? t('feed.giverBadge') : t('feed.receiverBadge')}
            </Text>
          </View>
        ) : null}

        <View
          style={[styles.menuOverlay, isProfileGrid && styles.menuOverlayDense]}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => e.stopPropagation()}
        >
          <PostMenuButton
            post={post}
            iconColor={OVERLAY_ICON}
            overlaySize={isProfileGrid ? 'compact' : 'default'}
          />
        </View>
      </View>

      <View style={styles.content}>
        {!isProfileGrid ? (
          <View style={styles.authorRow} accessibilityLabel={ownerLabel}>
            <AvatarInitials
              name={ownerLabel}
              avatarUrl={post.ownerAvatarUrl}
              size={OWNER_AVATAR_SIZE}
            />
            <Text style={styles.ownerName} numberOfLines={1}>{ownerLabel}</Text>
          </View>
        ) : null}

        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <TranslatableText
              source={cleanDisplayTitle(post.title)}
              translated={translatedFields?.title}
              status={titleStatus ?? 'source'}
              numberOfLines={2}
              style={[styles.title, isProfileGrid && styles.titleDense]}
              indicatorStyle={styles.translatingIndicator}
            />
          </View>
          <View style={[styles.categoryChip, isProfileGrid && styles.categoryChipDense]}>
            <Text
              style={[styles.categoryChipText, isProfileGrid && styles.categoryChipTextDense]}
              numberOfLines={1}
            >
              {t(`post.category.${post.category}`)}
            </Text>
          </View>
        </View>

        <View style={styles.metaFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
          </View>
          <Text style={styles.timeAgo} numberOfLines={1}>{timeAgo}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const PostCardGrid = React.memo(PostCardGridInner);

function deriveEconomicRole(
  postType: PostWithOwner['type'],
  identityRole: IdentityRoleForViewedProfile,
): 'giver' | 'receiver' {
  if (identityRole === 'publisher') return postType === 'Give' ? 'giver' : 'receiver';
  return postType === 'Give' ? 'receiver' : 'giver';
}
