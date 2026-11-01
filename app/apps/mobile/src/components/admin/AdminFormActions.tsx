import { Pressable, View } from 'react-native';
import { makeUseStyles, radius, spacing, Text, typography } from '@kc/ui';

export interface AdminFormActionsProps {
  readonly cancelLabel:    string;
  readonly submitLabel:    string;
  readonly submittingLabel: string;
  readonly isPending:      boolean;
  readonly onCancel:       () => void;
  readonly onSubmit:       () => void;
  readonly errorMsg?:      string | null;
}

export function AdminFormActions({
  cancelLabel, submitLabel, submittingLabel, isPending, onCancel, onSubmit, errorMsg,
}: AdminFormActionsProps) {
  const styles = useStyles();
  return (
    <>
      {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      <View style={styles.row}>
        <Pressable style={styles.cancel} onPress={onCancel} disabled={isPending}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.submit, isPending && styles.submitDisabled]}
          onPress={onSubmit}
          disabled={isPending}
        >
          <Text style={styles.submitText}>{isPending ? submittingLabel : submitLabel}</Text>
        </Pressable>
      </View>
    </>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  errorText:      { color: colors.error, fontSize: typography.bodySmall.fontSize },
  row:            { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  cancel:         { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  cancelText:     { fontSize: typography.bodySmall.fontSize, ...typography.medium },
  submit:         { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.5 },
  submitText:     { color: colors.textInverse, fontSize: typography.bodySmall.fontSize, ...typography.bold },
}));
