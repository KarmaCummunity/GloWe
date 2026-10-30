import { Pressable, View } from 'react-native';
import { makeUseStyles, Text } from '@kc/ui';

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
  errorText:      { color: colors.error, fontSize: 12 },
  row:            { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancel:         { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  cancelText:     { fontSize: 13, fontWeight: '500' },
  submit:         { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  submitDisabled: { opacity: 0.5 },
  submitText:     { color: colors.textInverse, fontSize: 13, fontWeight: '700' },
}));
