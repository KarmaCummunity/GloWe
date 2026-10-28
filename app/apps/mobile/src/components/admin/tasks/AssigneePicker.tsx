// app/apps/mobile/src/components/admin/tasks/AssigneePicker.tsx
// FR-ADMIN-018 — pick an assignee from active admins (uses admin_list_admins RPC).
// Visible only when the caller has admins.view permission (super_admin/moderator).
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adminChipScroll } from '../adminChipScroll';
import type { AdminGrant } from '@kc/domain';
import { makeUseStyles } from '@kc/ui';
import { container } from '../../../lib/container';
import { useLocaleBundle } from '../../../i18n/useLocaleBundle';

export interface AssigneePickerProps {
  readonly value: string | null;
  readonly onChange: (assigneeId: string | null) => void;
}

interface PickEntry {
  readonly userId: string;
  readonly displayName: string;
  readonly role: AdminGrant['role'];
}

export function AssigneePicker({ value, onChange }: AssigneePickerProps) {
  const styles = useStyles();
  const L = useLocaleBundle();
  const q = useQuery({
    queryKey: ['admin.admins.list', { includeRevoked: false }],
    queryFn:  () => container.listAdmins.execute({ includeRevoked: false }),
    staleTime: 60_000,
  });
  const entries = derivePickEntries(q.data ?? [], L.admin.admins.row.unnamed);

  return (
    <View>
      <ScrollView horizontal style={adminChipScroll.scroll} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, adminChipScroll.content]}>
        <ChipButton
          label={L.admin.tasks.form.unassigned}
          active={value === null}
          onPress={() => onChange(null)}
        />
        {entries.map((e) => (
          <ChipButton
            key={e.userId}
            label={e.displayName}
            active={value === e.userId}
            onPress={() => onChange(e.userId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function derivePickEntries(
  grants: readonly AdminGrant[],
  unnamedLabel: string,
): readonly PickEntry[] {
  const seen = new Set<string>();
  const out: PickEntry[] = [];
  for (const g of grants) {
    if (g.revokedAt !== null) continue;
    if (seen.has(g.userId)) continue;
    seen.add(g.userId);
    out.push({
      userId: g.userId,
      displayName: g.displayName ?? unnamedLabel,
      role: g.role,
    });
  }
  return out;
}

interface ChipButtonProps {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
}

function ChipButton({ label, active, onPress }: ChipButtonProps) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row:            { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: colors.secondaryLight,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  chipTextActive: { color: colors.textInverse },
}));
