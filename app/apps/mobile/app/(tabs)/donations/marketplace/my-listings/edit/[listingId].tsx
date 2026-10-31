import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography, Text, TextInput } from '@kc/ui';
import { Screen } from '../../../../../../src/components/ui/Screen';
import { marketplaceRepository } from '../../../../../../src/services/marketplaceComposition';
import { useInvalidateMyListings } from '../../../../../../src/hooks/useMyMarketplaceListings';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  label: { ...typography.caption, color: colors.textSecondary },
  input: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    ...typography.body,
  },
  btn: { padding: spacing.md, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' as const },
  btnText: { ...typography.body, color: colors.textInverse, fontWeight: '600' as const },
}));

export default function EditMyListingScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const invalidate = useInvalidateMyListings();
  const [saving, setSaving] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['marketplace', 'detail', listingId],
    queryFn: () => marketplaceRepository().getListingDetail(listingId!),
    enabled: Boolean(listingId),
  });

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  React.useEffect(() => {
    if (!detailQuery.data) return;
    setTitle(detailQuery.data.title);
    setSummary(detailQuery.data.summary ?? '');
  }, [detailQuery.data?.listingId]);

  if (detailQuery.isLoading) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  if (!detailQuery.data) {
    return (
      <Screen>
        <Text style={{ padding: spacing.lg }}>{t('marketplace.notFound')}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.label}>{t('marketplace.fieldTitle')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        <Text style={styles.label}>{t('marketplace.fieldSummary')}</Text>
        <TextInput
          style={[styles.input, { minHeight: 100 }]}
          value={summary}
          onChangeText={setSummary}
          multiline
        />
        <Pressable
          style={styles.btn}
          disabled={saving || title.trim().length < 2}
          onPress={async () => {
            setSaving(true);
            try {
              await marketplaceRepository().updateMyListing(listingId!, {
                title: title.trim(),
                summary: summary.trim() || null,
              });
              await invalidate();
              router.back();
            } finally {
              setSaving(false);
            }
          }}
        >
          <Text style={styles.btnText}>{saving ? t('marketplace.publishing') : t('marketplace.myListingsSave')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
