import { StyleSheet, View } from 'react-native';
import { makeUseStyles, Text, TextInput } from '@kc/ui';

export interface AdminFormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly multiline?: boolean;
  readonly keyboardNumeric?: boolean;
}

export function AdminFormField({
  label, value, onChange, multiline = false, keyboardNumeric = false,
}: AdminFormFieldProps) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardNumeric ? 'decimal-pad' : 'default'}
      />
    </View>
  );
}

const useStyles = makeUseStyles(({ colors }) => ({
  row:   { gap: 4 },
  label: { fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: colors.background,
    textAlign: 'right',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
}));
