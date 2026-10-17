import React from 'react';
import { Pressable, Text } from 'react-native';
import { KcFlashList } from '../lists/KcFlashList';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing } from '@kc/ui';
import { Screen } from '../ui/Screen';
import { worldHubBaseStyles } from './worldHubStyles';
import { givingHandoffUseCases } from '../../services/givingHandoffComposition';

const useStyles = makeUseStyles(({ colors }) => worldHubBaseStyles(colors));

/** My handoffs (as owner or recipient) for one giving world. */
export function MyWorldHandoffsList({ worldSlug }: { readonly worldSlug: 'items' | 'food' }) {
  const router = useRouter();
  const styles = useStyles();
  const rows = useQuery({
    queryKey: ['giving-handoffs', worldSlug],
    queryFn: async () => {
      const all = await givingHandoffUseCases.listMine().execute(50);
      return all.filter((r) => r.worldSlug === worldSlug);
    },
  });

  return (
    <Screen blobs="content">
      <KcFlashList
        data={rows.data ?? []}
        keyExtractor={(item) => item.handoffId}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        ListEmptyComponent={<Text style={{ padding: spacing.lg, textAlign: 'center' }}>—</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}` as never)}
          >
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowMeta}>
              {item.status} · {item.role}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
