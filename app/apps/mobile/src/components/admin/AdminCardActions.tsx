import { Pressable, View } from 'react-native';
import { makeUseStyles, Text } from '@kc/ui';

export interface AdminCardActionsProps {
  readonly editLabel:   string;
  readonly deleteLabel: string;
  readonly onEdit:      () => void;
  readonly onDelete:    () => void;
}

export function AdminCardActions({ editLabel, deleteLabel, onEdit, onDelete }: AdminCardActionsProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Pressable onPress={onEdit}   style={[styles.action, styles.actionPrimary]}>
        <Text style={styles.actionPrimaryText}>{editLabel}</Text>
      </Pressable>
      <Pressable onPress={onDelete} style={[styles.action, styles.actionDanger]}>
        <Text style={styles.actionDangerText}>{deleteLabel}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row:                { flexDirection: 'row', gap: 8, marginTop: 6 },
  action:             { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionPrimary:      { backgroundColor: colors.primary },
  actionPrimaryText:  { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
  actionDanger:       { backgroundColor: colors.error },
  actionDangerText:   { color: colors.textInverse, fontSize: 12, fontWeight: '700' },
}));
