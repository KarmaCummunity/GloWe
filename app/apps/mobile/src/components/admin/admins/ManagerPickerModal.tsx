// app/apps/mobile/src/components/admin/admins/ManagerPickerModal.tsx
// FR-ADMIN-025 — pick a direct manager for a grant from the same org (or detach
// to a tree root). Cycle/scope rules are enforced server-side; this list only
// excludes the grant itself.
import { Modal, Pressable } from 'react-native';
import type { OrgTreeMember } from '@kc/domain';
import { makeUseStyles, radius, useTheme, Text } from '@kc/ui';
import { AvatarInitials } from '../../AvatarInitials';
import { RoleBadge } from './RoleBadge';
import { rowDirectionStart, textAlignStart } from '../../../lib/rtlLayout';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';
import { KcFlashList } from '../../lists/KcFlashList';

export interface ManagerPickerModalProps {
  readonly visible: boolean;
  readonly candidates: readonly OrgTreeMember[];
  readonly busy?: boolean;
  readonly onPick: (managerGrantId: string | null) => void;
  readonly onClose: () => void;
}

export function ManagerPickerModal(props: ManagerPickerModalProps) {
  const { visible, candidates, busy, onPick, onClose } = props;
  const styles = useStyles();
  const { colors } = useTheme();
  const L = useLocaleBundle();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{L.admin.admins.managerPicker.title}</Text>
          <Text style={styles.hint}>{L.admin.admins.managerPicker.hint}</Text>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onPick(null)}
            style={styles.detach}
          >
            <Text style={styles.detachText}>{L.admin.admins.managerPicker.detach}</Text>
          </Pressable>

          <KcFlashList
            data={candidates}
            keyExtractor={(m) => m.grantId}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>{L.admin.admins.managerPicker.empty}</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => onPick(item.grantId)}
                style={styles.row}
              >
                <AvatarInitials
                  name={item.displayName ?? L.admin.admins.row.unnamed}
                  avatarUrl={item.avatarUrl}
                  size={32}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName ?? L.admin.admins.row.unnamed}
                </Text>
                <RoleBadge role={item.role} />
              </Pressable>
            )}
          />

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {L.admin.admins.managerPicker.cancel}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 16, gap: 8,
    width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '80%',
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, textAlign: textAlignStart() },
  hint:  { fontSize: 12, color: colors.textSecondary, textAlign: textAlignStart() },
  detach: {
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: colors.surface,
  },
  detachText: { fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: textAlignStart() },
  list: { flexGrow: 0 },
  row: {
    flexDirection: rowDirectionStart, alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: textAlignStart() },
  empty: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', padding: 16 },
  cancel: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
}));