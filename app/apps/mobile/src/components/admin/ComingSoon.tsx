// app/apps/mobile/src/components/admin/ComingSoon.tsx
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@kc/ui';
import { useLocaleBundle } from '../../i18n/useLocaleBundle';

export interface ComingSoonProps {
  subProject: 'A1' | 'A2' | 'A3' | 'A4';
  description?: string;
}

export function ComingSoon({ subProject, description }: ComingSoonProps): ReactElement {
  const L = useLocaleBundle();
  const t = L.admin.comingSoon;
  const key = subProject.toLowerCase() as 'a1' | 'a2' | 'a3' | 'a4';
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{description ?? t[key]}</Text>
      <Pressable
        style={styles.back}
        onPress={() => router.replace('/(admin)')}
        accessibilityRole="button"
      >
        <Text style={styles.backText}>{t.back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
  back: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#eee' },
  backText: { fontSize: 14 },
});
