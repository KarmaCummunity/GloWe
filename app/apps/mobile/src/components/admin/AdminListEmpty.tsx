import { View } from 'react-native';
import { makeUseStyles, Text } from '@kc/ui';

export interface AdminListEmptyProps {
  readonly title: string;
  readonly hint:  string;
}

export function AdminListEmpty({ title, hint }: AdminListEmptyProps) {
  const styles = useStyles();
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const useStyles = makeUseStyles(() => ({
  box:   { padding: 32, alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  hint:  { fontSize: 13, opacity: 0.6, textAlign: 'center' },
}));
