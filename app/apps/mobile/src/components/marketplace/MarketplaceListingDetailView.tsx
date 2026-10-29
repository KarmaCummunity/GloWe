import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import type { MarketplaceListingDetail } from '@kc/domain';
import { KCImage } from '../ui/KCImage';
import { listingImagePublicUrl } from '../../services/listingImageUpload';
import { marketplaceRepository } from '../../services/marketplaceComposition';
import { useSimilarListings } from '../../hooks/useMarketplaceListingDetail';
import { ReportListingModal } from './ReportListingModal';
import { GivingHandoffActions } from './GivingHandoffActions';
import { RideRouteCard } from './RideRouteCard';
import { isTestListingTitle } from '../../lib/displayTitle';
import { PostDetailHeader } from '../cards/PostDetailHeader';
import { SimilarListingCard } from '../cards/SimilarListingCard';
import { trackCoreLoop } from '../../lib/analyticsCoreLoop';
import { rtlTextAlignStart } from '../../lib/rtlTextAlignStart';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  summary: { ...typography.body, color: colors.textSecondary, textAlign: rtlTextAlignStart },
  ownerCard: {
    flexDirection: 'row' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center' as const,
  },
  ownerName: { ...typography.bodyLarge, color: colors.textPrimary },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  actions: { gap: spacing.sm },
  btn: { padding: spacing.md, borderRadius: 999, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { ...typography.body, color: colors.textPrimary, textAlign: 'center' as const },
  btnTextInverse: { color: colors.textInverse },
  section: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md },
  similarCell: { marginRight: spacing.sm, paddingVertical: spacing.xs },
  galleryImg: { width: 280, height: 180, borderRadius: 12, marginRight: spacing.sm },
}));

interface Props {
  detail: MarketplaceListingDetail;
  bottomInset: number;
}

export function MarketplaceListingDetailView({ detail, bottomInset }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: similarRaw = [] } = useSimilarListings(detail.listingId);
  // Never show automated-test listings ([e2e] / raw ISO timestamp titles) to real users.
  const similar = similarRaw.filter((item) => !isTestListingTitle(item.title));

  const worldLabel = i18n.language.startsWith('he') ? detail.worldLabelHe : detail.worldLabelEn;
  const kindLabel = i18n.language.startsWith('he') ? detail.kindLabelHe : detail.kindLabelEn;

  const share = async () => {
    const url = `${process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'https://karma-community-kc.com'}/donations/marketplace/${detail.listingId}`;
    await Share.share({ message: `${detail.title}\n${url}`, title: detail.title });
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomInset }]}>
        {detail.media.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {detail.media.map((item) => (
              <KCImage
                key={item.storagePath}
                uri={listingImagePublicUrl(item.storagePath)}
                style={styles.galleryImg}
              />
            ))}
          </ScrollView>
        ) : null}
        <PostDetailHeader
          title={detail.title}
          tone={detail.direction === 'request' ? 'request' : 'give'}
          badgeLabel={detail.direction === 'request' ? t('feed.requestTypeShort') : t('feed.giveTypeShort')}
          chip={worldLabel}
        />
        {detail.worldSlug === 'rides' ? <RideRouteCard details={detail.details} direction={detail.direction} /> : null}
        {detail.summary ? <Text style={styles.summary}>{detail.summary}</Text> : null}
        <Text style={styles.summary}>
          {kindLabel}
        </Text>
        {detail.owner ? (
          <Pressable
            style={styles.ownerCard}
            accessibilityRole="button"
            onPress={() => {
              const handle = detail.owner!.shareHandle || detail.owner!.userId;
              router.push(`/user/${handle}`);
            }}
          >
            {detail.owner.avatarUrl ? (
              <KCImage uri={detail.owner.avatarUrl} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
            <View>
              <Text style={styles.ownerName}>{detail.owner.displayName ?? t('marketplace.anonymousOwner')}</Text>
              {detail.owner.shareHandle ? (
                <Text style={styles.summary}>@{detail.owner.shareHandle}</Text>
              ) : null}
            </View>
          </Pressable>
        ) : null}
        <GivingHandoffActions detail={detail} />
        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={async () => {
              const chatId = await marketplaceRepository().startChat(detail.listingId, t('marketplace.chatOpener'));
              trackCoreLoop('chat_started', { world: detail.worldSlug, cityId: detail.cityId });
              router.push(`/chat/${chatId}`);
            }}
          >
            <Text style={[styles.btnText, styles.btnTextInverse]}>{t('marketplace.startChat')}</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => void share()}>
            <Text style={styles.btnText}>{t('marketplace.shareLink')}</Text>
          </Pressable>
          <Pressable
            style={styles.btn}
            onPress={async () => {
              const postId = await marketplaceRepository().shareToFeed(detail.listingId);
              router.push(`/post/${postId}`);
            }}
          >
            <Text style={styles.btnText}>{t('marketplace.shareFeed')}</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => setReportOpen(true)}>
            <Text style={styles.btnText}>{t('marketplace.report')}</Text>
          </Pressable>
        </View>
        {similar.length > 0 ? (
          <>
            <Text style={styles.section}>{t('marketplace.similarTitle')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {similar.map((item) => (
                <View key={item.listingId} style={styles.similarCell}>
                  <SimilarListingCard
                    item={item}
                    onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
      <ReportListingModal listingId={detail.listingId} visible={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}
