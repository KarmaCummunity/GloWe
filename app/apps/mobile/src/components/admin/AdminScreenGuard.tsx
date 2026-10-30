import type { ReactNode } from 'react';
import { View } from 'react-native';
import { makeUseStyles, Text } from '@kc/ui';

export interface AdminScreenGuardProps {
  readonly isLoading:      boolean;
  readonly allowed:        boolean;
  readonly loadingLabel:   string;
  readonly forbiddenLabel: string;
  readonly children:       ReactNode;
}

export function AdminScreenGuard({
  isLoading, allowed, loadingLabel, forbiddenLabel, children,
}: AdminScreenGuardProps) {
  const styles = useStyles();
  if (isLoading) {
    return <View style={styles.center}><Text>{loadingLabel}</Text></View>;
  }
  if (!allowed) {
    return <View style={styles.center}><Text style={styles.deniedTitle}>{forbiddenLabel}</Text></View>;
  }
  return <>{children}</>;
}

const useStyles = makeUseStyles(() => ({
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  deniedTitle: { fontSize: 18, fontWeight: '700' },
}));
