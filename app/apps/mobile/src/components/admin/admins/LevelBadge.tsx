// app/apps/mobile/src/components/admin/admins/LevelBadge.tsx
// FR-ADMIN-025 — depth-from-root badge shown on every org-tree node.
import { View } from 'react-native';
import { makeUseStyles, Text } from '@kc/ui';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface LevelBadgeProps {
  readonly level: number;
}

export function LevelBadge({ level }: LevelBadgeProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{L.admin.admins.tree.levelBadge(level)}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  badge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  text: { fontSize: 10, fontWeight: '800', color: colors.primary },
}));
