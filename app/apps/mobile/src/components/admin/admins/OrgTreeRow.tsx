// app/apps/mobile/src/components/admin/admins/OrgTreeRow.tsx
// FR-ADMIN-025 — a single, indented node row in the org hierarchy tree.
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OrgTreeNode } from '@kc/domain';
import { makeUseStyles, useTheme, Text } from '@kc/ui';
import { AvatarInitials } from '../../AvatarInitials';
import { RoleBadge } from './RoleBadge';
import { LevelBadge } from './LevelBadge';
import { rowDirectionStart, textAlignStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface OrgTreeRowProps {
  readonly node: OrgTreeNode;
  readonly hasChildren: boolean;
  readonly collapsed: boolean;
  readonly onToggle: (grantId: string) => void;
  readonly onSelect?: (userId: string) => void;
}

export function OrgTreeRow({ node, hasChildren, collapsed, onToggle, onSelect }: OrgTreeRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();
  const { member, level } = node;
  const name = member.displayName ?? L.admin.admins.row.unnamed;

  return (
    <View style={[styles.row, { marginStart: level * 16 }]}>
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => (hasChildren ? onToggle(member.grantId) : undefined)}
        style={styles.chevron}
      >
        {hasChildren && (
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect?.(member.userId)}
        style={styles.body}
      >
        <AvatarInitials name={name} avatarUrl={member.avatarUrl} size={32} />
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <LevelBadge level={level} />
          </View>
          <View style={styles.badges}>
            <RoleBadge role={member.role} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row: {
    flexDirection: rowDirectionStart, alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 8,
  },
  chevron: { width: 20, alignItems: 'center', justifyContent: 'center' },
  body: {
    flex: 1, flexDirection: rowDirectionStart, alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 12, padding: 8,
  },
  texts: { flex: 1, gap: 4 },
  titleRow: { flexDirection: rowDirectionStart, alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign: textAlignStart() },
  badges: { flexDirection: rowDirectionStart, flexWrap: 'wrap', gap: 6 },
}));
