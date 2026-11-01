import { Pressable, View } from 'react-native';
import { makeUseStyles, radius, spacing, Text, typography } from '@kc/ui';

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
  row:                { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action:             { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  actionPrimary:      { backgroundColor: colors.primary },
  actionPrimaryText:  { color: colors.textInverse, fontSize: typography.bodySmall.fontSize, ...typography.bold },
  actionDanger:       { backgroundColor: colors.error },
  actionDangerText:   { color: colors.textInverse, fontSize: typography.bodySmall.fontSize, ...typography.bold },
}));
