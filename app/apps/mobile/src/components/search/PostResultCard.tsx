// FR-FEED-017 — post result card for universal search.
import { Pressable, Text, View } from 'react-native';
import { KCImage } from '../ui/KCImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@kc/ui';
import { getSupabaseClient } from '@kc/infrastructure-supabase';
import type { PostWithOwner } from '@kc/application';
import { postOwnerDisplayLabel } from '../../lib/postOwnerDisplayLabel';
import { useSearchResultCardStyles } from './searchResultCard.styles';

const STORAGE_BUCKET = 'post-images';
function getPostImageUrl(path: string): string {
  return getSupabaseClient().storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function PostResultCard({ post }: { post: PostWithOwner }) {
  const styles = useSearchResultCardStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const isGive = post.type === 'Give';
  const firstImageUrl = post.mediaAssets.length > 0 ? getPostImageUrl(post.mediaAssets[0].path) : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/post/${post.postId}`)}
      accessibilityRole="button"
      accessibilityLabel={post.title}
    >
      {firstImageUrl ? (
        <KCImage uri={firstImageUrl} style={styles.postThumb} contentFit="cover" />
      ) : (
        <View style={[styles.postThumb, styles.postThumbPlaceholder]}>
          <Ionicons
            name={isGive ? 'gift-outline' : 'search-outline'}
            size={24}
            color={isGive ? colors.giveTag : colors.requestTag}
          />
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.postTitleRow}>
          <View style={[styles.typeTag, { backgroundColor: isGive ? colors.giveTagBg : colors.requestTagBg }]}>
            <Text style={[styles.typeTagText, { color: isGive ? colors.giveTag : colors.requestTag }]}>
              {isGive ? t('search.giveBadge') : t('search.requestBadge')}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{post.title}</Text>
        {post.description ? <Text style={styles.cardSubtitle} numberOfLines={2}>{post.description}</Text> : null}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>{postOwnerDisplayLabel(post, t)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.metaText}>{post.address.cityName}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-back" size={20} color={colors.textDisabled} />
    </Pressable>
  );
}
