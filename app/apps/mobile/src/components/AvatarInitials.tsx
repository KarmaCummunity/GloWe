import React from 'react';
import { View, Text } from 'react-native';
import { makeUseStyles, typography, radius, useTheme } from '@kc/ui';
import {
  getSupabasePublicImageUrl,
  getSupabaseImageThumbUrl,
  deriveThumbUrl,
} from '../lib/imageUrl';
import { KCImage } from './ui/KCImage';

interface AvatarInitialsProps {
  name: string;
  avatarUrl: string | null;
  size?: number;
}

const AVATAR_COLORS = [
  '#F97316', '#6366F1', '#22C55E', '#EC4899',
  '#14B8A6', '#F59E0B', '#8B5CF6', '#3B82F6',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

function AvatarInitialsInner({ name, avatarUrl, size = 40 }: AvatarInitialsProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');

  const bgColor = getAvatarColor(name);

  // PERF-4: chrome avatars (≤96px) get the 96px thumb. KCImage's `fallbackUri`
  // covers the transition window — old avatars without a thumb fall back to the
  // full image until the backfill pass writes the thumb. Google OAuth URLs are
  // already small and pass through `deriveThumbUrl` unchanged.
  const { primaryUrl, fallbackUrl } = React.useMemo(() => {
    if (!avatarUrl) return { primaryUrl: null, fallbackUrl: null };
    if (avatarUrl.startsWith('http')) {
      return { primaryUrl: deriveThumbUrl(avatarUrl), fallbackUrl: avatarUrl };
    }
    return {
      primaryUrl: getSupabaseImageThumbUrl({ bucket: 'avatars', path: avatarUrl }),
      fallbackUrl: getSupabasePublicImageUrl({ bucket: 'avatars', path: avatarUrl }),
    };
  }, [avatarUrl]);

  if (primaryUrl) {
    return (
      <KCImage
        uri={primaryUrl}
        fallbackUri={fallbackUrl}
        width={size}
        height={size}
        style={[styles.avatar, { borderRadius: size / 2 }]}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export const AvatarInitials = React.memo(AvatarInitialsInner);

const useStyles = makeUseStyles(({ colors, isDark }) => ({
  /** No outer margin — parents use `gap` / padding so fixed-size clips (e.g. search cards) stay circular on iOS. */
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.textInverse,
    fontWeight: '700',
    textAlign: 'center',
  },
}));
