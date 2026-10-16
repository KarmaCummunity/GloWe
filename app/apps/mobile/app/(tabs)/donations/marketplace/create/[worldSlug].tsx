import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../../src/components/ui/Screen';
import {
  getMarketplaceSupabaseClient,
  marketplaceRepository,
} from '../../../../../src/services/marketplaceComposition';

const useStyles = makeUseStyles(({ colors }) => ({
  body: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
  },
  label: { ...typography.caption, color: colors.textSecondary },
  btn: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 12, backgroundColor: colors.primary },
  btnText: { ...typography.body, color: colors.textInverse, textAlign: 'center' as const },
}));

export default function MarketplaceCreateScreen() {
  const { worldSlug } = useLocalSearchParams<{ worldSlug: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const [kindId, setKindId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!worldSlug) return;
    const client = getMarketplaceSupabaseClient();
    void client
      .from('listing_kinds')
      .select('kind_id')
      .eq('world_slug', worldSlug)
      .eq('is_active', true)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setKindId(data?.kind_id ?? null));
  }, [worldSlug]);

  if (!kindId) {
    return (
      <Screen>
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={typography.h2}>{t('marketplace.createTitle', { world: worldSlug })}</Text>
        <Text style={styles.label}>{t('marketplace.fieldTitle')}</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />
        <Text style={styles.label}>{t('marketplace.fieldSummary')}</Text>
        <TextInput style={styles.input} value={summary} onChangeText={setSummary} multiline />
        <Pressable
          style={styles.btn}
          disabled={busy || title.trim().length < 2}
          onPress={async () => {
            setBusy(true);
            try {
              const id = await marketplaceRepository().createListing({
                kindId,
                title: title.trim(),
                summary: summary.trim() || null,
                details: {},
              });
              router.replace(`/(tabs)/donations/marketplace/${id}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Text style={styles.btnText}>{busy ? t('marketplace.publishing') : t('marketplace.publish')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
