import React from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { makeUseStyles, spacing, typography } from '@kc/ui';
import { Screen } from '../../../../src/components/ui/Screen';
import { givingHandoffUseCases } from '../../../../src/services/givingHandoffComposition';

const useStyles = makeUseStyles(({ colors }) => ({
  row: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
  },
  title: { ...typography.bodyLarge, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
}));

export default function FoodHandoffsScreen() {
  const router = useRouter();
  const styles = useStyles();
  const rows = useQuery({
    queryKey: ['giving-handoffs', 'food'],
    queryFn: async () => {
      const all = await givingHandoffUseCases.listMine().execute(50);
      return all.filter((r) => r.worldSlug === 'food');
    },
  });

  return (
    <Screen blobs="content">
      <FlatList
        data={rows.data ?? []}
        keyExtractor={(item) => item.handoffId}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        ListEmptyComponent={<Text style={{ padding: spacing.lg, textAlign: 'center' }}>—</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(tabs)/donations/marketplace/${item.listingId}` as never)}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.status} · {item.role}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
