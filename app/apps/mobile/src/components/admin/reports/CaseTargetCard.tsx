// app/apps/mobile/src/components/admin/reports/CaseTargetCard.tsx
// V2-ADMIN-REPORTS-4 — friendly target preview for the case-detail screen.
//
// Replaces the previous `Object.entries(target).map(...)` raw dump (which
// exposed snake-case keys to admins) with a typed render per target type:
//
//   post → preview snippet + status badge + "Open post" quick-link
//   user → display name + account-status badge + "Open profile" quick-link
//   chat → hidden/active label (no link — chats are private; we link to
//          the reporter side from the reporter list instead)
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminReportTargetType } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface CaseTargetCardProps {
  readonly targetType: AdminReportTargetType;
  readonly targetId: string;
  readonly target: Readonly<Record<string, unknown>>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function fmtIso(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('he-IL');
}

export function CaseTargetCard({ targetType, targetId, target }: CaseTargetCardProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const t = L.admin.caseDetail.targetCard;

  if (targetType === 'post') {
    const preview  = asString(target['preview']);
    const status   = asString(target['status']);
    const authorId = asString(target['author_id']);
    const created  = fmtIso(asString(target['created_at']));
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.kind}>{t.postKind}</Text>
          {status && <Badge label={status} />}
        </View>
        <Text style={styles.preview} numberOfLines={4}>
          {preview && preview.length > 0 ? preview : t.noPreview}
        </Text>
        <View style={styles.metaRow}>
          {authorId && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/user/${authorId}` as never)}
            >
              <Text style={styles.link}>{t.openAuthor}</Text>
            </Pressable>
          )}
          {created && <Text style={styles.metaText}>{t.createdAt(created)}</Text>}
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryBtn}
          onPress={() => router.push(`/post/${targetId}` as never)}
        >
          <Text style={styles.primaryBtnText}>{t.openPost}</Text>
        </Pressable>
      </View>
    );
  }

  if (targetType === 'listing') {
    const title = asString(target['title']);
    const summary = asString(target['summary']);
    const status = asString(target['status']);
    const ownerId = asString(target['owner_id']);
    const worldSlug = asString(target['world_slug']);
    const kindSlug = asString(target['kind_slug']);
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.kind}>{t.listingKind}</Text>
          {status && <Badge label={status} />}
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {title ?? t.noPreview}
        </Text>
        {summary ? (
          <Text style={styles.metaText} numberOfLines={3}>
            {summary}
          </Text>
        ) : null}
        {(worldSlug || kindSlug) && (
          <Text style={styles.metaText}>
            {[worldSlug, kindSlug].filter(Boolean).join(' · ')}
          </Text>
        )}
        {ownerId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/user/${ownerId}` as never)}
          >
            <Text style={styles.link}>{t.openOwner}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={styles.primaryBtn}
          onPress={() => router.push(`/(tabs)/donations/marketplace/${targetId}` as never)}
        >
          <Text style={styles.primaryBtnText}>{t.openListing}</Text>
        </Pressable>
      </View>
    );
  }

  if (targetType === 'user') {
    const displayName = asString(target['display_name']);
    const status      = asString(target['status']);
    const created     = fmtIso(asString(target['created_at']));
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.kind}>{t.userKind}</Text>
          {status && <Badge label={status} />}
        </View>
        <Text style={styles.preview}>{displayName ?? t.unnamedUser}</Text>
        {created && <Text style={styles.metaText}>{t.signedUpAt(created)}</Text>}
        <Pressable
          accessibilityRole="button"
          style={styles.primaryBtn}
          onPress={() => router.push(`/user/${targetId}` as never)}
        >
          <Text style={styles.primaryBtnText}>{t.openProfile}</Text>
        </Pressable>
      </View>
    );
  }

  // chat
  const removedAt = fmtIso(asString(target['removed_at']));
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.kind}>{t.chatKind}</Text>
        <Badge label={removedAt ? t.chatRemoved : t.chatActive} />
      </View>
      <Text style={styles.metaText}>
        {removedAt ? t.removedAt(removedAt) : t.chatNoLink}
      </Text>
    </View>
  );
}

function Badge({ label }: { readonly label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  card: {
    padding: 14, gap: 10, borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  kind:         { fontSize: 12, fontWeight: '700', opacity: 0.6 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.secondaryLight },
  badgeText:    { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
  preview:      { fontSize: 14, lineHeight: 20 },
  metaRow:      { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  metaText:     { fontSize: 12, opacity: 0.65 },
  link:         { fontSize: 12, color: colors.primary, textDecorationLine: 'underline' },
  primaryBtn:   { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
  primaryBtnText: { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
}));
